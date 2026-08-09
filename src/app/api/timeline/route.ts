import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTimeline } from "@/server/queries";

export const runtime = "nodejs";
export function GET(request: NextRequest) {
  const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 100)));
  return NextResponse.json(getTimeline(limit));
}
