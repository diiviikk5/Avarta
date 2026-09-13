import { NextResponse } from "next/server";
import { getCaseList } from "@/lib/replay";

export async function GET() {
  return NextResponse.json(getCaseList());
}
