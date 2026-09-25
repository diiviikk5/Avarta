"""Unit tests for PINNPhysicsLoss, TopographyEngine, and Spectral PSD analysis."""

import unittest
import numpy as np
import torch
from models.physics_guard.pinn_loss import PINNPhysicsLoss
from services.downscaling.topography import TopographyEngine
from services.downscaling.spectral import compute_radial_psd, evaluate_spectral_benchmark, generate_synthetic_spectral_case


class TestMilestone2(unittest.TestCase):
    def test_pinn_loss_gradients_and_terms(self):
        loss_fn = PINNPhysicsLoss()
        y_pred = torch.tensor([[[[10.0, 35.0], [5.0, 40.0]]]], requires_grad=True)
        y_true = torch.tensor([[[[12.0, 30.0], [4.0, 38.0]]]])
        q = torch.tensor([[[[0.015, 0.018], [0.014, 0.019]]]])
        u = torch.tensor([[[[8.0, 12.0], [7.0, 11.0]]]])
        v = torch.tensor([[[[5.0, 9.0], [4.0, 8.0]]]])

        out = loss_fn(y_pred, y_true, specific_humidity=q, u_wind=u, v_wind=v)
        self.assertIn("loss", out)
        self.assertIn("moisture_loss", out)
        self.assertIn("continuity_loss", out)
        self.assertIn("non_neg_loss", out)
        self.assertGreater(out["loss"].item(), 0.0)

        # Ensure loss is fully differentiable
        out["loss"].backward()
        self.assertIsNotNone(y_pred.grad)
        self.assertTrue(torch.isfinite(y_pred.grad).all())

    def test_pinn_loss_penalizes_negative_rain(self):
        loss_fn = PINNPhysicsLoss(weight_non_neg=10.0)
        y_positive = torch.tensor([[[[5.0, 10.0], [15.0, 20.0]]]])
        y_negative = torch.tensor([[[[-15.0, 10.0], [15.0, -20.0]]]])
        y_true = torch.zeros_like(y_positive)

        loss_pos = loss_fn(y_positive, y_true)["loss"].item()
        loss_neg = loss_fn(y_negative, y_true)["loss"].item()
        self.assertGreater(loss_neg, loss_pos)

    def test_topography_engine_orographic_lift(self):
        engine = TopographyEngine(dx_meters=5000.0, dy_meters=5000.0)
        lats = np.linspace(29.0, 32.0, 20)
        lons = np.linspace(76.0, 79.0, 20)
        dem = engine.generate_regional_dem(lats, lons, region_type="himalayan_foothills")
        self.assertIn("elevation_meters", dem)
        self.assertIn("slope_percent", dem)
        self.assertGreater(dem["elevation_meters"].max(), 2000.0)

        # Southwest monsoon wind hitting foothills (u=10 m/s, v=15 m/s)
        u_wind = np.full_like(dem["elevation_meters"], 10.0)
        v_wind = np.full_like(dem["elevation_meters"], 15.0)
        lift = engine.compute_orographic_lift(dem["elevation_meters"], u_wind, v_wind)
        self.assertIn("orographic_velocity_ms", lift)
        self.assertIn("precipitation_enhancement_factor", lift)
        self.assertGreater(float(lift["precipitation_enhancement_factor"].max()), 1.2)

    def test_spectral_psd_computation(self):
        field = np.random.randn(32, 32)
        k_bins, psd = compute_radial_psd(field, dx_km=5.0)
        self.assertEqual(len(k_bins), len(psd))
        self.assertGreater(len(k_bins), 5)
        self.assertTrue(np.all(psd >= 0.0))

    def test_spectral_benchmark_resolves_spectral_smoothing(self):
        benchmark = generate_synthetic_spectral_case()
        self.assertIn("wavenumbers_k", benchmark)
        self.assertIn("psd_db", benchmark)
        self.assertIn("preservation_metrics", benchmark)

        metrics = benchmark["preservation_metrics"]
        # Diffusion retention should outperform bilinear significantly
        self.assertGreater(metrics["diffusion_retention_ratio"], metrics["bilinear_retention_ratio"])
        self.assertTrue(metrics["spectral_smoothing_resolved"])


if __name__ == "__main__":
    unittest.main()
