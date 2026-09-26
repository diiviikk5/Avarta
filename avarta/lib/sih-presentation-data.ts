export interface ThreatTrajectoryPoint {
  t_lead: number;
  lat: number;
  lon: number;
  pressure_min_hpa: number;
  vmax_knots: number;
  sigma_km: number;
}

export interface ThreatObject4D {
  threat_id: string;
  hazard_type: "TROPICAL_CYCLONE";
  tracking_start_utc: string;
  temporal_horizon_hours: number;
  climatology_baseline: string;
  bounding_box_4d: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
    pressure_levels_hpa: number[];
    time_steps_hours: number[];
  };
  centroid_trajectory: ThreatTrajectoryPoint[];
  spatial_footprint_5km: {
    grid_resolution_km: number;
    total_area_sq_km: number;
    peak_precipitation_rate_mm_hr: number;
    peak_wind_gust_ms: number;
  };
  severity_index: {
    efi_max: number;
    risk_score_100: number;
    threat_level: "EXTREME";
  };
  affected_admin_regions: string[];
  pinpoint_coordinates: Array<{
    name: string;
    lat: number;
    lon: number;
    eta_utc: string;
    peak_wind_kt: number;
  }>;
  provenance: {
    mode: "SIH_PRESENTATION_SCENARIO";
    operational_warning: false;
    note: string;
  };
}

export const SIH_THREAT_OBJECT: ThreatObject4D = {
  threat_id: "AVARTA-4D-2026-CYC-01",
  hazard_type: "TROPICAL_CYCLONE",
  tracking_start_utc: "2026-09-26T00:00:00Z",
  temporal_horizon_hours: 120,
  climatology_baseline: "IMDAA_30YR_P95",
  bounding_box_4d: {
    lat_min: 17.2,
    lat_max: 22.8,
    lon_min: 84.1,
    lon_max: 89.5,
    pressure_levels_hpa: [1000, 850, 500, 200],
    time_steps_hours: [0, 6, 12, 24, 48, 72, 96, 120],
  },
  centroid_trajectory: [
    { t_lead: 0, lat: 18.2, lon: 87.4, pressure_min_hpa: 988, vmax_knots: 55, sigma_km: 12.4 },
    { t_lead: 24, lat: 19.5, lon: 86.8, pressure_min_hpa: 974, vmax_knots: 70, sigma_km: 24.1 },
    { t_lead: 48, lat: 20.8, lon: 86.1, pressure_min_hpa: 962, vmax_knots: 85, sigma_km: 41.5 },
    { t_lead: 72, lat: 21.6, lon: 85.5, pressure_min_hpa: 978, vmax_knots: 60, sigma_km: 68.2 },
  ],
  spatial_footprint_5km: {
    grid_resolution_km: 5,
    total_area_sq_km: 14250,
    peak_precipitation_rate_mm_hr: 48.6,
    peak_wind_gust_ms: 44.2,
  },
  severity_index: { efi_max: 0.98, risk_score_100: 94, threat_level: "EXTREME" },
  affected_admin_regions: ["Bhadrak", "Balasore", "Kendrapara", "East Medinipur"],
  pinpoint_coordinates: [
    { name: "Dhamra Port Landfall Core", lat: 20.81, lon: 86.95, eta_utc: "T+44h", peak_wind_kt: 85 },
  ],
  provenance: {
    mode: "SIH_PRESENTATION_SCENARIO",
    operational_warning: false,
    note: "Demonstration object aligned to the SIH26078 presentation; not a live forecast or public warning.",
  },
};

export function threatObjectToGeoJSON(threat: ThreatObject4D) {
  const box = threat.bounding_box_4d;
  const polygon = [[
    [box.lon_min, box.lat_min], [box.lon_max, box.lat_min],
    [box.lon_max, box.lat_max], [box.lon_min, box.lat_max],
    [box.lon_min, box.lat_min],
  ]];
  return {
    type: "FeatureCollection",
    name: `${threat.threat_id}-4d-export`,
    features: [
      {
        type: "Feature",
        properties: { threat_id: threat.threat_id, feature_role: "4d_bounding_extent", ...threat.severity_index },
        geometry: { type: "Polygon", coordinates: polygon },
      },
      {
        type: "Feature",
        properties: { threat_id: threat.threat_id, feature_role: "centroid_trajectory" },
        geometry: { type: "LineString", coordinates: threat.centroid_trajectory.map((point) => [point.lon, point.lat]) },
      },
      ...threat.centroid_trajectory.map((point) => ({
        type: "Feature",
        properties: { threat_id: threat.threat_id, feature_role: "forecast_centroid", ...point },
        geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      })),
    ],
  };
}
