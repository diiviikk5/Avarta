export type HazardType = 
  | "CYCLONE"
  | "EXTREME_RAINFALL"
  | "HEAT_DOME"
  | "COLD_WAVE"
  | "CLOUDBURST";

export type ThreatStatus = "FORMING" | "INTENSIFYING" | "PEAK" | "DECAYING" | "DISSIPATED";

export type SeverityLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface TrajectoryPoint extends LatLon {
  time_offset_hours: number;
  timestamp: string;
  intensity_val: number;
  uncertainty_radius_km: number;
}

export interface EnsembleMember {
  member_id: string;
  name: string;
  weight: number;
  trajectory: LatLon[];
}

export interface ThreatComputeRegion {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  resolution_km: number;
  grid_cells_saved_percent: number;
}

export interface PhysicsValidation {
  moisture_flux_convergence: {
    passed: boolean;
    val: number;
    threshold: number;
    unit: string;
  };
  mass_continuity: {
    passed: boolean;
    error_percent: number;
    max_tolerated: number;
  };
  non_negative_precipitation: {
    passed: boolean;
    corrected_pixels: number;
  };
  thermodynamic_lapse_rate: {
    passed: boolean;
    val_k_per_km: number;
  };
  composite_physics_score: number; // 0 to 100%
}

export interface DownscalingGridData {
  field_name: string;
  unit: string;
  coarse_12km_peak: number;
  bilinear_baseline_peak: number;
  avarta_5km_peak: number;
  amplitude_preservation_ratio: number; // e.g. 0.982 (98.2%) vs 0.54 for baseline
  spectral_energy_high_freq: number;
  grid_resolution: string;
  coarse_matrix: number[][]; // 8x8 coarse grid
  downscaled_matrix: number[][]; // 20x20 fine 5km grid
}

export interface ImpactFootprint {
  threat_id: string;
  primary_zone_name: string;
  coordinates: LatLon;
  radius_5km_pins: LatLon[];
  peak_metric_label: string;
  peak_metric_value: number;
  peak_metric_unit: string;
  affected_area_km2: number;
  exposed_population: number;
  critical_infrastructure: string[];
  estimated_arrival_hours: number;
  duration_hours: number;
  ndrf_recommended_readiness: "STANDBY" | "LEVEL_2_DEPLOY" | "LEVEL_3_FULL_MOBILIZATION";
}

export interface ThreatObject {
  id: string;
  name: string;
  hazard_type: HazardType;
  status: ThreatStatus;
  severity: SeverityLevel;
  confidence: number;
  lead_time_days: number;
  timestamp: string;
  centroid: LatLon;
  velocity_kmh: number;
  bearing_deg: number;
  intensity_label: string;
  intensity_current: number;
  intensity_unit: string;
  intensity_slope: number; // rate of change
  historical_percentile: number; // e.g. 99.8th percentile vs 30-year ERA5
  efi_index: number; // Extreme Forecast Index: -1 to +1 (typically > 0.85 for extreme)
  trajectory: TrajectoryPoint[];
  ensemble_members: EnsembleMember[];
  compute_region: ThreatComputeRegion;
  downscaling: DownscalingGridData;
  physics_guard: PhysicsValidation;
  impact: ImpactFootprint;
}

export interface AgentChatMessage {
  id: string;
  sender: "user" | "agent" | "system";
  timestamp: string;
  content: string;
  tool_call?: {
    tool_name: string;
    arguments: Record<string, any>;
    result?: Record<string, any>;
  };
  pending_approval?: {
    action_type: string;
    details: string;
    threat_id: string;
    target_agency: string;
    approved?: boolean;
    executed_at?: string;
  };
}
