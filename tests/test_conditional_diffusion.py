import torch

from models.conditional_diffusion.precip_ddpm import (
    ConditionalPrecipitationDiffusion,
    denormalize_rain,
    normalize_rain,
)


def test_log_rain_transform_is_invertible_in_nominal_range():
    rain = torch.tensor([0.0, 1.0, 64.5, 499.0])
    assert torch.allclose(denormalize_rain(normalize_rain(rain)), rain, atol=1e-4)


def test_conditional_ddpm_trains_and_samples_shapes():
    torch.manual_seed(2)
    model = ConditionalPrecipitationDiffusion(coarse_channels=2, steps=4, width=16)
    coarse = torch.rand(2, 2, 4, 4)
    terrain = torch.rand(2, 1, 8, 8)
    target = torch.rand(2, 1, 8, 8) * 100
    loss = model.training_loss(target, coarse, terrain)
    assert torch.isfinite(loss)
    loss.backward()
    assert model.denoiser.input.weight.grad is not None
    scenarios = model.sample(coarse, terrain, members=2)
    assert scenarios.shape == (2, 2, 1, 8, 8)
    assert torch.isfinite(scenarios).all()
    assert (scenarios >= 0).all()
