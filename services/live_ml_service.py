"""Live ML & PyTorch Training Service for Avarta.

Provides:
1. Real forward & backward pass execution with PINNPhysicsLoss and ResidualDownscaler.
2. Spherical icosahedral GNN mesh telemetry and EFI anomaly activation.
3. Conditional DDPM step-by-step denoising telemetry.
4. Genuine checkpoint inspection (checkpoints/best_downscaler.pt).
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

import numpy as np

# Ensure root directory is on Python path
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

CHECKPOINT_PATH = REPO_ROOT / "checkpoints" / "best_downscaler.pt"
BENCHMARK_PATH = REPO_ROOT / "data" / "real_imd_training_results.json"


def get_checkpoint_metadata() -> Dict[str, Any]:
    """Inspect the real trained checkpoint file on disk."""
    import torch

    meta: Dict[str, Any] = {
        "checkpoint_exists": CHECKPOINT_PATH.exists(),
        "path": str(CHECKPOINT_PATH),
        "total_parameters": 0,
        "layers": [],
        "training_history": {},
    }

    if not CHECKPOINT_PATH.exists():
        return meta

    try:
        ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
        state_dict = ckpt.get("model_state_dict", ckpt)
        total_params = 0
        layers_info = []

        for name, tensor in state_dict.items():
            param_count = tensor.numel()
            total_params += param_count
            layers_info.append({
                "name": name,
                "shape": list(tensor.shape),
                "params": param_count,
                "dtype": str(tensor.dtype).replace("torch.", "")
            })

        meta["total_parameters"] = total_params
        meta["layers"] = layers_info
        history = ckpt.get("history", {})
        meta["history"] = history
        epochs = ckpt.get("epochs")
        if epochs is None and isinstance(history, dict):
            epochs = len(history.get("epoch", [])) or None
        meta["epochs"] = epochs
        if "final_peak_recovery" in ckpt:
            meta["final_peak_recovery"] = ckpt["final_peak_recovery"]
    except Exception as err:
        meta["error"] = str(err)

    if BENCHMARK_PATH.exists():
        try:
            meta["imd_validation"] = json.loads(BENCHMARK_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass

    return meta


def run_live_training_step(step_idx: int = 1, hazard: str = "rainfall") -> Dict[str, Any]:
    """Execute a genuine PyTorch forward + backward pass using PINNPhysicsLoss."""
    import torch
    import torch.nn.functional as F
    from models.physics_guard.pinn_loss import PINNPhysicsLoss
    from models.residual_downscaler.diffusion_downscaler import ResidualDownscaler

    start_time = time.perf_counter()

    # Reproducible seed modulated by step
    torch.manual_seed(42 + step_idx)
    np.random.seed(42 + step_idx)

    # Initialize model with hidden_dim=16
    model = ResidualDownscaler(in_channels=1, out_channels=1, hidden_dim=16)
    model.train()

    # Differentiable physics loss layer
    loss_fn = PINNPhysicsLoss(
        weight_mse=1.0,
        weight_tail=3.5,
        weight_moisture_conv=0.8,
        weight_non_neg=2.0,
        weight_continuity=0.2,
        dx_meters=5000.0,
        dy_meters=5000.0,
        extreme_percentile=0.90,
    )

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3 * (0.98 ** (step_idx % 50)))

    # Construct realistic synthetic atmospheric batch [B=2, C=1, 16, 16]
    coarse_16 = torch.abs(torch.randn(2, 1, 16, 16) * 35.0)
    terrain_38 = torch.clamp(torch.randn(2, 1, 38, 38) * 0.3 + 0.5, 0.0, 3.0)
    threat_vec = torch.tensor([
        [28.4, 77.3, 2.5, -1.8, 148.0, 4.2, 0.94, 0.92],
        [19.1, 85.2, 4.8, -3.1, 210.0, 6.8, 0.98, 0.95],
    ], dtype=torch.float32)

    # Ground truth with severe cloudburst peak
    target_38 = torch.abs(torch.randn(2, 1, 38, 38) * 45.0)
    target_38[:, :, 15:22, 15:22] += 120.0  # Intense cloudburst core

    # Atmospheric moisture & wind vector fields for physical balance
    q = torch.clamp(torch.randn(2, 1, 38, 38) * 0.005 + 0.016, 0.001, 0.030)  # kg/kg
    u = torch.randn(2, 1, 38, 38) * 8.0 - 5.0  # m/s
    v = torch.randn(2, 1, 38, 38) * 6.0 + 8.0  # m/s

    # Forward pass
    out = model(coarse_16, terrain_38, threat_vec)
    pred_5km = out["y_5km"]

    if pred_5km.shape[-2:] != target_38.shape[-2:]:
        pred_5km = F.interpolate(pred_5km, size=target_38.shape[-2:], mode="bilinear", align_corners=False)

    # Compute PINN loss with all 5 physics terms
    loss_dict = loss_fn(pred_5km, target_38, specific_humidity=q, u_wind=u, v_wind=v)
    total_loss = loss_dict["loss"]

    # Backward pass & optimization
    optimizer.zero_grad()
    total_loss.backward()

    # Compute gradient norm
    grad_norm = 0.0
    for p in model.parameters():
        if p.grad is not None:
            param_norm = p.grad.data.norm(2).item()
            grad_norm += param_norm ** 2
    grad_norm = math.sqrt(grad_norm)

    optimizer.step()
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    # Downsampled 2D arrays for live visualization heatmap (8x8 subgrid)
    coarse_slice = coarse_16[0, 0].detach().numpy()[::2, ::2].round(1).tolist()
    pred_slice = pred_5km[0, 0].detach().numpy()[::4, ::4].round(1).tolist()
    target_slice = target_38[0, 0].detach().numpy()[::4, ::4].round(1).tolist()

    return {
        "step": step_idx,
        "hazard": hazard,
        "experiment_scope": "independent_seeded_synthetic_gradient_probe",
        "persistent_optimizer_state": False,
        "convergence_claimed": False,
        "elapsed_ms": round(elapsed_ms, 2),
        "total_loss": round(total_loss.item(), 3),
        "loss_components": {
            "mse_loss": round(loss_dict["mse_loss"].item(), 3),
            "tail_loss": round(loss_dict["tail_loss"].item(), 3),
            "moisture_loss": round(loss_dict["moisture_loss"].item(), 4),
            "non_neg_loss": round(loss_dict["non_neg_loss"].item(), 4),
            "continuity_loss": round(loss_dict["continuity_loss"].item(), 6),
        },
        "gradient_norm": round(grad_norm, 3),
        "learning_rate": round(optimizer.param_groups[0]["lr"], 6),
        "predicted_peak_mm": round(float(pred_5km.max().item()), 1),
        "target_peak_mm": round(float(target_38.max().item()), 1),
        "preview": {
            "coarse": coarse_slice,
            "predicted": pred_slice,
            "target": target_slice,
        },
    }


def get_spherical_gnn_simulation() -> Dict[str, Any]:
    """Execute an architecture smoke test; random weights are never meteorology."""
    import torch
    from models.spherical_gnn.icosahedron import (
        EnsembleTemporalSphericalGNN,
        generate_icosahedron_vertices,
        subdivide_mesh,
    )

    verts = generate_icosahedron_vertices()
    nodes, edges = subdivide_mesh(verts, level=2)  # 162 nodes, 960 edges

    torch.manual_seed(101)
    gnn = EnsembleTemporalSphericalGNN(in_channels=11, hidden_dim=16, layers=1)
    gnn.eval()
    x = torch.randn(1, 3, 2, nodes.shape[0], 11)
    edge_index = torch.from_numpy(edges).long()
    positions = torch.from_numpy(nodes)

    with torch.no_grad():
        first = gnn(x, edge_index, positions)
        permuted = gnn(x[:, [2, 0, 1]], edge_index, positions)
    invariance_error = float(torch.max(torch.abs(
        first["anomaly_probability"] - permuted["anomaly_probability"]
    )).item())

    return {
        "level": 2,
        "total_nodes": int(nodes.shape[0]),
        "total_edges": int(edges.shape[1]),
        "architecture": "Member attention -> Earth-relative GNN -> lead-time GRU -> multi-task heads",
        "parameters": sum(parameter.numel() for parameter in gnn.parameters()),
        "input_shape": list(x.shape),
        "output_shape": list(first["anomaly_probability"].shape),
        "member_permutation_invariance_max_error": invariance_error,
        "weights_status": "random_architecture_smoke_test",
        "meteorological_skill_claimed": False,
    }


def get_diffusion_denoise_telemetry() -> Dict[str, Any]:
    """Inspect implemented DDPM machinery without fabricating skill telemetry."""
    from models.conditional_diffusion.precip_ddpm import ConditionalPrecipitationDiffusion

    model = ConditionalPrecipitationDiffusion(coarse_channels=7, steps=100)
    return {
        "total_timesteps": 100,
        "diffusion_schedule": "Linear beta schedule [1e-4 -> 0.02]",
        "parameters": sum(parameter.numel() for parameter in model.parameters()),
        "objective_terms": [
            "tail_weighted_denoising",
            "fft_spectral_fidelity",
            "coarse_scale_conservation",
            "extreme_peak_preservation",
            "optional_moisture_flux_and_continuity",
        ],
        "trained_checkpoint": False,
        "validated_5km_skill": False,
    }


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"
    if mode == "step":
        step_num = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        res = run_live_training_step(step_num)
        print(json.dumps(res, indent=2))
    elif mode == "gnn":
        res = get_spherical_gnn_simulation()
        print(json.dumps(res, indent=2))
    elif mode == "diffusion":
        res = get_diffusion_denoise_telemetry()
        print(json.dumps(res, indent=2))
    else:
        res = {
            "checkpoint": get_checkpoint_metadata(),
            "diffusion": get_diffusion_denoise_telemetry(),
            "gnn": get_spherical_gnn_simulation(),
        }
        print(json.dumps(res, indent=2))
