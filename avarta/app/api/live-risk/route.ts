import { NextResponse } from "next/server";

export interface LiveRegionRisk {
  name: string;
  state: string;
  zone: "North" | "South" | "East" | "West" | "Central" | "Northeast" | "Islands";
  latitude: number;
  longitude: number;
  temperature_c: number;
  max_temp_c: number;
  rainfall_mm: number;
  rain_sum_24h_mm: number;
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  relative_humidity_pct: number;
  surface_pressure_hpa: number;
  score: number;
  band: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  hazard_alert?: string;
  updated_at: string;
}

export const ALL_INDIA_LOCATIONS = [
  // North
  { name: "Srinagar", state: "Jammu & Kashmir", lat: 34.08, lon: 74.80, zone: "North" as const },
  { name: "Leh", state: "Ladakh", lat: 34.15, lon: 77.58, zone: "North" as const },
  { name: "Shimla", state: "Himachal Pradesh", lat: 31.10, lon: 77.17, zone: "North" as const },
  { name: "Dehradun", state: "Uttarakhand", lat: 30.32, lon: 78.03, zone: "North" as const },
  { name: "Amritsar", state: "Punjab", lat: 31.63, lon: 74.87, zone: "North" as const },
  { name: "Chandigarh", state: "Punjab/Haryana", lat: 30.73, lon: 76.78, zone: "North" as const },
  { name: "Delhi (NCR)", state: "Delhi", lat: 28.61, lon: 77.21, zone: "North" as const },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.85, lon: 80.95, zone: "North" as const },

  // West
  { name: "Jaipur", state: "Rajasthan", lat: 26.91, lon: 75.79, zone: "West" as const },
  { name: "Jodhpur", state: "Rajasthan", lat: 26.24, lon: 73.02, zone: "West" as const },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.02, lon: 72.57, zone: "West" as const },
  { name: "Mumbai", state: "Maharashtra", lat: 19.07, lon: 72.87, zone: "West" as const },
  { name: "Nagpur", state: "Maharashtra", lat: 21.15, lon: 79.09, zone: "West" as const },
  { name: "Panaji", state: "Goa", lat: 15.50, lon: 73.83, zone: "West" as const },

  // Central
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.26, lon: 77.41, zone: "Central" as const },
  { name: "Raipur", state: "Chhattisgarh", lat: 21.25, lon: 81.63, zone: "Central" as const },

  // East
  { name: "Patna", state: "Bihar", lat: 25.60, lon: 85.14, zone: "East" as const },
  { name: "Ranchi", state: "Jharkhand", lat: 23.34, lon: 85.31, zone: "East" as const },
  { name: "Kolkata", state: "West Bengal", lat: 22.57, lon: 88.36, zone: "East" as const },
  { name: "Bhubaneswar", state: "Odisha", lat: 20.30, lon: 85.82, zone: "East" as const },

  // South
  { name: "Hyderabad", state: "Telangana", lat: 17.38, lon: 78.49, zone: "South" as const },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.69, lon: 83.22, zone: "South" as const },
  { name: "Bengaluru", state: "Karnataka", lat: 12.97, lon: 77.59, zone: "South" as const },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.08, lon: 80.27, zone: "South" as const },
  { name: "Kochi", state: "Kerala", lat: 9.93, lon: 76.27, zone: "South" as const },

  // Northeast
  { name: "Guwahati", state: "Assam", lat: 26.14, lon: 91.74, zone: "Northeast" as const },
  { name: "Shillong", state: "Meghalaya", lat: 25.58, lon: 91.89, zone: "Northeast" as const },
  { name: "Itanagar", state: "Arunachal Pradesh", lat: 27.09, lon: 93.61, zone: "Northeast" as const },
  { name: "Gangtok", state: "Sikkim", lat: 27.34, lon: 88.61, zone: "Northeast" as const },

  // Islands
  { name: "Port Blair", state: "Andaman & Nicobar", lat: 11.62, lon: 92.73, zone: "Islands" as const },
];

