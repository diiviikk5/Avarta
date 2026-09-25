"""
Unit tests for 4D Kalman filter state tracker and Hungarian matching.
"""

import unittest
from services.tracking.kalman_tracker import ThreatObjectTracker, ThreatObservation

class TestKalmanTracker(unittest.TestCase):
    def setUp(self):
        self.tracker = ThreatObjectTracker(dist_threshold_km=250.0, max_missed_steps=3)

    def test_single_track_creation_and_update(self):
        obs1 = ThreatObservation(
            lat=15.0,
            lon=85.0,
            min_pressure=965.0,
            max_wind=48.0,
            radius_km=140.0,
            timestamp_utc="2026-09-25T00:00:00Z",
            variable="cyclone_vorticity"
        )

        tracks1 = self.tracker.update([obs1], "2026-09-25T00:00:00Z")
        self.assertEqual(len(tracks1), 1)
        self.assertEqual(tracks1[0].history_length, 1)

        # Subsequent observation shifted slightly northwest (motion vector)
        obs2 = ThreatObservation(
            lat=15.4,
            lon=84.5,
            min_pressure=960.0,
            max_wind=52.0,
            radius_km=150.0,
            timestamp_utc="2026-09-25T06:00:00Z",
            variable="cyclone_vorticity"
        )

        tracks2 = self.tracker.update([obs2], "2026-09-25T06:00:00Z")
        self.assertEqual(len(tracks2), 1)
        self.assertEqual(tracks2[0].threat_id, tracks1[0].threat_id)
        self.assertEqual(tracks2[0].history_length, 2)
        # Check velocity is estimated
        self.assertNotEqual(tracks2[0].kalman.x[2], 0.0)

if __name__ == "__main__":
    unittest.main()
