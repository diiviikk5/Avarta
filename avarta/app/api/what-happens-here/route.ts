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
  const leadHours = [0, 3, 6, 9, 12, 18, 24];
  const intensityShape = [0.12, 0.28, 0.55, 0.84, 1, 0.66, 0.32];
  let accumulation = 0;
  const hourly_timeline = leadHours.map((lead_hour, index) => {
    const rainfall_rate_mm_hr = Math.round((forecast.rainfall_mm / 12) * intensityShape[index] * 10) / 10;
    const stepHours = index === 0 ? 0 : lead_hour - leadHours[index - 1];
    accumulation += rainfall_rate_mm_hr * stepHours;
    return {
      lead_hour,
      label: lead_hour === 0 ? "Now" : `T+${lead_hour}h`,
      rainfall_rate_mm_hr,
      accumulated_rainfall_mm: Math.round(accumulation * 10) / 10,
      probability_percent: Math.round(Math.max(28, Math.min(95, forecast.confidence * 100 - Math.abs(12 - lead_hour) * 1.6))),
    };
  });
  const severe = forecast.severity === "HIGH" || forecast.severity === "SEVERE";
  const recommended_actions = severe
    ? [
        "Avoid underpasses, river crossings and visibly waterlogged roads during the peak window.",
        "Move vehicles and essential equipment away from low-lying drainage corridors.",
        "Keep IMD, district administration and emergency alerts enabled; act on official warnings.",
      ]
    : forecast.severity === "MODERATE"
      ? [
          "Allow extra travel time and avoid roads with repeated waterlogging history.",
          "Clear nearby roof and street drains where it is safe to do so.",
          "Check the next official IMD nowcast before outdoor work or travel.",
        ]
      : [
          "No major disruption is indicated, but keep routine weather alerts enabled.",
          "Carry rain protection and watch for brief local ponding near blocked drains.",
          "Recheck if official IMD or district alerts are issued for your location.",
        ];
  const impact_explanation = severe
    ? "Short-duration rainfall may arrive faster than urban drains can discharge it. The first visible effects are normally ponding, slower traffic and flooded underpasses; persistent cells can extend disruption into adjacent low-lying wards."
    : "The model signal is currently below the major-disruption range. Localised ponding is still possible because street-level outcomes depend on drainage condition, construction and very small storm cells that the replay grid cannot resolve.";
  const confidence_percent = Math.round(forecast.confidence * 100);
  return NextResponse.json({
    location: forecast.location,
    coordinates: { lat, lon },
    headline: `${forecast.severity} ${forecast.event.toUpperCase()}`,
    expected_rainfall_mm: [Math.round(low * 10) / 10, Math.round(high * 10) / 10],
    forecast_window: forecast.window_label,
    potential_impacts: forecast.potential_impacts,
    risk_radius_km: forecast.risk_radius_km,
    confidence: forecast.confidence,
    confidence_percent,
    anomaly_sigma: forecast.anomaly_sigma,
    severity: forecast.severity,
    risk_score: forecast.risk_score,
    risk_band: forecast.risk_band,
    forecast_hours: forecast.forecast_hours,
    hourly_timeline,
    risk_components: [
      { label: "Rainfall magnitude", score: Math.round(Math.min(100, forecast.rainfall_mm / 1.4)) },
      { label: "Climatology anomaly", score: Math.round(Math.min(100, Math.abs(forecast.anomaly_sigma) * 25)) },
      { label: "Forecast support", score: confidence_percent },
      { label: "Local uncertainty", score: Math.round((1 - forecast.confidence) * 100) },
    ],
    recommended_actions,
    explanations: {
      meteorology: `The nearest replay-grid cell indicates ${forecast.rainfall_mm.toFixed(1)} mm over the analysis period, or ${forecast.anomaly_sigma >= 0 ? "+" : ""}${forecast.anomaly_sigma.toFixed(1)} standard deviations from the provisional climatological baseline.`,
      impacts: impact_explanation,
      confidence: `${confidence_percent}% is model support, not a calibrated probability of personal harm. Confidence reflects anomaly strength and ensemble support; street-scale drainage and storm-cell placement remain unresolved.`,
    },
    visual_context: {
      image: severe ? "/images/cloudburst_flood_radar.jpg" : "/images/cyclone_satellite_amphan.jpg",
      alt: severe ? "Reference visualization of a cloudburst and flood radar field" : "Reference satellite visualization of an organised weather system",
      label: "Reference atmospheric visual · illustrative, not a live observation",
    },
    provenance: {
      model: replay.forecast.model,
      initialization_time: replay.forecast.initialization_time,
      grid_note: "Nearest available replay-grid cell; not a street-level sensor reading.",
    },
    narrative: forecast.narrative,
    status: "draft_decision_support",
    dissemination: "not_sent",
  });
}
