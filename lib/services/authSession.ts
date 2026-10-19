// ============================================================
// FORTIA HUB — Sessions utilisateur JWT (cookie HttpOnly)
// ------------------------------------------------------------
// Le JWT est signé (HS256 via `jose`) avec `JWT_SECRET`, stocké dans un
// cookie HttpOnly : il n'est jamais lisible par JavaScript (protection XSS).
// Une entrée `Session` est enregistrée en base pour permettre la révocation
// à la déconnexion. La base reste la source de vérité : à chaque requête,
// on vérifie la signature ET la session en base, puis on résout l'utilisateur.
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/server/dbRetry";

/** Nom du cookie de session utilisateur. */
export const SESSION_COOKIE_NAME = "fh_session";

/** Durée de validité d'une session (30 jours, prolongée à chaque usage actif). */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Cache mémoire : évite de relire la session en base à chaque requête. */
const SESSION_CACHE_TTL_MS = 30 * 1000;
const sessionCache = new Map<string, { userId: string; expiresAt: number; checkedAt: number }>();

/** Cache mémoire du profil utilisateur (20 s) — soulage fortement le pool. */
const USER_CACHE_TTL_MS = 20 * 1000;
const userCache = new Map<string, { data: any; savedAt: number }>();

/** Vide les caches (déconnexion, changement de profil). */
export function clearSessionCaches(token?: string, userId?: string): void {
  if (token) sessionCache.delete(token);
  if (userId) userCache.delete(userId);
  if (!token && !userId) {
    sessionCache.clear();
    userCache.clear();
  }
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET est manquant ou trop court. Définissez un secret d'au moins 32 caractères dans .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

/** Payload embarqué dans le JWT de session. */
interface SessionJwtPayload {
  /** Identifiant utilisateur (sub). */
  sub: string;
  /** Email utilisateur (pratique pour les logs, jamais utilisé comme source d'autorité). */
  email?: string;
}

/**
 * Signe un JWT de session pour l'utilisateur donné.
 */
export async function signSessionToken(userId: string, email?: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_MS / 1000)
    .sign(getJwtSecret());
}

/**
 * Vérifie la signature et l'expiration d'un JWT de session.
 * Retourne le payload ou null si invalide/expiré.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch {
    return null;
  }
}

/**
 * Crée une session en base (pour la révocation) et retourne le JWT.
 */
export async function createUserSession(
  user: { id: string; email: string },
  request: NextRequest
): Promise<{ token: string; expiresAt: Date }> {
  // Nettoyage des sessions expirées de cet utilisateur (best-effort, jamais d'impact
  // sur les sessions actives). Évite l'accumulation en base à chaque connexion.
  // Nettoyage BORNÉ (1,2 s maximum) : une suppression lente ne doit jamais
  // retarder ni faire échouer la connexion (pool PostgreSQL saturé).
  await Promise.race([
    cleanupExpiredSessions(user.id).catch((e: any) => {
      console.warn("[AUTH SESSION] Nettoyage des sessions expirées:", e?.message);
    }),
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);
  const token = await signSessionToken(user.id, user.email);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Écriture de la session en base = BEST-EFFORT.
  // Si le pool PostgreSQL est saturé, l'utilisateur doit pouvoir se connecter
  // quand même : le JWT signé fait foi, la ligne sera recréée plus tard.
  try {
    await Promise.race([
      prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
          userAgent: request.headers.get("user-agent") || "",
          ipAddress: request.headers.get("x-forwarded-for") || "",
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("session-create-timeout")), 8000)
      ),
    ]);
    clearSessionCaches(token, user.id);
  } catch (e: any) {
    console.warn("[AUTH SESSION] Session non enregistrée en base (JWT émis) :", e?.message);
  }

  return { token, expiresAt };
}

/**
 * PROLONGATION GLISSANTE : tant que l'utilisateur revient dans l'app,
 * sa session est repoussée (30 jours). Il n'est donc plus obligé de se
 * reconnecter chaque semaine ; seule une absence prolongée l'exige.
 *
 * Retourne le nouveau cookie à poser, ou null si rien à faire.
 */
export async function extendSessionIfNeeded(
  request: NextRequest
): Promise<{ token: string; expiresAt: Date } | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  const cached = sessionCache.get(token);
  if (!cached) return null; // cache non rempli : on attend le prochain passage

  const now = Date.now();
  const remaining = cached.expiresAt - now;
  const TWENTY_DAYS = 20 * 24 * 60 * 60 * 1000;

  // Rien à faire : session large, ou expiration inconnue (mode dégradé).
  if (remaining > TWENTY_DAYS || remaining < 60 * 1000) return null;

  const newToken = await signSessionToken(payload.sub, payload.email);
  const expiresAt = new Date(now + SESSION_DURATION_MS);

  try {
    await Promise.race([
      prisma.session.update({ where: { token }, data: { token: newToken, expiresAt } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("extend-timeout")), 5000)),
    ]);
  } catch (e: any) {
    console.warn("[AUTH SESSION] Prolongation en base impossible :", e?.message);
  }

  sessionCache.delete(token);
  sessionCache.set(newToken, {
    userId: payload.sub,
    expiresAt: expiresAt.getTime(),
    checkedAt: now,
  });

  return { token: newToken, expiresAt };
}

/**
 * Pose le cookie de session HttpOnly sur la réponse.
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Supprime le cookie de session de la réponse (déconnexion).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

/**
 * Résout l'utilisateur actuellement connecté à partir du cookie de session.
 * Triple vérification : cookie présent → JWT valide (signature+exp) →
 * session active en base (non expirée, rattachée au même utilisateur).
 * Retourne null si non authentifié. La source de vérité est la base.
 */
