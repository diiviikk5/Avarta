"""Extreme Forecast Index and georeferenced anomaly components.

EFI requires quantiles from a matching, independent model-climate archive. It
must not be interpreted as a calibrated EFI when supplied arbitrary quantiles.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
from scipy.ndimage import label


@dataclass
class AnomalyRegion:
    region_id: str
    variable: str
    centroid_lat: float
    centroid_lon: float
    bounding_box: Tuple[float, float, float, float]
    max_efi: float
    mean_efi: float
    z_score: float
    area_km2: float
    # These statistics cannot be inferred from EFI or a z-score alone.
    p_value: float | None = None
    climatology_percentile: float | None = None


class ClimatologyEngine:
    def __init__(self, efi_threshold: float = 0.75,
                 min_cluster_size_km2: float = 2500.0):
        if not -1 <= efi_threshold <= 1 or min_cluster_size_km2 < 0:
            raise ValueError("Invalid EFI threshold or minimum area")
        self.efi_threshold = efi_threshold
        self.min_cluster_size_km2 = min_cluster_size_km2

    def compute_efi(self, ensemble_forecasts: np.ndarray,
                    climatology_quantiles: np.ndarray,
                    num_integration_steps: int = 100,
                    quantile_probabilities: np.ndarray | None = None) -> np.ndarray:
        """Numerically integrate 2/pi * (p - F_forecast(Q_clim(p))) / sqrt(p(1-p)).

        Inputs have shapes [member, latitude, longitude] and
        [quantile, latitude, longitude]. Missing cells return NaN. A minimum of
        two valid ensemble members is required at each point. Probabilities
        default to evenly spaced 0.01..0.99; pass explicit archive levels when
        they differ. The result is uncalibrated unless the model climate is
        appropriate for the forecast model, valid date and lead.
        """
        forecast = np.asarray(ensemble_forecasts, dtype=np.float64)
        quantiles = np.asarray(climatology_quantiles, dtype=np.float64)
        if forecast.ndim != 3 or quantiles.ndim != 3 or forecast.shape[1:] != quantiles.shape[1:]:
            raise ValueError("Expected ensemble [E,H,W] and quantiles [Q,H,W]")
        if forecast.shape[0] < 2 or quantiles.shape[0] < 2 or num_integration_steps < 3:
            raise ValueError("At least two members/quantiles and three integration steps required")
        levels = (np.linspace(0.01, 0.99, len(quantiles)) if quantile_probabilities is None
                  else np.asarray(quantile_probabilities, dtype=np.float64))
        if levels.shape != (len(quantiles),) or np.any(np.diff(levels) <= 0) or levels[0] <= 0 or levels[-1] >= 1:
            raise ValueError("Quantile probabilities must increase strictly within (0, 1)")
        valid = ((np.isfinite(forecast).sum(axis=0) >= 2)
                 & np.isfinite(quantiles).all(axis=0)
                 & (np.diff(quantiles, axis=0) >= 0).all(axis=0))
        p_grid = np.linspace(levels[0], levels[-1], num_integration_steps)
        integral = np.zeros(forecast.shape[1:], dtype=np.float64)
        previous = None
        for p in p_grid:
            upper = int(np.searchsorted(levels, p, side="right"))
            lower = max(0, min(upper - 1, len(levels) - 2))
            upper = lower + 1
            fraction = (p - levels[lower]) / (levels[upper] - levels[lower])
            threshold = quantiles[lower] * (1 - fraction) + quantiles[upper] * fraction
            member_valid = np.isfinite(forecast)
            cdf = np.sum((forecast <= threshold) & member_valid, axis=0) / np.maximum(member_valid.sum(axis=0), 1)
            integrand = (p - cdf) / np.sqrt(p * (1 - p))
            if previous is not None:
                integral += (previous + integrand) * (p_grid[1] - p_grid[0]) / 2
            previous = integrand
        result = np.clip(2 / np.pi * integral, -1.0, 1.0)
        return np.where(valid, result, np.nan).astype(np.float32)

    @staticmethod
    def compute_z_scores(forecast_mean: np.ndarray, climatology_mean: np.ndarray,
                         climatology_std: np.ndarray, epsilon: float = 1e-6) -> np.ndarray:
        std = np.asarray(climatology_std)
        return (forecast_mean - climatology_mean) / np.where(std > 0, std, np.nan)

    def extract_extreme_anomalies(self, efi_map: np.ndarray,
                                  z_score_map: np.ndarray, lats: np.ndarray,
                                  lons: np.ndarray,
                                  variable_name: str = "precipitation_flux") -> List[AnomalyRegion]:
        efi_map, z_score_map = np.asarray(efi_map), np.asarray(z_score_map)
        lats, lons = np.asarray(lats), np.asarray(lons)
        if efi_map.shape != z_score_map.shape or efi_map.shape != (len(lats), len(lons)):
            raise ValueError("Maps and coordinates must describe the same grid")
        if len(lats) < 2 or len(lons) < 2:
            raise ValueError("At least two coordinates per spatial dimension required")
        dlat = abs(float(np.median(np.diff(lats))))
        dlon = abs(float(np.median(np.diff(lons))))
        if dlat == 0 or dlon == 0:
            raise ValueError("Coordinate spacing must be nonzero")
        cell_areas = 111.195**2 * dlat * dlon * np.maximum(np.cos(np.deg2rad(lats)), 0)
        mask = np.isfinite(efi_map) & np.isfinite(z_score_map) & (efi_map >= self.efi_threshold) & (z_score_map >= 2)
        components, count = label(mask)
        regions = []
        for object_id in range(1, count + 1):
            rows, cols = np.where(components == object_id)
            area = float(np.sum(cell_areas[rows]))
            if area < self.min_cluster_size_km2:
                continue
            weights = cell_areas[rows]
            regions.append(AnomalyRegion(
                region_id=f"ANOM-{variable_name[:3].upper()}-{len(regions)+1:03d}",
                variable=variable_name,
                centroid_lat=float(np.average(lats[rows], weights=weights)),
                centroid_lon=float(np.average(lons[cols], weights=weights)),
                bounding_box=(float(lats[rows].min()), float(lons[cols].min()),
                              float(lats[rows].max()), float(lons[cols].max())),
                max_efi=round(float(efi_map[rows, cols].max()), 3),
                mean_efi=round(float(np.average(efi_map[rows, cols], weights=weights)), 3),
                z_score=round(float(np.average(z_score_map[rows, cols], weights=weights)), 2),
                area_km2=round(area, 1),
            ))
        return regions
