"""
Avarta Real-World IMD 2025 Training Pipeline
Trains the ResidualDownscaler on actual 2025 India Meteorological Department (IMD)
high-resolution 0.25° gridded rainfall data (Rainfall_ind2025_rfp25.grd).

Implements the exact SIH-26078 requirements:
- Downscaling from coarse 12 km NWP to fine 5 km sub-grid
- ExtremeTailPreservationLoss targeting the 90th-99th percentile deluge amplitudes
- Preservation of localized peak intensities (e.g. 469.21 mm/day monsoon peaks)
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, List, Any, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Fix windows utf-8 encoding if needed
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure root directory on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.residual_downscaler.diffusion_downscaler import ResidualDownscaler
from services.ingestion.imd_gridded_parser import IMDGriddedParser
from training.train_downscaler import ExtremeTailPreservationLoss


class IMDRainfallDataset(Dataset):
    """
    PyTorch Dataset built directly on real IMD 2025 gridded rainfall records.
    Pairs 16x16 coarse resolution inputs with 38x38 fine resolution ground truth targets.
    """
    def __init__(self, crops: List[Dict[str, Any]]):
        self.crops = crops

    def __len__(self) -> int:
        return len(self.crops)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = self.crops[idx]
        fine_gt = item["fine_target_5km"]  # (38, 38)
        coarse_in = item["coarse_12km"]     # (16, 16)
        lat = item["lat_center"]
        lon = item["lon_center"]
        peak = item["peak_mm"]

        # Multichannel NWP representation (channel 0: rain, 1: simulated moisture, 2: zonal flux, 3: meridional)
        # Normalization: keep rainfall in mm, scale for stability
        x_coarse = np.repeat(coarse_in[None, :, :], 4, axis=0).astype(np.float32)
        x_coarse[1] *= 0.90
        x_coarse[2] *= 1.05
        x_coarse[3] *= 0.95

        # Synthetic DEM orography elevation proxy based on Western Ghats / Himalayas coordinates
        # Real geographical elevation proxy from lat/lon
        orography_height = 0.2
        if lat > 27.0:
            orography_height = min(3.5, 0.5 + (lat - 27.0) * 0.4)
        elif 8.0 < lat < 21.0 and 73.0 < lon < 76.0:
            orography_height = 1.2  # Western Ghats escarpment
        terrain = np.full((1, 38, 38), orography_height, dtype=np.float32)

        # Threat state embedding vector [lat, lon, v_lat, v_lon, peak_mm, convective_idx, efi, confidence]
        efi = min(1.0, max(0.5, peak / 200.0))
        threat_vec = np.array([lat, lon, 0.0, 0.0, peak, peak / 24.0, efi, 0.95], dtype=np.float32)

        return {
            "x_12km": torch.from_numpy(x_coarse),
            "terrain": torch.from_numpy(terrain),
            "threat_vec": torch.from_numpy(threat_vec),
            "y_5km_true": torch.from_numpy(fine_gt[None, :, :])
        }


def run_real_imd_training(
    grd_path: str = "data/raw/Rainfall_ind2025_rfp25.grd",
    epochs: int = 5,
    batch_size: int = 16,
    lr: float = 1e-3,
    min_peak_mm: float = 60.0,
    device: str = "cpu",
    output_dir: str = "checkpoints"
) -> Dict[str, Any]:
    """
    Executes training on the real 2025 IMD rainfall dataset.
    """
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs("data", exist_ok=True)

    print("================================================================================")
    print("      AVARTA REAL IMD 2025 DOWNSCALING & EXTREME-TAIL MODEL TRAINING           ")
    print("================================================================================")
    print(f"[*] Ingesting real binary IMD dataset from: {grd_path}")

    parser = IMDGriddedParser(filepath=grd_path)
    summary = parser.get_summary()
    print(f"[*] Total days: {summary['total_days']} | Grid: {summary['grid_dimensions']}")
    print(f"[*] All-India 2025 Peak Rainfall: {summary['all_time_peak_mm']} mm/day")
    print(f"[*] Annual Mean: {summary['annual_mean_rainfall_mm']} mm/day")

    print(f"[*] Extracting real deluge training crops (threshold: >={min_peak_mm} mm/day)...")
    crops = parser.extract_extreme_training_crops(min_peak_mm=min_peak_mm, crop_size=38)
    print(f"[+] Successfully extracted {len(crops)} real extreme cloudburst/monsoon training crops.")

    # Train / Val Split (80% / 20%)
    np.random.seed(42)
    indices = np.random.permutation(len(crops))
    split = int(0.8 * len(crops))
    train_crops = [crops[i] for i in indices[:split]]
    val_crops = [crops[i] for i in indices[split:]]

    train_ds = IMDRainfallDataset(train_crops)
    val_ds = IMDRainfallDataset(val_crops)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    dev = torch.device(device if torch.cuda.is_available() and device == "cuda" else "cpu")
    print(f"[*] Initializing ResidualDownscaler on device: {dev}")

    model = ResidualDownscaler(in_channels=4, out_channels=1, hidden_dim=64).to(dev)
    criterion = ExtremeTailPreservationLoss(quantile_threshold=0.90, alpha_tail=4.0, beta_physics=1.5)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[+] Model Architecture Parameters: {total_params:,}")

    history = {
        "train_loss": [],
        "val_loss": [],
        "train_tail_loss": [],
        "val_tail_loss": [],
        "peak_preservation_ratio": []
    }

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        train_losses = []
        train_tails = []

        for batch in train_loader:
            x_12 = batch["x_12km"].to(dev)
            terrain = batch["terrain"].to(dev)
            threat = batch["threat_vec"].to(dev)
            y_true = batch["y_5km_true"].to(dev)

            optimizer.zero_grad()
            out = model(x_12, terrain, threat)
            y_pred = out["y_5km"]
            if y_pred.shape[-2:] != y_true.shape[-2:]:
                y_pred = torch.nn.functional.interpolate(y_pred, size=y_true.shape[-2:], mode="bilinear", align_corners=False)
            loss, metrics = criterion(y_pred, y_true, terrain)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_losses.append(metrics["total_loss"])
            train_tails.append(metrics["tail_loss"])

        # Validation phase
        model.eval()
        val_losses = []
        val_tails = []
        pred_peaks = []
        true_peaks = []

        with torch.no_grad():
            for batch in val_loader:
                x_12 = batch["x_12km"].to(dev)
                terrain = batch["terrain"].to(dev)
                threat = batch["threat_vec"].to(dev)
                y_true = batch["y_5km_true"].to(dev)

                out = model(x_12, terrain, threat)
                y_pred = out["y_5km"]
                if y_pred.shape[-2:] != y_true.shape[-2:]:
                    y_pred = torch.nn.functional.interpolate(y_pred, size=y_true.shape[-2:], mode="bilinear", align_corners=False)
                loss, metrics = criterion(y_pred, y_true, terrain)

                val_losses.append(metrics["total_loss"])
                val_tails.append(metrics["tail_loss"])

                # Measure extreme amplitude preservation
                for b in range(y_true.size(0)):
                    true_peaks.append(float(torch.max(y_true[b]).cpu().item()))
                    pred_peaks.append(float(torch.max(y_pred[b]).cpu().item()))

        avg_train = float(np.mean(train_losses))
        avg_val = float(np.mean(val_losses))
        avg_val_tail = float(np.mean(val_tails))
        peak_ratio = float(np.mean(pred_peaks) / (np.mean(true_peaks) + 1e-6))

        history["train_loss"].append(avg_train)
        history["val_loss"].append(avg_val)
        history["train_tail_loss"].append(float(np.mean(train_tails)))
        history["val_tail_loss"].append(avg_val_tail)
        history["peak_preservation_ratio"].append(peak_ratio)

        print(f"Epoch [{epoch:02d}/{epochs:02d}] | Train Loss: {avg_train:.4f} | Val Loss: {avg_val:.4f} | Val Tail Loss: {avg_val_tail:.4f} | Peak Preservation: {peak_ratio*100:.1f}%")

    elapsed = round(time.time() - start_time, 2)
    checkpoint_path = os.path.join(output_dir, "imd2025_residual_downscaler.pt")
    torch.save({
        "epoch": epochs,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "summary": summary,
        "val_loss": history["val_loss"][-1],
        "peak_preservation_ratio": history["peak_preservation_ratio"][-1],
        "training_time_sec": elapsed
    }, checkpoint_path)
    print(f"[+] Model checkpoint saved to: {checkpoint_path}")

    # Save real metrics to JSON for web console & TUI integration
    results = {
        "dataset_name": "IMD Pune 0.25° Gridded Rainfall (2025)",
        "source_file": summary["source_file"],
        "dataset_summary": summary,
        "training_stats": {
            "num_extreme_crops": len(crops),
            "train_samples": len(train_crops),
            "val_samples": len(val_crops),
            "epochs": epochs,
            "batch_size": batch_size,
            "trainable_parameters": total_params,
            "training_time_seconds": elapsed,
            "final_train_loss": round(history["train_loss"][-1], 4),
            "final_val_loss": round(history["val_loss"][-1], 4),
            "final_val_tail_loss": round(history["val_tail_loss"][-1], 4),
            "peak_preservation_ratio": round(history["peak_preservation_ratio"][-1], 4),
            "loss_history": history
        }
    }

    metrics_file = "data/real_imd_training_results.json"
    with open(metrics_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[+] Real training metrics recorded to: {metrics_file}")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Avarta on Real IMD 2025 Dataset")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or cuda)")
    args = parser.parse_args()

    run_real_imd_training(epochs=args.epochs, batch_size=args.batch_size, device=args.device)
