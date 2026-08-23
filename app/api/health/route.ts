import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    academy: "FORTIA HUB",
    hasAiKey: !!process.env.GEMINI_API_KEY,
  });
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    academy: "FORTIA HUB",
    hasAiKey: !!process.env.GEMINI_API_KEY,
  });
}