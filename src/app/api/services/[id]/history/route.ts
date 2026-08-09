import { NextResponse } from "next/server";
import { getServiceDetail } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getServiceDetail(id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Service not found" }, { status: 404 });
}
