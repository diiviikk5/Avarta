"""
Avarta Global Extreme Forecast Index (EFI) & Anomaly Detection Engine
Computes spatial deviations against 30-year ERA5 historical climatology distributions.
Formula:
  EFI = (2 / π) * ∫_0^1 [p - F_forecast(Q_clim(p))] / sqrt(p*(1-p)) dp
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class AnomalyRegion:
    region_id: str
    variable: str
    centroid_lat: float
    centroid_lon: float
    bounding_box: Tuple[float, float, float, float]  # (min_lat, min_lon, max_lat, max_lon)
    max_efi: float
    mean_efi: float
    p_value: float
    z_score: float
    climatology_percentile: float

class ClimatologyEngine:
    """
    Computes ensemble EFI and identifies high-risk spatio-temporal contiguous clusters.
    """
    def __init__(self, efi_threshold: float = 0.75, min_cluster_size_km2: float = 2500.0):
        self.efi_threshold = efi_threshold
        self.min_cluster_size_km2 = min_cluster_size_km2

    def compute_efi(
        self,
        ensemble_forecasts: np.ndarray,
        climatology_quantiles: np.ndarray,
        num_integration_steps: int = 100
    ) -> np.ndarray:
        """
        Calculates EFI across grid points given ensemble forecasts and climatology quantiles.
        Args:
            ensemble_forecasts: Shape [E, H, W] - E ensemble members (e.g. 50 members)
            climatology_quantiles: Shape [Q, H, W] - Q percentiles (e.g. 1% to 99%)
            num_integration_steps: Discretization intervals for integral [0, 1]
        Returns:
            efi_map: Shape [H, W] with values in [-1.0, 1.0]
        """
        E, H, W = ensemble_forecasts.shape
        p_vals = np.linspace(0.01, 0.99, num_integration_steps)
        efi_accum = np.zeros((H, W), dtype=np.float32)

        # Vectorized empirical CDF calculation
        # For each quantile p, evaluate fraction of ensemble <= Q_clim(p)
        for p in p_vals:
            # Linear interpolation of climatology at percentile p
            q_idx = int(p * (climatology_quantiles.shape[0] - 1))
            q_thresh = climatology_quantiles[q_idx]  # [H, W]

            # F_f(Q_c(p)): fraction of ensemble members less than or equal to threshold
            f_f = np.mean(ensemble_forecasts <= q_thresh, axis=0)  # [H, W]

            weight = 1.0 / np.sqrt(p * (1.0 - p))
            efi_accum += (p - f_f) * weight

        # Multiply by normalization factor (2 / pi) * dp
        dp = p_vals[1] - p_vals[0]
        efi_map = (2.0 / np.pi) * efi_accum * dp
        return np.clip(efi_map, -1.0, 1.0)

    def compute_z_scores(
        self,
        forecast_mean: np.ndarray,
        climatology_mean: np.ndarray,
        climatology_std: np.ndarray,
        epsilon: float = 1e-6
    ) -> np.ndarray:
        """
        Computes standardized anomalies: Z = (X - μ_clim) / σ_clim
        """
        return (forecast_mean - climatology_mean) / (climatology_std + epsilon)

    def extract_extreme_anomalies(
        self,
        efi_map: np.ndarray,
        z_score_map: np.ndarray,
        lats: np.ndarray,
        lons: np.ndarray,
        variable_name: str = "precipitation_flux"
    ) -> List[AnomalyRegion]:
        """
        Identifies connected components where EFI exceeds threshold and groups them into anomaly regions.
        """
        H, W = efi_map.shape
        mask = (efi_map >= self.efi_threshold) & (z_score_map >= 2.0)
        
        # Simple connected cluster extractor without external heavy dependencies
        visited = np.zeros_like(mask, dtype=bool)
        clusters = []

        for r in range(H):
            for c in range(W):
                if mask[r, c] and not visited[r, c]:
                    # BFS component search
                    component = []
                    queue = [(r, c)]
                    visited[r, c] = True

                    while queue:
                        curr_r, curr_c = queue.pop(0)
                        component.append((curr_r, curr_c))

                        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                            nr, nc = curr_r + dr, curr_c + dc
                            if 0 <= nr < H and 0 <= nc < W:
                                if mask[nr, nc] and not visited[nr, nc]:
                                    visited[nr, nc] = True
                                    queue.append((nr, nc))

                    if len(component) >= 4:  # Minimum grid cell size
                        clusters.append(component)

        results = []
        for idx, cluster in enumerate(clusters):
            coords_r = [pt[0] for pt in cluster]
            coords_c = [pt[1] for pt in cluster]

            cluster_lats = [lats[r] for r in coords_r]
            cluster_lons = [lons[c] for c in coords_c]
            cluster_efis = [efi_map[r, c] for r, c in cluster]
            cluster_zs = [z_score_map[r, c] for r, c in cluster]

            centroid_lat = float(np.mean(cluster_lats))
            centroid_lon = float(np.mean(cluster_lons))
            bbox = (
                float(min(cluster_lats)),
                float(min(cluster_lons)),
                float(max(cluster_lats)),
                float(max(cluster_lons)),
            )

            max_efi = float(np.max(cluster_efis))
            mean_efi = float(np.mean(cluster_efis))
            mean_z = float(np.mean(cluster_zs))

            results.append(
                AnomalyRegion(
                    region_id=f"ANOM-{variable_name[:3].upper()}-{idx+1:03d}",
                    variable=variable_name,
                    centroid_lat=centroid_lat,
                    centroid_lon=centroid_lon,
                    bounding_box=bbox,
                    max_efi=round(max_efi, 3),
                    mean_efi=round(mean_efi, 3),
                    p_value=float(round(1.0 - (1.0 / (1.0 + np.exp(mean_z - 3.0))), 4)),
                    z_score=round(mean_z, 2),
                    climatology_percentile=round(float(np.clip(95.0 + mean_z * 1.5, 95.0, 99.99)), 2),
                )
            )

        return results
