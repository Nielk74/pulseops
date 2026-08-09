import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getIdentity, can } from "@/server/auth";
import { getConnectorHealth } from "@/server/queries";
import { syncSource } from "@/server/polling/sync";
import type { SourceId } from "@/shared/types/domain";

const sources = new Set<SourceId>(["teamcity", "deployments", "services", "git", "oracle", "machines"]);
export const runtime = "nodejs";
export function GET() { return NextResponse.json(getConnectorHealth()); }
export async function POST(request: NextRequest) {
  const identity = getIdentity(request);
  if (!can(identity, "OPERATOR")) return NextResponse.json({ error: "Operator role required" }, { status: 403 });
  const body = await request.json() as { source?: SourceId };
  if (!body.source || !sources.has(body.source)) return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  return NextResponse.json(await syncSource(body.source));
}
