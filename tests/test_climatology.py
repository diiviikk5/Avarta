"""
Unit tests for ERA5 Extreme Forecast Index (EFI) computation and anomaly clustering.
"""

import unittest
import numpy as np
from services.detection.climatology_engine import ClimatologyEngine

class TestClimatologyEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ClimatologyEngine(efi_threshold=0.7)

    def test_efi_computation(self):
        # Forecast members significantly higher than climatology
        E, H, W = 50, 10, 10
        Q = 100
        ensemble_forecasts = np.random.uniform(50.0, 100.0, size=(E, H, W))
        climatology_quantiles = np.linspace(0.0, 30.0, Q)[:, None, None] * np.ones((Q, H, W))

        efi = self.engine.compute_efi(ensemble_forecasts, climatology_quantiles)
        self.assertEqual(efi.shape, (H, W))
        # Since forecasts vastly exceed climatology, EFI should be close to +1.0
        self.assertTrue((efi > 0.8).all())

    def test_z_scores(self):
        fc_mean = np.array([[30.0, 10.0]])
        clim_mean = np.array([[10.0, 10.0]])
        clim_std = np.array([[5.0, 2.0]])

        z = self.engine.compute_z_scores(fc_mean, clim_mean, clim_std)
        self.assertAlmostEqual(z[0, 0], 4.0, places=2)
        self.assertAlmostEqual(z[0, 1], 0.0, places=2)

if __name__ == "__main__":
    unittest.main()
