import { NextResponse } from "next/server";
import { sqlite } from "@/server/db";
import { getConnectorHealth } from "@/server/queries";

export const runtime = "nodejs";

export function GET() {
  try {
    sqlite.prepare("select 1").get();
    const connectors = getConnectorHealth();
    const unhealthy = connectors.filter((connector) => ["ERROR", "STALE", "UNCONFIGURED"].includes(connector.status));
    return NextResponse.json({
      status: unhealthy.length ? "degraded" : "healthy",
      database: "healthy",
      connectors: { total: connectors.length, unhealthy: unhealthy.map((connector) => connector.id) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ status: "unhealthy", database: "unhealthy", error: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
