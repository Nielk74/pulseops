import { NextResponse } from "next/server";
import { getBuildDetail } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getBuildDetail(id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Build not found" }, { status: 404 });
}
