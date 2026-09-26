"""Event tracking with predicted trajectory + dynamic 4D bounding boxes (Phase 2).

Wraps the validated Kalman tracker: detections are linked across forecast
frames, then each persistent track is extrapolated to T+24h / T+48h / T+72h
using its estimated velocity. The "4D bbox" is
(south, west, north, east, valid_start, valid_end, peak_intensity,
uncertainty_km) — space + time + intensity.

This predicts *where the detected footprint goes*, not future weather.
Uncertainty grows linearly with lead time.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from services.tracking.kalman_tracker import PersistentThreatTracker

LEAD_OFFSETS_HOURS = (24, 48, 72)


def _parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


@dataclass
class TrajectoryPoint:
    latitude: float
    longitude: float
    lead_hours: int
    valid_time: str
    intensity: float
    uncertainty_radius_km: float


@dataclass
class TrackedEvent:
    event_id: str
    hazard_type: str
    current_center: List[float]
    current_time: str
    intensity: float
    velocity_kmh: float
    bearing_deg: float
    lifecycle: str
    trajectory: List[TrajectoryPoint] = field(default_factory=list)
    bbox_4d: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "hazard_type": self.hazard_type,
            "current_center": self.current_center,
            "current_time": self.current_time,
            "intensity": round(float(self.intensity), 2),
            "velocity_kmh": round(float(self.velocity_kmh), 1),
            "bearing_deg": round(float(self.bearing_deg), 1),
            "lifecycle": self.lifecycle,
            "trajectory": [
                {
                    "lat": round(p.latitude, 3),
                    "lon": round(p.longitude, 3),
                    "lead_hours": p.lead_hours,
                    "valid_time": p.valid_time,
                    "intensity": round(float(p.intensity), 2),
                    "uncertainty_radius_km": round(float(p.uncertainty_radius_km), 1),
                }
                for p in self.trajectory
            ],
            "bbox_4d": self.bbox_4d,
        }


class EventTracker:
    """High-level facade over PersistentThreatTracker with forecast legs."""

    def __init__(self, max_distance_km: float = 450.0, base_uncertainty_km: float = 25.0):
        self.inner = PersistentThreatTracker(max_distance_km=max_distance_km)
        self.base_uncertainty_km = base_uncertainty_km
        self.counter = 1

    @staticmethod
    def _velocity(track) -> tuple[float, float, float, float]:
        north = float(track.state[2])
        east = float(track.state[3])
        speed = math.hypot(north, east)
        bearing = (math.degrees(math.atan2(east, north)) + 360) % 360 if speed > 1e-6 else 0.0
        return north, east, speed, bearing

    def _extrapolate(
        self, lat: float, lon: float, north_kmh: float, east_kmh: float,
        intensity: float, slope_per_h: float, start: datetime,
    ) -> List[TrajectoryPoint]:
        points = []
        for lead in LEAD_OFFSETS_HOURS:
            d_lat = north_kmh * lead / 111.0
            d_lon = east_kmh * lead / (111.0 * max(abs(math.cos(math.radians(lat))), 0.15))
            valid = start + timedelta(hours=lead)
            points.append(
                TrajectoryPoint(
                    latitude=round(lat + d_lat, 3),
                    longitude=round(lon + d_lon, 3),
                    lead_hours=lead,
                    valid_time=valid.isoformat().replace("+00:00", "Z"),
                    intensity=round(max(0.0, intensity + slope_per_h * lead), 2),
                    uncertainty_radius_km=round(
                        self.base_uncertainty_km + 1.1 * lead, 1
                    ),
                )
            )
        return points

    def ingest_frames(self, frames: List[Dict[str, Any]]) -> List[TrackedEvent]:
        """Link detections of the form {lat, lon, intensity, hazard_type, timestamp}.

        Frames: [{timestamp, detections: [...]}]. Returns one event per active
        track after the final frame, with T+24/48/72 legs and a 4D bbox.
        """
        for frame in frames:
            self.inner.update_with_detections(frame.get("detections", []), frame["timestamp"])
        events: List[TrackedEvent] = []
        for threat_id, track in self.inner.active_tracks.items():
            event_id = f"EVT-{self.counter:03d}"
            self.counter += 1
            north, east, speed, bearing = self._velocity(track)
            lat, lon = float(track.state[0]), float(track.state[1])
            intensity = float(track.state[4])
            slope = float(track.state[5])
            now = track.last_time
            current_iso = now.isoformat().replace("+00:00", "Z")
            trajectory = self._extrapolate(lat, lon, north, east, intensity, slope, now)
            lats = [lat] + [p.latitude for p in trajectory]
            lons = [lon] + [p.longitude for p in trajectory]
            pad = 1.0  # bbox padding in degrees for the forecast corridor
            events.append(
                TrackedEvent(
                    event_id=event_id,
                    hazard_type=track.hazard_type,
                    current_center=[round(lat, 3), round(lon, 3)],
                    current_time=current_iso,
                    intensity=intensity,
                    velocity_kmh=speed,
                    bearing_deg=bearing,
                    lifecycle=track.determine_lifecycle(),
                    trajectory=trajectory,
                    bbox_4d={
                        "south": round(min(lats) - pad, 3),
                        "west": round(min(lons) - pad, 3),
                        "north": round(max(lats) + pad, 3),
                        "east": round(max(lons) + pad, 3),
                        "valid_start": current_iso,
                        "valid_end": trajectory[-1].valid_time if trajectory else current_iso,
                        "peak_intensity": round(
                            max([intensity] + [p.intensity for p in trajectory]), 2
                        ),
                        "uncertainty_km": trajectory[-1].uncertainty_radius_km if trajectory else self.base_uncertainty_km,
                        "kalman_track_id": threat_id,
                    },
                )
            )
        return events

    def events_from_replay_frames(self, replay_frames: List[Dict[str, Any]]) -> List[TrackedEvent]:
        """Adapt replay JSON frames ({valid_time, objects:[{centroid, peak...}]}) to tracker input."""
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        frames: List[Dict[str, Any]] = []
        for frame in replay_frames:
            detections = [
                {
                    "lat": float(obj["centroid"][0]),
                    "lon": float(obj["centroid"][1]),
                    "intensity": float(obj.get("peak_mm_3h", 0.0)),
                    "hazard_type": "rainfall",
                }
                for obj in frame.get("objects", [])
            ]
            frames.append({"timestamp": frame["valid_time"], "detections": detections})
        void = grouped  # keep linters quiet about legacy grouping stub
        _ = void
        return self.ingest_frames(frames)
