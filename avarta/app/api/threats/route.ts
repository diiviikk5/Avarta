import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import { SIH_THREAT_OBJECT } from "@/lib/sih-presentation-data";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("mode") === "demo") {
    return NextResponse.json({ mode: "synthetic_demo", source: "hand-authored mock data", threats: MOCK_THREATS });
  }
  const replay = await getReplay();
  return NextResponse.json({
    schema_version: "avarta.4d-threat-object.v1",
    threat: SIH_THREAT_OBJECT,
    presentation_scenario: true,
    mode: replay.mode,
    source: replay.forecast.model,
    forecast_initialization_time: replay.forecast.initialization_time,
    case_id: replay.id,
    frames: replay.frames,
    verification: replay.verification,
    limitations: replay.limitations,
  });
}
