import { NextResponse } from "next/server";
import { explainTestOccurrence } from "@/server/correlation/service";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = explainTestOccurrence(id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Test occurrence not found" }, { status: 404 });
}
