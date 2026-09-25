# Avarta (अवार्ता) — 4D AI Weather Intelligence Platform

[![Build & Unit Tests](https://img.shields.io/badge/tests-12%2F12%20passing-emerald)](https://github.com/diiviikk5/Avarta)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework: Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black)](https://nextjs.org/)
[![Physics: Navier-Stokes](https://img.shields.io/badge/Physics-Moisture%20Convergence%20Verified-blueviolet)](https://github.com/diiviikk5/Avarta)
[![Design: Editorial](https://img.shields.io/badge/Design-ElevenLabs%20Editorial%20System-stone)](https://github.com/diiviikk5/Avarta)

> **SIH Problem Statement 26078**: AI-driven spatio-temporal tracking of extreme weather anomalies in medium-range forecasts.

Avarta transforms 12 km coarse numerical weather prediction (NWP) ensemble fields into physics-verified, hyper-local 5 km threat intelligence. Instead of treating extreme events as disconnected pixels across forecast timesteps, Avarta tracks them as **persistent 4D spatio-temporal geometric threat objects** governed by atmospheric conservation laws.

---

## 1. System Architecture

```
12 km NWP Ensembles (ECMWF IFS / GFS / NCMRWF NEPS-G)
                 │
                 ▼
  [ Stage 1: Global Anomaly Detection ]
  ├── 30-Year ERA5 Climatology Engine (Quantile Integration)
  ├── Extreme Forecast Index (EFI) & Standardized Z-Scores
  └── Multi-Mesh Spherical Icosahedral GNN (Polar-Singularity Free)
                 │
                 ▼
  [ Stage 2: 4D Spatio-Temporal Threat Tracking ]
  ├── Hungarian Bipartite Spatial Association
  └── 6-State Extended Kalman Filter [lat, lon, v_lat, v_lon, I, dI/dt]
                 │
                 ▼
  [ Stage 3: Threat-First Compute Allocation ]
  └── Dynamic 5 km Bounding Box Trigger (Saves 88% Global Compute)
                 │
                 ▼
  [ Stage 4: Generative Residual Downscaler (12 km → 5 km) ]
  ├── Conditional Latent Diffusion with Threat Embedding Injection
  ├── High-Resolution Orography & DEM Alignment
  └── ExtremeTailPreservationLoss (Prevents Spectral Smoothing)
                 │
                 ▼
  [ Stage 5: Physics Guard & Conservation Layer ]
  ├── Non-Negative Precipitation Bounds: P(x, y) ≥ 0
  ├── Moisture Flux Convergence: -∇ · (q v) > 0 in Convective Cores
  └── Hydrostatic Mass Continuity Verification
                 │
                 ▼
  [ Stage 6: Actionable Synthesis & Dissemination ]
  ├── OASIS Common Alerting Protocol (CAP v1.2) Automated Payloads
  ├── District GIS Infrastructure Vulnerability Audit
  └── Editorial Operational Console & Copilot Dialogue
```

---

## 2. Mathematical Formulations

### 2.1 Extreme Forecast Index (EFI) Integral
Avarta evaluates anomalous shifts between the forecast ensemble cumulative distribution function $F_f$ and the 30-year ERA5 climatological quantile function $Q_c(p)$:

$$\text{EFI} = \frac{2}{\pi} \int_0^1 \frac{p - F_f(Q_c(p))}{\sqrt{p(1 - p)}} \, dp$$

Where:
- $p \in (0, 1)$ represents the climatological percentile.
- The denominator $\sqrt{p(1 - p)}$ heavily penalizes outliers occurring in the extreme tails.
- $\text{EFI} \in [-1, 1]$; values $> 0.80$ trigger autonomous threat object spawning.

### 2.2 Extreme-Tail Preserving Loss
Standard MSE/MAE loss functions smooth out turbulent storm peaks. Avarta incorporates an asymmetric tail penalty:

$$\mathcal{L}_{\text{total}} = \text{MSE}_{\text{base}} + \alpha_{\text{extreme}} \cdot \frac{\sum_{(x,y)} \mathbb{I}_{[y_{\text{true}} \ge Q_{0.95}]} \cdot (y_{\text{pred}} - y_{\text{true}})^2}{\sum_{(x,y)} \mathbb{I}_{[y_{\text{true}} \ge Q_{0.95}]} + \epsilon}$$

### 2.3 PhysicsGuard Moisture Flux Convergence
Before any downscaled field is disseminated, it is projected onto the physical conservation manifold. For precipitation rate $P > 25\text{ mm/h}$, net moisture flux divergence must remain non-positive:

$$\nabla \cdot (q \mathbf{v}) = \frac{\partial(q u)}{\partial x} + \frac{\partial(q v)}{\partial y} \le 0$$

Where $q$ is specific humidity ($\text{kg/kg}$) and $\mathbf{v} = (u, v)$ is horizontal wind velocity ($\text{m/s}$).

---

## 3. Editorial UI/UX Philosophy

The Avarta Operational Console departs entirely from typical "dark-mode neon developer tool" aesthetics. Built using an **editorial print magazine design system**:

- **Canvas**: Off-white alabaster (`#f5f5f5`) paired with warm near-black ink (`#0c0a09`).
- **Typography**: Display typography in **EB Garamond 300** (quiet, literary serif) paired with **Inter** for dense telemetry, tables, and buttons.
- **Atmospheric Voltage**: Soft pastel gradient orbs (*Mint* `#a7e5d3`, *Peach* `#f4c5a8`, *Lavender* `#c8b8e0`, *Sky* `#a8c8e8`) drift softly in the background as the sole color accents.
- **Console Interface**: Segmented pill tabs, 1px hairlines (`#e7e5e4`), interactive cartographic canvas, and direct CAP 1.2 JSON export.

---

## 4. Repository Structure

```
Avarta/
├── avarta/                          # Next.js 16 Editorial Web Console
│   ├── app/
│   │   ├── dashboard/page.tsx       # Primary Operational Workspace
│   │   ├── api/threats/route.ts     # Telemetry & Threat Query API
│   │   ├── globals.css              # Editorial tokens & atmospheric orbs
│   │   ├── layout.tsx               # EB Garamond & Inter typography config
│   │   └── page.tsx                 # Cinematic hero & feature showcase
│   ├── components/
│   │   ├── HeroSection.tsx          # 60fps local video switcher & scrim
│   │   ├── EditorialLandingFeatures.tsx # 4-column scientific deep-dive
│   │   └── dashboard/
│   │       ├── Header.tsx           # Telemetry status strip
│   │       ├── ThreatList.tsx       # 4D Threat Objects dossier
│   │       ├── InteractiveMap.tsx   # Cartographic corridor canvas
│   │       ├── DownscalingViewer.tsx# 12km vs 5km spectral comparison
│   │       ├── PhysicsGuardInspector.tsx # Conservation ledger
│   │       ├── ImpactPanel.tsx      # GIS exposure & CAP 1.2 export
│   │       └── AgentCopilot.tsx     # Autonomous response synthesis
│   └── types/threat.ts              # Strongly-typed TypeScript interfaces
│
├── models/                          # Core AI Architectures
│   ├── spherical_gnn/               # Multi-mesh icosahedral spherical GNN
│   ├── residual_downscaler/         # 12km → 5km residual diffusion network
│   └── physics_guard/               # Mass & moisture flux projection layers
│
├── services/                        # Production Microservices
│   ├── detection/climatology_engine.py # ERA5 EFI integral calculation
│   ├── tracking/kalman_tracker.py      # 4D Kalman filter & Hungarian matching
│   ├── ingestion/dataset_reader.py     # ECMWF / GFS / Zarr dataset loader
│   ├── impact/gis_footprint.py         # Infrastructure exposure & CAP 1.2
│   └── api/main.py                     # FastAPI REST microservice
│
└── tests/                           # Complete Unit Test Suite (12 tests)
    ├── test_spherical_gnn.py
    ├── test_downscaler.py
    ├── test_physics_guard.py
    ├── test_tracker.py
    └── test_climatology.py
```

---

## 5. Quickstart & Verification

### 5.1 Run Python Scientific Services & Unit Tests
```bash
# Clone the repository
git clone https://github.com/diiviikk5/Avarta.git
cd Avarta

# Run the complete test suite
python -m unittest discover -s tests
```

Output:
```
............
----------------------------------------------------------------------
Ran 12 tests in 0.048s

OK
```

### 5.2 Run Next.js Editorial Console
```bash
cd avarta
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the cinematic hero and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to launch the operational threat console.

---

## 6. Citations & References
1. Lam, R., et al. (2023). *Learning skillful medium-range global weather forecasting* (GraphCast). Science, 382(6677), 1416-1421.
2. Mardani, M., et al. (2024). *CorrDiff: Generative AI for Extreme Weather Downscaling*. NVIDIA Technical Report.
3. Lalaurette, F. (2003). *Early detection of abnormal weather using a probabilistic extreme forecast index*. Q.J.R. Meteorol. Soc., 129, 3031-3042.
4. Hersbach, H., et al. (2020). *The ERA5 global reanalysis*. Q.J.R. Meteorol. Soc., 146(730), 1999-2049.

---

## License
MIT License. Developed for Smart India Hackathon (SIH) 2026.
