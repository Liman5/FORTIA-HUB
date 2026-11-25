// ============================================================
// FORTIA HUB — VÉRIFICATION D'ADRESSE E-MAIL (OTP)
// ------------------------------------------------------------
// Le code à 6 chiffres est généré et vérifié UNIQUEMENT côté serveur :
//   • code aléatoire cryptographique (crypto.randomInt) ;
//   • stockage d'un HASH salé (SHA-256) dans la table platformConfig
//     (clé `otp:email:<adresse normalisée>`) — aucune migration ;
//   • expiration 10 minutes, 5 essais maximum ;
//   • comparaison à temps constant (timingSafeEqual) ;
//   • après succès, un JETON SIGNÉ (JWT HS256, 30 min, purpose
//     `email-verified`) autorise l'inscription.
// Le code n'est JAMAIS renvoyé au navigateur.
// ============================================================
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/server/logger";

const OTP_KEY_PREFIX = "otp:email:";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const TOKEN_PURPOSE = "email-verified";
const TOKEN_TTL_SECONDS = 30 * 60;

interface StoredOtp {
  /** Signature d'index requise pour être sérialisé dans une colonne JSON Prisma. */
  [key: string]: string | number;
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

/**
 * La vérification d'adresse e-mail (code OTP) est-elle EXIGÉE ?
 *
 * Interrupteur TEMPORAIRE de phase de test, sans modifier le reste du code :
 *   • `EMAIL_VERIFICATION_MODE="off"` **et** aucune `RESEND_API_KEY` → désactivée ;
 *   • dès qu'une clé Resend est présente, la vérification redevient
 *     obligatoire, même si le mode vaut "off" (impossible d'oublier de la
 *     réactiver après le branchement du domaine) ;
 *   • valeur absente, vide ou inconnue → obligatoire (comportement sûr).
 */
export function isEmailVerificationRequired(): boolean {
  const mode = String(process.env.EMAIL_VERIFICATION_MODE || "").trim().toLowerCase();
  if (mode !== "off") return true;
  return !!String(process.env.RESEND_API_KEY || "").trim();
}

function otpKey(email: string): string {
  return OTP_KEY_PREFIX + normalizeEmail(email);
}

function signingKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET est manquant ou trop court : la vérification d'adresse e-mail est indisponible."
    );
  }
  return new TextEncoder().encode(secret);
}

function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
function safeEqualHex(left: string, right: string): boolean {
  if (typeof left !== "string" || typeof right !== "string") return false;
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function readStoredOtp(email: string): Promise<StoredOtp | null> {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { key: otpKey(email) },
      select: { value: true },
    });
    const value = row?.value as Partial<StoredOtp> | null;
    if (!value || typeof value.hash !== "string" || typeof value.salt !== "string") return null;
    return {
      hash: value.hash,
      salt: value.salt,
      expiresAt: Number(value.expiresAt) || 0,
      attempts: Number(value.attempts) || 0,
      createdAt: Number(value.createdAt) || 0,
    };
  } catch (error) {
    logger.error("otp_read_failed", { message: (error as Error)?.message });
    return null;
  }
}

async function deleteStoredOtp(email: string): Promise<void> {
  try {
    await prisma.platformConfig.deleteMany({ where: { key: otpKey(email) } });
  } catch (error) {
    logger.warn("otp_delete_failed", { message: (error as Error)?.message });
  }
}

/**
 * Génère un nouveau code, enregistre son hash et renvoie le code à envoyer
 * par e-mail. Aucun appelant ne doit renvoyer ce code au navigateur.
 */
export async function issueEmailOtp(email: string): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString("hex");
  const now = Date.now();
  const stored: StoredOtp = {
    hash: hashOtp(code, salt),
    salt,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    createdAt: now,
  };

  await prisma.platformConfig.upsert({
    where: { key: otpKey(email) },
    create: {
      key: otpKey(email),
      value: stored,
      description: "Code de vérification d'adresse e-mail (hash salé, usage unique)",
    },
    update: { value: stored },
  });

  return code;
}

export type VerifyOtpResult =
  | { ok: true; verificationToken: string; email: string }
  | { ok: false; reason: "missing" | "expired" | "invalid" | "too_many_attempts" };

/** Vérifie un code saisi ; en cas de succès renvoie un jeton d'inscription signé. */
export async function verifyEmailOtp(email: string, code: string): Promise<VerifyOtpResult> {
  const normalized = normalizeEmail(email);
  const stored = await readStoredOtp(normalized);
  if (!stored) return { ok: false, reason: "missing" };

  if (Date.now() > stored.expiresAt) {
    await deleteStoredOtp(normalized);
    return { ok: false, reason: "expired" };
  }

  if (stored.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteStoredOtp(normalized);
    return { ok: false, reason: "too_many_attempts" };
  }

  const candidate = hashOtp(String(code).trim(), stored.salt);
  if (!safeEqualHex(candidate, stored.hash)) {
    const attempts = stored.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await deleteStoredOtp(normalized);
      return { ok: false, reason: "too_many_attempts" };
    }
    await prisma.platformConfig
      .update({ where: { key: otpKey(normalized) }, data: { value: { ...stored, attempts } } })
      .catch(() => null);
    return { ok: false, reason: "invalid" };
  }

  await deleteStoredOtp(normalized);

  const verificationToken = await new SignJWT({ purpose: TOKEN_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalized)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(signingKey());

  return { ok: true, verificationToken, email: normalized };
}

/**
 * Vérifie un jeton d'inscription : renvoie l'adresse validée, ou null.
 * Le jeton doit porter le bon `purpose` et correspondre à l'adresse fournie.
 */
export async function verifyEmailVerificationToken(
  token: string,
  expectedEmail: string
): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== TOKEN_PURPOSE) return null;
    const subject = normalizeEmail(String(payload.sub || ""));
    if (!subject) return null;
    if (subject !== normalizeEmail(expectedEmail)) return null;
    return subject;
  } catch {
    return null;
  }
}

