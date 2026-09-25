"""Untrained conditional DDPM candidate for rainfall downscaling.

This is a functioning generative model architecture, not a validated Avarta
forecast product. It needs independent, aligned forecast/observation pairs,
terrain, event-held-out training and benchmark comparison before deployment.
Neither 12 km nor 5 km spacing is inferred from tensor shape.
"""

from __future__ import annotations

import math

import torch
from torch import nn
from torch.nn import functional as F


MAX_RAIN_MM = 500.0


def normalize_rain(rain_mm: torch.Tensor) -> torch.Tensor:
    """Log-transform nonnegative daily rainfall into a nominal [0, 1] range."""
    if torch.any(rain_mm < 0):
        raise ValueError("Rainfall cannot be negative")
    return torch.log1p(rain_mm) / math.log1p(MAX_RAIN_MM)


def denormalize_rain(normalized: torch.Tensor) -> torch.Tensor:
    return torch.expm1(normalized.clamp(0, 1) * math.log1p(MAX_RAIN_MM))


class ConditionalDenoiser(nn.Module):
    def __init__(self, coarse_channels: int, width: int = 32):
        super().__init__()
        if coarse_channels < 1 or width < 8 or width % 8:
            raise ValueError("Need positive coarse channels and width divisible by eight")
        self.time = nn.Sequential(nn.Linear(width, width), nn.SiLU(), nn.Linear(width, width))
        self.input = nn.Conv2d(coarse_channels + 2, width, 3, padding=1)
        self.block1 = nn.Sequential(nn.GroupNorm(8, width), nn.SiLU(),
                                    nn.Conv2d(width, width, 3, padding=1))
        self.block2 = nn.Sequential(nn.GroupNorm(8, width), nn.SiLU(),
                                    nn.Conv2d(width, width, 3, padding=1))
        self.output = nn.Sequential(nn.GroupNorm(8, width), nn.SiLU(),
                                    nn.Conv2d(width, 1, 3, padding=1))
        self.width = width

    def forward(self, noisy: torch.Tensor, coarse: torch.Tensor,
                terrain: torch.Tensor, steps: torch.Tensor) -> torch.Tensor:
        if noisy.ndim != 4 or noisy.shape[1] != 1 or terrain.shape != noisy.shape:
            raise ValueError("noisy rainfall and terrain must be [batch, 1, fine_y, fine_x]")
        if coarse.ndim != 4 or coarse.shape[0] != noisy.shape[0]:
            raise ValueError("coarse field must be [batch, channels, coarse_y, coarse_x]")
        if steps.shape != (noisy.shape[0],):
            raise ValueError("steps must have one element per batch item")
        half = self.width // 2
        frequencies = torch.exp(-math.log(10000) * torch.arange(half, device=noisy.device) / max(half - 1, 1))
        angles = steps.float()[:, None] * frequencies[None, :]
        embedding = self.time(torch.cat((angles.sin(), angles.cos()), dim=1))
        condition = F.interpolate(coarse, size=noisy.shape[-2:], mode="bilinear", align_corners=False)
        state = self.input(torch.cat((noisy, condition, terrain), dim=1))
        state = state + embedding[:, :, None, None]
        state = state + self.block1(state)
        state = state + self.block2(state)
        return self.output(state)


class ConditionalPrecipitationDiffusion(nn.Module):
    """DDPM epsilon training and ancestral sampling; parameters are random until trained."""

    def __init__(self, coarse_channels: int, steps: int = 100,
                 width: int = 32, tail_weight: float = 2.0):
        super().__init__()
        if steps < 2 or tail_weight < 0:
            raise ValueError("Need at least two DDPM steps and nonnegative tail weight")
        self.denoiser = ConditionalDenoiser(coarse_channels, width)
        betas = torch.linspace(1e-4, 0.02, steps)
        alphas = 1 - betas
        cumulative = torch.cumprod(alphas, dim=0)
        self.register_buffer("betas", betas)
        self.register_buffer("alphas", alphas)
        self.register_buffer("cumulative", cumulative)
        self.tail_weight = tail_weight
        self.steps = steps

    def training_loss(self, target_mm: torch.Tensor, coarse: torch.Tensor,
                      terrain: torch.Tensor) -> torch.Tensor:
        if target_mm.shape != terrain.shape or target_mm.ndim != 4 or target_mm.shape[1] != 1:
            raise ValueError("target and terrain must share [batch,1,height,width] shape")
        target = normalize_rain(target_mm)
        timestep = torch.randint(self.steps, (target.shape[0],), device=target.device)
        noise = torch.randn_like(target)
        alpha_bar = self.cumulative[timestep, None, None, None]
        noisy = alpha_bar.sqrt() * target + (1 - alpha_bar).sqrt() * noise
        predicted_noise = self.denoiser(noisy, coarse, terrain, timestep)
        # Weight extreme target pixels without leaking them into conditions.
        cutoff = torch.quantile(target.flatten(1), 0.95, dim=1)[:, None, None, None]
        weights = 1 + self.tail_weight * (target >= cutoff).float()
        return ((predicted_noise - noise).square() * weights).mean()

    @torch.no_grad()
    def sample(self, coarse: torch.Tensor, terrain: torch.Tensor,
               members: int = 1) -> torch.Tensor:
        """Return [member, batch, 1, H, W] rainfall scenarios in mm.

        Sampling is stochastic; outputs from random/unvalidated weights have
        no meteorological meaning and must never be used for alerts.
        """
        if terrain.ndim != 4 or terrain.shape[1] != 1 or coarse.shape[0] != terrain.shape[0]:
            raise ValueError("Coarse and terrain batch dimensions must match")
        if members < 1:
            raise ValueError("At least one sample required")
        scenarios = []
        for _ in range(members):
            state = torch.randn_like(terrain)
            for index in reversed(range(self.steps)):
                timestep = torch.full((len(terrain),), index, device=terrain.device, dtype=torch.long)
                predicted_noise = self.denoiser(state, coarse, terrain, timestep)
                alpha_bar = self.cumulative[index]
                previous = self.cumulative[index - 1] if index else torch.ones_like(alpha_bar)
                estimate = ((state - (1 - alpha_bar).sqrt() * predicted_noise)
                            / alpha_bar.sqrt()).clamp(0, 1)
                mean = (self.betas[index] * previous.sqrt() / (1 - alpha_bar) * estimate
                        + (1 - previous) * self.alphas[index].sqrt() / (1 - alpha_bar) * state)
                variance = self.betas[index] * (1 - previous) / (1 - alpha_bar)
                state = mean + variance.sqrt() * torch.randn_like(state) if index else mean
            scenarios.append(denormalize_rain(state))
        return torch.stack(scenarios)
