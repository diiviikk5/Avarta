"""Proper scores for deciding whether an ensemble AI core actually improves.

All metrics operate on held-out observations. They are intentionally separate
from training loss so a visually sharp model cannot hide poor calibration or
false alarms behind one favorable image metric.
"""

from __future__ import annotations

from typing import Any, Iterable

import numpy as np
from scipy.ndimage import uniform_filter
from scipy.stats import rankdata


def _roc_auc(probability: np.ndarray, event: np.ndarray) -> float | None:
    positives = int(event.sum())
    negatives = int(len(event) - positives)
    if not positives or not negatives:
        return None
    ranks = rankdata(probability, method="average")
    auc = (float(ranks[event].sum()) - positives * (positives + 1) / 2) / (positives * negatives)
    return round(auc, 4)


def _crps(ensemble: np.ndarray, observation: np.ndarray) -> float:
    first = np.mean(np.abs(ensemble - observation[None]), axis=0)
    pairwise = np.zeros_like(observation, dtype=np.float64)
    members = len(ensemble)
    for left in range(members):
        for right in range(members):
            pairwise += np.abs(ensemble[left] - ensemble[right])
    pairwise /= members * members
    return float(np.mean(first - 0.5 * pairwise))


def verify_ensemble(
    ensemble: np.ndarray,
    observation: np.ndarray,
    *,
    threshold: float,
    reference_probability: float | np.ndarray | None = None,
    reliability_bins: int = 10,
    neighborhood_scales: Iterable[int] = (1, 3, 5),
) -> dict[str, Any]:
    """Return calibration, discrimination, sharpness and spatial skill metrics.

    ``ensemble`` is ``[member,y,x]`` and the observation is ``[y,x]``. Only
    cells where the observation and every member are finite are evaluated,
    preventing changing member counts from silently changing score meaning.
    """
    forecasts = np.asarray(ensemble, dtype=np.float64)
    truth = np.asarray(observation, dtype=np.float64)
    if forecasts.ndim != 3 or truth.shape != forecasts.shape[1:] or len(forecasts) < 2:
        raise ValueError("Expected at least two members [M,H,W] and observation [H,W]")
    if reliability_bins < 2:
        raise ValueError("At least two reliability bins are required")
    scales = tuple(int(scale) for scale in neighborhood_scales)
    if not scales or any(scale < 1 or scale % 2 == 0 for scale in scales):
        raise ValueError("Neighborhood scales must be positive odd integers")
    valid = np.isfinite(truth) & np.isfinite(forecasts).all(axis=0)
    if not valid.any():
        raise ValueError("No common finite forecast/observation cells")

    probability_grid = np.mean(forecasts >= threshold, axis=0)
    event_grid = truth >= threshold
    probability = probability_grid[valid]
    event = event_grid[valid].astype(np.float64)
    brier = float(np.mean((probability - event) ** 2))

    skill = None
    if reference_probability is not None:
        reference = np.asarray(reference_probability, dtype=np.float64)
        if reference.ndim == 0:
            reference = np.full(truth.shape, float(reference))
        if reference.shape != truth.shape or np.any((reference[valid] < 0) | (reference[valid] > 1)):
            raise ValueError("Reference probability must be scalar or match observation in [0,1]")
        reference_brier = float(np.mean((reference[valid] - event) ** 2))
        skill = None if reference_brier <= 0 else round(1 - brier / reference_brier, 4)

    edges = np.linspace(0, 1, reliability_bins + 1)
    reliability = []
    for index in range(reliability_bins):
        selected = ((probability >= edges[index])
                    & (probability <= edges[index + 1] if index == reliability_bins - 1
                       else probability < edges[index + 1]))
        reliability.append({
            "lower": round(float(edges[index]), 3),
            "upper": round(float(edges[index + 1]), 3),
            "count": int(selected.sum()),
            "mean_forecast_probability": round(float(probability[selected].mean()), 4) if selected.any() else None,
            "observed_frequency": round(float(event[selected].mean()), 4) if selected.any() else None,
        })

    complete_forecasts = forecasts[:, valid]
    complete_truth = truth[valid]
    crps = _crps(complete_forecasts, complete_truth)
    mean = complete_forecasts.mean(axis=0)
    spread = complete_forecasts.std(axis=0)
    rmse = float(np.sqrt(np.mean((mean - complete_truth) ** 2)))
    spread_rmse_ratio = float(np.sqrt(np.mean(spread**2)) / rmse) if rmse > 0 else None

    # Rank 0 means observation below all members; rank M means above all.
    rank_histogram = np.zeros(len(forecasts) + 1, dtype=np.int64)
    ranks = np.sum(complete_forecasts < complete_truth[None], axis=0)
    for value in ranks:
        rank_histogram[int(value)] += 1

    fraction_skill = {}
    valid_float = valid.astype(np.float64)
    for scale in scales:
        forecast_fraction = uniform_filter(np.where(valid, probability_grid, 0.0), size=scale, mode="nearest")
        observed_fraction = uniform_filter(np.where(valid, event_grid, 0.0).astype(float), size=scale, mode="nearest")
        support = uniform_filter(valid_float, size=scale, mode="nearest") > 0.999
        denominator = np.mean(forecast_fraction[support] ** 2 + observed_fraction[support] ** 2) if support.any() else 0
        numerator = np.mean((forecast_fraction[support] - observed_fraction[support]) ** 2) if support.any() else 0
        fraction_skill[str(scale)] = None if denominator <= 0 else round(float(1 - numerator / denominator), 4)

    return {
        "valid_cells": int(valid.sum()),
        "members": int(len(forecasts)),
        "threshold": float(threshold),
        "proper_scores": {
            "brier_score": round(brier, 6),
            "brier_skill_score": skill,
            "crps": round(crps, 6),
        },
        "discrimination": {"roc_auc": _roc_auc(probability, event.astype(bool))},
        "spread_skill": {"ensemble_mean_rmse": round(rmse, 6),
                         "spread_rmse_ratio": round(spread_rmse_ratio, 6) if spread_rmse_ratio is not None else None},
        "reliability": reliability,
        "rank_histogram": rank_histogram.tolist(),
        "fractions_skill_score": fraction_skill,
        "interpretation": {
            "ideal_brier_and_crps": 0.0,
            "ideal_roc_auc": 1.0,
            "ideal_spread_rmse_ratio": 1.0,
            "ideal_fractions_skill_score": 1.0,
        },
    }
