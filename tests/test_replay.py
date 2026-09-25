import json
from pathlib import Path

import numpy as np

from services.replay.august_2025 import LEADS, _three_hour_intervals
from training.train_imd_real import IMDRainfallDataset, split_by_date


def test_accumulation_windows_reconstruct_eight_three_hour_steps():
    records = {}
    for lead in LEADS:
        records[lead] = np.full((2, 2), 3.0 if lead % 6 else 7.0, dtype=np.float32)
    intervals = _three_hour_intervals(records)
    assert intervals.shape == (8, 2, 2)
    assert np.allclose(intervals[0], 4.0)
    assert np.allclose(intervals[1], 3.0)


def test_date_split_purges_adjacent_days():
    crops = [{"day_idx": day} for day in range(20)]
    train, validation, boundary = split_by_date(crops)
    assert boundary == 16
    assert max(c["day_idx"] for c in train) <= 12
    assert min(c["day_idx"] for c in validation) == 16


def test_model_metadata_does_not_use_target_peak():
    crop = {
        "coarse_proxy": np.ones((16, 16), dtype=np.float32) * 10,
        "target_imd_0p25": np.ones((38, 38), dtype=np.float32) * 400,
        "peak_mm": 400,
        "lat_center": 25.5,
        "lon_center": 76.5,
    }
    sample = IMDRainfallDataset([crop])[0]
    assert abs(sample["metadata"].max().item() - 10 / 500) < 1e-6
    assert sample["coarse"].max().item() == 10
    assert sample["target"].max().item() == 400


def test_committed_replay_has_provenance_and_no_false_five_km_claim():
    artifact = Path(__file__).resolve().parents[1] / "avarta/public/replay/august-2025.json"
    case = json.loads(artifact.read_text(encoding="utf-8"))
    assert case["forecast"]["grid_spacing_degrees"] == 0.5
    assert case["observation"]["grid_spacing_degrees"] == 0.25
    assert len(case["frames"]) == 8
    assert all(frame["valid_time"] and frame["lead_hour"] for frame in case["frames"])
    assert all(record["sha256"] for record in case["provenance"]["gefs_grib_records"])
    assert case["verification"]["heavy_rain_iou"] == 0
    assert case["independent_observation"]["grid_spacing_degrees"] == 0.05
    assert case["independent_verification"]["heavy_rain_iou"] == 0
    assert "no learned downscaling" in case["independent_verification"]["method"]
