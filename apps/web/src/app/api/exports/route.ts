import { NextResponse } from "next/server";
import { exportAllData } from "@/server/data/repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await exportAllData());
}
