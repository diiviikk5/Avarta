"""New SIH feature pipeline: detection -> tracking -> downscaling -> risk -> alerts."""

import numpy as np

from services.alerts.engine import point_forecast, region_risk_table, what_happens_here
from services.detection.multi_variable import classify_sigma, detect_grid_anomaly, detect_point_anomaly, sigma_score
from services.downscaling.hybrid import compare_methods, diffusion_status, downscale_v1_bilinear
from services.impact.risk_engine import build_local_impact, classify_risk, compute_risk_score
from services.tracking.event_track import EventTracker


def test_sigma_flags_extreme_rainfall_example():
    # Normal 10-30 mm/day vs forecast 140 mm/day -> extreme.
    sigma = sigma_score(
        np.array([[140.0]]), np.array([[20.0]]), np.array([[15.0]])
    )[0, 0]
    assert sigma > 5
    assert classify_sigma(sigma) == "EXTREME"
    assert classify_sigma(0.5) == "LOW"
    assert classify_sigma(2.4) == "MODERATE"
    assert classify_sigma(3.5) == "HIGH"


def test_point_anomaly_combines_six_variables():
    detection = detect_point_anomaly(
        28.40, 77.31,
        {"rainfall": 140.0, "temperature": 34.0, "wind_speed": 60.0,
         "pressure": 1000.0, "humidity": 88.0, "geopotential_height": 5940.0},
        {"rainfall": (20.0, 15.0), "temperature": (31.0, 3.0), "wind_speed": (18.0, 10.0),
         "pressure": (1006.0, 4.0), "humidity": (62.0, 12.0), "geopotential_height": (5880.0, 30.0)},
    )
    assert detection.is_extreme
    assert detection.overall_label in ("HIGH", "EXTREME")
    assert set(detection.variables) == {
        "rainfall", "temperature", "wind_speed", "pressure", "humidity", "geopotential_height",
    }


def test_grid_anomaly_returns_combined_sigma():
    shape = (4, 5)
    forecast = {name: np.full(shape, 10.0) for name in ("rainfall", "temperature")}
    mean = {name: np.zeros(shape) for name in ("rainfall", "temperature")}
    std = {name: np.full(shape, 5.0) for name in ("rainfall", "temperature")}
    result = detect_grid_anomaly(forecast, mean, std)
    assert result["combined_sigma"].shape == shape
    assert float(result["combined_sigma"].max()) == 2.0


def test_event_tracker_produces_24_48_72_legs_and_4d_bbox():
    tracker = EventTracker()
    events = tracker.ingest_frames([
        {"timestamp": "2025-08-22T03:00:00Z",
         "detections": [{"lat": 27.0, "lon": 77.0, "intensity": 40.0, "hazard_type": "rainfall"}]},
        {"timestamp": "2025-08-22T06:00:00Z",
         "detections": [{"lat": 27.3, "lon": 76.7, "intensity": 55.0, "hazard_type": "rainfall"}]},
    ])
    assert len(events) == 1
    event = events[0]
    assert [p.lead_hours for p in event.trajectory] == [24, 48, 72]
    assert event.bbox_4d["south"] < event.bbox_4d["north"]
    assert event.bbox_4d["valid_end"] > event.bbox_4d["valid_start"]
    assert event.event_id.startswith("EVT-")


def test_downscaling_v1_preserves_shape_and_nonnegativity():
    coarse = np.array([[42.0, 55.0, 61.0], [38.0, 180.0, 65.0], [40.0, 71.0, 59.0]])
    fine = downscale_v1_bilinear(coarse, factor=2.0)
    assert fine.shape == (6, 6)
    assert float(fine.min()) >= 0.0
    comparison = compare_methods(coarse)
    assert comparison["methods"]["v1_bilinear"]["available"] is True
    assert comparison["methods"]["advanced_diffusion"]["available"] is False
    assert diffusion_status()["available"] is False


def test_risk_bands_match_spec_thresholds():
    assert classify_risk(10) == "LOW"
    assert classify_risk(45) == "MODERATE"
    assert classify_risk(70) == "HIGH"
    assert classify_risk(90) == "SEVERE"
    risk = compute_risk_score(rainfall_sigma=5.7, wind_sigma=3.0, temperature_sigma=1.0,
                              historical_percentile=99.0, ensemble_spread_norm=0.6)
    assert risk["band"] in ("HIGH", "SEVERE")
    impact = build_local_impact("Faridabad", 28.40, 77.31, rainfall_mm=122.0, anomaly_sigma=5.7)
    assert impact.risk_radius_km == 5.0
    assert impact.to_dict()["color"] in ("🟢", "🟡", "🟠", "🔴")


def test_pinpoint_forecast_shape_matches_requested_api():
    result = point_forecast(28.40, 77.31, forecast_hours=12)
    for key in ("location", "event", "severity", "risk_radius_km", "rainfall_mm",
                "anomaly_sigma", "forecast_hours", "confidence"):
        assert key in result
    assert result["forecast_hours"] == 12
    assert result["risk_radius_km"] == 5
    assert result["status"] == "draft_decision_support"
    assert result["dissemination"] == "not_sent"


def test_what_happens_here_is_plain_language_and_draft():
    result = what_happens_here(28.53, 77.39)
    assert "narrative" in result
    assert "potential_impacts" in result
    assert result["risk_radius_km"] == 5
    assert result["dissemination"] == "not_sent"


def test_region_table_is_sorted_and_bounded():
    rows = region_risk_table()
    assert len(rows) >= 5
    scores = [r["risk_score"] for r in rows]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)
