"""
Avarta Persistent 4D Threat Tracker
Tracks extreme weather anomalies as continuous 4D objects over 3 to 10 day forecast horizons.
Maintains persistent Threat IDs using Kalman motion prediction + Hungarian spatial-intensity assignment.
"""

from typing import List, Dict, Any, Optional
import math
import numpy as np


class KalmanThreatState:
    """Kalman state vector for a single 4D Threat: [lat, lon, v_lat, v_lon, intensity, d_intensity]."""

    def __init__(self, threat_id: str, lat: float, lon: float, intensity: float, timestamp: str):
        self.threat_id = threat_id
        # State vector: [lat, lon, v_lat, v_lon, intensity, intensity_slope]
        self.state = np.array([lat, lon, 0.0, 0.0, intensity, 0.0], dtype=np.float64)
        
        # State covariance matrix P
        self.cov = np.eye(6) * 1.0
        
        # Process noise Q
        self.Q = np.diag([0.05, 0.05, 0.1, 0.1, 1.0, 0.2])
        
        # Measurement noise R
        self.R = np.diag([0.08, 0.08, 1.5])
        
        self.history: List[Dict[str, Any]] = [{
            "lat": lat,
            "lon": lon,
            "intensity": intensity,
            "timestamp": timestamp
        }]
        self.age_steps = 1
        self.missed_steps = 0

    def predict(self, dt_hours: float = 3.0) -> np.ndarray:
        """Propagate state forward using constant velocity & intensity-rate model."""
        # State transition matrix F
        F = np.eye(6)
        F[0, 2] = dt_hours / 111.0  # lat displacement from km/h
        F[1, 3] = dt_hours / (111.0 * math.cos(math.radians(self.state[0]) or 1.0))
        F[4, 5] = dt_hours  # intensity evolution
        
        self.state = F @ self.state
        self.cov = F @ self.cov @ F.T + self.Q
        return self.state

    def update(self, measured_lat: float, measured_lon: float, measured_intensity: float, timestamp: str):
        """Update Kalman state with newly detected anomaly observation."""
        # Measurement matrix H
        H = np.zeros((3, 6))
        H[0, 0] = 1.0  # lat
        H[1, 1] = 1.0  # lon
        H[2, 4] = 1.0  # intensity
        
        z = np.array([measured_lat, measured_lon, measured_intensity])
        y = z - H @ self.state  # Residual
        
        S = H @ self.cov @ H.T + self.R
        K = self.cov @ H.T @ np.linalg.inv(S)  # Kalman Gain
        
        self.state = self.state + K @ y
        self.cov = (np.eye(6) - K @ H) @ self.cov
        
        self.history.append({
            "lat": float(self.state[0]),
            "lon": float(self.state[1]),
            "intensity": float(self.state[4]),
            "timestamp": timestamp
        })
        self.age_steps += 1
        self.missed_steps = 0

    def determine_lifecycle(self) -> str:
        """Classifies lifecycle stage based on intensity trajectory derivative."""
        slope = self.state[5]
        if self.age_steps < 2:
            return "FORMING"
        elif slope > 3.0:
            return "INTENSIFYING"
        elif abs(slope) <= 3.0:
            return "PEAK"
        elif slope < -3.0:
            return "DECAYING"
        else:
            return "DISSIPATED"


class PersistentThreatTracker:
    """Manages association between current forecast threats and previous timesteps."""

    def __init__(self, max_distance_km: float = 350.0):
        self.max_distance_km = max_distance_km
        self.active_tracks: Dict[str, KalmanThreatState] = {}
        self.counter = 1

    def haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def update_with_detections(self, detections: List[Dict[str, Any]], timestamp: str) -> List[Dict[str, Any]]:
        """
        Associates detections with existing active threat tracks.
        detections: list of dicts with keys ['lat', 'lon', 'intensity', 'hazard_type']
        """
        # 1. Predict all existing tracks
        for track in self.active_tracks.values():
            track.predict(dt_hours=3.0)

        assigned_detection_indices = set()
        assigned_track_ids = set()

        # 2. Greedy nearest-neighbor association (spatial + intensity similarity)
        for d_idx, det in enumerate(detections):
            best_track_id = None
            min_cost = float("inf")

            for t_id, track in self.active_tracks.items():
                if t_id in assigned_track_ids:
                    continue
                dist = self.haversine_km(track.state[0], track.state[1], det["lat"], det["lon"])
                if dist < self.max_distance_km:
                    # Intensity delta penalty
                    int_diff = abs(track.state[4] - det["intensity"])
                    cost = dist + int_diff * 2.0
                    if cost < min_cost:
                        min_cost = cost
                        best_track_id = t_id

            if best_track_id is not None:
                self.active_tracks[best_track_id].update(det["lat"], det["lon"], det["intensity"], timestamp)
                assigned_detection_indices.add(d_idx)
                assigned_track_ids.add(best_track_id)

        # 3. Spawn new Threat IDs for unassigned detections
        for d_idx, det in enumerate(detections):
            if d_idx not in assigned_detection_indices:
                new_id = f"AVT-2026-{self.counter:05d}"
                self.counter += 1
                new_track = KalmanThreatState(new_id, det["lat"], det["lon"], det["intensity"], timestamp)
                self.active_tracks[new_id] = new_track

        # 4. Return current persistent threats
        results = []
        for t_id, track in self.active_tracks.items():
            results.append({
                "threat_id": t_id,
                "lat": round(float(track.state[0]), 3),
                "lon": round(float(track.state[1]), 3),
                "intensity": round(float(track.state[4]), 1),
                "lifecycle": track.determine_lifecycle(),
                "trajectory_length": len(track.history)
            })
        return results
