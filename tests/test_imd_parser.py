import unittest
import os
import numpy as np
from services.ingestion.imd_gridded_parser import IMDGriddedParser

class TestIMDGriddedParser(unittest.TestCase):
    def test_parser_with_real_dataset(self):
        grd_path = "data/raw/Rainfall_ind2025_rfp25.grd"
        if not os.path.exists(grd_path):
            self.skipTest(f"{grd_path} not found")
        
        parser = IMDGriddedParser(filepath=grd_path)
        summary = parser.get_summary()

        self.assertEqual(summary["total_days"], 365)
        self.assertAlmostEqual(summary["all_time_peak_mm"], 469.21, places=1)
        self.assertGreater(len(summary["top_extreme_deluge_days"]), 0)

        # Test extraction of extreme crops
        crops = parser.extract_extreme_training_crops(min_peak_mm=100.0, crop_size=38)
        self.assertGreater(len(crops), 0)
        self.assertEqual(crops[0]["fine_target_5km"].shape, (38, 38))
        self.assertEqual(crops[0]["coarse_12km"].shape, (16, 16))

if __name__ == "__main__":
    unittest.main()
