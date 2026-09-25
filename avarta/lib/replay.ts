import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ReplayCase {
  id: string;
  mode: string;
  title: string;
  hazard: string;
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
  domain: { south: number; north: number; west: number; east: number };
  verification: {
    sampled_grid_cells: number;
    forecast_peak_mm_day: number;
    observed_peak_mm_day: number;
    peak_absolute_error_mm_day: number;
    mean_absolute_error_mm_day: number;
    heavy_rain_threshold_mm_day: number;
    heavy_rain_iou: number | null;
    observed_peak_location: number[];
  };
  frames: {
    lead_hour: number;
    valid_time: string;
    objects: {
      track_id?: string;
      centroid: number[];
      bbox: number[];
      peak_mm_3h: number;
      cells: number;
    }[];
  }[];
  raster: {
    latitudes: number[];
    longitudes: number[];
    forecast_mm_day: number[][];
    member_exceedance_probability: number[][];
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

export async function getBenchmark(): Promise<BenchmarkReport> {
  const file = join(process.cwd(), "public", "replay", "training-benchmark.json");
  return JSON.parse(await readFile(file, "utf8")) as BenchmarkReport;
}
