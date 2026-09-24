"""5 km GeoJSON Spatial Impact Polygons and Critical Infrastructure Exposure.

Directly targets the NDRF alert fatigue problem statement:
- Replaces generic broad-district alerts with hyper-local 5 km impact polygon contours.
- Generates standard RFC 7946 GeoJSON FeatureCollections.
- Performs spatial intersection against critical lifeline assets:
  * National Highways (NH-44, NH-48, NH-16, NH-19, NH-21)
  * Major Civil Hospitals & Trauma Centers
  * 400kV / 220kV Electrical Grid Substations
  * Key Railway Trunk Corridors
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple
import numpy as np


# Curated geo-referenced database of critical infrastructure in key hazard corridors
CRITICAL_ASSETS = [
    # Hospitals
    {"type": "hospital", "name": "AIIMS New Delhi", "lat": 28.567, "lon": 77.210, "beds": 2400, "region": "Delhi NCR"},
    {"type": "hospital", "name": "Safdarjung Hospital", "lat": 28.570, "lon": 77.207, "beds": 1500, "region": "Delhi NCR"},
    {"type": "hospital", "name": "BK Civil Hospital Faridabad", "lat": 28.403, "lon": 77.315, "beds": 450, "region": "Haryana"},
    {"type": "hospital", "name": "SMS Hospital Jaipur", "lat": 26.892, "lon": 75.815, "beds": 3000, "region": "Rajasthan"},
    {"type": "hospital", "name": "District Hospital Sagar Island", "lat": 21.650, "lon": 88.080, "beds": 120, "region": "Sundarbans"},
    {"type": "hospital", "name": "SSKM Hospital Kolkata", "lat": 22.539, "lon": 88.343, "beds": 1800, "region": "West Bengal"},

    # Power Grid Substations (400kV / 220kV)
    {"type": "substation", "name": "Ballabgarh 400kV Substation (POWERGRID)", "lat": 28.340, "lon": 77.320, "voltage_kv": 400, "region": "Haryana"},
    {"type": "substation", "name": "Bawana 400kV Substation", "lat": 28.790, "lon": 77.030, "voltage_kv": 400, "region": "Delhi NCR"},
    {"type": "substation", "name": "Jaipur South 400kV Substation", "lat": 26.780, "lon": 75.760, "voltage_kv": 400, "region": "Rajasthan"},
    {"type": "substation", "name": "Haldia 400kV Substation (WBSETCL)", "lat": 22.060, "lon": 88.080, "voltage_kv": 400, "region": "West Bengal"},

    # National Highway Points / Nodes
    {"type": "highway", "name": "NH-44 (Delhi-Faridabad-Agra)", "lat": 28.380, "lon": 77.310, "route": "NH-44", "lanes": 6},
    {"type": "highway", "name": "NH-48 (Delhi-Gurugram-Jaipur)", "lat": 28.420, "lon": 77.010, "route": "NH-48", "lanes": 8},
    {"type": "highway", "name": "NH-16 (Kolkata-Bhubaneswar Coastal)", "lat": 21.900, "lon": 87.500, "route": "NH-16", "lanes": 4},
    {"type": "highway", "name": "NH-19 (Delhi-Kolkata Trunk)", "lat": 27.200, "lon": 78.020, "route": "NH-19", "lanes": 6},

    # Railway Corridors
    {"type": "railway", "name": "Northern Railway Delhi-Mathura Main Trunk", "lat": 28.370, "lon": 77.325, "tracks": 3},
    {"type": "railway", "name": "Western Railway Delhi-Rewari-Jaipur Trunk", "lat": 28.430, "lon": 76.990, "tracks": 2},
    {"type": "railway", "name": "South Eastern Railway Kharagpur-Bhadrak Coastal Trunk", "lat": 21.750, "lon": 87.200, "tracks": 2},
]


def geodesic_polygon_buffer(center_lat: float, center_lon: float, radius_km: float = 5.0, num_vertices: int = 24) -> List[List[float]]:
    """Generate a geographic circle/polygon buffer on WGS84 with radius in km.

    Returns coordinates in GeoJSON format: [[lon, lat], [lon, lat], ...].
    """
    coordinates = []
    lat_r = math.radians(center_lat)
    lon_r = math.radians(center_lon)
    # Earth radius in km
    R = 6371.0
    angular_distance = radius_km / R

    for i in range(num_vertices + 1):
        bearing = math.radians(i * 360.0 / num_vertices)
        lat_point = math.asin(
            math.sin(lat_r) * math.cos(angular_distance)
            + math.cos(lat_r) * math.sin(angular_distance) * math.cos(bearing)
        )
        lon_point = lon_r + math.atan2(
            math.sin(bearing) * math.sin(angular_distance) * math.cos(lat_r),
            math.cos(angular_distance) - math.sin(lat_r) * math.sin(lat_point),
        )
        coordinates.append([
            round(math.degrees(lon_point), 5),
            round(math.degrees(lat_point), 5),
        ])

    return coordinates


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two coordinates in kilometers."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    return 6371.0 * 2.0 * math.atan2(math.sqrt(max(0.0, a)), math.sqrt(max(0.0, 1.0 - a)))


def build_hazard_geojson(
    threat_points: List[Dict[str, Any]],
    default_radius_km: float = 5.0,
) -> Dict[str, Any]:
    """Build GeoJSON FeatureCollection containing 5 km threat polygon contours

    and intersecting critical infrastructure points.
    """
    features: List[Dict[str, Any]] = []
    intersected_assets: List[Dict[str, Any]] = []

    # 1. Threat Impact Polygons
    for item in threat_points:
        lat = float(item.get("lat") or item.get("latitude") or 28.40)
        lon = float(item.get("lon") or item.get("longitude") or 77.31)
        radius = float(item.get("radius_km", default_radius_km))
        threat_id = item.get("id", "THREAT-01")
        severity = item.get("severity", "SEVERE")
        hazard_name = item.get("hazard", "Extreme Anomaly")

        poly_coords = geodesic_polygon_buffer(lat, lon, radius_km=radius)

        features.append({
            "type": "Feature",
            "id": f"polygon-{threat_id}",
            "geometry": {
                "type": "Polygon",
                "coordinates": [poly_coords],
            },
            "properties": {
                "feature_type": "hazard_impact_zone",
                "threat_id": threat_id,
                "hazard": hazard_name,
                "severity": severity,
                "center": [lat, lon],
                "radius_km": radius,
                "forecast_hours": item.get("forecast_hours", 12),
                "intensity": item.get("intensity", 0.0),
                "fill_color": {"SEVERE": "#ef4444", "HIGH": "#f97316", "MODERATE": "#eab308", "LOW": "#22c55e"}.get(severity, "#ef4444"),
            },
        })

        # 2. Find intersecting infrastructure within this 5 km buffer
        for asset in CRITICAL_ASSETS:
            dist = haversine_distance_km(lat, lon, asset["lat"], asset["lon"])
            if dist <= radius:
                record = {**asset, "threat_id": threat_id, "distance_to_center_km": round(dist, 2)}
                intersected_assets.append(record)
                features.append({
                    "type": "Feature",
                    "id": f"asset-{asset['name'].replace(' ', '_')}",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [asset["lon"], asset["lat"]],
                    },
                    "properties": {
                        "feature_type": "critical_infrastructure",
                        "asset_type": asset["type"],
                        "name": asset["name"],
                        "threat_id": threat_id,
                        "distance_km": round(dist, 2),
                        "status": "AT_RISK_SHUTDOWN" if severity == "SEVERE" else "MONITORING_ALERT",
                    },
                })

    # Population exposure heuristic: ~12,500 people per 5 km radius cell in northern plains
    pop_exposed = len(threat_points) * int(math.pi * (default_radius_km ** 2) * 160)

    summary = {
        "impact_zones_count": len(threat_points),
        "radius_km": default_radius_km,
        "exposed_critical_assets_count": len(intersected_assets),
        "exposed_hospitals": sum(1 for a in intersected_assets if a["type"] == "hospital"),
        "exposed_substations": sum(1 for a in intersected_assets if a["type"] == "substation"),
        "exposed_highways": sum(1 for a in intersected_assets if a["type"] == "highway"),
        "exposed_railways": sum(1 for a in intersected_assets if a["type"] == "railway"),
        "estimated_exposed_population": pop_exposed,
        "assets_list": intersected_assets,
    }

    return {
        "type": "FeatureCollection",
        "summary": summary,
        "features": features,
    }
