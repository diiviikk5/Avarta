import { NextResponse } from "next/server";
import { pinpointForecastFromReplay } from "@/lib/forecast";
import { getReplay } from "@/lib/replay";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const hours = Number(url.searchParams.get("hours") ?? "12");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Provide ?lat=28.53&lon=77.39" }, { status: 400 });
  }
  const replay = await getReplay();
  const forecast = pinpointForecastFromReplay(replay, lat, lon, Number.isFinite(hours) ? hours : 12);
  const low = Math.max(0, forecast.rainfall_mm * 0.85);
  const high = forecast.rainfall_mm * 1.15 + 5;
  return NextResponse.json({
    location: forecast.location,
    headline: `${forecast.severity} ${forecast.event.toUpperCase()}`,
    expected_rainfall_mm: [Math.round(low * 10) / 10, Math.round(high * 10) / 10],
    forecast_window: forecast.window_label,
    potential_impacts: forecast.potential_impacts,
    risk_radius_km: forecast.risk_radius_km,
    confidence: forecast.confidence,
    anomaly_sigma: forecast.anomaly_sigma,
    severity: forecast.severity,
    narrative: forecast.narrative,
    status: "draft_decision_support",
    dissemination: "not_sent",
  });
}
