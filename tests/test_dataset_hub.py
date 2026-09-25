"""
Unit tests for Avarta Dataset Hub and SIH-26078 Historical Benchmarks.
"""

import unittest
import os
import numpy as np
from services.ingestion.dataset_hub import DatasetHub, DATASET_CATALOG
from training.train_downscaler import ExtremeTailPreservationLoss, AtmosphericDownscalingDataset
import torch

class TestDatasetHub(unittest.TestCase):
    def setUp(self):
        self.hub = DatasetHub()

    def test_catalog_contains_sih_datasets(self):
        catalog = self.hub.get_catalog()
        self.assertIn("IMDAA", catalog)
        self.assertIn("ERA5", catalog)
        self.assertIn("NEPS-G", catalog)
        self.assertIn("NCUM", catalog)
        self.assertIn("IMD_GRIDDED_4KM", catalog)
        self.assertIn("COPERNICUS_DEM", catalog)

    def test_cyclone_amphan_benchmark_metrics(self):
        amphan = self.hub.load_or_create_benchmark_dataset("cyclone_amphan_2020")
        self.assertEqual(amphan["min_central_pressure_hpa"], 907.0)
        self.assertEqual(amphan["max_sustained_wind_kmh"], 260.0)
        self.assertTrue(len(amphan["best_track"]) >= 5)
        # Verify coarse is lower than fine ground truth
        self.assertLess(np.max(amphan["ncum_12km_coarse"]), np.max(amphan["imd_5km_ground_truth"]))

    def test_extreme_tail_loss_computation(self):
        criterion = ExtremeTailPreservationLoss(quantile_threshold=0.90, alpha_tail=4.0)
        pred = torch.ones(2, 1, 16, 16) * 10.0
        target = torch.ones(2, 1, 16, 16) * 10.0
        terrain = torch.zeros(2, 1, 16, 16)
        loss, metrics = criterion(pred, target, terrain)
        self.assertAlmostEqual(loss.item(), 0.0, places=4)

if __name__ == "__main__":
    unittest.main()
