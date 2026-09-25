"""
Avarta dataset catalog and explicitly synthetic interface fixtures.
Catalog entries are candidate external sources, not ingested or licensed data:
- IMDAA: 12 km Regional Atmospheric Reanalysis (NCMRWF / IMD)
- ERA5: 0.25° 30-Year Global Climatological Baseline (ECMWF Copernicus CDS)
- NEPS-G: 12 km NCMRWF Global Ensemble Prediction System (23 lagged members in the cited configuration)
- NCUM: 12 km Deterministic Numerical Weather Prediction (NCMRWF)
- IMD 0.25°: Gridded Daily Precipitation (IMD Pune)
- Copernicus DEM: 30m / 90m Global Digital Elevation Model
"""

import os
import sys
import json
import datetime
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

# Use xarray if available
try:
    import xarray as xr
    HAS_XARRAY = True
except ImportError:
    HAS_XARRAY = False


DATASET_CATALOG = {
    "IMDAA": {
        "full_name": "Indian Monsoon Data Assimilation and Analysis (IMDAA)",
        "agency": "NCMRWF / IMD / Met Office UK",
        "spatial_resolution": "12 km (~0.12°)",
        "temporal_range": "1979 - Present (Hourly / 3-Hourly)",
        "variables": ["u10", "v10", "t2m", "msl", "tp", "q850", "z500"],
        "access_url": "https://rds.ncmrwf.gov.in/imdaa",
        "protocol": "HTTPS / OpenDAP / NetCDF4",
        "role_in_avarta": "Candidate regional reanalysis; not ingested in this repository."
    },
    "ERA5": {
        "full_name": "ECMWF Reanalysis v5 (ERA5)",
        "agency": "ECMWF / Copernicus Climate Change Service (C3S)",
        "spatial_resolution": "31 km (0.25° × 0.25°)",
        "temporal_range": "1940 - Present (Hourly)",
        "variables": ["10m_u_component_of_wind", "10m_v_component_of_wind", "2m_temperature", "mean_sea_level_pressure", "total_precipitation", "total_column_water_vapour"],
        "access_url": "https://cds.climate.copernicus.eu/api/v2",
        "protocol": "CDS API / AWS Open Data (s3://era5-pds/) / Google Cloud (gs://gcp-public-data-arco-era5/)",
        "role_in_avarta": "Candidate model-climate baseline; no 30-year quantiles are bundled or computed here."
    },
    "NEPS-G": {
        "full_name": "NCMRWF Ensemble Prediction System - Global (NEPS-G)",
        "agency": "National Centre for Medium Range Weather Forecasting (MoES, Govt of India)",
        "spatial_resolution": "12 km (N1024)",
        "ensemble_members": 23,
        "forecast_horizon": "10 Days (240 Hours, 6-hourly)",
        "variables": ["u", "v", "t", "q", "gh", "precip_rate", "efi_index"],
        "access_url": "https://ncmrwf.gov.in/nepsg_data_portal",
        "protocol": "WMO GRIB2 / NetCDF4 Streams",
        "role_in_avarta": "Candidate forecast input; no NEPS-G archive is currently available to this project."
    },
    "NCUM": {
        "full_name": "NCMRWF Unified Model Deterministic Forecast (NCUM)",
        "agency": "NCMRWF (Ministry of Earth Sciences)",
        "spatial_resolution": "12 km Global / 4 km Regional (NCUM-R)",
        "temporal_resolution": "Hourly out to 168 Hours (7 Days)",
        "variables": ["wind_gust", "surface_pressure", "relative_humidity", "convective_available_potential_energy (CAPE)"],
        "access_url": "https://ncmrwf.gov.in/data",
        "protocol": "GRIB2 / FTP / HTTPS",
        "role_in_avarta": "Candidate deterministic input; no NCUM archive is currently available to this project."
    },
    "IMD_GRIDDED_0P25": {
        "full_name": "IMD Daily Gridded Rainfall (0.25° × 0.25°)",
        "agency": "India Meteorological Department, Pune (National Data Centre)",
        "spatial_resolution": "0.25° (~25 km)",
        "temporal_range": "1901 - Present (Daily)",
        "variables": ["rainfall_mm"],
        "access_url": "https://imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html",
        "protocol": "Binary (.grd) / GeoTIFF / NetCDF",
        "role_in_avarta": "Coarse gridded rainfall analysis used for historical replay verification; not a 5 km target."
    },
    "CHIRPS_DAILY_0P05": {
        "full_name": "CHIRPS v2 daily rainfall estimate",
        "agency": "UCSB Climate Hazards Center",
        "spatial_resolution": "0.05° (~5 km latitude spacing)",
        "variables": ["rainfall_mm"],
        "access_url": "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/",
        "protocol": "GeoTIFF.gz",
        "role_in_avarta": "Independent gridded observation check for one historical replay; not point-gauge truth.",
    },
    "COPERNICUS_DEM": {
        "full_name": "Copernicus GLO-30 / GLO-90 Digital Elevation Model",
        "agency": "European Space Agency (ESA) / Airbus",
        "spatial_resolution": "30 meters / 90 meters",
        "variables": ["elevation_meters", "slope", "aspect", "roughness"],
        "access_url": "https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model",
        "protocol": "Cloud-Optimized GeoTIFF (COG) via AWS Open Data",
        "role_in_avarta": "Potential future terrain conditioning; not yet used by a trained model."
    }
}


