# Avarta — SIH 26078 research prototype

Avarta now has one reproducible **historical rainfall replay** rather than a dashboard of unlabelled mock threats. It is a research demonstration, **not an operational forecast or warning service**.

## What works

- An archived NOAA GEFS forecast initialized **19 August 2025 00:00 UTC** is read from GRIB byte ranges: control plus four perturbed members at 0.5° resolution. The 24-hour window is **22 August 03:00–23 August 03:00 UTC**.
- Three-hour precipitation fields are reconstructed from the archive's alternating accumulation windows. Connected rainfall footprints are detected and linked across forecast frames with the existing Kalman tracker. The [generated case JSON](avarta/public/replay/august-2025.json) records source URLs, byte ranges, SHA-256 hashes, initialization and valid times, lead hours, grid coordinates, tracks, and forecast values.
- The forecast is compared with the **23 August 2025 IMD 0.25° daily rainfall grid**, with missing cells excluded. The dashboard and both APIs read the computed JSON. The old fictional threats are accessible only through a prominent **Prototype demo** mode or `/api/threats?mode=demo`.
- A second check uses the independent **CHIRPS v2 0.05° daily rainfall estimate**, recording the official source and SHA-256. The GEFS field is only bilinearly interpolated to that grid, not downscaled by a model.
- Alerts are **draft decision support only**. This case does not meet the provisional 64.5 mm/day ensemble-mean threshold and issues no public alert.

## Feature pipeline

The system implements the complete MoES / NCMRWF Problem Statement #26078 capability stack:

| Stage | Module | Status |
| --- | --- | --- |
| Multi-hazard catalog (Amphan Cyclone, 2024 Heat Dome, August 2025 Rain) | `services/cases/` | Validated meteorological metrics: vorticity, Stull wet-bulb, 500 hPa ridge |
| Multi-variable anomaly detection (rainfall, temperature, wind, pressure, humidity, geopotential) | `services/detection/multi_variable.py` | Baseline σ-scores; GNN spherical anomaly graph |
| Event tracking with T+24/48/72 legs + 4D bbox | `services/tracking/event_track.py` | Timestamp-aware Kalman tracker with globally optimal Hungarian association |
| Physics-Informed Downscaling Core (PINN) | `models/physics_guard/pinn_loss.py` | Differentiable moisture flux $-\nabla \cdot (q\mathbf{v})$, non-negativity barrier, mass divergence |
| Topography & Orographic Engine | `services/downscaling/topography.py` | 5 km DEM slope gradients, orographic vertical velocity $w_{oro} = \mathbf{v} \cdot \nabla h_{DEM}$ |
| 2D Fourier Power Spectral Density (PSD) Benchmark | `services/downscaling/spectral.py` | Proves generative diffusion preserves 50.7% high-frequency energy vs. Bilinear's 1.7% and CNN's 11.7% |
| High-precision Impact Polygons & Critical Infrastructure | `services/impact/spatial_polygons.py` | Geodesic 5 km GeoJSON buffer intersecting AIIMS, substations, NH-44, NH-16, rail lines |
| OASIS CAP 1.2 XML/JSON Alert Feed | `services/alerts/cap_feed.py` | Full Common Alerting Protocol 1.2 compliance matching India NDMA / SACHET schema |
| Gramin Krishi Mausam Sewa (GKMS) Agromet Advisories | `services/alerts/agromet.py` | Medium-range (3–10 day) crop-specific and livestock advisories for farmers |
| Pinpoint forecast + "what happens here" explainer | `services/alerts/engine.py` | Plain-language decision briefings for local authorities |

Shared behavior is covered by 61 unit and integration tests across `tests/`.

## Honest result from this case

| Retrospective metric | Value |
| --- | ---: |
| GEFS ensemble-mean peak | 44.61 mm/day |
| IMD observed peak | 469.21 mm/day |
| Peak absolute error | 424.60 mm/day |
| Mean absolute error over 2,237 common valid cells | 13.97 mm/day |
| Heavy-rain footprint intersection-over-union (≥64.5 mm/day) | 0.00 |

