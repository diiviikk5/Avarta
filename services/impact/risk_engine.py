"""Risk scoring + hyper-local impact estimates (Phase 4).

Risk Score (0-100) =
    rainfall anomaly + wind anomaly + temperature anomaly
    + historical extremeness + forecast uncertainty.

Bands: 0-30 LOW, 30-60 MODERATE, 60-80 HIGH, 80-100 SEVERE.
The ~5 km impact radius is provisional draft decision support: a single
uncalibrated case cannot justify evacuation or public warning language.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

RISK_WEIGHTS = {
    "rainfall_sigma": 0.30,
    "wind_sigma": 0.25,
    "temperature_sigma": 0.15,
    "historical_extremeness": 0.15,  # 0..1 percentile distance, e.g. p99 -> 0.99
    "forecast_uncertainty": 0.15,  # 0..1 ensemble spread proxy
}


def classify_risk(score: float) -> str:
    if score >= 80:
        return "SEVERE"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def _clip01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def sigma_to_unit(sigma: float, scale: float = 6.0) -> float:
    """Map |sigma| 0..scale onto 0..1."""
    if sigma is None:
        return 0.0
    try:
        magnitude = abs(float(sigma))
    except (TypeError, ValueError):
        return 0.0
    if magnitude != magnitude:  # NaN
        return 0.0
    return _clip01(magnitude / scale)


def compute_risk_score(
    rainfall_sigma: float = 0.0,
    wind_sigma: float = 0.0,
    temperature_sigma: float = 0.0,
    historical_percentile: float = 50.0,
    ensemble_spread_norm: float = 0.5,
) -> Dict[str, object]:
    """Return score, band and component breakdown."""
    components = {
        "rainfall_sigma": sigma_to_unit(rainfall_sigma),
        "wind_sigma": sigma_to_unit(wind_sigma),
        "temperature_sigma": sigma_to_unit(temperature_sigma),
        "historical_extremeness": _clip01((historical_percentile - 50.0) / 50.0),
        "forecast_uncertainty": _clip01(ensemble_spread_norm),
    }
    score = round(sum(components[k] * w for k, w in RISK_WEIGHTS.items()) * 100, 1)
    band = classify_risk(score)
    return {"score": score, "band": band, "components": {k: round(v, 3) for k, v in components.items()}}


@dataclass
class LocalImpact:
    location_name: str
    latitude: float
    longitude: float
    risk_score: float
    risk_band: str
    rainfall_mm: float
    anomaly_sigma: float
    forecast_hours: int
    confidence: float
    risk_radius_km: float
    window_label: str
    potential_impacts: List[str]
    color: str

    def to_dict(self) -> dict:
        return {
            "location": self.location_name,
            "latitude": round(self.latitude, 3),
            "longitude": round(self.longitude, 3),
            "risk_score": self.risk_score,
            "risk_band": self.risk_band,
            "rainfall_mm": round(float(self.rainfall_mm), 1),
            "anomaly_sigma": round(float(self.anomaly_sigma), 2),
            "forecast_hours": self.forecast_hours,
            "confidence": round(float(self.confidence), 2),
            "risk_radius_km": self.risk_radius_km,
            "window_label": self.window_label,
            "potential_impacts": self.potential_impacts,
            "color": self.color,
        }


BAND_COLORS = {"LOW": "🟢", "MODERATE": "🟡", "HIGH": "🟠", "SEVERE": "🔴"}


def impacts_for_rainfall(rainfall_mm: float, band: str) -> List[str]:
    if band == "SEVERE" or rainfall_mm >= 140:
        return ["Urban flooding", "Road waterlogging", "Drainage overflow", "Flash-flood risk in low-lying areas"]
    if band == "HIGH" or rainfall_mm >= 80:
        return ["Flash flooding in drains", "Waterlogging", "Traffic disruption"]
    if band == "MODERATE" or rainfall_mm >= 35:
        return ["Local waterlogging in low areas", "Slippery roads"]
    return ["No significant impact expected"]


def build_local_impact(
    location_name: str,
    latitude: float,
    longitude: float,
    rainfall_mm: float,
    anomaly_sigma: float,
    wind_sigma: float = 0.0,
    temperature_sigma: float = 0.0,
    historical_percentile: float = 90.0,
    ensemble_spread_norm: float = 0.5,
    forecast_hours: int = 12,
    confidence: float = 0.7,
    window_label: str = "next 6–12 hours",
) -> LocalImpact:
    risk = compute_risk_score(
        rainfall_sigma=anomaly_sigma,
        wind_sigma=wind_sigma,
        temperature_sigma=temperature_sigma,
        historical_percentile=historical_percentile,
        ensemble_spread_norm=ensemble_spread_norm,
    )
    band = str(risk["band"])
    return LocalImpact(
        location_name=location_name,
        latitude=float(latitude),
        longitude=float(longitude),
        risk_score=float(risk["score"]),
        risk_band=band,
        rainfall_mm=float(rainfall_mm),
        anomaly_sigma=float(anomaly_sigma),
        forecast_hours=int(forecast_hours),
        confidence=float(confidence),
        risk_radius_km=5.0,
        window_label=window_label,
        potential_impacts=impacts_for_rainfall(float(rainfall_mm), band),
        color=BAND_COLORS[band],
    )
