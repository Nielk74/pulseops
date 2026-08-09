import { NextResponse } from "next/server";
import { getBuilds } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getBuilds()); }
