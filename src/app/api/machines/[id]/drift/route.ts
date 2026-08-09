import { NextResponse } from "next/server";
import { getMachineDrift } from "@/server/machines/drift";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(getMachineDrift(id));
}
