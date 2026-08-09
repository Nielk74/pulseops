import { NextResponse } from "next/server";
import { getFleet } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getFleet()); }
