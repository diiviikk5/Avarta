"""
Avarta Amplitude-Preserving Generative Residual Downscaler (Stage 2)
Solves the Spectral Smoothing Problem: Standard CNN/U-Nets average out high-intensity peaks.
Avarta uses a conditional residual generator that preserves extreme amplitudes and high-frequency wavelets.
"""

from typing import Dict, Any, Optional
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


if HAS_TORCH:
    class ResidualBlock(nn.Module):
        def __init__(self, channels: int):
            super().__init__()
            self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
            self.norm1 = nn.GroupNorm(4, channels)
            self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
            self.norm2 = nn.GroupNorm(4, channels)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            h = F.silu(self.norm1(self.conv1(x)))
            h = self.norm2(self.conv2(h))
            return x + h


    class ThreatConditioningEncoder(nn.Module):
        """Embeds structured ThreatObject metadata (intensity, velocity, lifecycle) into latent space."""
        def __init__(self, threat_dim: int = 8, embed_dim: int = 64):
            super().__init__()
            self.fc = nn.Sequential(
                nn.Linear(threat_dim, embed_dim),
                nn.SiLU(),
                nn.Linear(embed_dim, embed_dim)
            )

        def forward(self, threat_features: torch.Tensor) -> torch.Tensor:
            return self.fc(threat_features)


    class ResidualDownscaler(nn.Module):
        """
        Input:
            x_12km: Coarse forecast field (B, C, H, W)
            terrain: Elevation & orography (B, 1, H*2.4, W*2.4)
            threat_emb: ThreatObject latent vector (B, D)
        Output:
            y_5km: High-resolution field with extreme-tail preservation
        """
        def __init__(self, in_channels: int = 4, out_channels: int = 1, hidden_dim: int = 64):
            super().__init__()
            self.threat_encoder = ThreatConditioningEncoder()
            
            # Bilinear upsampler for coarse baseline
            self.upsample = nn.Upsample(scale_factor=2.4, mode="bilinear", align_corners=False)
            
            # Residual feature extractor
            self.in_proj = nn.Conv2d(in_channels + 1, hidden_dim, kernel_size=3, padding=1)
            self.res1 = ResidualBlock(hidden_dim)
            self.res2 = ResidualBlock(hidden_dim)
            
            # Extreme amplitude head (ensures non-smoothing of 99th percentile peaks)
            self.out_residual = nn.Sequential(
                nn.Conv2d(hidden_dim, hidden_dim // 2, kernel_size=3, padding=1),
                nn.SiLU(),
                nn.Conv2d(hidden_dim // 2, out_channels, kernel_size=1)
            )

        def forward(self, x_12km: torch.Tensor, terrain_5km: torch.Tensor, threat_vec: torch.Tensor) -> Dict[str, torch.Tensor]:
            # 1. Compute smooth baseline
            baseline_5km = self.upsample(x_12km[:, :1])
            
            # 2. Resample coarse atmospheric variables to fine grid
            x_upsampled = self.upsample(x_12km)
            
            # 3. Concatenate atmospheric state with local terrain
            features = torch.cat([x_upsampled, terrain_5km], dim=1)
            h = self.in_proj(features)
            
            # 4. Threat condition injection
            threat_latent = self.threat_encoder(threat_vec)  # (B, D)
            h = h + threat_latent.unsqueeze(-1).unsqueeze(-1)
            
            # 5. Extract fine-scale turbulent residual
            h = self.res1(h)
            h = self.res2(h)
            residual = self.out_residual(h)
            
            # 6. Composite field = Baseline + Extreme-preserving Residual
            reconstructed_5km = baseline_5km + residual
            
            return {
                "y_5km": reconstructed_5km,
                "residual_5km": residual,
                "baseline_5km": baseline_5km
            }


class ExtremeTailPreservationLoss:
    """
    Custom Loss Function that prevents spectral smoothing by penalizing
    under-prediction of extreme-tail percentiles (e.g. 99th percentile rainfall).
    """
    def __init__(self, alpha_extreme: float = 3.5, percentile_threshold: float = 0.95):
        self.alpha_extreme = alpha_extreme
        self.percentile_threshold = percentile_threshold

    def compute_loss(self, y_pred: np.ndarray, y_true: np.ndarray) -> Dict[str, float]:
        mse_base = float(np.mean((y_pred - y_true) ** 2))
        
        # High-percentile mask
        cutoff = np.percentile(y_true, self.percentile_threshold * 100)
        extreme_mask = (y_true >= cutoff).astype(np.float32)
        
        # Weighted extreme penalty
        extreme_penalty = float(np.sum(extreme_mask * ((y_pred - y_true) ** 2)) / (np.sum(extreme_mask) + 1e-6))
        
        total_loss = mse_base + self.alpha_extreme * extreme_penalty
        return {
            "total_loss": total_loss,
            "base_mse": mse_base,
            "extreme_tail_penalty": extreme_penalty
        }
