import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";
import { impactsFor, nearestPlace, riskScore } from "@/lib/forecast";

const ANCHORS: [string, number, number, string, string][] = [
  // North (9)
  ["Srinagar", 34.08, 74.80, "Jammu & Kashmir", "North"],
  ["Leh", 34.15, 77.58, "Ladakh", "North"],
  ["Shimla", 31.10, 77.17, "Himachal Pradesh", "North"],
  ["Dehradun", 30.32, 78.03, "Uttarakhand", "North"],
  ["Amritsar", 31.63, 74.87, "Punjab", "North"],
  ["Chandigarh", 30.73, 76.78, "Chandigarh (UT)", "North"],
  ["Delhi (NCR)", 28.61, 77.21, "Delhi", "North"],
  ["Gurugram", 28.46, 77.03, "Haryana", "North"],
  ["Lucknow", 26.85, 80.95, "Uttar Pradesh", "North"],

  // West (7)
  ["Jaipur", 26.91, 75.79, "Rajasthan", "West"],
  ["Jodhpur", 26.24, 73.02, "Rajasthan", "West"],
  ["Ahmedabad", 23.02, 72.57, "Gujarat", "West"],
  ["Mumbai", 19.07, 72.87, "Maharashtra", "West"],
  ["Nagpur", 21.15, 79.09, "Maharashtra", "West"],
  ["Panaji", 15.50, 73.83, "Goa", "West"],
  ["Daman", 20.42, 72.83, "Dadra & Nagar Haveli and Daman & Diu", "West"],

  // Central (3)
  ["Bhopal", 23.26, 77.41, "Madhya Pradesh", "Central"],
  ["Indore", 22.71, 75.85, "Madhya Pradesh", "Central"],
  ["Raipur", 21.25, 81.63, "Chhattisgarh", "Central"],

  // East (4)
  ["Patna", 25.60, 85.14, "Bihar", "East"],
  ["Ranchi", 23.34, 85.31, "Jharkhand", "East"],
  ["Kolkata", 22.57, 88.36, "West Bengal", "East"],
  ["Bhubaneswar", 20.30, 85.82, "Odisha", "East"],

  // South (7)
  ["Hyderabad", 17.38, 78.49, "Telangana", "South"],
  ["Visakhapatnam", 17.69, 83.22, "Andhra Pradesh", "South"],
  ["Vijayawada", 16.50, 80.64, "Andhra Pradesh", "South"],
  ["Bengaluru", 12.97, 77.59, "Karnataka", "South"],
  ["Chennai", 13.08, 80.27, "Tamil Nadu", "South"],
  ["Kochi", 9.93, 76.27, "Kerala", "South"],
  ["Puducherry", 11.94, 79.80, "Puducherry (UT)", "South"],

  // Northeast (8)
  ["Guwahati", 26.14, 91.74, "Assam", "Northeast"],
  ["Shillong", 25.58, 91.89, "Meghalaya", "Northeast"],
  ["Itanagar", 27.09, 93.61, "Arunachal Pradesh", "Northeast"],
  ["Kohima", 25.67, 94.10, "Nagaland", "Northeast"],
  ["Imphal", 24.81, 93.93, "Manipur", "Northeast"],
  ["Aizawl", 23.73, 92.71, "Mizoram", "Northeast"],
  ["Agartala", 23.83, 91.28, "Tripura", "Northeast"],
  ["Gangtok", 27.34, 88.61, "Sikkim", "Northeast"],

  // Islands (2)
  ["Port Blair", 11.62, 92.73, "Andaman & Nicobar Islands", "Islands"],
  ["Kavaratti", 10.56, 72.64, "Lakshadweep", "Islands"],
];

export async function GET() {
  const replay = await getReplay();
  const regions = ANCHORS.map(([name, lat, lon, state, zone]) => {
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
      state,
      zone,
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
