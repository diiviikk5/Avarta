"""Read-only research API backed by the generated historical replay artifacts and multi-hazard intelligence core."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Response

from services.cases.case_registry import get_case as fetch_case_by_id, list_cases
from services.downscaling.spectral import generate_synthetic_spectral_case
from services.impact.spatial_polygons import build_hazard_geojson
from services.alerts.cap_feed import generate_cap_feed, generate_cap_v1_2_xml
from services.alerts.agromet import generate_agromet_advisories
from services.alerts.ensemble_plume import generate_ensemble_plume

CASE_FILE = Path(__file__).resolve().parents[2] / "avarta/public/replay/august-2025.json"
app = FastAPI(title="Avarta Multi-Hazard Intelligence & Research API", version="0.3.0")


def case(case_id: Optional[str] = None) -> dict:
    if case_id:
        c = fetch_case_by_id(case_id)
        if c is not None:
            return c
        raise HTTPException(404, f"Case {case_id} not found")
    if not CASE_FILE.exists():
        raise HTTPException(503, "Historical replay has not been generated")
    return json.loads(CASE_FILE.read_text(encoding="utf-8"))


@app.get("/")
def root() -> dict:
    return {
        "platform": "Avarta",
        "status": "research_prototype",
        "problem_statement_id": "26078",
        "supported_hazards": ["rainfall", "cyclone", "heatwave"],
        "operational_alerting": False,
    }


@app.get("/api/cases/catalog")
def get_case_catalog() -> dict:
    return {"cases": list_cases()}


@app.get("/api/cases")
def get_case(case_id: Optional[str] = None, catalog: bool = False) -> dict:
    if catalog:
        return {"cases": list_cases()}
    return case(case_id)


@app.get("/api/cases/{case_id}")
def get_case_by_id(case_id: str) -> dict:
    return case(case_id)


@app.get("/api/threats")
def get_threats(case_id: Optional[str] = None) -> dict:
    report = case(case_id)
    return {
        "mode": report["mode"],
        "hazard": report.get("hazard", "extreme weather"),
        "source": report["forecast"]["model"],
        "forecast_initialization_time": report["forecast"]["initialization_time"],
        "case_id": report["id"],
        "frames": report["frames"],
        "verification": report["verification"],
    }


@app.get("/api/alerts/draft")
def draft_alert(case_id: Optional[str] = None) -> dict:
    report = case(case_id)
    # Check field raster
    if "forecast_mm_day" in report.get("raster", {}):
        field = report["raster"]["forecast_mm_day"]
        threshold = report["verification"].get("heavy_rain_threshold_mm_day", 64.5)
    else:
        field = report["raster"]["forecast_field"]
        threshold = 60.0

    row, col = max(
        ((r, c) for r, line in enumerate(field) for c in range(len(line))),
        key=lambda position: field[position[0]][position[1]],
    )
    peak = field[row][col]
    return {
        "status": "draft_decision_support",
        "dissemination": "not_sent",
        "case_id": report["id"],
        "hazard": report.get("hazard", "extreme weather"),
        "source": report["forecast"]["model"],
        "forecast_window_utc": report["forecast"]["window_utc"],
        "peak_intensity": peak,
        "centroid": {
            "latitude": report["raster"]["latitudes"][row],
            "longitude": report["raster"]["longitudes"][col],
        },
        "threshold_exceeded": peak >= threshold,
        "provisional_threshold": threshold,
        "requires_meteorologist_review": True,
    }


@app.get("/api/forecast")
def pinpoint_forecast(lat: float, lon: float, hours: int = 12) -> dict:
    """Pinpoint draft forecast: GET /api/forecast?lat=28.40&lon=77.31&hours=12."""
    from services.alerts.engine import point_forecast

    try:
        return point_forecast(lat, lon, forecast_hours=hours)
    except (ValueError, RuntimeError) as error:
        raise HTTPException(400 if isinstance(error, ValueError) else 503, str(error))


@app.get("/api/what-happens-here")
def what_happens_here(lat: float, lon: float, hours: int = 12) -> dict:
    from services.alerts.engine import what_happens_here as explain

    try:
        return explain(lat, lon, forecast_hours=hours)
    except (ValueError, RuntimeError) as error:
        raise HTTPException(400 if isinstance(error, ValueError) else 503, str(error))


@app.get("/api/risk-regions")
def risk_regions() -> dict:
    from services.alerts.engine import region_risk_table, risk_class_breaks

    return {
        "status": "draft_decision_support",
        "dissemination": "not_sent",
        "bands": risk_class_breaks(),
        "regions": region_risk_table(),
    }


@app.get("/api/events")
def tracked_events(case_id: Optional[str] = None) -> dict:
    from services.tracking.event_track import EventTracker

    report = case(case_id)
    # If case has custom frames, adapt them
    if report.get("hazard_type") in ("cyclone", "heatwave"):
        return {
            "case_id": report["id"],
            "status": "draft_decision_support",
            "hazard_type": report.get("hazard_type"),
            "frames_count": len(report["frames"]),
            "timeline": report["frames"],
            "verification": report["verification"],
            "note": "Multi-hazard trajectory with dynamic cone of uncertainty.",
        }

    tracker = EventTracker()
    events = tracker.events_from_replay_frames(report["frames"])
    return {
        "case_id": report["id"],
        "status": "draft_decision_support",
        "events": [event.to_dict() for event in events],
        "leads_hours": [24, 48, 72],
        "note": "Extrapolated footprint trajectory with growing uncertainty; not a weather prediction.",
    }


@app.get("/api/downscaling")
def downscaling_info() -> dict:
    import numpy as np
    from services.downscaling.hybrid import compare_methods

    report = case()
    field = np.asarray(report["raster"]["forecast_mm_day"], dtype=np.float32)
    coarse = field[:: max(1, field.shape[0] // 8), :: max(1, field.shape[1] // 8)]
    comparison = compare_methods(coarse[:8, :8] if coarse.size >= 64 else field[:8, :8])
    return {"case_id": report["id"], **comparison}


@app.get("/api/spectral-analysis")
def spectral_analysis() -> dict:
    """Fourier Power Spectral Density (PSD) analysis proving extreme amplitude preservation."""
    return generate_synthetic_spectral_case()


@app.get("/api/hazard-polygons")
def hazard_polygons(case_id: Optional[str] = None, radius_km: float = 5.0) -> dict:
    """GeoJSON FeatureCollection with 5 km hazard buffers and critical infrastructure intersection."""
    c = case(case_id)
    threat_points = []
    for frame in c.get("frames", []):
        for obj in frame.get("objects", []):
            threat_points.append({
                "id": obj.get("track_id", "ANOM-01"),
                "lat": obj["centroid"][0],
                "lon": obj["centroid"][1],
                "radius_km": radius_km,
                "severity": "SEVERE" if obj.get("peak_value", 0) > 40 or obj.get("peak_mm_3h", 0) > 25 else "HIGH",
                "hazard": c.get("hazard", "Extreme Anomaly"),
                "intensity": obj.get("peak_value") or obj.get("peak_mm_3h", 0),
            })
    if not threat_points:
        threat_points.append({"id": "ANOM-DEFAULT", "lat": 28.40, "lon": 77.31, "radius_km": radius_km, "severity": "HIGH", "hazard": "Rainfall Anomaly"})

    return build_hazard_geojson(threat_points[:6], default_radius_km=radius_km)


@app.get("/api/agromet-advisories")
def agromet_advisories(case_id: Optional[str] = None, lead_hours: int = 72) -> dict:
    """Gramin Krishi Mausam Sewa (GKMS) farming advisories."""
    c = case(case_id)
    hazard_type = c.get("hazard_type", "rainfall")
    return generate_agromet_advisories(hazard_type=hazard_type, lead_hours=lead_hours, region=c.get("title", "India"))


@app.get("/api/ensemble-plume")
def ensemble_plume(lat: float = 28.40, lon: float = 77.31, hazard_type: str = "rainfall") -> dict:
    """30-member ensemble plume / spaghetti trajectories across 10-day lead time."""
    return generate_ensemble_plume(lat=lat, lon=lon, hazard_type=hazard_type)


@app.get("/api/intelligence/audit")
def ensemble_intelligence_audit(case_id: Optional[str] = None, probability: float = 0.5) -> dict:
    """Finite-member uncertainty audit for a persisted ensemble probability field."""
    import numpy as np
    from services.intelligence import audit_probability_field

    report = case(case_id)
    raster = report.get("raster", {})
    field = raster.get("member_exceedance_probability")
    if field is None:
        raise HTTPException(422, "Case has no persisted member probability field")
    try:
        audit = audit_probability_field(
            np.asarray(field, dtype=np.float64),
            len(report["forecast"].get("members", [])),
            np.asarray(raster["latitudes"], dtype=np.float64),
            np.asarray(raster["longitudes"], dtype=np.float64),
            detection_probability=probability,
            min_area_km2=1000.0,
        )
    except ValueError as error:
        raise HTTPException(422, str(error))
    return {
        "case_id": report["id"],
        "hazard": report.get("hazard"),
        "source_model": report["forecast"].get("model"),
        "threshold": report.get("verification", {}).get("heavy_rain_threshold_mm_day"),
        **audit,
        "decision": "research_evidence_only",
        "note": "A small raw ensemble is not a calibrated warning probability.",
    }


@app.get("/api/cap/feed.xml")
def cap_feed() -> Response:
    """OASIS CAP v1.2 XML Feed for civil defense / NDMA SACHET."""
    xml_rain = generate_cap_v1_2_xml(
        alert_id="20250823-001",
        headline="Provisional Extreme Rainfall Watch in Haryana / NCR",
        event_name="Extreme Precipitation / Local Flash Flood",
        severity="Severe",
        area_desc="Faridabad, Ballabgarh, Delhi NCR",
    )
    feed_xml = generate_cap_feed([
        {"id": "IN-NDMA-AVARTA-20250823-001", "headline": "Faridabad Rain Alert", "xml_payload": xml_rain}
    ])
    return Response(content=feed_xml, media_type="application/xml")


@app.get("/api/cap/alert/{alert_id}")
def cap_single_alert(alert_id: str) -> Response:
    xml = generate_cap_v1_2_xml(
        alert_id=alert_id,
        headline=f"Meteorological Alert: {alert_id}",
        event_name="Extreme Weather Threat",
        severity="Severe",
    )
    return Response(content=xml, media_type="application/xml")


@app.post("/api/alerts/spatial", status_code=410)
def retired_spatial_alert() -> None:
    raise HTTPException(410, "Unvalidated spatial alert generation was retired; use /api/hazard-polygons or /api/alerts/draft")


@app.post("/api/downscale", status_code=501)
def unavailable_downscale() -> None:
    raise HTTPException(501, "No validated 5 km downscaling model is deployed; use /api/spectral-analysis for research benchmark")
