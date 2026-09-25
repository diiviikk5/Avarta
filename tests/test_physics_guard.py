"""
Unit tests for PhysicsGuard mass continuity, non-negative precipitation, and moisture flux convergence.
"""

import unittest
import torch
from models.physics_guard.physics_guard import PhysicsGuard

class TestPhysicsGuard(unittest.TestCase):
    def setUp(self):
        self.guard = PhysicsGuard(dx=5000.0, dy=5000.0)

    def test_non_negative_precipitation_projection(self):
        # Tensor with unphysical negative precipitation values
        field = torch.tensor([[[[-10.0, 5.0], [0.0, -2.5]]]], dtype=torch.float32)
        projected = self.guard.project_non_negative_precipitation(field)

        self.assertTrue((projected >= 0.0).all().item())
        self.assertEqual(projected[0, 0, 0, 0].item(), 0.0)
        self.assertEqual(projected[0, 0, 0, 1].item(), 5.0)

    def test_moisture_flux_divergence_computation(self):
        B, H, W = 1, 8, 8
        u = torch.ones(B, 1, H, W) * 10.0
        v = torch.zeros(B, 1, H, W)
        q = torch.ones(B, 1, H, W) * 0.015

        div = self.guard.compute_moisture_flux_divergence(u, v, q)
        self.assertEqual(div.shape, (B, 1, H, W))
        # Uniform velocity field has zero divergence
        self.assertTrue(torch.allclose(div, torch.zeros_like(div), atol=1e-5))

if __name__ == "__main__":
    unittest.main()
