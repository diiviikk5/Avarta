import { ThreatObject } from "@/types/threat";

// Helper to create synthetic 2D Gaussian heatmaps with high-frequency realistic convective texture
function generateMatrices(coarsePeak: number, finePeak: number, shape: "circular" | "elongated" | "spiral") {
  const coarseSize = 8;
  const fineSize = 20;

  // 8x8 coarse matrix (smoothed, flattened peaks)
  const coarse: number[][] = [];
  for (let r = 0; r < coarseSize; r++) {
    const row: number[] = [];
    for (let c = 0; c < coarseSize; c++) {
      const dx = (c - coarseSize / 2) / (coarseSize / 2.5);
      const dy = (r - coarseSize / 2) / (coarseSize / 2.5);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const val = Math.max(0, coarsePeak * Math.exp(-dist * 1.5) * (0.85 + Math.sin(r + c) * 0.15));
      row.push(parseFloat(val.toFixed(1)));
    }
    coarse.push(row);
  }

  // 20x20 fine downscaled matrix (sharp convective core, fine-scale rain bands)
  const fine: number[][] = [];
  for (let r = 0; r < fineSize; r++) {
    const row: number[] = [];
    for (let c = 0; c < fineSize; c++) {
      const dx = (c - fineSize / 2) / (fineSize / 2.8);
      const dy = (r - fineSize / 2) / (fineSize / 2.8);
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      let pattern = Math.exp(-dist * 1.3);
      if (shape === "spiral") {
        const angle = Math.atan2(dy, dx);
        pattern *= 0.6 + 0.4 * Math.sin(angle * 2.5 - dist * 3.5);
      } else if (shape === "elongated") {
        pattern = Math.exp(-(dx * dx * 1.8 + dy * dy * 0.7));
      }

      // Preserve extreme tail peak right at convective core
      const coreBoost = dist < 0.25 ? (1.0 - dist * 4) * 0.35 : 0;
      const noise = (Math.sin(r * 1.7) * Math.cos(c * 1.9)) * 0.08;
      const val = Math.max(0, finePeak * (pattern + coreBoost + noise));
      row.push(parseFloat(val.toFixed(1)));
    }
    fine.push(row);
  }

  return { coarse, fine };
}

const amphanGrids = generateMatrices(52.4, 118.2, "spiral");
const cloudburstGrids = generateMatrices(44.1, 142.8, "elongated");
const heatdomeGrids = generateMatrices(43.2, 47.9, "circular");

