import { NextResponse } from "next/server";
import { getActionDetail } from "@/server/actions/service";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getActionDetail(id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Action not found" }, { status: 404 });
}
