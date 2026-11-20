import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

function payload() {
  // N'expose jamais le nom des variables manquantes ni leur valeur.
  const env = validateEnv();
  return {
    status: env.ok ? "ok" : "degraded",
    academy: "FORTIA HUB",
    hasAiKey: !!process.env.GEMINI_API_KEY,
  };
}

export async function GET() {
  const body = payload();
  return NextResponse.json(body, { status: body.status === "ok" ? 200 : 503 });
}

export async function POST() {
  const body = payload();
  return NextResponse.json(body, { status: body.status === "ok" ? 200 : 503 });
}
