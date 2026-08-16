import { NextResponse } from "next/server";
import { readPreferences } from "@/lib/omp-web-preferences";

export const dynamic = "force-dynamic";

/** Lightweight read-only view of omp-web specific preferences for the UI. */
export async function GET() {
  return NextResponse.json(readPreferences());
}
