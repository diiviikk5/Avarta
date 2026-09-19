import type { ReplayCase } from "@/lib/replay";

export interface PinpointForecast {
  location: string;
  event: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  risk_radius_km: number;
  rainfall_mm: number;
  anomaly_sigma: number;
  forecast_hours: number;
  confidence: number;
  risk_score: number;
  risk_band: string;
  window_label: string;
  potential_impacts: string[];
  narrative: string;
  status: string;
}

const KNOWN_PLACES: [string, number, number][] = [
  ["Faridabad", 28.4, 77.31],
  ["Noida", 28.53, 77.39],
  ["Delhi", 28.61, 77.21],
  ["Gurugram", 28.46, 77.03],
  ["Jaipur", 26.91, 75.79],
  ["Lucknow", 26.85, 80.95],
  ["Patna", 25.59, 85.14],
  ["Chandigarh", 30.73, 76.78],
  ["Dehradun", 30.32, 78.03],
  ["Amritsar", 31.63, 74.87],
  ["Agra", 27.18, 78.01],
  ["Nagpur", 21.15, 79.09],
  ["Kolkata", 22.57, 88.36],
];

export function nearestPlace(lat: number, lon: number): string {
  let best = `${lat.toFixed(2)}N ${lon.toFixed(2)}E`;
  let bestDist = Infinity;
  for (const [name, plat, plon] of KNOWN_PLACES) {
    const d = (lat - plat) ** 2 + (lon - plon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return bestDist <= 0.25 ? best : `${lat.toFixed(2)}N ${lon.toFixed(2)}E`;
}

function nearestGrid(replay: ReplayCase, lat: number, lon: number) {
  const { latitudes, longitudes, member_exceedance_probability } = replay.raster;
  const grid = replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? [];
  let row = 0;
  let col = 0;
  latitudes.forEach((v, i) => {
    if (Math.abs(v - lat) < Math.abs((latitudes[row] ?? 0) - lat)) row = i;
  });
  longitudes.forEach((v, i) => {
    if (Math.abs(v - lon) < Math.abs((longitudes[col] ?? 0) - lon)) col = i;
  });
  return {
    rainfall: grid[row]?.[col] ?? 0,
    spread: member_exceedance_probability?.[row]?.[col] ?? 0.5,
    gridLat: latitudes[row] ?? lat,
    gridLon: longitudes[col] ?? lon,
  };
}

function sigmaToUnit(sigma: number, scale = 6): number {
  if (!Number.isFinite(sigma)) return 0;
  return Math.max(0, Math.min(1, Math.abs(sigma) / scale));
}

export function riskScore(parts: { rain: number; wind?: number; temp?: number; percentile?: number; spread?: number }) {
  const components = {
    rainfall_sigma: sigmaToUnit(parts.rain),
    wind_sigma: sigmaToUnit(parts.wind ?? 0),
    temperature_sigma: sigmaToUnit(parts.temp ?? 0),
    historical_extremeness: Math.max(0, Math.min(1, ((parts.percentile ?? 90) - 50) / 50)),
    forecast_uncertainty: Math.max(0, Math.min(1, parts.spread ?? 0.5)),
  };
  const score =
    Math.round(
      (components.rainfall_sigma * 0.3 +
        components.wind_sigma * 0.25 +
        components.temperature_sigma * 0.15 +
        components.historical_extremeness * 0.15 +
        components.forecast_uncertainty * 0.15) *
        1000,
    ) / 10;
  const band = score >= 80 ? "SEVERE" : score >= 60 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";
  return { score, band, components };
}

export function impactsFor(rainfall: number, band: string): string[] {
  if (band === "SEVERE" || rainfall >= 140)
    return ["Urban flooding", "Road waterlogging", "Drainage overflow", "Flash-flood risk in low-lying areas"];
  if (band === "HIGH" || rainfall >= 80) return ["Flash flooding in drains", "Waterlogging", "Traffic disruption"];
  if (band === "MODERATE" || rainfall >= 35) return ["Local waterlogging in low areas", "Slippery roads"];
  return ["No significant impact expected"];
}

export function pinpointForecastFromReplay(replay: ReplayCase, lat: number, lon: number, hours = 12): PinpointForecast {
  const grid = nearestGrid(replay, lat, lon);
  const sigma = Math.round(((grid.rainfall - 18) / 18) * 100) / 100;
  const { score, band } = riskScore({
    rain: sigma,
    percentile: Math.min(99.9, 50 + Math.abs(sigma) * 8),
    spread: grid.spread,
  });
  const severity = band as PinpointForecast["severity"];
  const event = severity === "HIGH" || severity === "SEVERE" ? "Extreme Rainfall" : "Rainfall Anomaly Watch";
  const location = nearestPlace(lat, lon);
  const window_label = hours >= 12 ? `next ${hours - 6}–${hours + 6} hours` : `next ${hours} hours`;
  const potential_impacts = impactsFor(grid.rainfall, band);
  const confidence = Math.round(Math.max(0.35, Math.min(0.92, 0.55 + Math.abs(sigma) * 0.05)) * 100) / 100;
  const low = Math.max(0, grid.rainfall * 0.85);
  const high = grid.rainfall * 1.15 + 5;
  return {
    location,
    event,
    severity,
    risk_radius_km: 5,
    rainfall_mm: Math.round(grid.rainfall * 10) / 10,
    anomaly_sigma: sigma,
    forecast_hours: hours,
    confidence,
    risk_score: score,
    risk_band: band,
    window_label,
    potential_impacts,
    narrative:
      `${location}: ${event} (${severity}). Expected rainfall ${low.toFixed(0)}–${high.toFixed(0)} mm ` +
      `over ${window_label}; anomaly ${sigma >= 0 ? "+" : ""}${sigma.toFixed(1)}σ vs provisional climatology. ` +
      `Possible: ${potential_impacts.join(", ")}. Draft decision support only — meteorologist review required.`,
    status: "draft_decision_support",
  };
}

export interface RegionRiskRow {
  name: string;
  latitude: number;
  longitude: number;
  rainfall: number;
  sigma: number;
  score: number;
  band: string;
}

const RAIN_ANCHORS: [string, number, number][] = [
  ["Punjab", 30.9, 75.8],
  ["Delhi", 28.6, 77.2],
  ["Uttar Pradesh", 27.5, 80.5],
  ["Bihar", 25.8, 85.5],
  ["Rajasthan", 26.5, 73.8],
  ["Haryana", 29.3, 76.0],
  ["Uttarakhand", 30.3, 78.5],
];

const CYCLONE_ANCHORS: [string, number, number][] = [
  ["Sundarbans", 21.94, 88.90],
  ["Kolkata", 22.57, 88.36],
  ["Digha", 21.62, 87.51],
  ["Paradip", 20.31, 86.61],
  ["Balasore", 21.49, 86.93],
  ["Bhubaneswar", 20.29, 85.82],
  ["Midnapore", 22.42, 87.32],
];

const HEATWAVE_ANCHORS: [string, number, number][] = [
  ["Delhi (Najafgarh)", 28.61, 77.21],
  ["Phalodi", 27.13, 72.36],
  ["Churu", 28.29, 74.96],
  ["Sirsa", 29.53, 75.03],
  ["Ganganagar", 29.91, 73.88],
  ["Jhansi", 25.44, 78.56],
  ["Nagpur", 21.15, 79.09],
];

/** State-level risk rows sampled from the replay grid, most severe first. */
export function regionRiskRows(replay: ReplayCase): RegionRiskRow[] {
  const isCyclone = (replay.hazard_type === "cyclone") || replay.id?.includes("cyclone");
  const isHeat = (replay.hazard_type === "heatwave") || replay.id?.includes("heat");
  const anchors = isCyclone ? CYCLONE_ANCHORS : isHeat ? HEATWAVE_ANCHORS : RAIN_ANCHORS;

  return anchors.map(([name, lat, lon]) => {
    const grid = nearestGrid(replay, lat, lon);
    const baseline = isHeat ? 40.0 : isCyclone ? 50.0 : 18.0;
    const sigma = (grid.rainfall - baseline) / (baseline * 0.5);
    const { score, band } = riskScore({
      rain: sigma,
      percentile: Math.min(99.9, 50 + Math.abs(sigma) * 8),
      spread: grid.spread,
    });
    return {
      name,
      latitude: lat,
      longitude: lon,
      rainfall: Math.round(grid.rainfall * 10) / 10,
      sigma: Math.round(sigma * 100) / 100,
      score,
      band,
    };
  }).sort((a, b) => b.score - a.score);
}

/** Lightweight track extrapolation shown on the dashboard (mirrors the Python EventTracker). */
export function replayTrackLegs(replay: ReplayCase) {
  const last = replay.frames[replay.frames.length - 1];
  if (!last || !last.objects) return [];
  const getPeak = (o: { peak_value?: number; peak_mm_3h?: number }) => o.peak_value ?? o.peak_mm_3h ?? 0;
  const top = [...last.objects].sort((a, b) => getPeak(b) - getPeak(a)).slice(0, 3);
  return top.map((obj, i) => {
    // Cheap velocity proxy: displacement of the same track across the last two frames.
    const prev = replay.frames[replay.frames.length - 2]?.objects.find((o) => o.track_id === obj.track_id);
    const dLat = prev ? obj.centroid[0] - prev.centroid[0] : 0.15;
    const dLon = prev ? obj.centroid[1] - prev.centroid[1] : -0.2;
    const peakVal = getPeak(obj);
    const steps = [24, 48, 72].map((h) => ({
      lat: Math.round((obj.centroid[0] + dLat * (h / 3)) * 1000) / 1000,
      lon: Math.round((obj.centroid[1] + dLon * (h / 3)) * 1000) / 1000,
      lead_hours: h,
      intensity: Math.round(peakVal * 10) / 10,
      uncertainty_radius_km: 25 + 1.1 * h,
    }));
    return {
      event_id: obj.track_id ?? `EVT-0${i + 1}42`.slice(0, 7),
      track_id: obj.track_id ?? `track-${i}`,
      current: { lat: obj.centroid[0], lon: obj.centroid[1] },
      peak: peakVal,
      bbox: obj.bbox,
      steps,
    };
  });
}
