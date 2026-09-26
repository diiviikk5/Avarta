import { NextResponse } from "next/server";

const LEAD_HOURS = [0, 12, 24, 36, 48, 72, 96, 120];

export async function GET() {
  const members = Array.from({ length: 20 }, (_, index) => {
    const source = index < 11 ? "NCMRWF_NEPS_G" : "NOAA_GEFS";
    const phase = index * 1.73;
    const divergent = index === 4 || index === 16 || index === 18;
    const waypoints = LEAD_HOURS.map((t, step) => {
      const growth = Math.pow(t / 120, 1.45);
      const fork = divergent && t >= 72 ? (index % 2 ? -1 : 1) * growth * 1.35 : 0;
      return {
        t_lead: t,
        lat: Number((18.2 + step * 0.48 + Math.sin(phase + step * 0.7) * (0.07 + growth * 0.48) + fork * 0.44).toFixed(3)),
        lon: Number((87.4 - step * 0.34 + Math.cos(phase * 0.8 + step) * (0.06 + growth * 0.55) + fork).toFixed(3)),
      };
    });
    return { id: `${source === "NCMRWF_NEPS_G" ? "NEPS" : "GEFS"}-${String(index + 1).padStart(2, "0")}`, source, divergent, waypoints };
  });

  const mean_track = LEAD_HOURS.map((t, step) => ({
    t_lead: t,
    lat: Number((members.reduce((sum, member) => sum + member.waypoints[step].lat, 0) / members.length).toFixed(3)),
    lon: Number((members.reduce((sum, member) => sum + member.waypoints[step].lon, 0) / members.length).toFixed(3)),
  }));
  const upper = LEAD_HOURS.map((t, i) => ({ t_lead: t, lat: mean_track[i].lat + 0.12 + i * 0.09, lon: mean_track[i].lon + 0.15 + i * 0.11 }));
  const lower = [...LEAD_HOURS].reverse().map((t, reverseIndex) => {
    const i = LEAD_HOURS.length - 1 - reverseIndex;
    return { t_lead: t, lat: mean_track[i].lat - 0.12 - i * 0.09, lon: mean_track[i].lon - 0.15 - i * 0.11 };
  });

  return NextResponse.json({
    lead_hours: LEAD_HOURS, members_count: 20,
    model_composition: { NCMRWF_NEPS_G_12KM: 11, NOAA_GEFS: 9 }, members, mean_track,
    p10_p90_corridor_polygon: [...upper, ...lower],
    member_divergence_index: { value: 0.68, classification: "HIGH", onset_lead_hour: 96, interpretation: "Track bifurcation emerges during Day 4–5." },
  });
}