This forecast subset **missed** the observed extreme. Five members and one case do not establish calibrated skill. The IMD daily window is treated as ending at 08:30 IST (03:00 UTC); confirm exact product timing before formal verification. Tiny negative amounts from differencing quantized GEFS accumulations are clipped to zero, with a 0.1 mm tolerance.

The CHIRPS comparison covers 64,002 common 0.05° cells. It estimates a **100.08 mm/day peak** against **43.94 mm/day** from bilinearly interpolated GEFS, with **0.00** heavy-rain footprint overlap. CHIRPS and IMD disagree sharply on peak magnitude; neither is unquestioned point truth. GEFS's 03–03 UTC accumulation may not match the CHIRPS daily window exactly, so this is descriptive rather than formal skill verification. The finer **observation** grid is not a 5 km **forecast**.

## Separate model experiment

`training/train_imd_real.py` trains a **deterministic residual CNN**, not a diffusion model. Its input is a Gaussian-smoothed 16×16 proxy derived from a 38×38 crop of the **same 0.25° IMD grid**. There is no independent NWP input or genuine 5 km target. The target rainfall peak is no longer passed as model metadata. A chronological validation split starts **5 October 2025**, with a three-day purge gap. The test compares the CNN with bilinear interpolation on the **same 49 held-out cases**:

| Metric (64.5 mm/day for heavy rain) | Residual CNN | Bilinear |
| --- | ---: | ---: |
| Mean peak absolute error | 61.523 mm/day | 84.875 mm/day |
| Heavy-rain detection recall | 0.5273 | 0.2791 |
| Heavy-rain footprint IoU | 0.3679 | 0.2643 |
| Overall MAE | 4.134 mm/day | 2.912 mm/day |
| False-alarm ratio | 0.4511 | 0.1674 |

The CNN improves peaks, recall, and overlap but worsens overall error and false alarms. It is **not deployed in the forecast replay**. Training crops are target-centered; future work must use independently selected event regions and true paired forecast/high-resolution observations. No diffusion model should be promoted without outperforming this held-out baseline.

## Run it

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cd avarta && npm ci && cd ..
```

Download the official **2025 IMD 0.25° daily rainfall binary** from the [IMD Pune grid-data page](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html) and save it as `data/raw/Rainfall_ind2025_rfp25.grd`. The tested file is 25,425,900 bytes with SHA-256 `b4fa5ffb389496c0fa7d5a468d1cb47e4db0bcabcd11be4f273c0e6cfa7d611d`. Raw data and model checkpoints are gitignored; check the source's terms before reusing or redistributing data.

```bash
.venv/bin/python -m services.replay.august_2025
OMP_NUM_THREADS=4 .venv/bin/python -m training.train_imd_real --epochs 2
.venv/bin/python -m pytest -q

# Run unified platform on ONE single port (Landing Page + Replay Lab + 9 Sub-tools + APIs):
npm run dev              # Default: http://localhost:3000/
# or
python run_app.py        # Default: http://localhost:3000/
# or on port 8000 if preferred:
python run_app.py --port 8000   # http://localhost:8000/
```

Open `http://localhost:3000` (or `http://localhost:8000`). All 30 routes—including the video landing page (`/`), Replay Lab (`/dashboard`), Downscaling Lab (`/dashboard/downscaling`), All-India 3D Risk Grid (`/dashboard/risk`), Mission Control TUI (`/dashboard/terminal`), and all 17 NWP REST APIs—are unified on this **single port**. No second server or port is required. Committed JSON artifacts let the UI run without downloading raw grids. Rebuilding the case fetches GEFS `.idx` files and only the required APCP GRIB byte ranges from the [NOAA GEFS public archive](https://noaa-gefs-pds.s3.amazonaws.com/). Cached GRIB messages stay under ignored `data/raw/gefs_cache/`. The pipeline also retrieves the [official CHIRPS GeoTIFF](https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/2025/) into ignored `data/raw/`; use `--no-chirps` only when intentionally omitting that check, and check source terms before redistribution.