function calculateRisk(rain24h: number, maxTemp: number, windGust: number): { score: number; band: "LOW" | "MODERATE" | "HIGH" | "SEVERE"; alert?: string } {
  let score = 8;
  const reasons: string[] = [];

  // Rainfall risk component
  if (rain24h >= 115.5) {
    score += 65;
    reasons.push("Very Heavy Rainfall (>115 mm/day)");
  } else if (rain24h >= 64.5) {
    score += 45;
    reasons.push("Heavy Rainfall (>64.5 mm/day)");
  } else if (rain24h >= 35.5) {
    score += 25;
    reasons.push("Moderate Rainfall");
  } else if (rain24h >= 15.5) {
    score += 12;
  }

  // Temperature / Heat stress component
  if (maxTemp >= 45.0) {
    score += 55;
    reasons.push("Severe Heatwave (>45°C)");
  } else if (maxTemp >= 41.0) {
    score += 32;
    reasons.push("Heatwave Warning (>41°C)");
  } else if (maxTemp <= 4.0) {
    score += 28;
    reasons.push("Severe Cold Wave (<4°C)");
  }

  // Wind component
  if (windGust >= 80.0) {
    score += 50;
    reasons.push("Gale Force Wind Gusts (>80 km/h)");
  } else if (windGust >= 50.0) {
    score += 22;
    reasons.push("Strong Surface Winds (>50 km/h)");
  }

  // Clamp 0–100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  let band: "LOW" | "MODERATE" | "HIGH" | "SEVERE" = "LOW";
  if (finalScore >= 80) band = "SEVERE";
  else if (finalScore >= 60) band = "HIGH";
  else if (finalScore >= 30) band = "MODERATE";

  return {
    score: finalScore,
    band,
    alert: reasons.length > 0 ? reasons.join(" · ") : "Normal weather watch",
  };
}

// In-memory cache for 5 minutes
let cachedData: { timestamp: number; payload: { updated_at: string; source: string; regions: LiveRegionRisk[] } } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedData && (now - cachedData.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({ ...cachedData.payload, cached: true });
  }

  const lats = ALL_INDIA_LOCATIONS.map((loc) => loc.lat).join(",");
  const lons = ALL_INDIA_LOCATIONS.map((loc) => loc.lon).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,surface_pressure&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Avarta-Weather-Intelligence/1.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const results: LiveRegionRisk[] = [];
    const timestampStr = new Date().toISOString();

    for (let i = 0; i < ALL_INDIA_LOCATIONS.length; i++) {
      const loc = ALL_INDIA_LOCATIONS[i];
      const item = data[i] || {};
      const current = item.current || {};
      const daily = item.daily || {};

      const temp = current.temperature_2m ?? 26.0;
      const maxTemp = daily.temperature_2m_max?.[0] ?? temp;
      const rain = current.precipitation ?? 0.0;
      const rainSum24 = daily.precipitation_sum?.[0] ?? rain;
      const windSpeed = current.wind_speed_10m ?? 8.0;
      const windGust = daily.wind_speed_10m_max?.[0] ?? (windSpeed * 1.4);
      const humidity = current.relative_humidity_2m ?? 65;
      const pressure = current.surface_pressure_hpa ?? 1010;

      const { score, band, alert } = calculateRisk(rainSum24, maxTemp, windGust);

      results.push({
        name: loc.name,
        state: loc.state,
        zone: loc.zone,
        latitude: loc.lat,
        longitude: loc.lon,
        temperature_c: Math.round(temp * 10) / 10,
        max_temp_c: Math.round(maxTemp * 10) / 10,
        rainfall_mm: Math.round(rain * 10) / 10,
        rain_sum_24h_mm: Math.round(rainSum24 * 10) / 10,
        wind_speed_kmh: Math.round(windSpeed * 10) / 10,
        wind_gust_kmh: Math.round(windGust * 10) / 10,
        relative_humidity_pct: Math.round(humidity),
        surface_pressure_hpa: Math.round(pressure),
        score,
        band,
        hazard_alert: alert,
        updated_at: timestampStr,
      });
    }

    // Sort by risk score descending
    results.sort((a, b) => b.score - a.score);

    const payload = {
      updated_at: timestampStr,
      source: "ECMWF IFS / NOAA GFS Live Assimilation (Open-Meteo)",
      total_regions: results.length,
      high_or_severe_count: results.filter((r) => r.band === "HIGH" || r.band === "SEVERE").length,
      moderate_count: results.filter((r) => r.band === "MODERATE").length,
      regions: results,
    };

    cachedData = { timestamp: now, payload };
    return NextResponse.json(payload);
  } catch (error) {
    // Fallback baseline in case network is down
    const timestampStr = new Date().toISOString();
    const fallbackResults: LiveRegionRisk[] = ALL_INDIA_LOCATIONS.map((loc) => {
      const { score, band, alert } = calculateRisk(2.5, 31.0, 14.0);
      return {
        name: loc.name,
        state: loc.state,
        zone: loc.zone,
        latitude: loc.lat,
        longitude: loc.lon,
        temperature_c: 29.5,
        max_temp_c: 32.0,
        rainfall_mm: 0.0,
        rain_sum_24h_mm: 2.5,
        wind_speed_kmh: 12.0,
        wind_gust_kmh: 18.0,
        relative_humidity_pct: 68,
        surface_pressure_hpa: 1012,
        score,
        band,
        hazard_alert: alert,
        updated_at: timestampStr,
      };
    });

    return NextResponse.json({
      updated_at: timestampStr,
      source: "Avarta Climatological Operational Baseline (Fallback)",
      total_regions: fallbackResults.length,
      high_or_severe_count: 0,
      moderate_count: 0,
      regions: fallbackResults,
      warning: "Using operational baseline cache.",
    });
  }
}
