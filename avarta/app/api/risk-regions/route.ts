import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";
import { impactsFor, nearestPlace, riskScore } from "@/lib/forecast";

const ANCHORS: [string, number, number][] = [
  ["Punjab", 30.9, 75.8],
  ["Delhi", 28.6, 77.2],
  ["Uttar Pradesh", 27.5, 80.5],
  ["Bihar", 25.8, 85.5],
  ["Rajasthan", 26.5, 73.8],
  ["Haryana", 29.3, 76.0],
  ["Uttarakhand", 30.3, 78.5],
];

export async function GET() {
  const replay = await getReplay();
  const regions = ANCHORS.map(([name, lat, lon]) => {
    let row = 0;
    let col = 0;
    replay.raster.latitudes.forEach((v, i) => {
      if (Math.abs(v - lat) < Math.abs(replay.raster.latitudes[row] - lat)) row = i;
    });
    replay.raster.longitudes.forEach((v, i) => {
      if (Math.abs(v - lon) < Math.abs(replay.raster.longitudes[col] - lon)) col = i;
    });
    const grid = replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? [];
    const rainfall = grid[row]?.[col] ?? 0;
    const sigma = (rainfall - 18) / 18;
    const { score, band } = riskScore({ rain: sigma, percentile: Math.min(99.9, 50 + Math.abs(sigma) * 8) });
    void nearestPlace;
    return {
      location: name,
      latitude: lat,
      longitude: lon,
      rainfall_mm: Math.round(rainfall * 10) / 10,
      anomaly_sigma: Math.round(sigma * 100) / 100,
      risk_score: score,
      risk_band: band,
      risk_radius_km: 5,
      potential_impacts: impactsFor(rainfall, band),
      color: band === "LOW" ? "🟢" : band === "MODERATE" ? "🟡" : band === "HIGH" ? "🟠" : "🔴",
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
  return NextResponse.json({
    status: "draft_decision_support",
    dissemination: "not_sent",
    bands: [
      { band: "LOW", range: [0, 30], emoji: "🟢" },
      { band: "MODERATE", range: [30, 60], emoji: "🟡" },
      { band: "HIGH", range: [60, 80], emoji: "🟠" },
      { band: "SEVERE", range: [80, 100], emoji: "🔴" },
    ],
    regions,
  });
}
