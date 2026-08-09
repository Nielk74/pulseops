import { NextResponse } from "next/server";
import { getOverviewData } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getOverviewData()); }
