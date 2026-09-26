"""
Unit tests for 4D Kalman filter state tracker and spatial association.
"""

import unittest
from services.tracking.kalman_tracker import PersistentThreatTracker, KalmanThreatState


class TestKalmanTracker(unittest.TestCase):
    def setUp(self):
        self.tracker = PersistentThreatTracker(max_distance_km=350.0)

    def test_kalman_state_prediction_and_update(self):
        state = KalmanThreatState(
            threat_id="TEST-001",
            lat=15.0,
            lon=85.0,
            intensity=80.0,
            timestamp="2026-09-25T00:00:00Z"
        )
        self.assertEqual(state.age_steps, 1)

        # Propagate forward
        pred_state = state.predict(dt_hours=3.0)
        self.assertEqual(len(pred_state), 6)

        # Measurement update
        state.update(measured_lat=15.3, measured_lon=84.7, measured_intensity=88.0, timestamp="2026-09-25T03:00:00Z")
        self.assertEqual(state.age_steps, 2)
        self.assertEqual(len(state.history), 2)
        self.assertEqual(state.determine_lifecycle(), "INTENSIFYING")

    def test_multi_timestep_association(self):
        # Timestep 1 detection
        det_t1 = [{"lat": 16.0, "lon": 82.0, "intensity": 65.0, "hazard_type": "cyclone"}]
        active_t1 = self.tracker.update_with_detections(det_t1, "2026-09-25T00:00:00Z")
        self.assertEqual(len(active_t1), 1)
        tracked_id = active_t1[0]["threat_id"]

        # Timestep 2 detection (within distance threshold)
        det_t2 = [{"lat": 16.5, "lon": 81.6, "intensity": 75.0, "hazard_type": "cyclone"}]
        active_t2 = self.tracker.update_with_detections(det_t2, "2026-09-25T03:00:00Z")
        self.assertEqual(len(active_t2), 1)
        # Verify track continuity (same persistent threat ID)
        self.assertEqual(active_t2[0]["threat_id"], tracked_id)
        self.assertEqual(active_t2[0]["trajectory_length"], 2)

    def test_assignment_is_global_and_output_matches_detection_order(self):
        first = self.tracker.update_with_detections([
            {"lat": 0, "lon": 0, "intensity": 10, "hazard_type": "rainfall"},
            {"lat": 0, "lon": 2, "intensity": 10, "hazard_type": "rainfall"},
        ], "2026-09-25T00:00:00Z")
        second = self.tracker.update_with_detections([
            {"lat": 0, "lon": 1.3, "intensity": 10, "hazard_type": "rainfall"},
            {"lat": 0, "lon": 2.1, "intensity": 10, "hazard_type": "rainfall"},
        ], "2026-09-25T03:00:00Z")
        self.assertEqual([item["threat_id"] for item in second],
                         [item["threat_id"] for item in first])
        self.assertEqual([item["detection_index"] for item in second], [0, 1])

    def test_missing_track_expires_without_ghost_output(self):
        tracker = PersistentThreatTracker(max_missed_steps=1)
        first = tracker.update_with_detections([
            {"lat": 0, "lon": 0, "intensity": 10}
        ], "2026-09-25T00:00:00Z")
        self.assertEqual(tracker.update_with_detections([], "2026-09-25T03:00:00Z"), [])
        self.assertIn(first[0]["threat_id"], tracker.active_tracks)
        tracker.update_with_detections([], "2026-09-25T06:00:00Z")
        self.assertNotIn(first[0]["threat_id"], tracker.active_tracks)


if __name__ == "__main__":
    unittest.main()
