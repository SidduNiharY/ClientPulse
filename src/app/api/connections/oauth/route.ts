import { NextResponse } from "next/server";

const message =
  "Direct API OAuth setup is disabled. Import data through Google Sheets, CSV, scripts, or BigQuery.";

export async function GET() {
  return NextResponse.json({ error: message }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: message }, { status: 410 });
}
