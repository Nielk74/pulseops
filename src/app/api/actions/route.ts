import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { can, getIdentity } from "@/server/auth";
import { executeAction } from "@/server/actions/service";
import { getActions } from "@/server/queries";
import { executeActionSchema } from "@/shared/schemas/actions";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getActions()); }
export async function POST(request: NextRequest) {
  const identity = getIdentity(request);
  if (!can(identity, "OPERATOR")) return NextResponse.json({ error: "Operator role required" }, { status: 403 });
  const parsed = executeActionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await executeAction(parsed.data.actionId, identity));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
