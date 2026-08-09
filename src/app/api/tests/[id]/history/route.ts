import { NextResponse } from "next/server";
import { getTestDetail } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getTestDetail(id);
  return result ? NextResponse.json(result.history) : NextResponse.json({ error: "Test occurrence not found" }, { status: 404 });
}
