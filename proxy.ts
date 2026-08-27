import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * FORTIA HUB — Proxy de protection des pages privées (Next.js 16).
 * Vérifie la signature du JWT de session (cookie HttpOnly `fh_session`) avant
 * de laisser accéder aux pages qui nécessitent une authentification.
 *
 * Note : il s'agit d'une protection d'accès par URL. La validation complète
 * (session active en base, révocation) reste faite côté serveur dans les
 * routes API via `getCurrentUser()` et `GET /api/auth/session`.
 */

const SESSION_COOKIE_NAME = "fh_session";

export const config = {
  matcher: ["/member/:path*", "/settings/:path*", "/notifications/:path*"],
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await isSessionJwtValid(token);

  if (!valid) {
    // Page privée demandée sans session valide → redirection vers la connexion.
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Vérifie uniquement la signature et l'expiration du JWT (léger, sans accès
 * base : le proxy ne doit pas créer de connexion Prisma à chaque requête).
 */
async function isSessionJwtValid(token?: string): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}
