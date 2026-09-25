"""
IMD Pune High-Resolution Gridded Binary (.grd) Dataset Parser
Directly ingests India Meteorological Department (IMD) daily 0.25° x 0.25° gridded rainfall data.
File structure:
- 129 latitude points (6.5°N to 38.5°N, step 0.25°)
- 135 longitude points (66.5°E to 100.0°E, step 0.25°)
- 365 daily float32 slices (69,660 bytes / day)
- Missing / sea value: -999.0
"""

import os
import sys
import numpy as np
from typing import Dict, List, Any, Tuple, Optional

# Grid geometry for IMD 0.25° gridded product
LATS_IMD = np.linspace(6.5, 38.5, 129, dtype=np.float32)
LONS_IMD = np.linspace(66.5, 100.0, 135, dtype=np.float32)


class IMDGriddedParser:
    def __init__(self, filepath: str = "data/raw/Rainfall_ind2025_rfp25.grd"):
        self.filepath = filepath
        self.lats = LATS_IMD
        self.lons = LONS_IMD
        self.raw_data: Optional[np.ndarray] = None
        self._load_data()

    def _load_data(self):
        if not os.path.exists(self.filepath):
            # Check Downloads directory fallback
            user_home = os.path.expanduser("~")
            fallback = os.path.join(user_home, "Downloads", "Rainfall_ind2025_rfp25.grd")
            if os.path.exists(fallback):
                self.filepath = fallback

        if os.path.exists(self.filepath):
            # 365 days x 129 lats x 135 lons = 6,356,475 float32
            raw = np.fromfile(self.filepath, dtype=np.float32)
            self.raw_data = raw.reshape(-1, 129, 135)
        else:
            raise FileNotFoundError(f"IMD Gridded file not found at {self.filepath}")

    def get_summary(self) -> Dict[str, Any]:
        """Returns statistics on the real 2025 IMD rainfall records."""
        if self.raw_data is None:
            return {}

        valid_mask = self.raw_data != -999.0
        valid_vals = self.raw_data[valid_mask]

        # Find top 5 extreme deluge days
        daily_peaks = []
        for day_idx in range(self.raw_data.shape[0]):
            day_slice = self.raw_data[day_idx]
            v_slice = day_slice[day_slice != -999.0]
            if len(v_slice) > 0:
                p_max = float(np.max(v_slice))
                daily_peaks.append((day_idx, p_max))

        daily_peaks.sort(key=lambda x: x[1], reverse=True)
        top_events = []
        for day_idx, p_max in daily_peaks[:5]:
            # Locate peak coordinate
            day_slice = self.raw_data[day_idx].copy()
            day_slice[day_slice == -999.0] = -1.0
            r, c = np.unravel_index(np.argmax(day_slice), day_slice.shape)
            top_events.append({
                "day_of_year": day_idx + 1,
                "peak_rainfall_mm": round(p_max, 2),
                "lat": round(float(self.lats[r]), 2),
                "lon": round(float(self.lons[c]), 2)
            })

        return {
            "source_file": self.filepath,
            "total_days": int(self.raw_data.shape[0]),
            "grid_dimensions": f"{len(self.lats)} lats × {len(self.lons)} lons",
            "coverage_region": f"6.5°N - 38.5°N, 66.5°E - 100.0°E (All India)",
            "all_time_peak_mm": round(float(np.max(valid_vals)), 2),
            "annual_mean_rainfall_mm": round(float(np.mean(valid_vals)), 2),
            "top_extreme_deluge_days": top_events
        }

    def extract_extreme_training_crops(
        self,
        min_peak_mm: float = 80.0,
        crop_size: int = 38
    ) -> List[Dict[str, np.ndarray]]:
        """
        Extracts localized bounding box crops centered around actual extreme cloudbursts/rainfall
        recorded in India during 2025, ideal for training the downscaling diffusion core.
        """
        crops = []
        if self.raw_data is None:
            return crops

        half = crop_size // 2

        for day_idx in range(self.raw_data.shape[0]):
            day_grid = self.raw_data[day_idx].copy()
            # Clean missing values
            valid = day_grid != -999.0
            if not np.any(valid):
                continue
            
            day_grid[~valid] = 0.0
            max_val = np.max(day_grid)

            if max_val >= min_peak_mm:
                # Find centroid of max rainfall
                r_max, c_max = np.unravel_index(np.argmax(day_grid), day_grid.shape)

                # Clamp crop indices
                r_start = max(0, min(len(self.lats) - crop_size, r_max - half))
                c_start = max(0, min(len(self.lons) - crop_size, c_max - half))

                fine_target = day_grid[r_start:r_start+crop_size, c_start:c_start+crop_size]

                # Create coarse 12 km simulated NWP field via Gaussian smoothing + subsampling
                from scipy.ndimage import gaussian_filter, zoom
                coarse_sim = gaussian_filter(fine_target, sigma=2.0)
                coarse_16 = zoom(coarse_sim, 16.0 / crop_size, order=1).astype(np.float32)

                crops.append({
                    "day_idx": day_idx,
                    "lat_center": float(self.lats[r_max]),
                    "lon_center": float(self.lons[c_max]),
                    "peak_mm": float(max_val),
                    "fine_target_5km": fine_target.astype(np.float32),
                    "coarse_12km": coarse_16.astype(np.float32)
                })

        return crops
