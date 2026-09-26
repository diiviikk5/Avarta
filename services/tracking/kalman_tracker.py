"""Timestamp-aware Kalman association for detected forecast footprints.

This links already-detected objects; it does not itself predict weather or
establish forecast skill. Tracks expire after a configurable number of misses.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Dict, Any
import math
import numpy as np
from scipy.optimize import linear_sum_assignment


def _time(timestamp: str) -> datetime:
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Track timestamps must include a timezone")
    return parsed


class KalmanThreatState:
    """State vector [lat, lon, north_km/h, east_km/h, intensity, intensity/h]."""

    def __init__(self, threat_id: str, lat: float, lon: float, intensity: float,
                 timestamp: str, hazard_type: str = "unknown"):
        self.threat_id = threat_id
        self.hazard_type = hazard_type
        self.last_time = _time(timestamp)
        self.state = np.array([lat, lon, 0.0, 0.0, intensity, 0.0], dtype=np.float64)
        self.cov = np.eye(6, dtype=np.float64)
        self.Q = np.diag([0.05, 0.05, 0.1, 0.1, 1.0, 0.2])
        self.R = np.diag([0.08, 0.08, 1.5])
        self.history: List[Dict[str, Any]] = [{
            "lat": lat, "lon": lon, "intensity": intensity, "timestamp": timestamp,
        }]
        self.age_steps = 1
        self.missed_steps = 0

    def predict(self, dt_hours: float = 3.0) -> np.ndarray:
        if dt_hours <= 0:
            raise ValueError("Prediction interval must be positive")
        transition = np.eye(6)
        transition[0, 2] = dt_hours / 111.0
        transition[1, 3] = dt_hours / (111.0 * max(abs(math.cos(math.radians(self.state[0]))), 0.05))
        transition[4, 5] = dt_hours
        self.state = transition @ self.state
        self.cov = transition @ self.cov @ transition.T + self.Q * dt_hours / 3.0
        return self.state

    def update(self, measured_lat: float, measured_lon: float,
               measured_intensity: float, timestamp: str):
        now = _time(timestamp)
        dt_hours = (now - self.last_time).total_seconds() / 3600.0
        if dt_hours <= 0:
            raise ValueError("Updates must advance in time")
        matrix = np.zeros((3, 6))
        matrix[0, 0], matrix[1, 1], matrix[2, 4] = 1.0, 1.0, 1.0
        measurement = np.array([measured_lat, measured_lon, measured_intensity])
        residual = measurement - matrix @ self.state
        covariance = matrix @ self.cov @ matrix.T + self.R
        gain = self.cov @ matrix.T @ np.linalg.inv(covariance)
        self.state += gain @ residual
        self.cov = (np.eye(6) - gain @ matrix) @ self.cov
        self.state[2] = (measured_lat - self.history[-1]["lat"]) * 111.0 / dt_hours
        self.state[3] = ((measured_lon - self.history[-1]["lon"]) * 111.0
                         * max(abs(math.cos(math.radians(measured_lat))), 0.05) / dt_hours)
        self.state[5] = (measured_intensity - self.history[-1]["intensity"]) / dt_hours
        self.history.append({"lat": measured_lat, "lon": measured_lon,
                             "intensity": measured_intensity, "timestamp": timestamp})
        self.last_time = now
        self.age_steps += 1
        self.missed_steps = 0

    def determine_lifecycle(self) -> str:
        slope = self.state[5]
        if self.age_steps < 2:
            return "FORMING"
        if slope > 1.0:
            return "INTENSIFYING"
        if slope < -1.0:
            return "DECAYING"
        return "PEAK"


class PersistentThreatTracker:
    """Globally optimal one-to-one association within a distance gate."""

    def __init__(self, max_distance_km: float = 350.0, max_missed_steps: int = 2):
        if max_distance_km <= 0 or max_missed_steps < 0:
            raise ValueError("Invalid tracker distance or miss limit")
        self.max_distance_km = max_distance_km
        self.max_missed_steps = max_missed_steps
        self.active_tracks: Dict[str, KalmanThreatState] = {}
        self.counter = 1
        self.last_frame_time: datetime | None = None

    @staticmethod
    def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1))
             * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        return 6371.0 * 2 * math.atan2(math.sqrt(max(a, 0)), math.sqrt(max(1 - a, 0)))

    def update_with_detections(self, detections: List[Dict[str, Any]], timestamp: str) -> List[Dict[str, Any]]:
        now = _time(timestamp)
        if self.last_frame_time is not None:
            dt_hours = (now - self.last_frame_time).total_seconds() / 3600.0
            if dt_hours <= 0:
                raise ValueError("Forecast frames must advance in time")
            for track in self.active_tracks.values():
                track.predict(dt_hours)
        self.last_frame_time = now

        tracks = list(self.active_tracks.values())
        cost = np.full((len(tracks), len(detections)), 1e9, dtype=np.float64)
        for row, track in enumerate(tracks):
            for col, detection in enumerate(detections):
                if detection.get("hazard_type", "unknown") != track.hazard_type:
                    continue
                distance = self.haversine_km(track.state[0], track.state[1],
                                             detection["lat"], detection["lon"])
                if distance <= self.max_distance_km:
                    cost[row, col] = distance + 2.0 * abs(track.state[4] - detection["intensity"])

        assigned_tracks, assigned_detections = set(), set()
        detection_ids: dict[int, str] = {}
        if cost.size:
            for row, col in zip(*linear_sum_assignment(cost)):
                if cost[row, col] >= 1e9:
                    continue
                track, detection = tracks[row], detections[col]
                track.update(detection["lat"], detection["lon"], detection["intensity"], timestamp)
                assigned_tracks.add(track.threat_id)
                assigned_detections.add(col)
                detection_ids[col] = track.threat_id

        for track in tracks:
            if track.threat_id not in assigned_tracks:
                track.missed_steps += 1
                if track.missed_steps > self.max_missed_steps:
                    del self.active_tracks[track.threat_id]

        for index, detection in enumerate(detections):
            if index in assigned_detections:
                continue
            threat_id = f"AVT-{now.year}-{self.counter:05d}"
            self.counter += 1
            self.active_tracks[threat_id] = KalmanThreatState(
                threat_id, detection["lat"], detection["lon"], detection["intensity"],
                timestamp, detection.get("hazard_type", "unknown"),
            )
            detection_ids[index] = threat_id

        # Only current detections are returned; predicted-but-unseen tracks remain
        # internal until they are either matched again or expire.
        return [{"threat_id": detection_ids[index],
                 "detection_index": index,
                 "lat": round(float(self.active_tracks[detection_ids[index]].state[0]), 3),
                 "lon": round(float(self.active_tracks[detection_ids[index]].state[1]), 3),
                 "intensity": round(float(self.active_tracks[detection_ids[index]].state[4]), 1),
                 "hazard_type": self.active_tracks[detection_ids[index]].hazard_type,
                 "lifecycle": self.active_tracks[detection_ids[index]].determine_lifecycle(),
                 "trajectory_length": len(self.active_tracks[detection_ids[index]].history)}
                for index in range(len(detections))]
