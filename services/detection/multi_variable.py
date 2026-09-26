"""Multi-variable extreme weather anomaly detection (Phase 1).

Baseline approach for SIH 26078: compare forecast fields against historical
climatology distributions per variable, then combine into one anomaly score.

Variables: rainfall, temperature, wind_speed, pressure, humidity,
geopotential_height. The GNN in models/spherical_gnn remains the advanced
research path; this module is the demonstrable baseline that already feeds
risk scoring, tracking and alerts.

Honesty: sigma/EFI values are only as good as the supplied climatology.
No calibrated probability is claimed here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np

SUPPORTED_VARIABLES = (
    "rainfall",
    "temperature",
    "wind_speed",
    "pressure",
    "humidity",
    "geopotential_height",
)

# Higher weight => stronger influence on the combined score.
VARIABLE_WEIGHTS = {
    "rainfall": 0.30,
    "temperature": 0.15,
    "wind_speed": 0.20,
    "pressure": 0.10,
    "humidity": 0.10,
    "geopotential_height": 0.15,
}


def sigma_score(forecast: np.ndarray, clim_mean: np.ndarray, clim_std: np.ndarray) -> np.ndarray:
    """Element-wise (forecast - mean) / std. Non-positive std yields NaN."""
    forecast = np.asarray(forecast, dtype=np.float64)
    mean = np.asarray(clim_mean, dtype=np.float64)
    std = np.asarray(clim_std, dtype=np.float64)
    if forecast.shape != mean.shape or forecast.shape != std.shape:
        raise ValueError("forecast, mean and std must share a shape")
    safe = np.where(std > 0, std, np.nan)
    with np.errstate(invalid="ignore", divide="ignore"):
        return (forecast - mean) / safe


def classify_sigma(sigma: float) -> str:
    """Single-value severity label used across dashboard, API and TUI."""
    magnitude = abs(float(sigma))
    if not np.isfinite(magnitude):
        return "UNKNOWN"
    if magnitude >= 5:
        return "EXTREME"
    if magnitude >= 3:
        return "HIGH"
    if magnitude >= 2:
        return "MODERATE"
    return "LOW"


@dataclass
class VariableAnomaly:
    variable: str
    sigma: float
    forecast_value: float
    climatology_mean: float
    label: str


@dataclass
class ExtremeDetection:
    """Point-scale detection result for one location."""

    latitude: float
    longitude: float
    variables: Dict[str, VariableAnomaly] = field(default_factory=dict)
    combined_sigma: float = 0.0
    overall_label: str = "LOW"
    is_extreme: bool = False
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "combined_sigma": round(float(self.combined_sigma), 2),
            "overall_label": self.overall_label,
            "is_extreme": bool(self.is_extreme),
            "explanation": self.explanation,
            "variables": {
                name: {
                    "sigma": round(float(v.sigma), 2) if np.isfinite(v.sigma) else None,
                    "forecast_value": round(float(v.forecast_value), 2),
                    "climatology_mean": round(float(v.climatology_mean), 2),
                    "label": v.label,
                }
                for name, v in self.variables.items()
            },
        }


def detect_point_anomaly(
    latitude: float,
    longitude: float,
    forecast_vars: Dict[str, float],
    climatology: Dict[str, tuple[float, float]],
) -> ExtremeDetection:
    """Combine per-variable sigma values into one decision.

    forecast_vars: {variable: forecast value}
    climatology: {variable: (mean, std)}
    """
    variables: Dict[str, VariableAnomaly] = {}
    weighted = 0.0
    weight_sum = 0.0
    parts: List[str] = []
    for name, value in forecast_vars.items():
        if name not in SUPPORTED_VARIABLES:
            raise ValueError(f"Unsupported variable: {name}")
        if name not in climatology:
            continue
        mean, std = climatology[name]
        sigma = float((value - mean) / std) if std and std > 0 else float("nan")
        label = classify_sigma(sigma)
        variables[name] = VariableAnomaly(
            variable=name,
            sigma=sigma,
            forecast_value=float(value),
            climatology_mean=float(mean),
            label=label,
        )
        if np.isfinite(sigma):
            weight = VARIABLE_WEIGHTS[name]
            weighted += abs(sigma) * weight
            weight_sum += weight
        parts.append(f"{name} {value:g} vs normal {mean:g} (σ={sigma:+.1f})")
    combined = float(weighted / weight_sum) if weight_sum else float("nan")
    label = classify_sigma(combined)
    is_extreme = bool(np.isfinite(combined) and combined >= 3.0)
    explanation = (
        f"Forecast at {latitude:.2f}N {longitude:.2f}E: " + "; ".join(parts)
        if parts
        else "No climatology overlap for supplied variables."
    )
    return ExtremeDetection(
        latitude=float(latitude),
        longitude=float(longitude),
        variables=variables,
        combined_sigma=combined,
        overall_label=label,
        is_extreme=is_extreme,
        explanation=explanation,
    )


def detect_grid_anomaly(
    forecast_vars: Dict[str, np.ndarray],
    climatology_mean: Dict[str, np.ndarray],
    climatology_std: Dict[str, np.ndarray],
) -> Dict[str, np.ndarray]:
    """Grid version: returns per-variable sigma maps plus combined score."""
    combined = None
    weight_sum = 0.0
    sigmas: Dict[str, np.ndarray] = {}
    for name, forecast in forecast_vars.items():
        if name not in SUPPORTED_VARIABLES:
            raise ValueError(f"Unsupported variable: {name}")
        sigma = sigma_score(forecast, climatology_mean[name], climatology_std[name])
        sigmas[name] = sigma.astype(np.float32)
        weight = VARIABLE_WEIGHTS[name]
        term = np.nan_to_num(np.abs(sigma), nan=0.0) * weight
        combined = term if combined is None else combined + term
        weight_sum += weight
    if combined is None:
        raise ValueError("No variables supplied")
    sigmas["combined_sigma"] = (combined / weight_sum).astype(np.float32)
    return sigmas
