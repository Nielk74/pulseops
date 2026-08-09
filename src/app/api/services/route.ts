import { NextResponse } from "next/server";
import { getServices } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getServices()); }
