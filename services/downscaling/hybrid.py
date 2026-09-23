"""Hybrid downscaling pipeline 12 km -> ~5 km (Phase 3).

Progressive strategy so the demo always works:

Version 1 (shipped): bilinear interpolation to the fine grid. Transparent,
    no learned skill claimed.
Version 2 (experimental): deterministic residual CNN from
    models/residual_downscaler. Uses checkpoint
    checkpoints/imd2025_residual_cnn.pt when present, else reports
    unavailable instead of inventing weights.
Advanced (architecture only): conditional diffusion model in
    models/conditional_diffusion has no trained weights; this module reports
    its status honestly and never samples random weights as weather.

All outputs carry method + validation flags so the UI/API cannot present
interpolation as a learned 5 km forecast.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import numpy as np
from scipy.ndimage import zoom

CHECKPOINT = Path("checkpoints/imd2025_residual_cnn.pt")


def downscale_v1_bilinear(coarse: np.ndarray, factor: float = 2.4) -> np.ndarray:
    """Bilinear upsampling. Factor 2.4 maps ~12 km to ~5 km."""
    coarse = np.asarray(coarse, dtype=np.float32)
    if coarse.ndim != 2:
        raise ValueError("coarse field must be 2D")
    if factor <= 0:
        raise ValueError("factor must be positive")
    upsampled = zoom(coarse, factor, order=1).astype(np.float32)
    return np.maximum(upsampled, 0.0)


def peak_preservation(baseline_peak: float, candidate_peak: float) -> float | None:
    if not baseline_peak or baseline_peak <= 0:
        return None
    return round(float(candidate_peak / baseline_peak), 3)


def downscale_v2_cnn(coarse: np.ndarray, factor: float = 2.4) -> Dict[str, Any]:
    """Try the trained residual CNN; fall back to an honest unavailable flag.

    The checkpoint expects a 16x16 coarse proxy and was trained on
    target-derived IMD data (not NWP -> 5 km). Loading it here is for
    interface comparison only, never as validated skill.
    """
    try:
        import torch  # noqa: F401
    except ImportError:
        return {"available": False, "reason": "torch not installed", "field": None}
    if not CHECKPOINT.exists():
        return {"available": False, "reason": "no trained checkpoint", "field": None}
    try:
        from models.residual_downscaler.diffusion_downscaler import ResidualDownscaler

        import torch
        import torch.nn.functional as F

        checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=False)
        state = checkpoint.get("model_state_dict", checkpoint)
        # Checkpoint was trained with hidden_dim=16, single channel.
        model = ResidualDownscaler(in_channels=1, out_channels=1, hidden_dim=16)
        model.load_state_dict(state, strict=False)
        model.eval()
        array = np.asarray(coarse, dtype=np.float32)
        tensor = torch.from_numpy(array[None, None])
        terrain = torch.zeros((1, 1, array.shape[0], array.shape[1]))
        threat = torch.zeros((1, 8))
        with torch.no_grad():
            output = model(tensor, terrain, threat)["y_5km"]
            target_h = max(1, round(array.shape[0] * factor))
            target_w = max(1, round(array.shape[1] * factor))
            if output.shape[-2:] != (target_h, target_w):
                output = F.interpolate(output, size=(target_h, target_w), mode="bilinear", align_corners=False)
            field = np.maximum(output.numpy()[0, 0], 0.0).astype(np.float32)
        return {
            "available": True,
            "reason": "checkpoint inference; experimental coarse-proxy CNN, not validated 5 km skill",
            "field": field,
        }
    except Exception as error:  # never break the dashboard on experimental path
        return {"available": False, "reason": f"cnn inference failed: {error}", "field": None}


def diffusion_status() -> Dict[str, Any]:
    return {
        "available": False,
        "reason": "conditional DDPM architecture exists with no trained weights or 5 km skill result",
        "module": "models/conditional_diffusion/precip_ddpm.py",
    }


def compare_methods(coarse: np.ndarray, factor: float = 2.4) -> Dict[str, Any]:
    """Run every downscaling tier and return a dashboard-ready comparison."""
    coarse = np.asarray(coarse, dtype=np.float32)
    bilinear = downscale_v1_bilinear(coarse, factor)
    cnn = downscale_v2_cnn(coarse, factor)
    coarse_peak = float(np.nanmax(coarse)) if coarse.size else 0.0
    bilinear_peak = float(np.nanmax(bilinear)) if bilinear.size else 0.0
    result: Dict[str, Any] = {
        "coarse_peak": round(coarse_peak, 2),
        "methods": {
            "v1_bilinear": {
                "available": True,
                "peak": round(bilinear_peak, 2),
                "peak_preservation_ratio": peak_preservation(coarse_peak, bilinear_peak),
                "note": "Transparent interpolation baseline. No learned detail.",
                "field_shape": list(bilinear.shape),
            },
            "v2_cnn": {
                "available": bool(cnn["available"]),
                "peak": round(float(np.nanmax(cnn["field"])), 2) if cnn["field"] is not None else None,
                "peak_preservation_ratio": (
                    peak_preservation(coarse_peak, float(np.nanmax(cnn["field"])))
                    if cnn["field"] is not None
                    else None
                ),
                "note": cnn["reason"],
                "field_shape": list(cnn["field"].shape) if cnn["field"] is not None else None,
            },
            "advanced_diffusion": {
                **diffusion_status(),
                "peak": None,
                "peak_preservation_ratio": None,
            },
        },
        "validation": "Bilinear is the only deployed path. CNN/diffusion need paired "
        "forecast/high-resolution targets and event holdouts before any skill claim.",
    }
    return result
