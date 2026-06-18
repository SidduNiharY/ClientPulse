import { NextResponse } from "next/server";
import { validateProductionSetup } from "@/server/providers/validateProductionSetup";

export async function GET() {
  return NextResponse.json({
    providers: validateProductionSetup()
  });
}
