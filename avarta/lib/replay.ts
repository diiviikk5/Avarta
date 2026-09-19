import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ReplayCase {
  id: string;
  mode: string;
  title: string;
  hazard: string;
  hazard_type?: string;
  forecast: {
    model: string;
    initialization_time: string;
    window_utc: string[];
    lead_hours: number[];
    members: string[];
    grid_spacing_degrees: number;
    units: string;
  };
  observation: {
    model: string;
    date: string;
    grid_spacing_degrees: number;
    units: string;
    source_url: string;
    timing_note: string;
  };
  independent_observation?: {
    model: string;
    date: string;
    grid_spacing_degrees: number;
    source_url: string;
    sha256: string;
    note: string;
  };
  independent_verification?: {
    method: string;
    sampled_grid_cells: number;
    forecast_peak_mm_day: number;
    chirps_peak_mm_day: number;
    mean_absolute_error_mm_day: number;
    heavy_rain_iou: number | null;
    heavy_rain_threshold_mm_day: number;
    timing_note: string;
  };
  domain: { south: number; north: number; west: number; east: number };
  verification: {
    sampled_grid_cells: number;
    forecast_peak_mm_day?: number;
    observed_peak_mm_day?: number;
    peak_absolute_error_mm_day?: number;
    mean_absolute_error_mm_day?: number;
    heavy_rain_threshold_mm_day?: number;
    heavy_rain_iou?: number | null;
    observed_peak_location?: number[];
    landfall_location?: number[];
    forecast_peak_intensity?: number;
    observed_peak_intensity?: number;
    min_central_pressure_hpa?: number;
    peak_vorticity_1e5?: number;
    landfall_wind_kmh?: number;
    track_forecast_error_km_48h?: number;
    peak_wet_bulb_c?: number;
    peak_z500_ridge_gpm?: number;
    climatological_normal_c?: number;
    max_sigma_anomaly?: number;
    heat_stress_category?: string;
    affected_population_estimate_millions?: number;
  };
  frames: {
    lead_hour: number;
    valid_time: string;
    objects: {
      track_id?: string;
      centroid: number[];
      bbox: number[];
      peak_mm_3h?: number;
      peak_value?: number;
      pressure_hpa?: number;
      vorticity_1e5?: number;
      stage?: string;
      cells: number;
    }[];
  }[];
  raster: {
    latitudes: number[];
    longitudes: number[];
    forecast_mm_day?: number[][];
    forecast_field?: number[][];
    member_exceedance_probability?: number[][];
  };
  limitations: string[];
}

export interface BenchmarkReport {
  experiment: string;
  model: string;
  coarse_proxy: string;
  validation: {
    method: string;
    first_validation_date: string;
    train_samples: number;
    validation_samples: number;
    heavy_rain_threshold_mm_day: number;
    residual_cnn: BenchmarkMetrics;
    bilinear: BenchmarkMetrics;
  };
}

interface BenchmarkMetrics {
  mean_peak_absolute_error_mm_day: number;
  mean_absolute_error_mm_day: number;
  heavy_rain_detection_recall: number;
  heavy_rain_false_alarm_ratio: number;
  heavy_rain_footprint_iou: number;
}

export async function getReplay(): Promise<ReplayCase> {
  const file = join(process.cwd(), "public", "replay", "august-2025.json");
  return JSON.parse(await readFile(file, "utf8")) as ReplayCase;
}

export async function getCase(caseId?: string): Promise<ReplayCase> {
  const normalized = (caseId || "").toLowerCase();
  let filename = "august-2025.json";
  if (normalized.includes("cyclone") || normalized.includes("amphan")) {
    filename = "cyclone-amphan.json";
  } else if (normalized.includes("heat")) {
    filename = "heatwave-2024.json";
  }
  const file = join(process.cwd(), "public", "replay", filename);
  const data = JSON.parse(await readFile(file, "utf8")) as ReplayCase;
  if (data && data.raster) {
    const grid = data.raster.forecast_field ?? data.raster.forecast_mm_day ?? [];
    data.raster.forecast_field = grid;
    data.raster.forecast_mm_day = grid;
  }
  return data;
}

export function getCaseList() {
  return [
    {
      id: "gefs-imd-rain-2025-08-23",
      hazard_type: "rainfall",
      title: "23 August 2025 · Northwest India Heavy Rainfall",
      region: "Northwest India (Rajasthan, Haryana, Delhi)",
      dates: "19–23 August 2025",
      model_inputs: "NOAA GEFS (0.5°) × IMD Daily (0.25°)",
      peak_observed: "469.2 mm/day",
      file: "august-2025.json",
    },
    {
      id: "cyclone-amphan-2020-05",
      hazard_type: "cyclone",
      title: "May 2020 · Super Cyclonic Storm Amphan",
      region: "Bay of Bengal & Sundarbans Landfall",
      dates: "16–21 May 2020",
      model_inputs: "NCMRWF NEPS-G / IMD Best-Track (0.25°)",
      peak_observed: "260.0 km/h (907 hPa)",
      file: "cyclone-amphan.json",
    },
    {
      id: "heatwave-north-india-2024-05",
      hazard_type: "heatwave",
      title: "May 2024 · Severe North India Heat Dome",
      region: "Indo-Gangetic Plain & Thar Desert",
      dates: "23–28 May 2024",
      model_inputs: "NCMRWF NEPS-G / IMD Gridded Temp (0.25°)",
      peak_observed: "49.8 °C (Tw 31.4°C)",
      file: "heatwave-2024.json",
    },
  ];
}

export async function getBenchmark(): Promise<BenchmarkReport> {
  const file = join(process.cwd(), "public", "replay", "training-benchmark.json");
  return JSON.parse(await readFile(file, "utf8")) as BenchmarkReport;
}
