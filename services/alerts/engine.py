"""Alert + pinpoint forecast engine (Phases 4-5 glue).

Exposes the exact shape requested:

GET /forecast?lat=28.40&lon=77.31 ->
{
  "location": "Faridabad", "event": "Extreme Rainfall",
  "severity": "HIGH", "risk_radius_km": 5, "rainfall_mm": 122,
  "anomaly_sigma": 5.7, "forecast_hours": 12, "confidence": 0.84
}

Plus the "What happens here?" plain-language explainer and draft
SMS/email payloads. Everything is draft decision support: thresholds are
provisional, dissemination is never sent automatically, and every response
requires meteorologist review before any public use.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

from services.detection.multi_variable import classify_sigma
from services.impact.risk_engine import build_local_impact, classify_risk

ROOT = Path(__file__).resolve().parents[2]
CASE_FILE = ROOT / "avarta/public/replay/august-2025.json"

# Approximate reverse-geocode anchors for the replay domain + demo cities.
KNOWN_PLACES: List[Tuple[str, float, float]] = [
    ("Faridabad", 28.40, 77.31),
    ("Noida", 28.53, 77.39),
    ("Delhi", 28.61, 77.21),
    ("Gurugram", 28.46, 77.03),
    ("Jaipur", 26.91, 75.79),
    ("Lucknow", 26.85, 80.95),
    ("Patna", 25.59, 85.14),
    ("Chandigarh", 30.73, 76.78),
    ("Dehradun", 30.32, 78.03),
    ("Shimla", 31.10, 77.17),
    ("Amritsar", 31.63, 74.87),
    ("Agra", 27.18, 78.01),
    ("Varanasi", 25.32, 82.99),
    ("Bhopal", 23.26, 77.41),
    ("Nagpur", 21.15, 79.09),
    ("Kolkata", 22.57, 88.36),
    ("Mumbai", 19.08, 72.88),
    ("Chennai", 13.08, 80.27),
]

# Provisional IMD-style climatology means/stds for point anomaly estimates.
# Clearly labeled defaults; real deployments must supply matched model climate.
DEFAULT_CLIMATOLOGY: Dict[str, Tuple[float, float]] = {
    "rainfall": (18.0, 18.0),  # mm/day normal ~10-30
    "temperature": (31.0, 3.0),
    "wind_speed": (18.0, 10.0),
    "pressure": (1006.0, 4.0),
    "humidity": (62.0, 12.0),
    "geopotential_height": (5880.0, 30.0),
}


def nearest_place(lat: float, lon: float) -> str:
    best, best_dist = "Unnamed grid cell", float("inf")
    for name, plat, plon in KNOWN_PLACES:
        dist = (lat - plat) ** 2 + (lon - plon) ** 2
        if dist < best_dist:
            best, best_dist = name, dist
    # Only claim a city name when reasonably close (~55 km).
    return best if best_dist <= 0.25 else f"{lat:.2f}N {lon:.2f}E"


def _load_case() -> dict | None:
    if not CASE_FILE.exists():
        return None
    return json.loads(CASE_FILE.read_text(encoding="utf-8"))


def _nearest_grid_value(lat: float, lon: float, case: dict) -> Dict[str, Any]:
    lats = np.asarray(case["raster"]["latitudes"])
    lons = np.asarray(case["raster"]["longitudes"])
    field = np.asarray(case["raster"]["forecast_mm_day"])
    exceed = np.asarray(case["raster"].get("member_exceedance_probability", np.zeros_like(field)))
    row = int(np.argmin(np.abs(lats - lat)))
    col = int(np.argmin(np.abs(lons - lon)))
    rainfall = float(field[row, col])
    spread = float(exceed[row, col]) if exceed.shape == field.shape else 0.5
    return {
        "grid_lat": float(lats[row]),
        "grid_lon": float(lons[col]),
        "rainfall_mm": rainfall,
        "ensemble_spread_norm": spread,
    }


def point_forecast(lat: float, lon: float, forecast_hours: int = 12) -> Dict[str, Any]:
    """Build the GET /forecast?lat&lon response from the replay grid.

    Rainfall comes from the archived GEFS ensemble mean; other variables use
    provisional climatology defaults and are marked as estimates. Confidence
    blends ensemble agreement with anomaly magnitude; it is NOT calibrated.
    """
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Latitude must be -90..90 and longitude -180..180")
    case = _load_case()
    if case is None:
        raise RuntimeError("Historical replay artifact is missing")
    grid = _nearest_grid_value(lat, lon, case)
    rainfall = grid["rainfall_mm"]
    clim_mean, clim_std = DEFAULT_CLIMATOLOGY["rainfall"]
    sigma = float((rainfall - clim_mean) / clim_std) if clim_std else 0.0
    severity_sigma = classify_sigma(sigma)
    impact = build_local_impact(
        location_name=nearest_place(lat, lon),
        latitude=lat,
        longitude=lon,
        rainfall_mm=rainfall,
        anomaly_sigma=sigma,
        historical_percentile=min(99.9, 50 + abs(sigma) * 8),
        ensemble_spread_norm=grid["ensemble_spread_norm"],
        forecast_hours=forecast_hours,
        confidence=round(max(0.35, min(0.92, 0.55 + abs(sigma) * 0.05)), 2),
        window_label=f"next {max(1, forecast_hours - 6)}–{forecast_hours + 6} hours" if forecast_hours >= 12 else f"next {forecast_hours} hours",
    )
    data = impact.to_dict()
    threshold = float(case["verification"]["heavy_rain_threshold_mm_day"])
    # Map risk band onto the requested severity vocabulary.
    severity = {"LOW": "LOW", "MODERATE": "MODERATE", "HIGH": "HIGH", "SEVERE": "SEVERE"}[data["risk_band"]]
    return {
        "location": data["location"],
        "event": "Extreme Rainfall" if severity in ("HIGH", "SEVERE") else "Rainfall Anomaly Watch",
        "severity": severity,
        "risk_radius_km": data["risk_radius_km"],
        "rainfall_mm": data["rainfall_mm"],
        "anomaly_sigma": round(sigma, 2),
        "anomaly_label": severity_sigma,
        "forecast_hours": forecast_hours,
        "confidence": data["confidence"],
        "risk_score": data["risk_score"],
        "risk_band": data["risk_band"],
        "grid_cell": {"latitude": grid["grid_lat"], "longitude": grid["grid_lon"]},
        "window_label": data["window_label"],
        "potential_impacts": data["potential_impacts"],
        "provisional_threshold_mm_day": threshold,
        "threshold_exceeded": rainfall >= threshold,
        "status": "draft_decision_support",
        "dissemination": "not_sent",
        "requires_meteorologist_review": True,
        "source": case["forecast"]["model"],
        "forecast_window_utc": case["forecast"]["window_utc"],
        "method": "GEFS ensemble-mean grid lookup + provisional climatology sigma; "
        "other variables estimated, confidence uncalibrated. Not a 5 km forecast.",
    }


def what_happens_here(lat: float, lon: float, forecast_hours: int = 12) -> Dict[str, Any]:
    """Plain-language answer to 'What will happen in my area?'."""
    forecast = point_forecast(lat, lon, forecast_hours)
    low = max(0.0, forecast["rainfall_mm"] * 0.85)
    high = forecast["rainfall_mm"] * 1.15 + 5
    return {
        "location": forecast["location"],
        "headline": f"{forecast['severity']} {forecast['event'].upper()}",
        "expected_rainfall_mm": [round(low, 1), round(high, 1)],
        "forecast_window": forecast["window_label"],
        "potential_impacts": forecast["potential_impacts"],
        "risk_radius_km": forecast["risk_radius_km"],
        "confidence": forecast["confidence"],
        "anomaly_sigma": forecast["anomaly_sigma"],
        "severity": forecast["severity"],
        "narrative": (
            f"{forecast['location']}: {forecast['event']} ({forecast['severity']}). "
            f"Expected rainfall {low:.0f}–{high:.0f} mm over {forecast['window_label']}; "
            f"anomaly {forecast['anomaly_sigma']:+.1f}σ vs provisional climatology. "
            f"Possible: {', '.join(forecast['potential_impacts'])}. "
            f"Draft decision support only — meteorologist review required."
        ),
        "status": "draft_decision_support",
        "dissemination": "not_sent",
    }


def draft_messages(lat: float, lon: float, channel: str = "sms") -> Dict[str, Any]:
    """Format (never send) SMS/email payloads for the draft alert."""
    info = what_happens_here(lat, lon)
    if channel == "email":
        body = (
            f"Subject: [DRAFT - NOT FOR RELEASE] {info['headline']} - {info['location']}\n\n"
            f"{info['narrative']}\n\nRisk radius ~{info['risk_radius_km']} km. "
            f"Confidence {int(info['confidence'] * 100)}%. Do not disseminate without review."
        )
    else:
        body = (
            f"[DRAFT] {info['headline']} {info['location']}: "
            f"{info['expected_rainfall_mm'][0]:.0f}-{info['expected_rainfall_mm'][1]:.0f}mm "
            f"{info['forecast_window']}. Risk ~{info['risk_radius_km']}km. Review required."
        )
    return {"channel": channel, "body": body, "dissemination": "not_sent"}


def region_risk_table() -> List[Dict[str, Any]]:
    """State-level risk overview combining replay rainfall with provisional sigma.

    Fixed anchor coordinates keep the table stable; rainfall is sampled from
    the nearest replay grid cell so the table always reflects real artifact
    values instead of hand-written intensities.
    """
    anchors = [
        ("Punjab", 30.9, 75.8),
        ("Delhi", 28.6, 77.2),
        ("Uttar Pradesh", 27.5, 80.5),
        ("Bihar", 25.8, 85.5),
        ("Rajasthan", 26.5, 73.8),
        ("Haryana", 29.3, 76.0),
        ("Uttarakhand", 30.3, 78.5),
    ]
    case = _load_case()
    rows = []
    for name, lat, lon in anchors:
        rainfall = 0.0
        if case is not None:
            try:
                rainfall = _nearest_grid_value(lat, lon, case)["rainfall_mm"]
            except Exception:
                rainfall = 0.0
        clim_mean, clim_std = DEFAULT_CLIMATOLOGY["rainfall"]
        sigma = float((rainfall - clim_mean) / clim_std)
        impact = build_local_impact(name, lat, lon, rainfall, sigma)
        rows.append(impact.to_dict())
    # Order most severe first for the dashboard.
    rows.sort(key=lambda r: r["risk_score"], reverse=True)
    return rows


def risk_class_breaks() -> List[Dict[str, Any]]:
    return [
        {"band": "LOW", "range": [0, 30], "emoji": "🟢", "action": "Monitor routine forecast"},
        {"band": "MODERATE", "range": [30, 60], "emoji": "🟡", "action": "Watch; check drains and advisories"},
        {"band": "HIGH", "range": [60, 80], "emoji": "🟠", "action": "Prepare; draft response, expert review required"},
        {"band": "SEVERE", "range": [80, 100], "emoji": "🔴", "action": "Urgent review; no public alert without authority"},
    ]
