"""
Unit tests for CorrDiff residual diffusion downscaler and ExtremeTailPreservationLoss.
"""

import unittest
import numpy as np
from models.residual_downscaler.diffusion_downscaler import (
    ExtremeTailPreservationLoss,
    HAS_TORCH,
)

if HAS_TORCH:
    import torch
    from models.residual_downscaler.diffusion_downscaler import ResidualDownscaler


class TestResidualDownscaler(unittest.TestCase):
    def setUp(self):
        self.loss_fn = ExtremeTailPreservationLoss(alpha_extreme=3.5, percentile_threshold=0.95)

    def test_extreme_tail_loss(self):
        y_true = np.linspace(0.0, 100.0, 1000).reshape(10, 100)
        # Prediction that severely under-predicts the extreme tail
        y_pred = y_true.copy()
        y_pred[y_true > 90.0] = 50.0

        loss_dict = self.loss_fn.compute_loss(y_pred, y_true)
        self.assertIn("total_loss", loss_dict)
        self.assertIn("extreme_tail_penalty", loss_dict)
        self.assertGreater(loss_dict["extreme_tail_penalty"], 0.0)
        self.assertGreater(loss_dict["total_loss"], loss_dict["base_mse"])

    @unittest.skipUnless(HAS_TORCH, "PyTorch required for downscaler forward pass")
    def test_downscaler_forward_pass(self):
        model = ResidualDownscaler(in_channels=4, out_channels=1, hidden_dim=32)

        B, C, H, W = 1, 4, 10, 10
        x_12km = torch.randn(B, C, H, W)
        # fine terrain is scaled by 2.4 => 24x24
        terrain_5km = torch.randn(B, 1, 24, 24)
        threat_vec = torch.randn(B, 8)

        output = model(x_12km, terrain_5km, threat_vec)
        self.assertIn("y_5km", output)
        self.assertIn("residual_5km", output)
        self.assertEqual(output["y_5km"].shape, (B, 1, 24, 24))


if __name__ == "__main__":
    unittest.main()
