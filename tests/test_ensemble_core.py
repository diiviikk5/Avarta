import numpy as np

from models.spherical_gnn.icosahedron import generate_icosahedron_vertices, subdivide_mesh
from services.intelligence.ensemble_core import EnsembleIntelligenceCore, audit_probability_field


def _climate(height=6, width=7):
    probabilities = np.array([0.01, 0.10, 0.50, 0.90, 0.99])
    values = np.array([0.0, 2.0, 10.0, 22.0, 30.0])[:, None, None]
    return np.broadcast_to(values, (len(probabilities), height, width)).copy(), probabilities


def test_upper_tail_analysis_builds_uncertainty_aware_footprint():
    climate, probabilities = _climate()
    ensemble = np.full((5, 6, 7), 8.0)
    for member in range(5):
        ensemble[member, 2:5, 2:6] = 72.0 + member * 3
    lats, lons = np.linspace(20, 25, 6), np.linspace(70, 76, 7)

    result = EnsembleIntelligenceCore(min_area_km2=0).analyze(
        ensemble, climate, probabilities, lats, lons,
        threshold=64.5, variable="rainfall", units="mm/day",
    )

    assert result.feature_cube.shape == (6, 7, len(result.feature_names))
    assert len(result.footprints) == 1
    footprint = result.footprints[0]
    assert footprint.member_support == 5
    assert footprint.peak_efi > 0.8
    assert footprint.peak_sot > 1
    # The posterior never turns 5/5 members into a falsely certain 100%.
    assert 0.9 < footprint.peak_probability < 1.0
    assert footprint.probability_lower_90 < footprint.peak_probability
    assert result.evidence["probability_kind"] == "raw_finite_ensemble"
    assert result.evidence["member_probability_resolution"] == 0.2


def test_lower_tail_detects_unusually_low_pressure():
    probabilities = np.array([0.01, 0.10, 0.50, 0.90, 0.99])
    climate = np.broadcast_to(
        np.array([950.0, 975.0, 1005.0, 1025.0, 1040.0])[:, None, None],
        (5, 4, 4),
    ).copy()
    ensemble = np.full((8, 4, 4), 1008.0)
    ensemble[:, 1:3, 1:3] = np.arange(8)[:, None, None] + 925.0
    result = EnsembleIntelligenceCore(min_area_km2=0).analyze(
        ensemble, climate, probabilities, np.arange(4.0), np.arange(70.0, 74.0),
        threshold=940.0, variable="pressure", units="hPa", tail="lower",
    )
    assert len(result.footprints) == 1
    assert result.footprints[0].peak_efi > 0.8
    assert result.footprints[0].peak_sot > 0
    assert result.footprints[0].peak_intensity < 940


def test_missing_members_are_exposed_and_mesh_features_are_ready_for_gnn():
    climate, probabilities = _climate(3, 4)
    ensemble = np.full((4, 3, 4), 12.0)
    ensemble[:, 0, 0] = np.nan
    ensemble[:2, 0, 1] = np.nan
    lats, lons = np.array([-20.0, 0.0, 20.0]), np.array([0.0, 90.0, 180.0, 270.0])
    result = EnsembleIntelligenceCore(min_area_km2=0, min_members=3).analyze(
        ensemble, climate, probabilities, lats, lons,
        threshold=20.0, variable="rainfall", units="mm/day",
    )
    confidence_index = result.feature_names.index("forecast_confidence")
    assert np.isnan(result.feature_cube[0, 0, confidence_index])
    assert np.isnan(result.feature_cube[0, 1, confidence_index])
    nodes, _ = subdivide_mesh(generate_icosahedron_vertices(), level=1)
    mesh_features = EnsembleIntelligenceCore.map_features_to_spherical_mesh(result, lats, lons, nodes)
    assert mesh_features.shape == (42, len(result.feature_names))


def test_calibration_metadata_is_provenance_not_a_false_calibration_claim():
    climate, probabilities = _climate(2, 2)
    ensemble = np.full((6, 2, 2), 40.0)
    result = EnsembleIntelligenceCore(min_area_km2=0).analyze(
        ensemble, climate, probabilities, np.array([10.0, 11.0]), np.array([70.0, 71.0]),
        threshold=30.0, variable="rainfall", units="mm/day",
        calibration={"method": "isotonic", "validation_cases": 120},
    )
    assert result.evidence["probability_kind"] == "raw_finite_ensemble"
    assert result.evidence["calibration_status"] == "external_metadata_supplied_not_applied"
    assert result.evidence["calibration_metadata"]["validation_cases"] == 120


def test_archived_probability_audit_recovers_member_support_and_interval():
    field = np.array([[0.0, 0.4, 0.6], [0.0, 0.8, 1.0]])
    report = audit_probability_field(
        field, 5, np.array([21.0, 20.5]), np.array([70.0, 70.5, 71.0]),
        detection_probability=0.6,
    )
    assert report["member_probability_resolution"] == 0.2
    assert len(report["footprints"]) == 1
    footprint = report["footprints"][0]
    assert footprint["supporting_members"] == 5
    assert footprint["peak_raw_probability"] == 1.0
    assert footprint["probability_interval_90"][0] < 1.0
    assert report["operationally_calibrated"] is False
