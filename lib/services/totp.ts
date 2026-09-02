// ============================================================
// FORTIA HUB — Moteur TOTP (RFC 6238) pour Google Authenticator
// Utilisé uniquement côté serveur (Node crypto).
// ============================================================
import { createHmac, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TIME_STEP_SECONDS = 30;
const DIGITS = 6;

/** Génère une clé secrète base32 (20 octets = 160 bits). */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let secret = "";
  for (let i = 0; i < bytes.length; i++) {
    secret += ALPHABET[bytes[i] % 32];
  }
  return secret;
}

/** Encode une chaîne base32 (RFC 4648) vers des octets. */
function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    value = (value << 5) | ALPHABET.indexOf(cleaned[i]);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function dynamicTruncate(hmac: Buffer): number {
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return code;
}

/** Calcule le code TOTP pour la clé secrète donnée. */
export function computeTotp(secret: string, atSeconds?: number): string {
  const counter = Math.floor(
    (atSeconds ?? Math.floor(Date.now() / 1000)) / TIME_STEP_SECONDS
  );
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const truncated = dynamicTruncate(hmac);
  const code = (truncated % 10 ** DIGITS).toString().padStart(DIGITS, "0");
  return code;
}

/**
 * Vérifie un code TOTP avec une tolérance de ± `window` pas de 30 s.
 * (La tolérance ±1 gère l'horloge des appareils.)
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const clean = String(token || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const current = Math.floor(Date.now() / 1000);
  for (let i = -window; i <= window; i++) {
    const at = current + i * TIME_STEP_SECONDS;
    if (computeTotp(secret, at) === clean) return true;
  }
  return false;
}

/** URL standard `otpauth://` pour Google Authenticator. */
export function buildOtpauthUrl(accountName: string, secret: string, issuer = "FORTIA HUB"): string {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(TIME_STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
