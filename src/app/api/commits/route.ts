import { NextResponse } from "next/server";
import { getCommits } from "@/server/queries";

export const runtime = "nodejs";
export function GET() { return NextResponse.json(getCommits()); }
