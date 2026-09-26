"""Explicit NetCDF ingestion for user-supplied ensemble and climate archives.

No synthetic values or fabricated source labels are produced here. NCMRWF and
ERA5 access is external; this adapter validates files after they are obtained.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr


DIM_ALIASES = {
    "member": ("member", "number", "ensemble_member"),
    "lead": ("lead", "step", "forecast_hour"),
    "latitude": ("latitude", "lat"),
    "longitude": ("longitude", "lon"),
    "quantile": ("quantile", "percentile"),
}


def _rename_dimensions(array: xr.DataArray, required: tuple[str, ...]) -> xr.DataArray:
    replacements = {}
    for standard in required:
        found = [name for name in DIM_ALIASES[standard] if name in array.dims]
        if len(found) != 1:
            raise ValueError(f"Expected one {standard} dimension; found {array.dims}")
        if found[0] != standard:
            replacements[found[0]] = standard
    return array.rename(replacements)


def _digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


class NWPDatasetReader:
    """Load small, explicit spatial subsets; no implicit global materialization."""

    def load_ensemble_forecast(
        self, path: str | Path, variable: str,
        domain: tuple[float, float, float, float],
        lead_hours: tuple[float, float] | None = None,
    ) -> dict[str, Any]:
        source = Path(path)
        if not source.is_file():
            raise FileNotFoundError(source)
        with xr.open_dataset(source) as dataset:
            if variable not in dataset:
                raise KeyError(f"{variable} absent from {source}")
            array = _rename_dimensions(dataset[variable],
                                       ("member", "lead", "latitude", "longitude"))
            if set(array.dims) != {"member", "lead", "latitude", "longitude"}:
                raise ValueError("Select or remove extra dimensions before ingestion")
            south, north, west, east = domain
            if south >= north or west >= east:
                raise ValueError("Invalid spatial domain")
            latitudes = array.latitude.values
            longitudes = array.longitude.values
            array = array.isel(
                latitude=np.flatnonzero((latitudes >= south) & (latitudes <= north)),
                longitude=np.flatnonzero((longitudes >= west) & (longitudes <= east)),
            )
            if lead_hours is not None:
                leads = array.lead.values
                if np.issubdtype(leads.dtype, np.timedelta64):
                    leads = leads / np.timedelta64(1, "h")
                array = array.isel(lead=np.flatnonzero((leads >= lead_hours[0]) & (leads <= lead_hours[1])))
            if 0 in array.shape:
                raise ValueError("Selection contains no forecast cells")
            array = array.transpose("member", "lead", "latitude", "longitude").load()
            data = np.asarray(array.values, dtype=np.float32)
            return {
                "variable": variable,
                "units": array.attrs.get("units", "unknown"),
                "data": data,
                "members": np.asarray(array.member.values).tolist(),
                "leads": np.asarray(array.lead.values).astype(str).tolist(),
                "lats": np.asarray(array.latitude.values, dtype=np.float32),
                "lons": np.asarray(array.longitude.values, dtype=np.float32),
                "source_file": str(source),
                "source_sha256": _digest(source),
                "source_model": dataset.attrs.get("source_model", "unverified_user_supplied"),
            }

    def load_climatology_quantiles(
        self, path: str | Path, variable: str,
        domain: tuple[float, float, float, float],
    ) -> dict[str, Any]:
        source = Path(path)
        if not source.is_file():
            raise FileNotFoundError(source)
        with xr.open_dataset(source) as dataset:
            if variable not in dataset:
                raise KeyError(f"{variable} absent from {source}")
            array = _rename_dimensions(dataset[variable],
                                       ("quantile", "latitude", "longitude"))
            if set(array.dims) != {"quantile", "latitude", "longitude"}:
                raise ValueError("Select calendar day, lead and season before ingestion")
            south, north, west, east = domain
            latitudes, longitudes = array.latitude.values, array.longitude.values
            array = array.isel(
                latitude=np.flatnonzero((latitudes >= south) & (latitudes <= north)),
                longitude=np.flatnonzero((longitudes >= west) & (longitudes <= east)),
            )
            if 0 in array.shape:
                raise ValueError("Selection contains no climatology cells")
            array = array.transpose("quantile", "latitude", "longitude").load()
            probabilities = np.asarray(array["quantile"].values, dtype=np.float64)
            if probabilities.max() > 1:
                probabilities /= 100
            if np.any(np.diff(probabilities) <= 0) or probabilities[0] <= 0 or probabilities[-1] >= 1:
                raise ValueError("Quantile coordinates must increase within (0, 1)")
            return {
                "variable": variable,
                "units": array.attrs.get("units", "unknown"),
                "quantiles": np.asarray(array.values, dtype=np.float32),
                "probabilities": probabilities,
                "lats": np.asarray(array.latitude.values, dtype=np.float32),
                "lons": np.asarray(array.longitude.values, dtype=np.float32),
                "source_file": str(source),
                "source_sha256": _digest(source),
                "source_model": dataset.attrs.get("source_model", "unverified_user_supplied"),
                "baseline_period": dataset.attrs.get("baseline_period", "unspecified"),
            }
