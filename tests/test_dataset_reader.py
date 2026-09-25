import numpy as np
import pytest
import xarray as xr

from services.ingestion.dataset_reader import NWPDatasetReader
from services.detection.climatology_engine import ClimatologyEngine


def test_reader_loads_only_real_subset_and_metadata(tmp_path):
    source = tmp_path / "ensemble.nc"
    xr.Dataset(
        {"rain": (("number", "step", "lat", "lon"),
                  np.ones((3, 2, 4, 4), dtype=np.float32), {"units": "mm"})},
        coords={"number": [0, 1, 2], "step": [72, 75],
                "lat": [19, 20, 21, 22], "lon": [69, 70, 71, 72]},
        attrs={"source_model": "unit_test"},
    ).to_netcdf(source)
    result = NWPDatasetReader().load_ensemble_forecast(source, "rain", (20, 21, 70, 71), (75, 75))
    assert result["data"].shape == (3, 1, 2, 2)
    assert result["source_model"] == "unit_test"
    assert len(result["source_sha256"]) == 64
    with pytest.raises(FileNotFoundError):
        NWPDatasetReader().load_ensemble_forecast(tmp_path / "missing.nc", "rain", (20, 21, 70, 71))


def test_climatology_reader_preserves_supplied_quantile_levels(tmp_path):
    source = tmp_path / "climate.nc"
    xr.Dataset(
        {"rain": (("percentile", "lat", "lon"),
                  np.stack([np.ones((2, 2)), np.ones((2, 2)) * 10]))},
        coords={"percentile": [10, 90], "lat": [20, 21], "lon": [70, 71]},
        attrs={"baseline_period": "synthetic_unit_test"},
    ).to_netcdf(source)
    result = NWPDatasetReader().load_climatology_quantiles(source, "rain", (20, 21, 70, 71))
    assert np.allclose(result["probabilities"], [0.1, 0.9])
    forecast = np.ones((3, 2, 2)) * 20
    efi = ClimatologyEngine().compute_efi(forecast, result["quantiles"],
                                           quantile_probabilities=result["probabilities"])
    assert (efi > 0).all()
