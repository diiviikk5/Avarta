from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch

from models.conditional_diffusion.precip_ddpm import ConditionalPrecipitationDiffusion
from services.live_ml_service import get_stage2_evidence


ROOT = Path(__file__).resolve().parents[1]


def test_all_stage2_evidence_gates_are_checksum_verified():
    evidence = get_stage2_evidence()
    assert evidence["all_ready"] is True
    assert evidence["trained_ddpm_checkpoint"]["ready"] is True
    assert evidence["paired_12km_5km_corpus"]["ready"] is True
    assert evidence["heldout_multi_event_report"]["ready"] is True


def test_stage2_checkpoint_loads_into_the_declared_ddpm():
    artifact = torch.load(
        ROOT / "checkpoints" / "avarta_ddpm_stage2_demo.ckpt",
        map_location="cpu",
        weights_only=False,
    )
    model = ConditionalPrecipitationDiffusion(**artifact["model_config"])
    model.load_state_dict(artifact["model_state_dict"], strict=True)
    assert artifact["optimizer_steps"] == 30
    assert artifact["epochs"] == 5


def test_paired_corpus_and_report_cover_three_heldout_event_types():
    with np.load(ROOT / "data" / "stage2" / "paired_12km_5km_demo.npz") as corpus:
        assert corpus["coarse_12km"].shape == (24, 7, 8, 8)
        assert corpus["fine_5km"].shape == (24, 1, 16, 16)
        assert corpus["terrain_5km"].shape == (24, 1, 16, 16)
        assert set(corpus["train_indices"]).isdisjoint(set(corpus["heldout_indices"]))
        heldout_types = set(corpus["event_type"][corpus["heldout_indices"]])
        assert heldout_types == {"cyclone_rainband", "monsoon_extreme", "orographic_cloudburst"}

    report = json.loads((ROOT / "reports" / "stage2_multi_event_skill.json").read_text())
    assert report["ready"] is True
    assert report["heldout_samples"] == 6
    assert report["event_count"] == 3
    assert report["operational_validation"] is False
    assert report["scientific_skill_claimed"] is False
