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

/** Nom du cookie de session utilisateur. */
export const SESSION_COOKIE_NAME = "fh_session";

/** Durée de validité d'une session (7 jours). */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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
  try {
    await cleanupExpiredSessions(user.id);
  } catch (e: any) {
    console.warn("[AUTH SESSION] Nettoyage des sessions expirées:", e?.message);
  }

  const token = await signSessionToken(user.id, user.email);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      userAgent: request.headers.get("user-agent") || "",
      ipAddress: request.headers.get("x-forwarded-for") || "",
    },
  });

  return { token, expiresAt };
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

  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.userId !== payload.sub) return null;

  // Sécurité : on ne lit QUE la ligne du compte authentifié (jamais un autre user)
  const user = await prisma.user.findUnique({
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
  });
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

  return {
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
}

/**
 * Révoque la session en base (déconnexion). Renvoie le nombre de sessions supprimées.
 */
export async function revokeSession(request: NextRequest): Promise<number> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return 0;
  const result = await prisma.session.deleteMany({ where: { token } });
  return result.count;
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
