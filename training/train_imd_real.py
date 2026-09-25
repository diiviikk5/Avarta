"""Chronological IMD 0.25° coarse-proxy reconstruction benchmark.

The coarse input is derived from the IMD target, not an independent NWP field.
This experiment is neither a forecast nor genuine 5 km downscaling.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

from models.residual_downscaler.diffusion_downscaler import ResidualDownscaler
from services.ingestion.imd_gridded_parser import IMDGriddedParser
from training.train_downscaler import ExtremeTailPreservationLoss

HEAVY_RAIN_MM_DAY = 64.5


class IMDRainfallDataset(Dataset):
    def __init__(self, crops: list[dict]):
        self.crops = crops

    def __len__(self) -> int:
        return len(self.crops)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        item = self.crops[index]
        coarse = item["coarse_proxy"].astype(np.float32)
        target = item["target_imd_0p25"].astype(np.float32)
        # All conditioning is available from the coarse input;
        # true peak and target-derived intensity never enter the model.
        metadata = np.array([
            0, 0, 0, 0,
            float(coarse.max()) / 500, float(coarse.mean()) / 500, 0, 0,
        ], dtype=np.float32)
        return {
            "coarse": torch.from_numpy(coarse[None]),
            "terrain": torch.zeros((1, 38, 38), dtype=torch.float32),
            "metadata": torch.from_numpy(metadata),
            "target": torch.from_numpy(target[None]),
        }


def split_by_date(crops: list[dict], purge_days: int = 3) -> tuple[list[dict], list[dict], int]:
    days = sorted({int(c["day_idx"]) for c in crops})
    if len(days) < 6:
        raise ValueError("At least six separate dates are required")
    boundary = days[int(len(days) * 0.8)]
    train = [c for c in crops if c["day_idx"] < boundary - purge_days]
    validation = [c for c in crops if c["day_idx"] >= boundary]
    if not train or not validation:
        raise ValueError("Date split left no training or validation samples")
    return train, validation, boundary


def metrics(predictions: list[np.ndarray], targets: list[np.ndarray]) -> dict:
    peak_errors = [abs(float(p.max()) - float(t.max())) for p, t in zip(predictions, targets)]
    errors = [float(np.mean(np.abs(p - t))) for p, t in zip(predictions, targets)]
    hits = misses = false_alarms = 0
    for pred, target in zip(predictions, targets):
        p, t = pred >= HEAVY_RAIN_MM_DAY, target >= HEAVY_RAIN_MM_DAY
        hits += int((p & t).sum())
        misses += int((~p & t).sum())
        false_alarms += int((p & ~t).sum())
    return {
        "samples": len(targets),
        "mean_peak_absolute_error_mm_day": round(float(np.mean(peak_errors)), 3),
        "mean_absolute_error_mm_day": round(float(np.mean(errors)), 3),
        "heavy_rain_detection_recall": round(hits / (hits + misses), 4) if hits + misses else 0,
        "heavy_rain_false_alarm_ratio": round(false_alarms / (hits + false_alarms), 4) if hits + false_alarms else 0,
        "heavy_rain_footprint_iou": round(hits / (hits + misses + false_alarms), 4) if hits + misses + false_alarms else 0,
        "observed_heavy_rain_cells": hits + misses,
        "predicted_heavy_rain_cells": hits + false_alarms,
    }


def run_real_imd_training(grd_path: str = "data/raw/Rainfall_ind2025_rfp25.grd",
                          epochs: int = 2, batch_size: int = 16, lr: float = 1e-3,
                          min_peak_mm: float = 60, device: str = "cpu",
                          output_dir: str = "checkpoints") -> dict:
    torch.manual_seed(42)
    np.random.seed(42)
    source = IMDGriddedParser(filepath=grd_path)
    crops = source.extract_extreme_training_crops(min_peak_mm=min_peak_mm, crop_size=38)
    train, validation, boundary = split_by_date(crops)
    train_loader = DataLoader(IMDRainfallDataset(train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(IMDRainfallDataset(validation), batch_size=batch_size)
    dev = torch.device("cuda" if device == "cuda" and torch.cuda.is_available() else "cpu")
    model = ResidualDownscaler(in_channels=1, out_channels=1, hidden_dim=16).to(dev)
    loss_fn = ExtremeTailPreservationLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    history = []
    for epoch in range(epochs):
        model.train()
        losses = []
        for batch in train_loader:
            coarse, terrain, metadata, target = (batch[k].to(dev) for k in ("coarse", "terrain", "metadata", "target"))
            optimizer.zero_grad()
            pred = model(coarse, terrain, metadata)["y_5km"]
            if pred.shape[-2:] != target.shape[-2:]:
                pred = F.interpolate(pred, size=target.shape[-2:], mode="bilinear", align_corners=False)
            loss, _ = loss_fn(pred, target, terrain)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1)
            optimizer.step()
            losses.append(float(loss.item()))
        history.append(round(float(np.mean(losses)), 3))
        print(f"Epoch {epoch + 1}/{epochs}: loss {history[-1]:.3f}")

    model.eval()
    predictions, baselines, targets = [], [], []
    with torch.no_grad():
        for batch in val_loader:
            coarse, terrain, metadata, target = (batch[k].to(dev) for k in ("coarse", "terrain", "metadata", "target"))
            pred = model(coarse, terrain, metadata)["y_5km"]
            if pred.shape[-2:] != target.shape[-2:]:
                pred = F.interpolate(pred, size=target.shape[-2:], mode="bilinear", align_corners=False)
            baseline = F.interpolate(coarse, size=target.shape[-2:], mode="bilinear", align_corners=False)
            predictions.extend(np.maximum(pred.cpu().numpy()[:, 0], 0))
            baselines.extend(baseline.cpu().numpy()[:, 0])
            targets.extend(target.cpu().numpy()[:, 0])

    results = {
        "experiment": "IMD 0.25° coarse-proxy reconstruction",
        "model": "deterministic residual CNN",
        "not_a_forecast": True,
        "not_5km_downscaling": True,
        "source": "IMD Pune 2025 daily 0.25° gridded rainfall",
        "coarse_proxy": "Gaussian-smoothed target resampled from 38x38 to 16x16; no independent NWP input",
        "validation": {
            "method": "chronological date holdout with a three-day purge gap",
            "first_validation_date": (date(2025, 1, 1) + timedelta(days=boundary)).isoformat(),
            "train_samples": len(train), "validation_samples": len(validation),
            "heavy_rain_threshold_mm_day": HEAVY_RAIN_MM_DAY,
            "residual_cnn": metrics(predictions, targets),
            "bilinear": metrics(baselines, targets),
        },
        "training": {"epochs": epochs, "batch_size": batch_size, "loss": history},
    }
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    torch.save({"model_state_dict": model.state_dict(), "results": results}, Path(output_dir) / "imd2025_residual_cnn.pt")
    output = Path("data/real_imd_training_results.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    web_output = Path("avarta/public/replay/training-benchmark.json")
    web_output.parent.mkdir(parents=True, exist_ok=True)
    web_output.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results["validation"], indent=2))
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    args = parser.parse_args()
    run_real_imd_training(epochs=args.epochs, batch_size=args.batch_size, device=args.device)
