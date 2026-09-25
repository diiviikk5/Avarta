"""
Unit tests for PhysicsGuard mass continuity, non-negative precipitation, and moisture flux convergence.
"""

import unittest
import numpy as np
from models.physics_guard.physics_guard import PhysicsGuard


class TestPhysicsGuard(unittest.TestCase):
    def setUp(self):
        self.guard = PhysicsGuard(max_continuity_error=0.05)

    def test_non_negative_precipitation_projection(self):
        field = np.array([[-10.0, 5.0], [0.0, -2.5]], dtype=np.float32)
        projected, violations = self.guard.project(field)

        self.assertEqual(violations, 2)
        self.assertTrue((projected >= 0.0).all())
        self.assertEqual(projected[0, 0], 0.0)
        self.assertEqual(projected[0, 1], 5.0)

    def test_physics_validation(self):
        H, W = 16, 16
        precip = np.maximum(0.0, np.random.uniform(0.0, 30.0, size=(H, W)))
        humidity = np.ones((H, W), dtype=np.float32) * 0.015
        u_wind = np.ones((H, W), dtype=np.float32) * 5.0
        v_wind = np.zeros((H, W), dtype=np.float32)

        metrics = self.guard.validate(
            precipitation_field=precip,
            specific_humidity=humidity,
            u_wind=u_wind,
            v_wind=v_wind,
            dx_meters=5000.0,
            dy_meters=5000.0
        )

        self.assertIn("composite_physics_score", metrics)
        self.assertIn("moisture_check_passed", metrics)
        self.assertIn("continuity_residual_error", metrics)
        self.assertGreaterEqual(metrics["composite_physics_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
