#!/usr/bin/env python3
"""Build reproducible, explicitly demo-scoped Stage-2 DDPM evidence.

The generated corpus is a deterministic physics-shaped fixture, not an
operational MoES/IMD training product. Its purpose is to prove that AVARTA can
train, checkpoint and evaluate the implemented conditional diffusion path
end-to-end without converting architecture smoke tests into scientific claims.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
import torch
from torch.nn import functional as F


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models.conditional_diffusion.precip_ddpm import ConditionalPrecipitationDiffusion


SEED = 26078
EVENT_TYPES = ("cyclone_rainband", "monsoon_extreme", "orographic_cloudburst")
CHECKPOINT = ROOT / "checkpoints" / "avarta_ddpm_stage2_demo.ckpt"
CHECKPOINT_REPORT = ROOT / "reports" / "stage2_ddpm_checkpoint.json"
CORPUS = ROOT / "data" / "stage2" / "paired_12km_5km_demo.npz"
CORPUS_MANIFEST = ROOT / "data" / "stage2" / "paired_12km_5km_manifest.json"
SKILL_REPORT = ROOT / "reports" / "stage2_multi_event_skill.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_corpus() -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, list[str], list[str]]:
    generator = np.random.default_rng(SEED)
    yy, xx = np.mgrid[0:16, 0:16].astype(np.float32)
    xx /= 15.0
    yy /= 15.0
    fine_fields: list[np.ndarray] = []
    terrain_fields: list[np.ndarray] = []
    event_ids: list[str] = []
    event_types: list[str] = []

    for index in range(24):
        event_type = EVENT_TYPES[index % len(EVENT_TYPES)]
        cx = 0.42 + 0.16 * math.sin(index * 0.71)
        cy = 0.48 + 0.14 * math.cos(index * 0.53)
        terrain = np.clip(
            0.18 + 0.72 * np.exp(-((xx - 0.72) ** 2 / 0.045 + (yy - 0.52) ** 2 / 0.16))
            + 0.08 * np.sin(xx * 12 + index),
            0,
            1,
        ).astype(np.float32)

        if event_type == "cyclone_rainband":
            radius = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
            rain = 12 + 92 * np.exp(-((radius - 0.19) ** 2) / 0.006)
            rain += 34 * np.exp(-((xx - cx + 0.08) ** 2 + (yy - cy) ** 2) / 0.018)
        elif event_type == "monsoon_extreme":
            diagonal = yy - (0.82 - 0.52 * xx)
            rain = 9 + 126 * np.exp(-(diagonal ** 2) / 0.008) * np.exp(-((xx - cx) ** 2) / 0.18)
            rain += 28 * np.exp(-((xx - 0.26) ** 2 + (yy - 0.62) ** 2) / 0.045)
        else:
            rain = 7 + 178 * np.exp(-((xx - cx) ** 2 / 0.012 + (yy - cy) ** 2 / 0.016))
            rain += 52 * terrain * np.exp(-((xx - 0.68) ** 2) / 0.08)

        rain += terrain * 9 + generator.normal(0, 1.8, size=rain.shape)
        fine_fields.append(np.clip(rain, 0, 260).astype(np.float32)[None, ...])
        terrain_fields.append(terrain[None, ...])
        event_ids.append(f"STAGE2-{event_type.upper()}-{index + 1:02d}")
        event_types.append(event_type)

    fine = torch.from_numpy(np.stack(fine_fields))
    terrain = torch.from_numpy(np.stack(terrain_fields))
    coarse_rain = F.adaptive_avg_pool2d(fine, (8, 8))
    terrain_coarse = F.adaptive_avg_pool2d(terrain, (8, 8))
    grid_y, grid_x = torch.meshgrid(torch.linspace(-1, 1, 8), torch.linspace(-1, 1, 8), indexing="ij")
    coarse = torch.cat(
        (
            coarse_rain,
            0.60 + coarse_rain / 520,
            grid_x[None, None].repeat(24, 1, 1, 1) * 8,
            grid_y[None, None].repeat(24, 1, 1, 1) * 8,
            1000 - coarse_rain * 0.16,
            0.45 + terrain_coarse * 0.35,
            terrain_coarse,
        ),
        dim=1,
    ).float()
    return coarse, terrain.float(), fine.float(), event_ids, event_types


def metric_block(prediction: torch.Tensor, target: torch.Tensor, threshold: float = 64.5) -> dict[str, float]:
    predicted_mask = prediction >= threshold
    target_mask = target >= threshold
    intersection = (predicted_mask & target_mask).sum().item()
    union = (predicted_mask | target_mask).sum().item()
    target_peak = target.flatten(1).amax(dim=1)
    predicted_peak = prediction.flatten(1).amax(dim=1)
    return {
        "mean_absolute_error_mm_day": round(float((prediction - target).abs().mean().item()), 4),
        "mean_peak_recovery_ratio": round(float((predicted_peak / target_peak.clamp_min(1e-6)).mean().item()), 4),
        "extreme_footprint_iou": round(float(intersection / union if union else 1.0), 4),
    }


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    torch.set_num_threads(2)
    for path in (CHECKPOINT.parent, CHECKPOINT_REPORT.parent, CORPUS.parent, SKILL_REPORT.parent):
        path.mkdir(parents=True, exist_ok=True)

    coarse, terrain, fine, event_ids, event_types = make_corpus()
    train_indices = np.arange(18)
    heldout_indices = np.arange(18, 24)
    np.savez_compressed(
        CORPUS,
        coarse_12km=coarse.numpy(),
        fine_5km=fine.numpy(),
        terrain_5km=terrain.numpy(),
        event_id=np.asarray(event_ids),
        event_type=np.asarray(event_types),
        train_indices=train_indices,
        heldout_indices=heldout_indices,
    )
    corpus_hash = sha256(CORPUS)
    CORPUS_MANIFEST.write_text(json.dumps({
        "schema_version": "avarta.stage2-paired-corpus.v1",
        "scope": "deterministic_physics_shaped_demonstration_fixture",
        "operational_training_corpus": False,
        "scientific_skill_claimed": False,
        "source_method": "Reproducible analytic storm fields conditioned by synthetic terrain; generated by scripts/prepare_stage2_evidence.py",
        "sample_count": 24,
        "train_samples": 18,
        "heldout_samples": 6,
        "event_types": list(EVENT_TYPES),
        "coarse_shape": [24, 7, 8, 8],
        "fine_shape": [24, 1, 16, 16],
        "nominal_resolution_contract": {"coarse_km": 12, "fine_km": 5},
        "split_strategy": "event-balanced final-six holdout",
        "artifact": str(CORPUS.relative_to(ROOT)),
        "sha256": corpus_hash,
        "seed": SEED,
    }, indent=2) + "\n", encoding="utf-8")

    model = ConditionalPrecipitationDiffusion(coarse_channels=7, steps=32, width=32)
    optimizer = torch.optim.AdamW(model.parameters(), lr=8e-4, weight_decay=1e-5)
    history: list[float] = []
    model.train()
    optimizer_steps = 0
    for epoch in range(5):
        epoch_losses = []
        permutation = torch.randperm(len(train_indices), generator=torch.Generator().manual_seed(SEED + epoch))
        for start in range(0, len(train_indices), 3):
            idx = permutation[start:start + 3]
            diagnostics = model.training_diagnostics(fine[idx], coarse[idx], terrain[idx])
            optimizer.zero_grad()
            diagnostics["loss"].backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            optimizer_steps += 1
            epoch_losses.append(float(diagnostics["loss"].detach().item()))
        history.append(round(float(np.mean(epoch_losses)), 6))

    torch.save({
        "artifact_type": "avarta_stage2_demo_ddpm",
        "scope": "demonstration_fixture_not_operational_weights",
        "model_config": {"coarse_channels": 7, "steps": 32, "width": 32},
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "epochs": 5,
        "optimizer_steps": optimizer_steps,
        "seed": SEED,
        "training_history": {"epoch_loss": history},
        "paired_corpus_sha256": corpus_hash,
    }, CHECKPOINT)
    checkpoint_hash = sha256(CHECKPOINT)
    CHECKPOINT_REPORT.write_text(json.dumps({
        "schema_version": "avarta.stage2-ddpm-checkpoint.v1",
        "ready": True,
        "scope": "trained_demonstration_fixture_not_operational_meteorological_weights",
        "scientific_skill_claimed": False,
        "artifact": str(CHECKPOINT.relative_to(ROOT)),
        "sha256": checkpoint_hash,
        "parameters": sum(parameter.numel() for parameter in model.parameters()),
        "epochs": 5,
        "optimizer_steps": optimizer_steps,
        "training_history": {"epoch_loss": history},
        "corpus_sha256": corpus_hash,
        "reproduction_command": ".venv/bin/python scripts/prepare_stage2_evidence.py",
    }, indent=2) + "\n", encoding="utf-8")

    model.eval()
    heldout = torch.as_tensor(heldout_indices)
    with torch.no_grad():
        torch.manual_seed(SEED + 900)
        prediction = model.sample(coarse[heldout], terrain[heldout], members=2).mean(dim=0)
        bilinear = F.interpolate(coarse[heldout, :1], size=fine.shape[-2:], mode="bilinear", align_corners=False)
    per_event = {}
    for event_type in EVENT_TYPES:
        local = [i for i, corpus_index in enumerate(heldout_indices) if event_types[int(corpus_index)] == event_type]
        indices = torch.as_tensor(local)
        per_event[event_type] = metric_block(prediction[indices], fine[heldout][indices])
    SKILL_REPORT.write_text(json.dumps({
        "schema_version": "avarta.stage2-multi-event-skill.v1",
        "ready": True,
        "scope": "held_out_demonstration_fixture",
        "operational_validation": False,
        "independent_observations": False,
        "scientific_skill_claimed": False,
        "warning": "These measured results close the software evidence gate only. They are not MoES/IMD forecast skill or real 5 km validation.",
        "heldout_samples": len(heldout_indices),
        "event_count": len(EVENT_TYPES),
        "event_types": list(EVENT_TYPES),
        "threshold_mm_day": 64.5,
        "ddpm_ensemble_members": 2,
        "checkpoint_sha256": checkpoint_hash,
        "corpus_sha256": corpus_hash,
        "ddpm": metric_block(prediction, fine[heldout]),
        "bilinear_baseline": metric_block(bilinear, fine[heldout]),
        "per_event": per_event,
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "checkpoint": str(CHECKPOINT),
        "corpus": str(CORPUS),
        "report": str(SKILL_REPORT),
        "optimizer_steps": optimizer_steps,
        "final_epoch_loss": history[-1],
    }, indent=2))


if __name__ == "__main__":
    main()
