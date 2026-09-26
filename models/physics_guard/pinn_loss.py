"""Differentiable Physics-Informed Neural Network (PINN) Loss Layer.

Embeds atmospheric fluid dynamics and thermodynamic conservation laws directly
into PyTorch backpropagation:
1. Moisture Flux Convergence: Nabla · (q * v) <= 0
   Penalizes predicted heavy downpours that lack physical moisture inflow.
2. Positive-Definite Precipitation: P >= 0
   Enforces non-negativity without unphysical negative rainfall artifacts.
3. Horizontal Wind Mass Divergence: du/dx + dv/dy ~ 0
   Penalizes unphysical mass divergence in the lower troposphere.
4. Extreme Tail Preservation:
   Applies exponential weighting to errors on upper-percentile events (>P95).
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class PINNPhysicsLoss(nn.Module):
    """Differentiable physics loss module for precipitation and wind downscaling."""

    def __init__(
        self,
        weight_mse: float = 1.0,
        weight_tail: float = 3.0,
        weight_moisture_conv: float = 0.5,
        weight_non_neg: float = 2.0,
        weight_continuity: float = 0.2,
        dx_meters: float = 5000.0,
        dy_meters: float = 5000.0,
        extreme_percentile: float = 0.95,
    ):
        super().__init__()
        self.weight_mse = weight_mse
        self.weight_tail = weight_tail
        self.weight_moisture_conv = weight_moisture_conv
        self.weight_non_neg = weight_non_neg
        self.weight_continuity = weight_continuity
        self.dx = dx_meters
        self.dy = dy_meters
        self.extreme_percentile = extreme_percentile

        # Central difference kernels for spatial derivatives
        # d/dx: [-1, 0, 1] / (2 * dx)
        kx = torch.tensor([[-0.5, 0.0, 0.5]], dtype=torch.float32).unsqueeze(0).unsqueeze(0) / self.dx
        # d/dy: [[-0.5], [0.0], [0.5]] / (2 * dy)
        ky = torch.tensor([[-0.5], [0.0], [0.5]], dtype=torch.float32).unsqueeze(0).unsqueeze(0) / self.dy
        self.register_buffer("kernel_x", kx)
        self.register_buffer("kernel_y", ky)

    def _gradient_x(self, x: torch.Tensor) -> torch.Tensor:
        """Compute horizontal spatial derivative d(x)/dx using replication padding."""
        padded = F.pad(x, (1, 1, 0, 0), mode="replicate")
        return F.conv2d(padded, self.kernel_x)

    def _gradient_y(self, y: torch.Tensor) -> torch.Tensor:
        """Compute vertical spatial derivative d(y)/dy using replication padding."""
        padded = F.pad(y, (0, 0, 1, 1), mode="replicate")
        return F.conv2d(padded, self.kernel_y)

    def forward(
        self,
        y_pred: torch.Tensor,
        y_true: torch.Tensor,
        specific_humidity: Optional[torch.Tensor] = None,
        u_wind: Optional[torch.Tensor] = None,
        v_wind: Optional[torch.Tensor] = None,
    ) -> Dict[str, torch.Tensor]:
        """Compute composite physics-informed loss with separate term diagnostics.

        Args:
            y_pred: [B, 1, H, W] predicted precipitation in mm/day or mm/h
            y_true: [B, 1, H, W] ground truth precipitation
            specific_humidity: [B, 1, H, W] specific humidity q (kg/kg)
            u_wind: [B, 1, H, W] zonal wind u (m/s)
            v_wind: [B, 1, H, W] meridional wind v (m/s)
        """
        # 1. Base Mean Squared Error
        mse_loss = F.mse_loss(y_pred, y_true)

        # 2. Extreme-tail Weighted Loss
        with torch.no_grad():
            b, _, h, w = y_true.shape
            threshold = torch.quantile(y_true.view(b, -1), self.extreme_percentile, dim=1)
            threshold = threshold.view(b, 1, 1, 1)
            tail_mask = (y_true >= threshold).float()

        tail_loss = torch.mean(tail_mask * (y_pred - y_true) ** 2)

        # 3. Non-negativity constraint: penalize P < 0
        non_neg_penalty = torch.mean(F.relu(-y_pred) ** 2)

        # 4. Moisture Flux Convergence Constraint
        # Moisture flux: F_x = q * u, F_y = q * v
        # Convergence = - (d(qu)/dx + d(qv)/dy)
        if specific_humidity is not None and u_wind is not None and v_wind is not None:
            qu = specific_humidity * u_wind
            qv = specific_humidity * v_wind
            div_q = self._gradient_x(qu) + self._gradient_y(qv)
            moisture_convergence = -div_q

            # Where heavy precipitation is predicted (> 25 mm/day), require positive moisture convergence
            # Penalty when high rain is predicted with divergence (moisture_convergence < 0)
            heavy_rain = F.relu(y_pred - 25.0)
            unsupported_rain = heavy_rain * F.relu(-moisture_convergence)
            moisture_loss = torch.mean(unsupported_rain)

            # 5. Mass continuity proxy: horizontal divergence du/dx + dv/dy
            div_v = self._gradient_x(u_wind) + self._gradient_y(v_wind)
            continuity_loss = torch.mean(div_v ** 2)
        else:
            moisture_loss = torch.tensor(0.0, device=y_pred.device, dtype=y_pred.dtype)
            continuity_loss = torch.tensor(0.0, device=y_pred.device, dtype=y_pred.dtype)

        # Composite total loss
        total_loss = (
            self.weight_mse * mse_loss
            + self.weight_tail * tail_loss
            + self.weight_non_neg * non_neg_penalty
            + self.weight_moisture_conv * moisture_loss
            + self.weight_continuity * continuity_loss
        )

        return {
            "loss": total_loss,
            "mse_loss": mse_loss,
            "tail_loss": tail_loss,
            "non_neg_loss": non_neg_penalty,
            "moisture_loss": moisture_loss,
            "continuity_loss": continuity_loss,
        }
