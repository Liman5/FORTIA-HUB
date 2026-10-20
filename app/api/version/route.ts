import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/version
 * ------------------------------------------------------------
 * Renvoie l'identifiant du build actuellement servi. L'application
 * installée (PWA) compare cette valeur à la sienne : si elles diffèrent,
 * une nouvelle version a été déployée → mise à jour automatique.
 *
 * Jamais mis en cache (CDN, navigateur, service worker).
 */
export async function GET() {
  return new NextResponse(JSON.stringify({ buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev" }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
