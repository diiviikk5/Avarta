import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("case_id") || "rainfall";

  let centerLat = 28.40;
  let centerLon = 77.31;
  let hazardName = "Extreme Rainfall";
  let radius = 5.0;

  if (caseId.includes("cyclone")) {
    centerLat = 21.65;
    centerLon = 88.30;
    hazardName = "Super Cyclone Amphan";
    radius = 18.0;
  } else if (caseId.includes("heat")) {
    centerLat = 28.61;
    centerLon = 77.21;
    hazardName = "Extreme Heat Dome";
    radius = 25.0;
  }

  // Geodesic 16-point circle approximation
  const coordinates: [number, number][] = [];
  const R = 6371.0;
  const angularDist = radius / R;
  const latR = (centerLat * Math.PI) / 180.0;
  const lonR = (centerLon * Math.PI) / 180.0;

  for (let i = 0; i <= 16; i++) {
    const bearing = (i * 360.0 * Math.PI) / (16 * 180.0);
    const latPoint = Math.asin(
      Math.sin(latR) * Math.cos(angularDist) +
      Math.cos(latR) * Math.sin(angularDist) * Math.cos(bearing)
    );
    const lonPoint =
      lonR +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latR),
        Math.cos(angularDist) - Math.sin(latR) * Math.sin(latPoint)
      );
    coordinates.push([
      Math.round(((lonPoint * 180.0) / Math.PI) * 100000) / 100000,
      Math.round(((latPoint * 180.0) / Math.PI) * 100000) / 100000,
    ]);
  }

  const features = [
    {
      type: "Feature",
      id: "hazard-zone-01",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      properties: {
        hazard: hazardName,
        severity: "SEVERE",
        radius_km: radius,
        fill_color: "#ef4444",
        status: "ACTIVE_5KM_CONTOUR",
      },
    },
    {
      type: "Feature",
      id: "asset-hospital",
      geometry: {
        type: "Point",
        coordinates: [centerLon + 0.015, centerLat + 0.01],
      },
      properties: {
        name: "District Civil Hospital & Trauma Center",
        type: "hospital",
        status: "EMERGENCY_POWER_MANDATE",
      },
    },
    {
      type: "Feature",
      id: "asset-substation",
      geometry: {
        type: "Point",
        coordinates: [centerLon - 0.02, centerLat - 0.015],
      },
      properties: {
        name: "400kV Power Grid Substation",
        type: "substation",
        status: "AT_RISK_SHUTDOWN",
      },
    },
    {
      type: "Feature",
      id: "asset-highway",
      geometry: {
        type: "Point",
        coordinates: [centerLon, centerLat],
      },
      properties: {
        name: "National Highway (NH-44 / NH-16) Lifeline Corridor",
        type: "highway",
        status: "WATERLOGGING_WARNING",
      },
    },
  ];

  return NextResponse.json({
    type: "FeatureCollection",
    summary: {
      hazard: hazardName,
      radius_km: radius,
      exposed_hospitals: 1,
      exposed_substations: 1,
      exposed_highways: 1,
      estimated_exposed_population: Math.round(Math.PI * radius * radius * 160),
    },
    features: features,
  });
}
