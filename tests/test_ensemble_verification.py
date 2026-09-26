import numpy as np
import pytest

from services.intelligence.verification import verify_ensemble


def test_perfect_ensemble_has_perfect_event_and_spatial_scores():
    observation = np.array([[0.0, 10.0, 80.0], [0.0, 70.0, 90.0], [5.0, 10.0, 100.0]])
    ensemble = np.stack([observation, observation, observation])
    report = verify_ensemble(
        ensemble, observation, threshold=64.5,
        reference_probability=0.5, neighborhood_scales=(1, 3),
    )
    assert report["proper_scores"]["brier_score"] == 0
    assert report["proper_scores"]["crps"] == 0
    assert report["proper_scores"]["brier_skill_score"] == 1
    assert report["discrimination"]["roc_auc"] == 1
    assert report["fractions_skill_score"] == {"1": 1.0, "3": 1.0}


def test_bad_ensemble_scores_worse_and_reliability_counts_all_cells():
    observation = np.array([[0.0, 0.0], [100.0, 100.0]])
    good = np.array([
        [[0.0, 10.0], [80.0, 90.0]],
        [[5.0, 0.0], [90.0, 100.0]],
    ])
    bad = 100.0 - good
    good_report = verify_ensemble(good, observation, threshold=64.5, reliability_bins=5)
    bad_report = verify_ensemble(bad, observation, threshold=64.5, reliability_bins=5)
    assert good_report["proper_scores"]["brier_score"] < bad_report["proper_scores"]["brier_score"]
    assert good_report["proper_scores"]["crps"] < bad_report["proper_scores"]["crps"]
    assert sum(item["count"] for item in good_report["reliability"]) == 4
    assert len(good_report["rank_histogram"]) == 3


def test_verification_rejects_even_neighborhood_and_missing_overlap():
    ensemble = np.ones((2, 2, 2))
    observation = np.ones((2, 2))
    with pytest.raises(ValueError, match="odd"):
        verify_ensemble(ensemble, observation, threshold=1, neighborhood_scales=(2,))
    with pytest.raises(ValueError, match="No common"):
        verify_ensemble(ensemble * np.nan, observation, threshold=1)