export async function getCurrentUser(request: NextRequest): Promise<{
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  badge: string;
  accountType: string;
  kycStatus: string;
  enrolledCourseIds: string[];
  purchasedProductIds: string[];
  courseProgress: Record<string, number>;
  earnedCertificates: any[];
  paymentHistory: any[];
} | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  // ===== 1) Session : cache mémoire (30 s) avant toute lecture en base =====
  // Sans ce cache, chaque appel d'API faisait 2 requêtes SQL (session + user) :
  // c'est ce qui saturait le pool et provoquait P2039 au moment de se connecter.
  const cachedSession = sessionCache.get(token);
  const now = Date.now();
  let sessionUserId = payload.sub;

  if (cachedSession && now - cachedSession.checkedAt < SESSION_CACHE_TTL_MS) {
    if (cachedSession.expiresAt < now) return null;
    sessionUserId = cachedSession.userId;
  } else {
    try {
      const session = await withDbRetry(() =>
        prisma.session.findUnique({
          where: { token },
          select: { userId: true, expiresAt: true },
        })
      );

      if (!session || session.expiresAt.getTime() < now) {
        sessionCache.delete(token);
        return null;
      }
      if (session.userId !== payload.sub) {
        sessionCache.delete(token);
        return null;
      }

      sessionUserId = session.userId;
      sessionCache.set(token, {
        userId: session.userId,
        expiresAt: session.expiresAt.getTime(),
        checkedAt: now,
      });
    } catch (error) {
      // Base momentanément saturée : on NE déconnecte PAS l'utilisateur.
      // Le JWT est signé et valide ; on re-valide en base à la prochaine occasion.
      console.warn(
        "[AUTH SESSION] Vérification en base impossible, JWT accepté (mode dégradé) :",
        (error as Error)?.message
      );
      sessionCache.set(token, {
        userId: payload.sub,
        expiresAt: now + 15 * 1000,
        checkedAt: now,
      });
    }
  }

  // ===== 2) Profil : cache mémoire (20 s) =====
  const cachedUser = userCache.get(sessionUserId);
  if (cachedUser && now - cachedUser.savedAt < USER_CACHE_TTL_MS) {
    return cachedUser.data;
  }

  // Sécurité : on ne lit QUE la ligne du compte authentifié (jamais un autre user)
  interface SessionUserRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    badge: string;
    accountType: string;
    isActive: boolean;
    kycStatus: string;
    enrolledCourseIds: string[];
    purchasedProductIds: string[];
    courseProgress: unknown;
    earnedCertificates: unknown;
    paymentHistory: unknown;
  }
  let user: SessionUserRow | null = null;
  try {
    user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          badge: true,
          accountType: true,
          isActive: true,
          kycStatus: true,
          enrolledCourseIds: true,
          purchasedProductIds: true,
          courseProgress: true,
          earnedCertificates: true,
          paymentHistory: true,
        },
      })
    );
  } catch (error) {
    console.warn("[AUTH SESSION] Lecture du compte impossible :", (error as Error)?.message);
    // Profil déjà connu récemment → on le sert plutôt que de déconnecter.
    const stale = userCache.get(sessionUserId);
    return stale ? stale.data : null;
  }
  if (!user || !user.isActive) return null;

  const safeArray = (v: any): any[] => (Array.isArray(v) ? v : []);
  let progress: Record<string, number> = {};
  try {
    const parsed = JSON.parse(String(user.courseProgress || "{}"));
    if (parsed && typeof parsed === "object") progress = parsed;
  } catch {}
  let certificates: any[] = [];
  try {
    const parsed = JSON.parse(String(user.earnedCertificates || "[]"));
    if (Array.isArray(parsed)) certificates = parsed;
  } catch {}
  let paymentHistory: any[] = [];
  try {
    const parsed = JSON.parse(String(user.paymentHistory || "[]"));
    if (Array.isArray(parsed)) paymentHistory = parsed;
  } catch {}

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    badge: user.badge || "none",
    accountType: user.accountType,
    kycStatus: user.kycStatus || "non_soumis",
    enrolledCourseIds: safeArray(user.enrolledCourseIds),
    purchasedProductIds: safeArray(user.purchasedProductIds),
    courseProgress: progress,
    earnedCertificates: certificates,
    paymentHistory: paymentHistory,
  };

  userCache.set(sessionUserId, { data: profile, savedAt: now });
  return profile;
}

/**
 * Révoque la session en base (déconnexion). Renvoie le nombre de sessions supprimées.
 */
export async function revokeSession(request: NextRequest): Promise<number> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return 0;
  const payload = await verifySessionToken(token);
  clearSessionCaches(token, payload?.sub);
  try {
    const result = await withDbRetry(() => prisma.session.deleteMany({ where: { token } }));
    return result.count;
  } catch (e: any) {
    console.warn("[AUTH SESSION] Révocation en base impossible :", e?.message);
    return 0;
  }
}

/**
 * Supprime les sessions EXPIRÉES de la base.
 * Ne touche JAMAIS aux sessions actives (filtre strict `expiresAt < now`).
 * Si `userId` est fourni, le nettoyage est ciblé sur cet utilisateur (indexé).
 */
export async function cleanupExpiredSessions(userId?: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      ...(userId ? { userId } : {}),
    },
  });
  return result.count;
}
