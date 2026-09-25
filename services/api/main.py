"""Read-only research API backed by the generated historical replay artifact."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException

CASE_FILE = Path(__file__).resolve().parents[2] / "avarta/public/replay/august-2025.json"
app = FastAPI(title="Avarta research replay API", version="0.2.0")


def case() -> dict:
    if not CASE_FILE.exists():
        raise HTTPException(503, "Historical replay has not been generated")
    return json.loads(CASE_FILE.read_text(encoding="utf-8"))


@app.get("/")
def root() -> dict:
    return {"platform": "Avarta", "status": "research_prototype", "operational_alerting": False}


@app.get("/api/cases")
def get_case() -> dict:
    return case()


@app.get("/api/threats")
def get_threats() -> dict:
    report = case()
    return {
        "mode": report["mode"],
        "source": report["forecast"]["model"],
        "forecast_initialization_time": report["forecast"]["initialization_time"],
        "case_id": report["id"],
        "frames": report["frames"],
        "verification": report["verification"],
    }


@app.get("/api/alerts/draft")
def draft_alert() -> dict:
    report = case()
    field = report["raster"]["forecast_mm_day"]
    row, col = max(((r, c) for r, line in enumerate(field) for c in range(len(line))),
                   key=lambda position: field[position[0]][position[1]])
    peak = field[row][col]
    threshold = report["verification"]["heavy_rain_threshold_mm_day"]
    return {
        "status": "draft_decision_support",
        "dissemination": "not_sent",
        "case_id": report["id"],
        "source": report["forecast"]["model"],
        "forecast_window_utc": report["forecast"]["window_utc"],
        "coarse_grid_peak_mm_day": peak,
        "centroid": {"latitude": report["raster"]["latitudes"][row],
                     "longitude": report["raster"]["longitudes"][col]},
        "threshold_exceeded": peak >= threshold,
        "heavy_rain_threshold_mm_day": threshold,
        "requires_meteorologist_review": True,
    }


@app.post("/api/alerts/spatial", status_code=410)
def retired_spatial_alert() -> None:
    raise HTTPException(410, "Unvalidated spatial alert generation was retired; use /api/alerts/draft")


@app.post("/api/downscale", status_code=501)
def unavailable_downscale() -> None:
    raise HTTPException(501, "No validated 5 km downscaling model is deployed")
