import { NextResponse } from "next/server";
import { getBenchmark } from "@/lib/replay";

export async function GET() {
  return NextResponse.json(await getBenchmark());
}
