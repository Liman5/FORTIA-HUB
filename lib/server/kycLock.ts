import "server-only";

// ============================================================
// FORTIA HUB — VERROU DES DOSSIERS KYC
// ------------------------------------------------------------
// • Le masquage d'un dossier est protégé par un CODE À 6 CHIFFRES
//   défini AVANT le masquage.
// • Le code est PROPRE À CHAQUE DOSSIER (aucun code global) : il est
//   stocké sous forme de hash bcrypt dans `kyc_submissions.lock_code_hash`.
// • Le déverrouillage délivre un jeton de courte durée (15 min) : la
//   révélation ne vaut que pour la session en cours. Le dossier reste
//   masqué en base pour tout autre administrateur.
// • Anti force brute : 5 essais, puis blocage de 5 minutes.
// ============================================================

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/** Groupes d'informations masquables (un dossier peut en masquer plusieurs). */
export const KYC_MASK_GROUPS = ["identity", "contact", "document", "company", "files"] as const;
export type KycMaskGroup = (typeof KYC_MASK_GROUPS)[number];

/** Libellés affichés dans l'administration. */
export const KYC_MASK_LABELS: Record<KycMaskGroup, string> = {
  identity: "Identité (nom, prénom, rôle)",
  contact: "Contact (e-mail, téléphone, pays, adresse)",
  document: "Pièce (type, numéro, expiration)",
  company: "Entreprise (raison sociale, forme, RCCM)",
  files: "Documents joints (recto, verso, selfie, RCCM)",
};

/** Colonnes de document supprimables. */
export const KYC_DOC_SLOTS = [
  "idRectoUrl",
  "idVersoUrl",
  "selfieUrl",
  "companyDocUrl",
  "documentFileUrl",
] as const;
export type KycDocSlot = (typeof KYC_DOC_SLOTS)[number];

export const KYC_CODE_LENGTH = 6;
export const KYC_MAX_ATTEMPTS = 5;
export const KYC_BLOCK_MINUTES = 5;
export const KYC_UNLOCK_TTL_MINUTES = 15;

/**
 * Nettoie une saisie de code (espaces, tirets, espaces insécables).
 * Retourne la suite de chiffres, ou "" si le code est illisible.
 */
export function normalizeKycCode(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[^0-9]/g, "")
    .slice(0, KYC_CODE_LENGTH);
}

/** Valide un code à 6 chiffres. Retourne un message d'erreur, ou null si valide. */
export function validateKycCode(code: string): string | null {
  if (!/^[0-9]{6}$/.test(code)) {
    return `Le code secret doit contenir exactement ${KYC_CODE_LENGTH} chiffres.`;
  }
  if (/^(\d)\1{5}$/.test(code)) {
    return "Code trop simple : évitez 6 chiffres identiques.";
  }
  return null;
}

/** Normalise la liste des groupes à masquer (uniquement des valeurs connues). */
export function normalizeMaskGroups(fields: unknown): KycMaskGroup[] {
  const list = Array.isArray(fields) ? fields : String(fields ?? "").split(",");
  const seen = new Set<string>();
  for (const item of list) {
    const value = String(item || "").trim().toLowerCase();
    if ((KYC_MASK_GROUPS as readonly string[]).includes(value)) seen.add(value);
  }
  return KYC_MASK_GROUPS.filter((group) => seen.has(group));
}

/** Un groupe est-il masqué sur ce dossier ? */
export function isGroupHidden(hiddenFields: unknown, group: KycMaskGroup): boolean {
  const raw = String(hiddenFields ?? "");
  if (!raw) return false;
  return normalizeMaskGroups(raw).includes(group);
}

export async function hashKycCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyKycCode(code: string, hash: string): Promise<boolean> {
  const value = String(hash || "");
  if (!value || value.length < 20) return false;
  try {
    return await bcrypt.compare(code, value);
  } catch {
    return false;
  }
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET manquant ou trop court : déverrouillage KYC impossible.");
  }
  return new TextEncoder().encode(secret);
}

/** Jeton de déverrouillage, lié à un dossier et de courte durée. */
export async function signKycUnlockToken(kycId: string): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + KYC_UNLOCK_TTL_MINUTES * 60 * 1000);
  const token = await new SignJWT({ kyc: kycId, typ: "kyc-unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Vérifie qu'un jeton de déverrouillage est valide pour ce dossier. */
export async function verifyKycUnlockToken(kycId: string, token: unknown): Promise<boolean> {
  const value = String(token || "");
  if (!value) return false;
  try {
    const { payload } = await jwtVerify(value, getSecret());
    return payload?.typ === "kyc-unlock" && String(payload?.kyc || "") === String(kycId);
  } catch {
    return false;
  }
}
