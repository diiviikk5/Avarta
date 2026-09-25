import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";

export async function GET() {
  return NextResponse.json(await getReplay());
}
