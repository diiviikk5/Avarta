"""Build a small, verifiable rainfall replay from public GEFS and IMD data.

GEFS fields are archived forecast *inputs*, while the IMD grid is an observed
daily analysis used only for verification. No synthetic values enter this case.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import eccodes
import numpy as np
from scipy.ndimage import label

from services.ingestion.imd_gridded_parser import IMDGriddedParser
from services.ingestion.chirps_daily import read_crop as read_chirps_crop, source_url as chirps_source_url, download as download_chirps
from services.tracking.kalman_tracker import PersistentThreatTracker


CASE_ID = "gefs-imd-rain-2025-08-23"
INIT = "2025-08-19T00:00:00Z"
OBS_DATE = "2025-08-23"
MEMBERS = ("gec00", "gep01", "gep02", "gep03", "gep04")
LEADS = tuple(range(75, 100, 3))
DOMAIN = (20.0, 31.0, 69.0, 84.0)  # south, north, west, east
GEFS_BASE = "https://noaa-gefs-pds.s3.amazonaws.com/gefs.20250819/00/atmos/pgrb2ap5"
IMD_SOURCE = "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html"
HEAVY_RAIN_MM_DAY = 64.5
CACHE = Path("data/raw/gefs_cache")


def _read_url(url: str, *, start: int | None = None, end: int | None = None) -> bytes:
    headers = {"User-Agent": "Avarta historical replay (SIH26078)"}
    if start is not None and end is not None:
        headers["Range"] = f"bytes={start}-{end}"
    request = Request(url, headers=headers)
    for attempt in range(4):
        try:
            with urlopen(request, timeout=45) as response:
                payload = response.read()
                if start is not None and response.status != 206:
                    raise RuntimeError(f"Expected HTTP 206 for {url}; got {response.status}")
            return payload
        except OSError:
            if attempt == 3:
                raise
            time.sleep(0.5 * (attempt + 1))
    raise AssertionError("unreachable")


def _gefs_url(member: str, lead: int) -> str:
    if member not in MEMBERS or lead not in LEADS:
        raise ValueError("Unexpected GEFS member or lead hour")
    return f"{GEFS_BASE}/{member}.t00z.pgrb2a.0p50.f{lead:03d}"


def fetch_gefs_precip(member: str, lead: int) -> tuple[np.ndarray, dict]:
    """Fetch one APCP GRIB message by byte range, without a full GRIB download."""
    url = _gefs_url(member, lead)
    CACHE.mkdir(parents=True, exist_ok=True)
    key = f"{member}-{lead:03d}"
    payload_file, metadata_file = CACHE / f"{key}.grib2", CACHE / f"{key}.json"
    if payload_file.exists() and metadata_file.exists():
        message = payload_file.read_bytes()
        metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
        if hashlib.sha256(message).hexdigest() != metadata["sha256"]:
            raise RuntimeError(f"Cached GRIB checksum mismatch: {payload_file}")
    else:
        index = _read_url(url + ".idx").decode("utf-8").splitlines()
        matches = [i for i, row in enumerate(index) if ":APCP:surface:" in row]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one APCP record in {url}.idx")
        position = matches[0]
        start = int(index[position].split(":")[1])
        end = int(index[position + 1].split(":")[1]) - 1
        message = _read_url(url, start=start, end=end)
        metadata = {"url": url, "byte_range": [start, end],
                    "sha256": hashlib.sha256(message).hexdigest(),
                    "member": member, "lead_hour": lead}
        payload_file.write_bytes(message)
    handle = eccodes.codes_new_from_message(message)
    try:
        if eccodes.codes_get(handle, "shortName") != "tp":
            raise RuntimeError(f"Unexpected GRIB variable in {url}")
        step_range = eccodes.codes_get(handle, "stepRange")
        ni = eccodes.codes_get(handle, "Ni")
        nj = eccodes.codes_get(handle, "Nj")
        full = eccodes.codes_get_values(handle).reshape(nj, ni)
        latitudes = 90.0 - np.arange(nj) * 0.5
        longitudes = np.arange(ni) * 0.5
        south, north, west, east = DOMAIN
        rows = np.flatnonzero((latitudes >= south) & (latitudes <= north))
        cols = np.flatnonzero((longitudes >= west) & (longitudes <= east))
        crop = full[np.ix_(rows, cols)].astype(np.float32)
    finally:
        eccodes.codes_release(handle)
    metadata["step_range_hours"] = step_range
    metadata_file.write_text(json.dumps(metadata), encoding="utf-8")
    return crop, metadata


def _three_hour_intervals(accumulations: dict[int, np.ndarray]) -> np.ndarray:
    """Undo alternating 3 h / 6 h APCP windows in the GEFS archive.

    GRIB APCP values are quantized; subtraction can yield a few hundredths of a
    millimetre below zero where the physical interval is zero.
    """
    intervals = []
    for lead in LEADS[1:]:
        if lead % 6 == 0:
            interval = accumulations[lead] - accumulations[lead - 3]
        else:
            interval = accumulations[lead]
        if float(interval.min()) < -0.1:
            raise RuntimeError(f"Negative derived precipitation at lead {lead}")
        intervals.append(np.maximum(interval, 0.0))
    return np.stack(intervals)


def _observed_grid(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    parser = IMDGriddedParser(str(path))
    day = (datetime.fromisoformat(OBS_DATE) - datetime(2025, 1, 1)).days
    if parser.raw_data is None or parser.raw_data.shape[0] != 365:
        raise ValueError("Expected the full 2025 IMD annual rainfall grid")
    raw = parser.raw_data[day].astype(np.float32)
    south, north, west, east = DOMAIN
    rows = (parser.lats >= south) & (parser.lats <= north)
    cols = (parser.lons >= west) & (parser.lons <= east)
    cropped = raw[np.ix_(rows, cols)]
    cropped = np.where(cropped == -999, np.nan, cropped)
    return cropped, parser.lats[rows], parser.lons[cols], hashlib.sha256(path.read_bytes()).hexdigest()


def _bilinear_to_imd(field: np.ndarray, coarse_lats: np.ndarray, coarse_lons: np.ndarray,
                     imd_lats: np.ndarray, imd_lons: np.ndarray) -> np.ndarray:
    from scipy.interpolate import RegularGridInterpolator

    interpolator = RegularGridInterpolator(
        (coarse_lats[::-1], coarse_lons), field[::-1],
        method="linear", bounds_error=False, fill_value=np.nan,
    )
    yy, xx = np.meshgrid(imd_lats, imd_lons, indexing="ij")
    return interpolator(np.stack([yy, xx], axis=-1)).astype(np.float32)


def _footprint_iou(forecast: np.ndarray, observed: np.ndarray, threshold: float) -> float | None:
    valid = np.isfinite(observed) & np.isfinite(forecast)
    predicted = (forecast >= threshold) & valid
    actual = (observed >= threshold) & valid
    union = int(np.sum(predicted | actual))
    return round(float(np.sum(predicted & actual) / union), 4) if union else None


def _track(intervals: np.ndarray, lats: np.ndarray, lons: np.ndarray) -> list[dict]:
    tracker = PersistentThreatTracker(max_distance_km=450.0)
    frames = []
    for index, field in enumerate(intervals):
        mask = field >= 8.0  # 3 h forecast accumulation, mm
        objects, count = label(mask)
        detections = []
        footprints = []
        for object_id in range(1, count + 1):
            rows, cols = np.where(objects == object_id)
            if len(rows) < 3:
                continue
            weights = field[rows, cols]
            lat = float(np.average(lats[rows], weights=weights))
            lon = float(np.average(lons[cols], weights=weights))
            peak = float(np.max(weights))
            detections.append({"lat": lat, "lon": lon, "intensity": peak, "hazard_type": "rainfall"})
            footprints.append({"centroid": [round(lat, 3), round(lon, 3)],
                               "bbox": [float(lats[rows].min()), float(lons[cols].min()),
                                        float(lats[rows].max()), float(lons[cols].max())],
                               "peak_mm_3h": round(peak, 2), "cells": len(rows)})
        lead = LEADS[index + 1]
        timestamp = datetime.fromtimestamp(
            datetime(2025, 8, 19, tzinfo=timezone.utc).timestamp() + lead * 3600,
            tz=timezone.utc,
        ).isoformat().replace("+00:00", "Z")
        active = tracker.update_with_detections(detections, timestamp)
        for footprint, matched in zip(footprints, active):
            footprint["track_id"] = matched["threat_id"]
        frames.append({"lead_hour": lead, "valid_time": timestamp,
                       "objects": sorted(footprints, key=lambda x: x["peak_mm_3h"], reverse=True)[:8]})
    return frames


def build_case(imd_file: Path, workers: int = 6, chirps_file: Path | None = None) -> dict:
    observed, imd_lats, imd_lons, imd_sha = _observed_grid(imd_file)
    records: dict[str, dict[int, np.ndarray]] = {member: {} for member in MEMBERS}
    sources = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        jobs = {pool.submit(fetch_gefs_precip, member, lead): (member, lead)
                for member in MEMBERS for lead in LEADS}
        for job in as_completed(jobs):
            member, lead = jobs[job]
            records[member][lead], source = job.result()
            sources.append(source)
    daily_members = np.stack([_three_hour_intervals(records[m]).sum(axis=0) for m in MEMBERS])
    intervals = np.stack([_three_hour_intervals(records[m]) for m in MEMBERS]).mean(axis=0)
    daily_mean = daily_members.mean(axis=0)
    south, north, west, east = DOMAIN
    coarse_lats = np.arange(north, south - 0.01, -0.5, dtype=np.float32)
    coarse_lons = np.arange(west, east + 0.01, 0.5, dtype=np.float32)
    forecast_on_imd_grid = _bilinear_to_imd(daily_mean, coarse_lats, coarse_lons, imd_lats, imd_lons)
    valid = np.isfinite(observed) & np.isfinite(forecast_on_imd_grid)
    peak_fcst = float(np.nanmax(forecast_on_imd_grid))
    peak_obs = float(np.nanmax(observed))
    exceedance = (daily_members >= HEAVY_RAIN_MM_DAY).mean(axis=0)
    frames = _track(intervals, coarse_lats, coarse_lons)
    peak_row, peak_col = np.unravel_index(np.nanargmax(observed), observed.shape)
    report = {
        "id": CASE_ID,
        "mode": "historical_replay",
        "title": "23 August 2025 · northwest India rainfall",
        "hazard": "24-hour heavy rainfall",
        "forecast": {"model": "NOAA GEFS", "initialization_time": INIT,
                     "window_utc": ["2025-08-22T03:00:00Z", "2025-08-23T03:00:00Z"],
                     "lead_hours": [75, 99], "members": list(MEMBERS),
                     "grid_spacing_degrees": 0.5, "units": "mm / 24 h"},
        "observation": {"model": "IMD daily gridded rainfall", "date": OBS_DATE,
                        "grid_spacing_degrees": 0.25, "units": "mm / day",
                        "source_url": IMD_SOURCE, "sha256": imd_sha,
                        "timing_note": "IMD daily accumulation is treated as ending at 08:30 IST (03:00 UTC)."},
        "domain": {"south": south, "north": north, "west": west, "east": east},
        "verification": {
            "sampled_grid_cells": int(valid.sum()),
            "forecast_peak_mm_day": round(peak_fcst, 2),
            "observed_peak_mm_day": round(peak_obs, 2),
            "peak_absolute_error_mm_day": round(abs(peak_fcst - peak_obs), 2),
            "mean_absolute_error_mm_day": round(float(np.mean(np.abs(forecast_on_imd_grid[valid] - observed[valid]))), 2),
            "heavy_rain_threshold_mm_day": HEAVY_RAIN_MM_DAY,
            "heavy_rain_iou": _footprint_iou(forecast_on_imd_grid, observed, HEAVY_RAIN_MM_DAY),
            "observed_peak_location": [round(float(imd_lats[peak_row]), 3), round(float(imd_lons[peak_col]), 3)],
        },
        "frames": frames,
        "raster": {"latitudes": [round(float(v), 2) for v in coarse_lats],
                   "longitudes": [round(float(v), 2) for v in coarse_lons],
                   "forecast_mm_day": np.round(daily_mean.astype(np.float64), 2).tolist(),
                   "member_exceedance_probability": np.round(exceedance.astype(np.float64), 2).tolist()},
        "provenance": {"gefs_grib_records": sorted(sources, key=lambda s: (s["member"], s["lead_hour"])),
                       "generated_by": "python -m services.replay.august_2025"},
        "limitations": [
            "Five ensemble members are a small demonstration subset, not a calibrated probability forecast.",
            "Forecast is 0.5° and observation is 0.25°; this replay does not demonstrate 5 km downscaling.",
            "Tiny negative 3-hour values from differencing quantized GEFS accumulations are clipped to zero (maximum allowed 0.1 mm).",
            "A single event cannot establish forecast skill or warning thresholds.",
        ],
    }
    if chirps_file is not None:
        chirps, chirps_lats, chirps_lons, chirps_sha = read_chirps_crop(chirps_file, DOMAIN)
        forecast_on_chirps = _bilinear_to_imd(
            daily_mean, coarse_lats, coarse_lons, chirps_lats, chirps_lons,
        )
        common = np.isfinite(chirps) & np.isfinite(forecast_on_chirps)
        if not common.any():
            raise RuntimeError("No common GEFS/CHIRPS cells in domain")
        report["independent_observation"] = {
            "model": "CHIRPS v2 daily rainfall estimate",
            "date": OBS_DATE,
            "grid_spacing_degrees": 0.05,
            "source_url": chirps_source_url(datetime.fromisoformat(OBS_DATE).date()),
            "sha256": chirps_sha,
            "note": "Independent satellite/gauge estimate, not point-gauge ground truth.",
        }
        report["independent_verification"] = {
            "method": "GEFS ensemble mean bilinearly interpolated to CHIRPS grid; no learned downscaling",
            "sampled_grid_cells": int(common.sum()),
            "forecast_peak_mm_day": round(float(forecast_on_chirps[common].max()), 2),
            "chirps_peak_mm_day": round(float(chirps[common].max()), 2),
            "mean_absolute_error_mm_day": round(float(np.mean(np.abs(forecast_on_chirps[common] - chirps[common]))), 2),
            "heavy_rain_iou": _footprint_iou(forecast_on_chirps, chirps, HEAVY_RAIN_MM_DAY),
            "heavy_rain_threshold_mm_day": HEAVY_RAIN_MM_DAY,
            "timing_note": "The GEFS 03–03 UTC accumulation is not known to exactly match the CHIRPS daily window; descriptive comparison only.",
        }
        report["limitations"].append(
            "CHIRPS 0.05° provides an independent fine observation grid, not evidence of a 5 km forecast. "
            "CHIRPS daily extreme magnitudes and timing have additional product uncertainty."
        )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--imd-file", type=Path, default=Path("data/raw/Rainfall_ind2025_rfp25.grd"))
    parser.add_argument("--output", type=Path, default=Path("avarta/public/replay/august-2025.json"))
    parser.add_argument("--chirps-file", type=Path, help="Use a local official CHIRPS daily GeoTIFF.gz")
    parser.add_argument("--no-chirps", action="store_true", help="Skip the independent CHIRPS check (default downloads/caches it)")
    args = parser.parse_args()
    chirps_file = (None if args.no_chirps else
                   args.chirps_file or download_chirps(datetime.fromisoformat(OBS_DATE).date()))
    report = build_case(args.imd_file, chirps_file=chirps_file)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}: {report['verification']}")


if __name__ == "__main__":
    main()
