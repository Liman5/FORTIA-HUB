// ============================================================
// FORTIA HUB — Double authentification (2FA)
// ------------------------------------------------------------
// Le flag 2FA est stocké dans la table `platform_config`
// (clé = `2fa:user:{userId}`) afin de ne nécessiter AUCUNE
// migration de schéma. Le code de vérification est envoyé par
// e-mail (OTP 6 chiffres) et validé avant d'autoriser l'accès
// au compte ou d'activer/désactiver la 2FA.
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const TWO_FACTOR_KEY_PREFIX = "2fa:user:";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET est manquant ou trop court. Définissez un secret d'au moins 32 caractères dans .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

/** Vérifie si la double authentification est activée pour un utilisateur. */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { key: TWO_FACTOR_KEY_PREFIX + userId },
      select: { value: true },
    });
    return row?.value ? (row.value as any)?.enabled === true : false;
  } catch (e) {
    console.warn("[2FA] Lecture du flag 2FA impossible:", (e as any)?.message);
    return false;
  }
}

/** Active ou désactive la 2FA pour un utilisateur. */
export async function setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
  const key = TWO_FACTOR_KEY_PREFIX + userId;
  await prisma.platformConfig.upsert({
    where: { key },
    create: {
      key,
      value: { enabled },
      description: "Double authentification (2FA) de l'utilisateur",
    },
    update: { value: { enabled } },
  });
}

/**
 * Crée un « défi » 2FA : un JWT court (10 min) lié à l'utilisateur.
 * Il est échangé contre le code OTP lors de la connexion.
 */
export async function createTwoFactorChallenge(userId: string): Promise<string> {
  return new SignJWT({ purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 10 * 60)
    .sign(getJwtSecret());
}

/**
 * Valide un défi 2FA et retourne l'identifiant utilisateur, ou null si invalide.
 */
export async function verifyTwoFactorChallenge(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "2fa" || !payload.sub) return null;
    return payload.sub as string;
  } catch (e) {
    return null;
  }
}
