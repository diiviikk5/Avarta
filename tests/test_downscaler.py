"""
Unit tests for CorrDiff residual diffusion downscaler and ExtremeTailPreservationLoss.
"""

import unittest
import torch
from models.residual_downscaler.diffusion_downscaler import (
    ResidualDownscalerUNet,
    ExtremeTailPreservationLoss
)

class TestResidualDownscaler(unittest.TestCase):
    def setUp(self):
        self.model = ResidualDownscalerUNet(in_channels=4, out_channels=4, base_dim=32)
        self.loss_fn = ExtremeTailPreservationLoss(tail_weight=3.0, threshold_quantile=0.90)

    def test_forward_pass_shape(self):
        batch_size = 2
        in_c = 4
        H, W = 16, 16
        x_coarse = torch.randn(batch_size, in_c, H, W)
        timesteps = torch.tensor([10, 50], dtype=torch.long)

        out = self.model(x_coarse, timesteps)
        self.assertEqual(out.shape, (batch_size, in_c, H * 2, W * 2))

    def test_extreme_tail_loss(self):
        pred = torch.tensor([[[[1.0, 5.0], [10.0, 50.0]]]], dtype=torch.float32)
        target = torch.tensor([[[[1.0, 5.0], [10.0, 45.0]]]], dtype=torch.float32)

        loss = self.loss_fn(pred, target)
        self.assertTrue(torch.is_tensor(loss))
        self.assertGreater(loss.item(), 0.0)

if __name__ == "__main__":
    unittest.main()