export const MOCK_THREATS: ThreatObject[] = [
  {
    id: "AVT-2026-0041",
    name: "Severe Cyclone Amphan-II",
    hazard_type: "CYCLONE",
    status: "INTENSIFYING",
    severity: "CRITICAL",
    confidence: 0.94,
    lead_time_days: 4.5,
    timestamp: "2026-09-25T14:00:00Z",
    centroid: { lat: 19.8, lon: 87.4 },
    velocity_kmh: 24.6,
    bearing_deg: 345, // North-Northwest
    intensity_label: "Sustained Peak Wind & Convection",
    intensity_current: 165.0,
    intensity_unit: "km/h",
    intensity_slope: +8.4,
    historical_percentile: 99.8,
    efi_index: 0.96, // Highly anomalous
    trajectory: [
      { lat: 17.2, lon: 88.5, time_offset_hours: -24, timestamp: "2026-09-24T14:00Z", intensity_val: 125, uncertainty_radius_km: 18 },
      { lat: 18.5, lon: 88.0, time_offset_hours: -12, timestamp: "2026-09-25T02:00Z", intensity_val: 145, uncertainty_radius_km: 24 },
      { lat: 19.8, lon: 87.4, time_offset_hours: 0, timestamp: "2026-09-25T14:00Z", intensity_val: 165, uncertainty_radius_km: 32 },
      { lat: 21.1, lon: 87.2, time_offset_hours: 24, timestamp: "2026-09-26T14:00Z", intensity_val: 180, uncertainty_radius_km: 54 },
      { lat: 22.3, lon: 88.1, time_offset_hours: 48, timestamp: "2026-09-27T14:00Z", intensity_val: 155, uncertainty_radius_km: 88 },
      { lat: 23.6, lon: 89.2, time_offset_hours: 72, timestamp: "2026-09-28T14:00Z", intensity_val: 95, uncertainty_radius_km: 140 }
    ],
    ensemble_members: [
      { member_id: "EPS-01", name: "NCMRWF EPS #1", weight: 0.14, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 21.0, lon: 86.9 }, { lat: 22.1, lon: 87.5 }, { lat: 23.4, lon: 88.6 }] },
      { member_id: "EPS-02", name: "NCMRWF EPS #2", weight: 0.12, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 21.2, lon: 87.3 }, { lat: 22.4, lon: 88.2 }, { lat: 23.8, lon: 89.4 }] },
      { member_id: "EPS-03", name: "ECMWF Ens #3", weight: 0.16, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 21.3, lon: 87.6 }, { lat: 22.7, lon: 88.6 }, { lat: 24.1, lon: 89.9 }] },
      { member_id: "EPS-04", name: "ECMWF Ens #4", weight: 0.10, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 20.9, lon: 86.6 }, { lat: 21.8, lon: 87.1 }, { lat: 23.0, lon: 88.0 }] },
      { member_id: "EPS-05", name: "GEFS Pert #5", weight: 0.11, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 21.4, lon: 87.8 }, { lat: 22.8, lon: 88.9 }, { lat: 24.3, lon: 90.3 }] },
      { member_id: "EPS-06", name: "UKMO Pert #6", weight: 0.13, trajectory: [{ lat: 19.8, lon: 87.4 }, { lat: 21.1, lon: 87.2 }, { lat: 22.3, lon: 88.1 }, { lat: 23.6, lon: 89.2 }] }
    ],
    compute_region: {
      min_lat: 18.0,
      max_lat: 24.5,
      min_lon: 85.5,
      max_lon: 90.5,
      resolution_km: 5.0,
      grid_cells_saved_percent: 88.4 // Threat-first compute vs global downscaling
    },
    downscaling: {
      field_name: "Convective Precipitation Rate",
      unit: "mm/h",
      coarse_12km_peak: 52.4,
      bilinear_baseline_peak: 54.1,
      avarta_5km_peak: 118.2,
      amplitude_preservation_ratio: 0.984, // 98.4% peak retained
      spectral_energy_high_freq: 0.892,
      grid_resolution: "5 km subgrid",
      coarse_matrix: amphanGrids.coarse,
      downscaled_matrix: amphanGrids.fine
    },
    physics_guard: {
      moisture_flux_convergence: {
        passed: true,
        val: -4.82e-4,
        threshold: -1.2e-4,
        unit: "g/(kg·s)"
      },
      mass_continuity: {
        passed: true,
        error_percent: 0.028,
        max_tolerated: 0.05
      },
      non_negative_precipitation: {
        passed: true,
        corrected_pixels: 0
      },
      thermodynamic_lapse_rate: {
        passed: true,
        val_k_per_km: -6.4
      },
      composite_physics_score: 99.4
    },
    impact: {
      threat_id: "AVT-2026-0041",
      primary_zone_name: "Digha - Sundarbans Coastal Belt",
      coordinates: { lat: 21.68, lon: 87.55 },
      radius_5km_pins: [
        { lat: 21.68, lon: 87.55 },
        { lat: 21.82, lon: 87.72 },
        { lat: 21.95, lon: 88.12 }
      ],
      peak_metric_label: "Peak Storm Surge & Rain",
      peak_metric_value: 118.2,
      peak_metric_unit: "mm/h",
      affected_area_km2: 4820,
      exposed_population: 2640000,
      critical_infrastructure: [
        "Haldia Oil Refinery & Port",
        "Kolkata Southern Flood Embankments",
        "Coastal Substation Grid 220kV"
      ],
      estimated_arrival_hours: 38,
      duration_hours: 22,
      ndrf_recommended_readiness: "LEVEL_3_FULL_MOBILIZATION"
    }
  },
  {
    id: "AVT-2026-0089",
    name: "Kullu-Mandi Orographic Cloudburst",
    hazard_type: "CLOUDBURST",
    status: "PEAK",
    severity: "CRITICAL",
    confidence: 0.91,
    lead_time_days: 2.0,
    timestamp: "2026-09-25T15:30:00Z",
    centroid: { lat: 31.95, lon: 77.10 },
    velocity_kmh: 12.3,
    bearing_deg: 45, // Northeast into gorge
    intensity_label: "Flash Precipitation Rate",
    intensity_current: 142.8,
    intensity_unit: "mm/h",
    intensity_slope: +14.2,
    historical_percentile: 99.9,
    efi_index: 0.98,
    trajectory: [
      { lat: 31.55, lon: 76.75, time_offset_hours: -12, timestamp: "2026-09-25T03:30Z", intensity_val: 78, uncertainty_radius_km: 12 },
      { lat: 31.75, lon: 76.92, time_offset_hours: -6, timestamp: "2026-09-25T09:30Z", intensity_val: 115, uncertainty_radius_km: 16 },
      { lat: 31.95, lon: 77.10, time_offset_hours: 0, timestamp: "2026-09-25T15:30Z", intensity_val: 142, uncertainty_radius_km: 22 },
      { lat: 32.18, lon: 77.30, time_offset_hours: 12, timestamp: "2026-09-26T03:30Z", intensity_val: 120, uncertainty_radius_km: 36 },
      { lat: 32.40, lon: 77.55, time_offset_hours: 24, timestamp: "2026-09-26T15:30Z", intensity_val: 65, uncertainty_radius_km: 55 }
    ],
    ensemble_members: [
      { member_id: "NCUM-01", name: "NCUM High-Res Ens 1", weight: 0.25, trajectory: [{ lat: 31.95, lon: 77.10 }, { lat: 32.15, lon: 77.28 }, { lat: 32.38, lon: 77.50 }] },
      { member_id: "NCUM-02", name: "NCUM High-Res Ens 2", weight: 0.22, trajectory: [{ lat: 31.95, lon: 77.10 }, { lat: 32.22, lon: 77.34 }, { lat: 32.45, lon: 77.62 }] },
      { member_id: "NEPS-03", name: "NEPS-G Member 3", weight: 0.28, trajectory: [{ lat: 31.95, lon: 77.10 }, { lat: 32.12, lon: 77.22 }, { lat: 32.32, lon: 77.45 }] }
    ],
    compute_region: {
      min_lat: 31.2,
      max_lat: 32.8,
      min_lon: 76.4,
      max_lon: 77.9,
      resolution_km: 5.0,
      grid_cells_saved_percent: 94.2
    },
    downscaling: {
      field_name: "Orographic Flash Rain Intensity",
      unit: "mm/h",
      coarse_12km_peak: 44.1,
      bilinear_baseline_peak: 46.5,
      avarta_5km_peak: 142.8,
      amplitude_preservation_ratio: 0.991, // Standard downscalers completely wipe out valley cloudbursts
      spectral_energy_high_freq: 0.945,
      grid_resolution: "5 km terrain-aware",
      coarse_matrix: cloudburstGrids.coarse,
      downscaled_matrix: cloudburstGrids.fine
    },
    physics_guard: {
      moisture_flux_convergence: {
        passed: true,
        val: -6.12e-4,
        threshold: -1.5e-4,
        unit: "g/(kg·s)"
      },
      mass_continuity: {
        passed: true,
        error_percent: 0.034,
        max_tolerated: 0.05
      },
      non_negative_precipitation: {
        passed: true,
        corrected_pixels: 0
      },
      thermodynamic_lapse_rate: {
        passed: true,
        val_k_per_km: -7.1
      },
      composite_physics_score: 98.7
    },
    impact: {
      threat_id: "AVT-2026-0089",
      primary_zone_name: "Beas River Catchment Basin",
      coordinates: { lat: 31.95, lon: 77.10 },
      radius_5km_pins: [
        { lat: 31.95, lon: 77.10 },
        { lat: 31.98, lon: 77.14 },
        { lat: 31.92, lon: 77.06 }
      ],
      peak_metric_label: "Flash Flood Runoff Trigger",
      peak_metric_value: 142.8,
      peak_metric_unit: "mm/h",
      affected_area_km2: 920,
      exposed_population: 185000,
      critical_infrastructure: [
        "Larji Hydro Dam Sluice Gates",
        "National Highway 21 (Mandi-Manali corridor)",
        "Pandoh Bridge Culvert"
      ],
      estimated_arrival_hours: 6,
      duration_hours: 14,
      ndrf_recommended_readiness: "LEVEL_3_FULL_MOBILIZATION"
    }
  },
  {
    id: "AVT-2026-0104",
    name: "Vidarbha Persistent Heat Dome",
    hazard_type: "HEAT_DOME",
    status: "INTENSIFYING",
    severity: "HIGH",
    confidence: 0.88,
    lead_time_days: 6.0,
    timestamp: "2026-09-25T12:00:00Z",
    centroid: { lat: 21.14, lon: 79.08 },
    velocity_kmh: 4.2, // Quasi-stationary blocking high
    bearing_deg: 110,
    intensity_label: "Maximum Surface Temperature",
    intensity_current: 47.9,
    intensity_unit: "°C",
    intensity_slope: +1.6,
    historical_percentile: 99.4,
    efi_index: 0.92,
    trajectory: [
      { lat: 21.05, lon: 78.85, time_offset_hours: -24, timestamp: "2026-09-24T12:00Z", intensity_val: 45.8, uncertainty_radius_km: 25 },
      { lat: 21.10, lon: 78.96, time_offset_hours: -12, timestamp: "2026-09-25T00:00Z", intensity_val: 46.5, uncertainty_radius_km: 30 },
      { lat: 21.14, lon: 79.08, time_offset_hours: 0, timestamp: "2026-09-25T12:00Z", intensity_val: 47.9, uncertainty_radius_km: 38 },
      { lat: 21.20, lon: 79.22, time_offset_hours: 24, timestamp: "2026-09-26T12:00Z", intensity_val: 48.4, uncertainty_radius_km: 50 },
      { lat: 21.28, lon: 79.40, time_offset_hours: 48, timestamp: "2026-09-27T12:00Z", intensity_val: 48.7, uncertainty_radius_km: 68 }
    ],
    ensemble_members: [
      { member_id: "NEPS-H1", name: "NEPS Heat Perturbation 1", weight: 0.35, trajectory: [{ lat: 21.14, lon: 79.08 }, { lat: 21.22, lon: 79.24 }, { lat: 21.30, lon: 79.42 }] },
      { member_id: "NEPS-H2", name: "NEPS Heat Perturbation 2", weight: 0.30, trajectory: [{ lat: 21.14, lon: 79.08 }, { lat: 21.18, lon: 79.18 }, { lat: 21.24, lon: 79.35 }] },
      { member_id: "ECMWF-H3", name: "ECMWF Heat Member 3", weight: 0.35, trajectory: [{ lat: 21.14, lon: 79.08 }, { lat: 21.25, lon: 79.30 }, { lat: 21.36, lon: 79.52 }] }
    ],
    compute_region: {
      min_lat: 19.5,
      max_lat: 23.0,
      min_lon: 77.2,
      max_lon: 81.5,
      resolution_km: 5.0,
      grid_cells_saved_percent: 91.0
    },
    downscaling: {
      field_name: "2-Meter Screen Temperature",
      unit: "°C",
      coarse_12km_peak: 43.2,
      bilinear_baseline_peak: 43.6,
      avarta_5km_peak: 47.9,
      amplitude_preservation_ratio: 0.988,
      spectral_energy_high_freq: 0.865,
      grid_resolution: "5 km urban-albedo resolved",
      coarse_matrix: heatdomeGrids.coarse,
      downscaled_matrix: heatdomeGrids.fine
    },
    physics_guard: {
      moisture_flux_convergence: {
        passed: true,
        val: 1.12e-5, // Dry anticyclonic subsidence
        threshold: 2.0e-5,
        unit: "g/(kg·s)"
      },
      mass_continuity: {
        passed: true,
        error_percent: 0.012,
        max_tolerated: 0.05
      },
      non_negative_precipitation: {
        passed: true,
        corrected_pixels: 0
      },
      thermodynamic_lapse_rate: {
        passed: true,
        val_k_per_km: -9.8 // Dry adiabatic lapse rate
      },
      composite_physics_score: 99.8
    },
    impact: {
      threat_id: "AVT-2026-0104",
      primary_zone_name: "Nagpur - Wardha Urban Belt",
      coordinates: { lat: 21.14, lon: 79.08 },
      radius_5km_pins: [
        { lat: 21.14, lon: 79.08 },
        { lat: 21.18, lon: 79.12 },
        { lat: 21.10, lon: 79.02 }
      ],
      peak_metric_label: "Wet-Bulb Globe Risk Index",
      peak_metric_value: 34.2,
      peak_metric_unit: "°C WBGT",
      affected_area_km2: 12400,
      exposed_population: 4120000,
      critical_infrastructure: [
        "Regional Power Grid 765kV Thermal Line",
        "Agricultural Surface Water Canals",
        "District Medical ICU Heat Wards"
      ],
      estimated_arrival_hours: 48,
      duration_hours: 96,
      ndrf_recommended_readiness: "LEVEL_2_DEPLOY"
    }
  }
];
