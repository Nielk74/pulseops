import { NextResponse } from "next/server";
import { getMachineDetail } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getMachineDetail(id);
  return result ? NextResponse.json(result.packages) : NextResponse.json({ error: "Machine not found" }, { status: 404 });
}
