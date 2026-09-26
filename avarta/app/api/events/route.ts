import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";
import { replayTrackLegs } from "@/lib/forecast";

export async function GET() {
  const replay = await getReplay();
  return NextResponse.json({
    case_id: replay.id,
    status: "draft_decision_support",
    leads_hours: [24, 48, 72],
    events: replayTrackLegs(replay),
    note: "Extrapolated footprint trajectory with growing uncertainty; not a weather prediction.",
  });
}
