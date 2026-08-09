import { NextResponse } from "next/server";
import { getTests } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getTests()); }
