import { NextRequest, NextResponse } from "next/server";
import { getCase, getCaseList, getReplay } from "@/lib/replay";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const isCatalog = url.searchParams.get("catalog") === "true";
  if (isCatalog) {
    return NextResponse.json(getCaseList());
  }
  const caseId = url.searchParams.get("case") || url.searchParams.get("id");
  if (caseId) {
    try {
      const caseData = await getCase(caseId);
      return NextResponse.json(caseData);
    } catch {
      return NextResponse.json(await getReplay());
    }
  }
  return NextResponse.json(await getReplay());
}
