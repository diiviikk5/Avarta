"""Evidence-aware ensemble anomaly analysis for medium-range NWP.

This module is the deterministic scientific layer between raw ensemble fields
and a learned tracker.  It turns ``[member, y, x]`` forecasts plus a matched
model-climate distribution into EFI, Shift-of-Tails (SOT), exceedance
probability, finite-ensemble credible intervals, confidence and georeferenced
footprints.  The resulting feature cube is suitable input to the spherical
GNN; it is also a transparent baseline against which the GNN must improve.

No probability is described as calibrated; optional calibration metadata is
retained as provenance but never silently applied. Jeffreys intervals expose
the large uncertainty of a small ensemble instead of hiding it behind a
precise percentage.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal
import warnings

import numpy as np
from scipy.ndimage import label
from scipy.stats import beta

from services.detection.climatology_engine import ClimatologyEngine
from models.spherical_gnn.icosahedron import interpolate_grid_to_mesh

Tail = Literal["upper", "lower"]


@dataclass(frozen=True)
class HazardFootprint:
    footprint_id: str
    variable: str
    tail: Tail
    centroid: tuple[float, float]
    bounding_box: tuple[float, float, float, float]
    area_km2: float
    peak_probability: float
    probability_lower_90: float
    peak_efi: float
    peak_sot: float
    peak_intensity: float
    confidence: float
    member_support: int
    severity: str

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["centroid"] = list(self.centroid)
        value["bounding_box"] = list(self.bounding_box)
        return value


@dataclass
class EnsembleResult:
    variable: str
    units: str
    tail: Tail
    threshold: float
    members: int
    feature_names: tuple[str, ...]
    feature_cube: np.ndarray
    maps: dict[str, np.ndarray]
    footprints: list[HazardFootprint]
    evidence: dict[str, Any]

    def summary(self, include_maps: bool = False) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "variable": self.variable,
            "units": self.units,
            "tail": self.tail,
            "threshold": self.threshold,
            "members": self.members,
            "feature_names": list(self.feature_names),
            "footprints": [item.to_dict() for item in self.footprints],
            "evidence": self.evidence,
        }
        if include_maps:
            payload["maps"] = {
                name: np.round(values.astype(np.float64), 4).tolist()
                for name, values in self.maps.items()
            }
        return payload


def _validate_coordinates(lats: np.ndarray, lons: np.ndarray, shape: tuple[int, int]) -> None:
    if lats.ndim != 1 or lons.ndim != 1 or shape != (len(lats), len(lons)):
        raise ValueError("Coordinates must be 1D and match the forecast grid")
    if len(lats) < 2 or len(lons) < 2:
        raise ValueError("At least two latitude and longitude coordinates are required")
    if not np.isfinite(lats).all() or not np.isfinite(lons).all():
        raise ValueError("Coordinates must be finite")
    if np.any(np.diff(lats) == 0) or np.any(np.diff(lons) == 0):
        raise ValueError("Coordinates must not contain duplicates")


def _cell_areas_km2(lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    """Spherical cell areas for regular or mildly irregular rectilinear grids."""
    lat_edges = np.empty(len(lats) + 1, dtype=np.float64)
    lon_edges = np.empty(len(lons) + 1, dtype=np.float64)
    lat_edges[1:-1] = (lats[:-1] + lats[1:]) / 2
    lon_edges[1:-1] = (lons[:-1] + lons[1:]) / 2
    lat_edges[0] = lats[0] - (lats[1] - lats[0]) / 2
    lat_edges[-1] = lats[-1] + (lats[-1] - lats[-2]) / 2
    lon_edges[0] = lons[0] - (lons[1] - lons[0]) / 2
    lon_edges[-1] = lons[-1] + (lons[-1] - lons[-2]) / 2
    lat_edges = np.clip(lat_edges, -90, 90)
    strip = np.abs(np.sin(np.deg2rad(lat_edges[1:])) - np.sin(np.deg2rad(lat_edges[:-1])))
    width = np.abs(np.deg2rad(np.diff(lon_edges)))
    return 6371.0088**2 * strip[:, None] * width[None, :]


def _jeffreys_interval(hits: np.ndarray, trials: np.ndarray, confidence: float = 0.90) -> tuple[np.ndarray, np.ndarray]:
    alpha = (1.0 - confidence) / 2.0
    lower = beta.ppf(alpha, hits + 0.5, trials - hits + 0.5)
    upper = beta.ppf(1.0 - alpha, hits + 0.5, trials - hits + 0.5)
    invalid = trials < 1
    return np.where(invalid, np.nan, lower), np.where(invalid, np.nan, upper)


def _severity(probability: float, efi: float, confidence: float) -> str:
    # A high raw probability with weak evidence cannot become SEVERE.
    score = probability * max(confidence, 0.25) + max(efi, 0.0) * 0.20
    if score >= 0.80 and confidence >= 0.65:
        return "SEVERE"
    if score >= 0.60 and confidence >= 0.45:
        return "HIGH"
    if score >= 0.35:
        return "MODERATE"
    return "LOW"


def audit_probability_field(
    probability: np.ndarray,
    member_count: int,
    lats: np.ndarray,
    lons: np.ndarray,
    *,
    detection_probability: float = 0.50,
    min_area_km2: float = 0.0,
) -> dict[str, Any]:
    """Audit a persisted raw member-frequency field without inventing members.

    This is useful for compact replay artifacts that kept only ``k / M`` and
    not all member rasters. It reconstructs integer support, adds a 90%
    Jeffreys interval, and extracts probability footprints. It deliberately
    cannot calculate EFI, SOT or forecast intensities from the reduced data.
    """
    field = np.asarray(probability, dtype=np.float64)
    lats, lons = np.asarray(lats, dtype=np.float64), np.asarray(lons, dtype=np.float64)
    if field.ndim != 2 or member_count < 2:
        raise ValueError("A 2D probability field and at least two members are required")
    _validate_coordinates(lats, lons, field.shape)
    if not 0 <= detection_probability <= 1 or min_area_km2 < 0:
        raise ValueError("Invalid probability threshold or area")
    valid = np.isfinite(field)
    if np.any((field[valid] < 0) | (field[valid] > 1)):
        raise ValueError("Probabilities must lie in [0,1]")
    hits = np.rint(np.where(valid, field, 0.0) * member_count).astype(np.int64)
    reconstructed = hits / member_count
    # Catch lossy/corrupt artifacts while allowing ordinary JSON rounding.
    if valid.any() and float(np.nanmax(np.abs(reconstructed - field))) > 0.011:
        raise ValueError("Probability field is inconsistent with the member count")
    trials = np.full(field.shape, member_count, dtype=np.int64)
    lower, upper = _jeffreys_interval(hits, trials)
    posterior = (hits + 0.5) / (member_count + 1.0)
    components, count = label(valid & (reconstructed >= detection_probability),
                              structure=np.ones((3, 3), dtype=np.int8))
    areas = _cell_areas_km2(lats, lons)
    footprints = []
    for component_id in range(1, count + 1):
        rows, cols = np.where(components == component_id)
        area = float(areas[rows, cols].sum())
        if area < min_area_km2:
            continue
        weights = areas[rows, cols] * np.maximum(reconstructed[rows, cols], 1e-6)
        peak = int(np.argmax(reconstructed[rows, cols]))
        row, col = rows[peak], cols[peak]
        footprints.append({
            "footprint_id": f"ARCHIVE-PROB-{len(footprints)+1:03d}",
            "centroid": [round(float(np.average(lats[rows], weights=weights)), 4),
                         round(float(np.average(lons[cols], weights=weights)), 4)],
            "bounding_box": [round(float(lats[rows].min()), 4), round(float(lons[cols].min()), 4),
                             round(float(lats[rows].max()), 4), round(float(lons[cols].max()), 4)],
            "area_km2": round(area, 1),
            "peak_raw_probability": round(float(reconstructed[row, col]), 4),
            "peak_posterior_probability": round(float(posterior[row, col]), 4),
            "probability_interval_90": [round(float(lower[row, col]), 4), round(float(upper[row, col]), 4)],
            "supporting_members": int(hits[row, col]),
        })
    return {
        "members": member_count,
        "probability_kind": "raw_finite_ensemble",
        "member_probability_resolution": round(1 / member_count, 4),
        "credible_interval": "Jeffreys beta-binomial, 90%",
        "detection_probability": detection_probability,
        "valid_cells": int(valid.sum()),
        "maximum_raw_probability": round(float(np.nanmax(reconstructed)), 4) if valid.any() else None,
        "footprints": footprints,
        "unavailable_from_reduced_artifact": ["EFI", "shift_of_tails", "member_intensity_spread"],
        "operationally_calibrated": False,
    }


class EnsembleIntelligenceCore:
    """Compute transparent probabilistic features and coherent hazard objects."""

    FEATURE_NAMES = (
        "ensemble_mean",
        "ensemble_std",
        "ensemble_p10",
        "ensemble_p50",
        "ensemble_p90",
        "exceedance_probability",
        "probability_lower_90",
        "efi",
        "shift_of_tails",
        "forecast_confidence",
        "valid_member_fraction",
    )

    def __init__(
        self,
        *,
        probability_threshold: float = 0.50,
        efi_threshold: float = 0.70,
        min_area_km2: float = 1000.0,
        min_members: int = 3,
    ) -> None:
        if not 0 <= probability_threshold <= 1 or not -1 <= efi_threshold <= 1:
            raise ValueError("Probability and EFI thresholds are outside their valid ranges")
        if min_area_km2 < 0 or min_members < 2:
            raise ValueError("Minimum area/members are invalid")
        self.probability_threshold = probability_threshold
        self.efi_threshold = efi_threshold
        self.min_area_km2 = min_area_km2
        self.min_members = min_members
        self.climatology = ClimatologyEngine(efi_threshold=efi_threshold, min_cluster_size_km2=min_area_km2)

    @staticmethod
    def shift_of_tails(
        ensemble: np.ndarray,
        climate_quantiles: np.ndarray,
        probabilities: np.ndarray,
        tail: Tail = "upper",
    ) -> np.ndarray:
        """ECMWF-style SOT using forecast p90 and climate p90/p99 (or p10/p1).

        Positive values mean the ensemble tail extends beyond the model-climate
        extreme.  Values are unbounded and clipped only for numerical safety.
        """
        probabilities = np.asarray(probabilities, dtype=np.float64)
        if tail not in ("upper", "lower"):
            raise ValueError("tail must be 'upper' or 'lower'")
        required = (0.90, 0.99) if tail == "upper" else (0.10, 0.01)
        climate = [
            np.apply_along_axis(lambda column: np.interp(level, probabilities, column), 0, climate_quantiles)
            for level in required
        ]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            forecast_q = np.nanquantile(ensemble, required[0], axis=0)
        if tail == "upper":
            denominator = climate[1] - climate[0]
            score = (forecast_q - climate[1]) / denominator
        else:
            denominator = climate[0] - climate[1]
            score = (climate[1] - forecast_q) / denominator
        return np.where(denominator > 1e-8, np.clip(score, -10, 10), np.nan).astype(np.float32)

    def analyze(
        self,
        ensemble: np.ndarray,
        climate_quantiles: np.ndarray,
        quantile_probabilities: np.ndarray,
        lats: np.ndarray,
        lons: np.ndarray,
        *,
        threshold: float,
        variable: str,
        units: str,
        tail: Tail = "upper",
        calibration: dict[str, Any] | None = None,
    ) -> EnsembleResult:
        ensemble = np.asarray(ensemble, dtype=np.float64)
        climate_quantiles = np.asarray(climate_quantiles, dtype=np.float64)
        probabilities = np.asarray(quantile_probabilities, dtype=np.float64)
        lats, lons = np.asarray(lats, dtype=np.float64), np.asarray(lons, dtype=np.float64)
        if ensemble.ndim != 3 or climate_quantiles.ndim != 3:
            raise ValueError("Expected ensemble [member,y,x] and climate [quantile,y,x]")
        if ensemble.shape[0] < self.min_members:
            raise ValueError(f"At least {self.min_members} ensemble members are required")
        if ensemble.shape[1:] != climate_quantiles.shape[1:]:
            raise ValueError("Forecast and climate grids must match")
        if probabilities.shape != (climate_quantiles.shape[0],):
            raise ValueError("One probability is required per climate quantile")
        if np.any(np.diff(probabilities) <= 0) or probabilities[0] <= 0 or probabilities[-1] >= 1:
            raise ValueError("Climate probabilities must increase strictly inside (0,1)")
        _validate_coordinates(lats, lons, ensemble.shape[1:])

        valid = np.isfinite(ensemble)
        trials = valid.sum(axis=0)
        high = ensemble >= threshold if tail == "upper" else ensemble <= threshold
        hits = (high & valid).sum(axis=0)
        raw_probability = np.divide(hits, trials, out=np.full_like(hits, np.nan, dtype=float), where=trials > 0)
        # Jeffreys posterior mean behaves sensibly for 0/M and M/M outcomes.
        probability = np.divide(hits + 0.5, trials + 1.0, out=np.full_like(hits, np.nan, dtype=float), where=trials > 0)
        probability_lower, probability_upper = _jeffreys_interval(hits, trials)

        if tail == "upper":
            efi = self.climatology.compute_efi(ensemble, climate_quantiles, quantile_probabilities=probabilities)
        else:
            efi = self.climatology.compute_efi(-ensemble, -climate_quantiles[::-1], quantile_probabilities=1 - probabilities[::-1])
        sot = self.shift_of_tails(ensemble, climate_quantiles, probabilities, tail)

        # Fully missing cells are intentional data-quality signals, not runtime
        # failures.  They stay NaN in the feature cube.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            mean = np.nanmean(ensemble, axis=0)
            std = np.nanstd(ensemble, axis=0)
            p10, p50, p90 = np.nanquantile(ensemble, (0.10, 0.50, 0.90), axis=0)
        entropy = -(probability * np.log2(np.clip(probability, 1e-8, 1))
                    + (1 - probability) * np.log2(np.clip(1 - probability, 1e-8, 1)))
        agreement = 1 - entropy
        evidence_strength = np.minimum(trials / 20.0, 1.0)
        confidence = np.clip((0.65 * agreement + 0.35 * np.abs(efi)) * np.sqrt(evidence_strength), 0, 1)
        confidence = np.where(trials >= self.min_members, confidence, np.nan)
        member_fraction = trials / ensemble.shape[0]

        maps = {
            "raw_exceedance_probability": raw_probability.astype(np.float32),
            "exceedance_probability": probability.astype(np.float32),
            "probability_lower_90": probability_lower.astype(np.float32),
            "probability_upper_90": probability_upper.astype(np.float32),
            "efi": efi.astype(np.float32),
            "shift_of_tails": sot.astype(np.float32),
            "forecast_confidence": confidence.astype(np.float32),
        }
        feature_cube = np.stack((mean, std, p10, p50, p90, probability,
                                 probability_lower, efi, sot, confidence, member_fraction), axis=-1).astype(np.float32)
        footprints = self._extract_footprints(
            ensemble, maps, lats, lons, threshold=threshold, variable=variable, tail=tail,
        )
        resolution = 1.0 / ensemble.shape[0]
        evidence = {
            "probability_kind": "raw_finite_ensemble",
            "calibration_metadata": calibration,
            "calibration_status": (
                "external_metadata_supplied_not_applied" if calibration else "not_calibrated"
            ),
            "member_probability_resolution": round(resolution, 4),
            "credible_interval": "Jeffreys beta-binomial, 90%",
            "valid_cell_fraction": round(float(np.mean(trials >= self.min_members)), 4),
            "caveats": [
                "EFI/SOT require a forecast-model, season and lead-matched model climate.",
                f"With {ensemble.shape[0]} members, raw probabilities move in {resolution:.1%} increments.",
                "Confidence measures ensemble agreement and evidence volume, not forecast correctness.",
                "Calibration metadata is provenance only; this core does not silently transform probabilities.",
            ],
        }
        return EnsembleResult(variable, units, tail, float(threshold), int(ensemble.shape[0]),
                              self.FEATURE_NAMES, feature_cube, maps, footprints, evidence)

    def _extract_footprints(
        self,
        ensemble: np.ndarray,
        maps: dict[str, np.ndarray],
        lats: np.ndarray,
        lons: np.ndarray,
        *,
        threshold: float,
        variable: str,
        tail: Tail,
    ) -> list[HazardFootprint]:
        probability, efi = maps["exceedance_probability"], maps["efi"]
        mask = ((probability >= self.probability_threshold) | (efi >= self.efi_threshold)) & np.isfinite(efi)
        components, count = label(mask, structure=np.ones((3, 3), dtype=np.int8))
        areas = _cell_areas_km2(lats, lons)
        output: list[HazardFootprint] = []
        for component_id in range(1, count + 1):
            rows, cols = np.where(components == component_id)
            area = float(areas[rows, cols].sum())
            if area < self.min_area_km2:
                continue
            cell_weights = areas[rows, cols] * np.maximum(probability[rows, cols], 1e-3)
            member_peaks = np.nanmax(ensemble[:, rows, cols], axis=1) if tail == "upper" else np.nanmin(ensemble[:, rows, cols], axis=1)
            support = int(np.sum(member_peaks >= threshold) if tail == "upper" else np.sum(member_peaks <= threshold))
            peak_index = int(np.nanargmax(probability[rows, cols]))
            peak_row, peak_col = rows[peak_index], cols[peak_index]
            peak_probability = float(np.nanmax(probability[rows, cols]))
            peak_efi = float(np.nanmax(efi[rows, cols]))
            peak_confidence = float(np.nanmax(maps["forecast_confidence"][rows, cols]))
            output.append(HazardFootprint(
                footprint_id=f"ENS-{variable[:3].upper()}-{len(output)+1:03d}",
                variable=variable,
                tail=tail,
                centroid=(round(float(np.average(lats[rows], weights=cell_weights)), 4),
                          round(float(np.average(lons[cols], weights=cell_weights)), 4)),
                bounding_box=(round(float(lats[rows].min()), 4), round(float(lons[cols].min()), 4),
                              round(float(lats[rows].max()), 4), round(float(lons[cols].max()), 4)),
                area_km2=round(area, 1),
                peak_probability=round(peak_probability, 4),
                probability_lower_90=round(float(maps["probability_lower_90"][peak_row, peak_col]), 4),
                peak_efi=round(peak_efi, 4),
                peak_sot=round(float(np.nanmax(maps["shift_of_tails"][rows, cols])), 4),
                peak_intensity=round(float(np.nanmax(member_peaks) if tail == "upper" else np.nanmin(member_peaks)), 3),
                confidence=round(peak_confidence, 4),
                member_support=support,
                severity=_severity(peak_probability, peak_efi, peak_confidence),
            ))
        rank = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "SEVERE": 3}
        return sorted(output, key=lambda item: (rank[item.severity], item.peak_probability, item.area_km2), reverse=True)

    @staticmethod
    def map_features_to_spherical_mesh(
        result: EnsembleResult,
        lats: np.ndarray,
        lons: np.ndarray,
        nodes: np.ndarray,
    ) -> np.ndarray:
        """Remap all analysis channels to an icosahedral mesh for GNN input."""
        channels = [
            interpolate_grid_to_mesh(result.feature_cube[..., index], lats, lons, nodes)
            for index in range(result.feature_cube.shape[-1])
        ]
        return np.stack(channels, axis=-1).astype(np.float32)
