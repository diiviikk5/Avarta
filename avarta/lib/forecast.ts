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

export interface BriefingRegion {
  name: string;
  state: string;
  zone: "North" | "West" | "Central" | "East" | "South" | "Northeast" | "Islands";
  lat: number;
  lon: number;
}

/** Judge-demo presets for the local briefing workspace. Coordinates remain editable. */
export const BRIEFING_REGIONS: BriefingRegion[] = [
  { name: "Noida", state: "Uttar Pradesh", zone: "North", lat: 28.53, lon: 77.39 },
  { name: "Faridabad", state: "Haryana", zone: "North", lat: 28.4, lon: 77.31 },
  { name: "Delhi", state: "Delhi", zone: "North", lat: 28.61, lon: 77.21 },
  { name: "Gurugram", state: "Haryana", zone: "North", lat: 28.46, lon: 77.03 },
  { name: "Srinagar", state: "Jammu & Kashmir", zone: "North", lat: 34.08, lon: 74.8 },
  { name: "Dehradun", state: "Uttarakhand", zone: "North", lat: 30.32, lon: 78.03 },
  { name: "Chandigarh", state: "Chandigarh", zone: "North", lat: 30.73, lon: 76.78 },
  { name: "Jaipur", state: "Rajasthan", zone: "West", lat: 26.91, lon: 75.79 },
  { name: "Ahmedabad", state: "Gujarat", zone: "West", lat: 23.02, lon: 72.57 },
  { name: "Mumbai", state: "Maharashtra", zone: "West", lat: 19.07, lon: 72.87 },
  { name: "Panaji", state: "Goa", zone: "West", lat: 15.5, lon: 73.83 },
  { name: "Nagpur", state: "Maharashtra", zone: "West", lat: 21.15, lon: 79.09 },
  { name: "Bhopal", state: "Madhya Pradesh", zone: "Central", lat: 23.26, lon: 77.41 },
  { name: "Raipur", state: "Chhattisgarh", zone: "Central", lat: 21.25, lon: 81.63 },
  { name: "Lucknow", state: "Uttar Pradesh", zone: "East", lat: 26.85, lon: 80.95 },
  { name: "Patna", state: "Bihar", zone: "East", lat: 25.6, lon: 85.14 },
  { name: "Kolkata", state: "West Bengal", zone: "East", lat: 22.57, lon: 88.36 },
  { name: "Bhubaneswar", state: "Odisha", zone: "East", lat: 20.3, lon: 85.82 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", zone: "South", lat: 17.69, lon: 83.22 },
  { name: "Hyderabad", state: "Telangana", zone: "South", lat: 17.38, lon: 78.49 },
  { name: "Bengaluru", state: "Karnataka", zone: "South", lat: 12.97, lon: 77.59 },
  { name: "Chennai", state: "Tamil Nadu", zone: "South", lat: 13.08, lon: 80.27 },
  { name: "Kochi", state: "Kerala", zone: "South", lat: 9.93, lon: 76.27 },
  { name: "Guwahati", state: "Assam", zone: "Northeast", lat: 26.14, lon: 91.74 },
  { name: "Shillong", state: "Meghalaya", zone: "Northeast", lat: 25.58, lon: 91.89 },
  { name: "Imphal", state: "Manipur", zone: "Northeast", lat: 24.81, lon: 93.93 },
  { name: "Gangtok", state: "Sikkim", zone: "Northeast", lat: 27.34, lon: 88.61 },
  { name: "Port Blair", state: "Andaman & Nicobar Islands", zone: "Islands", lat: 11.62, lon: 92.73 },
  { name: "Kavaratti", state: "Lakshadweep", zone: "Islands", lat: 10.56, lon: 72.64 },
];

const KNOWN_PLACES: [string, number, number][] = BRIEFING_REGIONS.map(({ name, lat, lon }) => [name, lat, lon]);

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
  state?: string;
  zone?: string;
  hazard_alert?: string;
  temperature_c?: number;
  max_temp_c?: number;
  wind_gust_kmh?: number;
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

export const ALL_INDIA_ANCHORS: [string, number, number, string, string][] = [
  // North (9)
  ["Srinagar (J&K)", 34.08, 74.80, "Jammu & Kashmir", "North"],
  ["Leh (Ladakh)", 34.15, 77.58, "Ladakh", "North"],
  ["Shimla (HP)", 31.10, 77.17, "Himachal Pradesh", "North"],
  ["Dehradun (UK)", 30.32, 78.03, "Uttarakhand", "North"],
  ["Amritsar (PB)", 31.63, 74.87, "Punjab", "North"],
  ["Chandigarh", 30.73, 76.78, "Chandigarh (UT)", "North"],
  ["Delhi (NCR)", 28.61, 77.21, "Delhi", "North"],
  ["Gurugram (HR)", 28.46, 77.03, "Haryana", "North"],
  ["Lucknow (UP)", 26.85, 80.95, "Uttar Pradesh", "North"],

  // West (7)
  ["Jaipur (RJ)", 26.91, 75.79, "Rajasthan", "West"],
  ["Jodhpur (RJ)", 26.24, 73.02, "Rajasthan", "West"],
  ["Ahmedabad (GJ)", 23.02, 72.57, "Gujarat", "West"],
  ["Mumbai (MH)", 19.07, 72.87, "Maharashtra", "West"],
  ["Nagpur (MH)", 21.15, 79.09, "Maharashtra", "West"],
  ["Panaji (Goa)", 15.50, 73.83, "Goa", "West"],
  ["Daman", 20.42, 72.83, "Dadra & Nagar Haveli and Daman & Diu", "West"],

  // Central (3)
  ["Bhopal (MP)", 23.26, 77.41, "Madhya Pradesh", "Central"],
  ["Indore (MP)", 22.71, 75.85, "Madhya Pradesh", "Central"],
  ["Raipur (CG)", 21.25, 81.63, "Chhattisgarh", "Central"],

  // East (4)
  ["Patna (BR)", 25.60, 85.14, "Bihar", "East"],
  ["Ranchi (JH)", 23.34, 85.31, "Jharkhand", "East"],
  ["Kolkata (WB)", 22.57, 88.36, "West Bengal", "East"],
  ["Bhubaneswar (OD)", 20.30, 85.82, "Odisha", "East"],

  // South (7)
  ["Hyderabad (TS)", 17.38, 78.49, "Telangana", "South"],
  ["Visakhapatnam (AP)", 17.69, 83.22, "Andhra Pradesh", "South"],
  ["Vijayawada (AP)", 16.50, 80.64, "Andhra Pradesh", "South"],
  ["Bengaluru (KA)", 12.97, 77.59, "Karnataka", "South"],
  ["Chennai (TN)", 13.08, 80.27, "Tamil Nadu", "South"],
  ["Kochi (KL)", 9.93, 76.27, "Kerala", "South"],
  ["Puducherry (PY)", 11.94, 79.80, "Puducherry (UT)", "South"],

  // Northeast (8)
  ["Guwahati (AS)", 26.14, 91.74, "Assam", "Northeast"],
  ["Shillong (ML)", 25.58, 91.89, "Meghalaya", "Northeast"],
  ["Itanagar (AR)", 27.09, 93.61, "Arunachal Pradesh", "Northeast"],
  ["Kohima (NL)", 25.67, 94.10, "Nagaland", "Northeast"],
  ["Imphal (MN)", 24.81, 93.93, "Manipur", "Northeast"],
  ["Aizawl (MZ)", 23.73, 92.71, "Mizoram", "Northeast"],
  ["Agartala (TR)", 23.83, 91.28, "Tripura", "Northeast"],
  ["Gangtok (SK)", 27.34, 88.61, "Sikkim", "Northeast"],

  // Islands (2)
  ["Port Blair (AN)", 11.62, 92.73, "Andaman & Nicobar Islands", "Islands"],
  ["Kavaratti (LD)", 10.56, 72.64, "Lakshadweep", "Islands"],
];

/** State-level risk rows sampled from the replay grid or all-India stations, most severe first. */
export function regionRiskRows(replay: ReplayCase, allIndia = false): RegionRiskRow[] {
  const isLive = allIndia || (replay.hazard_type === "live") || replay.id?.includes("live");
  const isCyclone = (replay.hazard_type === "cyclone") || replay.id?.includes("cyclone");
  const isHeat = (replay.hazard_type === "heatwave") || replay.id?.includes("heat");
  const anchors = isLive ? ALL_INDIA_ANCHORS : isCyclone ? CYCLONE_ANCHORS : isHeat ? HEATWAVE_ANCHORS : RAIN_ANCHORS;

  return anchors.map((anchor) => {
    const name = anchor[0];
    const lat = anchor[1];
    const lon = anchor[2];
    const state = anchor[3];
    const zone = anchor[4];
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
      state,
      zone,
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
      previous: prev ? { lat: prev.centroid[0], lon: prev.centroid[1] } : null,
      velocity_degrees_per_3h: { lat: dLat, lon: dLon },
      history: replay.frames.flatMap((frame) => {
        const match = frame.objects.find((candidate) => candidate.track_id === obj.track_id);
        return match ? [{ lat: match.centroid[0], lon: match.centroid[1], lead_hour: frame.lead_hour }] : [];
      }),
      peak: peakVal,
      bbox: obj.bbox,
      steps,
    };
  });
}