class DatasetHub:
    """
    Manages data ingestion, caching, and NetCDF/GRIB2 conversion for Avarta.
    """
    def __init__(self, cache_dir: str = "data/raw"):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs("data/processed", exist_ok=True)
        os.makedirs("data/benchmarks", exist_ok=True)

    def get_catalog(self) -> Dict[str, Any]:
        """Return possible external sources; only the replay path is wired today."""
        return DATASET_CATALOG

    def create_synthetic_fixture(self, event_name: str = "cyclone_amphan_2020") -> Dict[str, Any]:
        """
        Create a fictional storm/heatwave fixture for UI and shape tests only.
        These random fields must never be used as forecast/observation skill evidence.
        """
        if event_name == "cyclone_amphan_2020":
            return self._build_cyclone_amphan_benchmark()
        elif event_name == "north_india_heatwave_2022":
            return self._build_heatwave_benchmark()
        else:
            raise ValueError(f"Unknown benchmark event: {event_name}")

    def _build_cyclone_amphan_benchmark(self) -> Dict[str, Any]:
        """
        Fictional cyclone field inspired by a historical scenario, not observations.
        """
        # Coordinates grid covering Bay of Bengal & West Bengal: 10°N to 26°N, 80°E to 94°E
        H, W = 64, 64
        rng = np.random.default_rng(2020)
        lats = np.linspace(10.0, 26.0, H, dtype=np.float32)
        lons = np.linspace(80.0, 94.0, W, dtype=np.float32)

        # Hand-authored example track points; not an official best-track record.
        best_track = [
            {"time": "2020-05-16T12:00:00Z", "lat": 10.7, "lon": 86.4, "pressure_hpa": 998, "wind_kmh": 65, "stage": "DEPRESSION"},
            {"time": "2020-05-17T06:00:00Z", "lat": 11.5, "lon": 86.1, "pressure_hpa": 988, "wind_kmh": 90, "stage": "CYCLONIC_STORM"},
            {"time": "2020-05-18T00:00:00Z", "lat": 13.2, "lon": 86.3, "pressure_hpa": 940, "wind_kmh": 190, "stage": "VERY_SEVERE_CYCLONIC_STORM"},
            {"time": "2020-05-18T18:00:00Z", "lat": 14.9, "lon": 86.5, "pressure_hpa": 907, "wind_kmh": 260, "stage": "SUPER_CYCLONIC_STORM"},
            {"time": "2020-05-19T12:00:00Z", "lat": 17.4, "lon": 87.0, "pressure_hpa": 925, "wind_kmh": 215, "stage": "EXTREMELY_SEVERE_CS"},
            {"time": "2020-05-20T12:00:00Z", "lat": 21.65, "lon": 88.3, "pressure_hpa": 950, "wind_kmh": 165, "stage": "LANDFALL_SAGAR_ISLAND"},
            {"time": "2020-05-21T06:00:00Z", "lat": 24.2, "lon": 89.1, "pressure_hpa": 985, "wind_kmh": 75, "stage": "DECAY_INLAND"}
        ]

        # Generate two synthetic same-grid fields; spacing is not 12 km or 5 km.
        lat_grid, lon_grid = np.meshgrid(lats, lons, indexing="ij")
        eye_lat, eye_lon = 14.9, 86.5
        dist = np.sqrt((lat_grid - eye_lat)**2 + (lon_grid - eye_lon)**2) * 111.0  # km

        # Deliberately smoothed toy field.
        eyewall_coarse = np.exp(-((dist - 35.0)**2) / (2.0 * 25.0**2))
        wind_12km = 145.0 * eyewall_coarse + rng.uniform(5, 25, size=(H, W))

        # Sharp toy target, not ground truth.
        eyewall_5km = np.exp(-((dist - 20.0)**2) / (2.0 * 8.0**2))
        eye_calm = np.exp(-(dist**2) / (2.0 * 6.0**2))
        wind_5km = 260.0 * eyewall_5km - 180.0 * eye_calm + rng.uniform(5, 30, size=(H, W))
        wind_5km = np.clip(wind_5km, 0.0, 260.0)

        # Arbitrary fixture threshold, not an ERA5 quantile.
        era5_q99 = np.ones((H, W), dtype=np.float32) * 65.0
        efi_score = float(np.max(wind_12km) / 65.0 - 1.0)
        efi_score = min(1.0, max(-1.0, efi_score / 2.0))

        return {
            "event_id": "SYNTHETIC-AMPHAN-STYLE",
            "mode": "synthetic_fixture",
            "name": "Super Cyclonic Storm Amphan",
            "basin": "North Indian Ocean / Bay of Bengal",
            "dates": "16 May 2020 – 21 May 2020",
            "scenario_label": "hypothetical high-intensity cyclone",
            "example_min_pressure_hpa": 907.0,
            "example_max_wind_kmh": 260.0,
            "lats": lats,
            "lons": lons,
            "example_track": best_track,
            "coarse_toy_field": wind_12km.astype(np.float32),
            "fine_toy_field": wind_5km.astype(np.float32),
            "toy_threshold": era5_q99,
            "toy_score": efi_score,
            "datasets_utilized": []
        }

    def _build_heatwave_benchmark(self) -> Dict[str, Any]:
        """
        Fictional heat-dome field inspired by a historical scenario.
        """
        H, W = 48, 48
        rng = np.random.default_rng(2022)
        lats = np.linspace(20.0, 32.0, H, dtype=np.float32)
        lons = np.linspace(70.0, 85.0, W, dtype=np.float32)

        # Heat dome centered over Rajasthan / Haryana / Delhi
        lat_grid, lon_grid = np.meshgrid(lats, lons, indexing="ij")
        center_lat, center_lon = 27.5, 76.5
        dist = np.sqrt((lat_grid - center_lat)**2 + (lon_grid - center_lon)**2) * 111.0

        dome = np.exp(-(dist**2) / (2.0 * 220.0**2))
        temp_12km = 38.0 + 8.5 * dome + rng.uniform(-0.5, 0.5, (H, W))
        temp_5km = 38.0 + 11.2 * dome + rng.uniform(-0.3, 0.3, (H, W))

        return {
            "event_id": "SYNTHETIC-HEATWAVE-STYLE",
            "mode": "synthetic_fixture",
            "name": "North-Central India Extreme Heatwave Dome",
            "basin": "Indo-Gangetic Plain & Thar Desert",
            "dates": "12 May 2022 – 18 May 2022",
            "example_max_temp_c": 49.2,
            "lats": lats,
            "lons": lons,
            "coarse_toy_field": temp_12km.astype(np.float32),
            "fine_toy_field": temp_5km.astype(np.float32),
            "anomaly_zscore": +3.4,
            "datasets_utilized": []
        }

    def export_benchmark_netcdf(self, benchmark_dict: Dict[str, Any], filepath: str) -> str:
        """
        Export an explicitly synthetic fixture; never label it as observations.
        """
        if not HAS_XARRAY:
            # Save as NPZ fallback if xarray is absent
            np.savez_compressed(filepath.replace(".nc", ".npz"), **{k: v for k, v in benchmark_dict.items() if isinstance(v, (np.ndarray, list, str, float, int))})
            return filepath.replace(".nc", ".npz")

        ds = xr.Dataset(
            data_vars={
                "coarse_toy_field": (["lat", "lon"], benchmark_dict["coarse_toy_field"]),
                "fine_toy_field": (["lat", "lon"], benchmark_dict["fine_toy_field"]),
            },
            coords={
                "lat": benchmark_dict["lats"],
                "lon": benchmark_dict["lons"],
            },
            attrs={
                "title": f"Avarta synthetic fixture: {benchmark_dict['name']}",
                "mode": "synthetic_fixture",
                "event_id": benchmark_dict["event_id"],
                "dates": benchmark_dict["dates"],
                "source_models": ", ".join(benchmark_dict["datasets_utilized"]),
                "institution": "Avarta Meteorological Intelligence Core",
                "conventions": "CF-1.8"
            }
        )
        ds.to_netcdf(filepath)
        return filepath
