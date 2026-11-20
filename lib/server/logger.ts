// ============================================================
// FORTIA HUB — JOURNALISATION STRUCTURÉE (Phase 3)
// ------------------------------------------------------------
// Un objet JSON par ligne, corrélé par `requestId`.
// Les clés sensibles sont masquées AVANT écriture (jamais de secret,
// de mot de passe, de jeton ou de donnée de carte dans les logs).
// ============================================================

export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY =
  /password|passwd|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|card|cvv|iban|signature/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[tronqué]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    const redacted = value
      .replace(/(password[\w]*|secret|token|api[-_]?key)\s*[:=]\s*['"]?[^'"\s,;]+/gi, "$1=[masqué]")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [masqué]");
    return redacted.length > 500 ? `${redacted.slice(0, 500)}…` : redacted;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitize(entry, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[masqué]" : sanitize(entry, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {}
): void {
  const line = JSON.stringify({
    ...(sanitize(context) as Record<string, unknown>),
    ts: new Date().toISOString(),
    level,
    event,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => logEvent("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => logEvent("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => logEvent("error", event, context),
};
