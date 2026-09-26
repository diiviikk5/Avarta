import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    scenario: "SIH26078_CYCLONE_DANA_DEMONSTRATOR",
    population_at_risk: { total_exposed: 1420000, tier1_severe_zone: 380000, evacuation_centers_active: 48 },
    critical_infrastructure: {
      power_substations_threatened: [
        { id: "SS-BLS-132", name: "Balasore Grid Substation", voltage: "132 kV", risk: "CRITICAL", lat: 21.49, lon: 86.93 },
        { id: "SS-BDK-220", name: "Bhadrak Pooling Station", voltage: "220 kV", risk: "HIGH", lat: 21.05, lon: 86.50 },
        { id: "SS-KDP-132", name: "Kendrapara Substation", voltage: "132 kV", risk: "CRITICAL", lat: 20.50, lon: 86.42 },
      ], highway_submergence_km: 84.5, railway_tracks_inundation_km: 42,
    },
    agriculture_exposure: { kharif_paddy_threatened_hectares: 64200, saline_inundation_risk_hectares: 18500 },
    urban_flash_flood_nodes: [
      { location: "Cuttack — Badambadi", predicted_24h_accumulation_mm: 214, drainage_capacity_exceeded_by_percent: 68 },
      { location: "Bhubaneswar — Jayadev Vihar", predicted_24h_accumulation_mm: 188, drainage_capacity_exceeded_by_percent: 52 },
      { location: "Puri — Grand Road", predicted_24h_accumulation_mm: 176, drainage_capacity_exceeded_by_percent: 47 },
    ],
    highway_segments: [
      { id: "NH16-BLS-BDK", name: "NH-16 Balasore–Bhadrak", risk: "CRITICAL", lat: 21.25, lon: 86.72 },
      { id: "NH316-PURI", name: "NH-316 Puri Approach", risk: "HIGH", lat: 19.92, lon: 85.83 },
    ],
  });
}