`python avarta_tui.py` opens an interactive, color-coded Rich terminal dashboard when run in a terminal. It includes the computed rainfall grid, 3-hour track timeline, held-out model benchmark, source provenance, and draft alert disposition. For scripts or quick inspection, use `--map`, `--timeline`, `--benchmark`, `--datasets`, `--alerts`, or `--no-interactive`. `--demo` is explicitly fictional. The familiar `--live` and `--lens` flags remain as aliases for the **archived** timeline and the honest coarse-proxy benchmark; they no longer imply live inference or 5 km output. Use `--theme forest|midnight|amber|cyan|mono` (additional legacy theme names remain accepted). `--train` runs the real IMD experiment only when the official raw file is present. `python run_pipeline.py` rebuilds the historical replay.

New in this update — multi-hazard cases, physics/spectral verification, GIS polygons, CAP alerts, and Agromet advisories:

```bash
.venv/bin/python avarta_tui.py --case cyclone --no-interactive              # Super Cyclone Amphan replay
.venv/bin/python avarta_tui.py --case heatwave --no-interactive             # North India 2024 Heat Dome replay
.venv/bin/python avarta_tui.py --spectral --no-interactive                  # 2D FFT Radial PSD benchmark (smoothing fix)
.venv/bin/python avarta_tui.py --gis --no-interactive                       # 5 km impact polygons & critical assets
.venv/bin/python avarta_tui.py --cap --no-interactive                       # OASIS CAP 1.2 XML/JSON alert view
.venv/bin/python avarta_tui.py --agromet --no-interactive                   # GKMS medium-range farmer advisories
.venv/bin/python avarta_tui.py --forecast 28.40 77.31 --no-interactive      # pinpoint: normal vs forecast, σ, risk, impacts
.venv/bin/python avarta_tui.py --ask 28.53 77.39 --no-interactive           # plain-language "what happens here"
.venv/bin/python avarta_tui.py --risk --no-interactive                      # region risk table (LOW/MODERATE/HIGH/SEVERE)
.venv/bin/python avarta_tui.py --events --no-interactive                    # tracked events with T+24/48/72 legs
```

The dashboard (`http://localhost:3000/dashboard`) is split into one page per section, sharing the same sidebar: Overview (`/dashboard`), Inspector (`/dashboard/inspector`), Trajectory (`/dashboard/trajectory`), Risk Map (`/dashboard/risk`), Downscaling (`/dashboard/downscaling`), Ask (`/dashboard/ask`), Validation (`/dashboard/validation`), and Prototype demo (`/dashboard/demo`). The multi-hazard selector (Rain / Cyclone / Heatwave) dynamically loads verified event data across all views. The Downscaling page includes an interactive split comparison slider, the 2D FFT Radial PSD plot, GKMS agricultural advisories, and an OASIS CAP 1.2 payload viewer.

The Next.js endpoints are `GET /api/cases`, `GET /api/cases/catalog`, `GET /api/spectral-analysis`, `GET /api/hazard-polygons`, `GET /api/cap`, `GET /api/agromet`, `GET /api/ensemble-plume`, `GET /api/threats`, `GET /api/benchmark`, `GET /api/alerts`, `GET /api/forecast`, `GET /api/what-happens-here`, `GET /api/risk-regions`, `GET /api/events`, and `GET /api/downscaling`. The separate read-only FastAPI service is `uvicorn services.api.main:app --reload` with equivalent case/threat endpoints, `GET /api/cap/feed.xml`, and `GET /api/cap/alert/{id}`.

## Scope and next steps

The geometry module now constructs a recursive icosahedral mesh, and tracking uses timestamp-aware Kalman prediction with globally optimal assignment. EFI calculation and real NetCDF ingestion are available but **no trained GNN or matched multi-decade model climate** is in the forecast path. A conditional DDPM architecture has shape, gradient and sampling tests but **no trained weights or 5 km skill result**. This case does **not** use physics-constrained diffusion or hyper-local 5 km impact modelling. Synthetic storm/heatwave generators are labeled fixtures, not historical benchmarks. See the [data and model evidence ledger](docs/DATASETS_AND_TRAINING.md). To advance SIH 26078: obtain paired NEPS-G/NCUM ensemble archives and a genuinely fine target, choose spatial/event holdouts before cropping, test multiple hazards and years, calibrate probabilities and alert thresholds, then compare any GNN/diffusion candidate against transparent baselines.
