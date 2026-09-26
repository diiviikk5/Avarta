import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";

export async function GET() {
  const replay = await getReplay();
  const threshold = replay.verification.heavy_rain_threshold_mm_day ?? 64.5;
  const raster = replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? [];
  let peak = { value: -1, row: 0, col: 0 };
  raster.forEach((line, row) => line.forEach((value, col) => {
    if (value > peak.value) peak = { value, row, col };
  }));
  const { value, row, col } = peak;
  return NextResponse.json({
    id: `${replay.id}-draft`,
    status: "draft_decision_support",
    dissemination: "not_sent",
    case_id: replay.id,
    source: replay.forecast.model,
    forecast_initialization_time: replay.forecast.initialization_time,
    forecast_window_utc: replay.forecast.window_utc,
    observation_date_for_retrospective_verification: replay.observation.date,
    hazard: "24-hour rainfall",
    centroid: { latitude: replay.raster.latitudes[row], longitude: replay.raster.longitudes[col] },
    coarse_grid_peak_mm_day: value,
    heavy_rain_threshold_mm_day: threshold,
    threshold_exceeded: value >= threshold,
    message: value >= threshold
      ? "Unvalidated forecast threshold exceeded. Meteorologist review required before any public alert."
      : "No grid cell reaches the provisional heavy-rain threshold. No public alert is indicated by this replay.",
    limitations: replay.limitations,
  });
}
