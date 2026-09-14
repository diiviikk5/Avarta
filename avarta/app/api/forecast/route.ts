import { NextResponse } from "next/server";
import { pinpointForecastFromReplay } from "@/lib/forecast";
import { getReplay } from "@/lib/replay";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const hours = Number(url.searchParams.get("hours") ?? "12");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Provide ?lat=28.40&lon=77.31", status: "draft_decision_support" },
      { status: 400 },
    );
  }
  try {
    const replay = await getReplay();
    const forecast = pinpointForecastFromReplay(replay, lat, lon, Number.isFinite(hours) ? hours : 12);
    return NextResponse.json({
      ...forecast,
      dissemination: "not_sent",
      requires_meteorologist_review: true,
      method: "GEFS ensemble-mean grid lookup + provisional climatology sigma. Not a 5 km forecast.",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
