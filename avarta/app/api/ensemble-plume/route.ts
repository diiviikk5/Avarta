import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "28.40");
  const lon = parseFloat(searchParams.get("lon") || "77.31");
  const hazard = (searchParams.get("hazard") || "rainfall").toLowerCase();

  const leadHours = [0, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 144, 168, 192, 216, 240];
  const nLeads = leadHours.length;
  const nMembers = 30;

  let units = "mm / 24h";
  let basePeak = 65.0;
  let peakHour = 72;

  if (hazard.includes("cyclone")) {
    units = "km/h";
    basePeak = 180.0;
    peakHour = 60;
  } else if (hazard.includes("heat")) {
    units = "°C";
    basePeak = 47.5;
    peakHour = 96;
  }

  const members: Record<string, number[]> = {};
  const matrix: number[][] = [];

  for (let m = 0; m < nMembers; m++) {
    const memberVals: number[] = [];
    const seedShift = (m % 5) - 2;
    const intensityFactor = 0.7 + (m / (nMembers - 1)) * 0.6;

    for (let i = 0; i < nLeads; i++) {
      const h = leadHours[i];
      const spread = 0.1 + 0.3 * Math.sqrt(h / 240.0);
      const noise = Math.sin(m * 11 + i * 7) * spread;

      const temporalProfile = Math.exp(-Math.pow(h - (peakHour + seedShift * 6), 2) / (2 * Math.pow(36, 2)));

      let val: number;
      if (hazard.includes("heat")) {
        val = 38.0 + (basePeak - 38.0) * temporalProfile * intensityFactor + noise * 2.5;
        val = Math.max(34.0, Math.min(52.0, val));
      } else {
        val = basePeak * temporalProfile * intensityFactor + noise * (basePeak * 0.2);
        val = Math.max(0.0, val);
      }
      memberVals.push(Math.round(val * 10) / 10);
    }
    members[`mem_${m.toString().padStart(2, "0")}`] = memberVals;
    matrix.push(memberVals);
  }

  // Calculate ensemble mean & percentiles
  const meanCurve: number[] = [];
  const p10Curve: number[] = [];
  const p50Curve: number[] = [];
  const p90Curve: number[] = [];

  for (let i = 0; i < nLeads; i++) {
    const column = matrix.map((row) => row[i]).sort((a, b) => a - b);
    const sum = column.reduce((acc, v) => acc + v, 0);
    meanCurve.push(Math.round((sum / nMembers) * 10) / 10);
    p10Curve.push(column[Math.floor(nMembers * 0.1)]);
    p50Curve.push(column[Math.floor(nMembers * 0.5)]);
    p90Curve.push(column[Math.floor(nMembers * 0.9)]);
  }

  return NextResponse.json({
    location: { latitude: lat, longitude: lon },
    hazard_type: hazard,
    units: units,
    lead_hours: leadHours,
    members_count: nMembers,
    members: members,
    ensemble_mean: meanCurve,
    percentiles: {
      p10: p10Curve,
      p50: p50Curve,
      p90: p90Curve,
    },
    forecast_spread_ratio_10d: Math.round(((p90Curve[nLeads - 1] - p10Curve[nLeads - 1]) / Math.max(1, meanCurve[nLeads - 1])) * 100) / 100,
    scientific_note: "Spread increases over medium-range leads (3-10 days). 30-member plume isolates probability density.",
  });
}
