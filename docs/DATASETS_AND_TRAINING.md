# Data and model evidence ledger

Avarta is a research prototype for SIH 26078, **not an operational warning
system**. The distinction between an implemented module and a validated
forecast capability matters as much as the architecture.

| Component | Present state | What is missing |
| --- | --- | --- |
| NOAA GEFS rainfall replay | Five archived 0.5° members and eight 3-hour forecast frames, linked to an IMD daily grid | Multi-event validation, calibrated ensemble probabilities, full NEPS-G archive |
| Ensemble intelligence core | Upper/lower-tail EFI, Shift-of-Tails, finite-member Jeffreys intervals, confidence, geodesic footprints, spherical-mesh features, Brier/CRPS/reliability/rank/FSS verification | Lead/season/model-matched climate archive and many-case probability calibration |
| Independent observation check | CHIRPS v2 0.05° daily estimate for one case | Exact daily-window alignment and multiple dates; CHIRPS is not point-gauge truth |
| Spherical mesh/GNN | Recursive icosahedron, geometric interpolation, ensemble member attention, Earth-relative edges, temporal GRU, uncertainty and motion heads | Trained weights, globally tiled ingestion, node labels and held-out skill |
| EFI calculator | Numerical EFI integration from supplied quantiles, with missing-data checks | Matching multi-decade model-climate quantiles by season and lead; ERA5 alone is not automatically model climate |
| Downscaler | Separate deterministic residual CNN experiment on target-derived coarse IMD proxies | Independent NWP/fine-grid pairs, multi-event holdout, terrain, genuine 5 km verification |
| Diffusion / physics | Conditional DDPM with tail, FFT spectral, coarse conservation, peak and optional moisture/continuity objectives; shape/gradient/sampling tests | Independent data, event-held-out training, trained weights, baseline comparison and genuine 5 km verification |
| Alerts | Draft API response only | Calibrated thresholds, expert review, governance and dissemination authority |

The earlier `DatasetHub` storm/heatwave generators are explicitly **synthetic
fixtures** for interface and tensor-shape tests. They are not Amphan/heatwave
forecasts, radar observations, 5 km ground truth, or ERA5 climatology. Do not
quote their scores as benchmark results. `training/train_downscaler.py` is
likewise a toy synthetic training exercise; its non-negativity penalty does not
enforce Navier–Stokes or moisture continuity. The only measured model
experiment is `training/train_imd_real.py`, whose limitations and held-out
bilinear comparison are in the main [README](../README.md).

## Reproduce the independent observation check

Use the official [CHIRPS v2 daily 0.05° GeoTIFF archive](https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/2025/)
alongside the IMD annual rainfall file described in the README:

```bash
.venv/bin/python -m services.replay.august_2025
```

The script caches the source `.tif.gz` outside Git, verifies its GeoTIFF
georeference, records SHA-256 and source URL, and adds a separate CHIRPS check
to the case artifact. Forecast values are merely **bilinearly interpolated**
to the CHIRPS grid. This is neither learned downscaling nor evidence of a
5 km forecast. GEFS uses a 03–03 UTC accumulation; the exact CHIRPS daily
window has not been established here, so the comparison is descriptive.

## Ingest user-supplied archives

`NWPDatasetReader` accepts real NetCDF files, never creates atmospheric
values. Ensemble variables must have member, lead, latitude and longitude
dimensions; quantile files must have quantile, latitude and longitude
dimensions. Coordinate aliases (`number`, `step`, `lat`, `lon`, `percentile`)
are accepted. Both calls require a spatial bounding box to avoid accidental
full-global array materialization. They return source SHA-256 and source-model
metadata from the file (or `unverified_user_supplied` when absent).

```python
from services.ingestion.dataset_reader import NWPDatasetReader

reader = NWPDatasetReader()
domain = (20.0, 31.0, 69.0, 84.0)  # south, north, west, east
forecast = reader.load_ensemble_forecast("my_neps.nc", "rainfall", domain, (72, 240))
climate = reader.load_climatology_quantiles("my_model_climate.nc", "rainfall", domain)
```

These calls validate structure and provenance; they do not certify that
units, initialization/valid times, accumulation windows, grid alignment or
model-climate sampling are scientifically matched. Those checks must be
completed before feeding the arrays to the EFI calculator or training a GNN.

`models/conditional_diffusion/precip_ddpm.py` contains a functioning
conditional denoising/sampling implementation, with a tail-weighted training
objective. Its tests use random tensors strictly to verify code mechanics.
There is **no checkpoint or empirical downscaling result**; random-weight
samples must never be interpreted as weather. The only current physical
output-domain rule is nonnegative rainfall, not fluid conservation.
