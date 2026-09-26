"""Tests for multi-hazard cases: Cyclone Amphan and North India Heatwave."""

import unittest
import numpy as np
from services.cases.case_registry import list_cases, get_case, export_all_cases
from services.cases.cyclone_case import compute_relative_vorticity, generate_cyclone_amphan_case
from services.cases.heatwave_case import compute_wet_bulb_stull, compute_heat_index, generate_heatwave_case


class TestMultiHazard(unittest.TestCase):
    def test_case_registry_lists_all_three_hazards(self):
        cases = list_cases()
        self.assertEqual(len(cases), 3)
        hazard_types = {c["hazard_type"] for c in cases}
        self.assertEqual(hazard_types, {"rainfall", "cyclone", "heatwave"})

    def test_export_all_cases_creates_json_files(self):
        exported = export_all_cases()
        self.assertIn("cyclone", exported)
        self.assertIn("heatwave", exported)
        self.assertTrue(exported["cyclone"].exists())
        self.assertTrue(exported["heatwave"].exists())

    def test_cyclone_amphan_case_structure(self):
        case = get_case("cyclone")
        self.assertIsNotNone(case)
        self.assertEqual(case["id"], "cyclone-amphan-2020-05")
        self.assertEqual(case["verification"]["min_central_pressure_hpa"], 907.0)
        self.assertEqual(case["verification"]["forecast_peak_intensity"], 260.0)
        self.assertGreater(len(case["frames"]), 5)
        # Check that vorticity and pressure exist in frames
        first_obj = case["frames"][0]["objects"][0]
        self.assertIn("vorticity_1e5", first_obj)
        self.assertIn("pressure_hpa", first_obj)

    def test_vorticity_calculation(self):
        u = np.zeros((10, 10))
        v = np.zeros((10, 10))
        # Simple cyclonic shear: v increasing with x
        for col in range(10):
            v[:, col] = col * 5.0
        zeta = compute_relative_vorticity(u, v, dx_meters=1000.0, dy_meters=1000.0)
        # dv/dx should be 5.0 / 1000 = 0.005 s^-1
        self.assertTrue(np.allclose(zeta[1:-1, 1:-1], 0.005))

    def test_heatwave_case_structure(self):
        case = get_case("heatwave")
        self.assertIsNotNone(case)
        self.assertEqual(case["id"], "heatwave-north-india-2024-05")
        self.assertGreaterEqual(case["verification"]["observed_peak_intensity"], 48.0)
        self.assertIn("peak_wet_bulb_c", case["verification"])
        self.assertIn("peak_z500_ridge_gpm", case["verification"])

    def test_stull_wet_bulb_formula(self):
        # At 45°C and 30% RH: Tw is typically ~28-30°C
        tw = compute_wet_bulb_stull(45.0, 30.0)
        self.assertGreater(tw, 26.0)
        self.assertLess(tw, 34.0)

    def test_heat_index(self):
        hi = compute_heat_index(42.0, 40.0)
        # High heat and moderate humidity creates severe apparent temp
        self.assertGreater(hi, 45.0)


if __name__ == "__main__":
    unittest.main()
