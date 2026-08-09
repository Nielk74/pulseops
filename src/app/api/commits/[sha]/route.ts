import { NextResponse } from "next/server";
import { getCommitDetail } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ sha: string }> }) {
  const { sha } = await params;
  const result = getCommitDetail(sha);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Commit not found" }, { status: 404 });
}
