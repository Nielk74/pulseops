import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { can, getIdentity } from "@/server/auth";
import { createActionPlan } from "@/server/actions/service";
import { actionPlanSchema } from "@/shared/schemas/actions";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const identity = getIdentity(request);
  if (!can(identity, "OPERATOR")) return NextResponse.json({ error: "Operator role required" }, { status: 403 });
  const parsed = actionPlanSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid action plan", details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(createActionPlan(parsed.data, identity), { status: 201 });
}
