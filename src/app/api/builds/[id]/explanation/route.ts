import { NextResponse } from "next/server";
import { getBuildDetail } from "@/server/queries";
import { explainTestOccurrence } from "@/server/correlation/service";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getBuildDetail(id);
  if (!result) return NextResponse.json({ error: "Build not found" }, { status: 404 });
  return NextResponse.json(result.tests.filter((test) => test.anomalyType !== "NONE").map((test) => explainTestOccurrence(test.id)));
}
