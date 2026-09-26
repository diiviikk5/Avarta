import torch

from models.conditional_diffusion.precip_ddpm import (
    ConditionalPrecipitationDiffusion,
    denormalize_rain,
    normalize_rain,
    summarize_scenarios,
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


def test_multiphysics_objective_reports_real_components_and_gradients():
    torch.manual_seed(9)
    model = ConditionalPrecipitationDiffusion(coarse_channels=3, steps=4, width=16)
    coarse = torch.rand(2, 3, 4, 4) * 80
    terrain = torch.rand(2, 1, 8, 8)
    target = torch.rand(2, 1, 8, 8) * 120
    humidity = torch.rand_like(target) * 0.02
    u_wind = torch.randn_like(target) * 8
    v_wind = torch.randn_like(target) * 8
    diagnostics = model.training_diagnostics(
        target, coarse, terrain,
        specific_humidity=humidity, u_wind=u_wind, v_wind=v_wind,
    )
    assert set(diagnostics) == {
        "loss", "denoising_loss", "spectral_loss", "coarse_consistency_loss",
        "peak_loss", "physics_loss",
    }
    assert all(torch.isfinite(value) for value in diagnostics.values())
    diagnostics["loss"].backward()
    assert model.denoiser.output[-1].weight.grad is not None


def test_scenario_summary_keeps_probability_and_spread():
    scenarios = torch.tensor([0.0, 40.0, 80.0, 120.0]).view(4, 1, 1, 1, 1)
    summary = summarize_scenarios(scenarios, threshold_mm=64.5)
    assert summary["mean"].item() == 60.0
    assert summary["p50"].item() == 60.0
    assert summary["threshold_exceedance_probability"].item() == 0.5
    assert summary["standard_deviation"].item() > 0
