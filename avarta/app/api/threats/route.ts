import { NextResponse } from "next/server";
import { MOCK_THREATS } from "@/lib/mock-weather-data";

export async function GET() {
  return NextResponse.json({
    status: "success",
    timestamp: new Date().toISOString(),
    total_threats: MOCK_THREATS.length,
    compute_strategy: "THREAT_FIRST_DYNAMIC_CROP",
    threats: MOCK_THREATS
  });
}
