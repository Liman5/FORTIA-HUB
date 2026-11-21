// ============================================================
// FORTIA HUB — VALIDATION DES VARIABLES D'ENVIRONNEMENT (Phase 3)
// ------------------------------------------------------------
// Les variables INDISPENSABLES échouent explicitement si elles manquent
// (en production). Les variables facultatives restent facultatives.
// Aucune valeur n'est jamais journalisée ni exposée.
// ============================================================

import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis."),
  DIRECT_URL: optionalUrl,
  JWT_SECRET: z.string().min(32, "JWT_SECRET doit contenir au moins 32 caractères."),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,

  R2_ACCOUNT_ID: optionalSecret,
  R2_ACCESS_KEY_ID: optionalSecret,
  R2_SECRET_ACCESS_KEY: optionalSecret,
  R2_BUCKET_NAME: optionalSecret,
  R2_PRIVATE_BUCKET_NAME: optionalSecret,

  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional().or(z.literal("")),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional().or(z.literal("")),
  PAYSTACK_SECRET_KEY: optionalSecret,
  FLUTTERWAVE_SECRET_KEY: optionalSecret,
  FLUTTERWAVE_WEBHOOK_SECRET: optionalSecret,
  PAYMENTS_SANDBOX_ENABLED: z.enum(["true", "false"]).optional(),
  PAYMENTS_SANDBOX_ALLOW_PROD: z.enum(["true", "false"]).optional(),
  SANDBOX_WEBHOOK_SECRET: optionalSecret,

  RESEND_API_KEY: optionalSecret,
  SENDER_EMAIL: optionalSecret,
  CRON_SECRET: optionalSecret,
  ADMIN_EMAILS: optionalSecret,
  GEMINI_API_KEY: optionalSecret,
  VAPID_PUBLIC_KEY: optionalSecret,
  VAPID_PRIVATE_KEY: optionalSecret,
});

export type ServerEnv = z.infer<typeof envSchema>;

export interface EnvValidationResult {
  ok: boolean;
  issues: string[];
  env?: ServerEnv;
}

let cached: ServerEnv | null = null;

/**
 * Valide l'environnement. En production, lève une erreur explicite :
 * une application mal configurée ne doit pas démarrer silencieusement.
 */
export function validateEnv(
  options: { throwOnError?: boolean } = {}
): EnvValidationResult {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    cached = parsed.data;
    return { ok: true, issues: [], env: parsed.data };
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join(".") || "env"} : ${issue.message}`
  );

  if (options.throwOnError) {
    throw new Error(`Configuration d'environnement invalide:\n- ${issues.join("\n- ")}`);
  }

  console.warn(
    `[ENV] Configuration incomplète (${issues.length} problème(s)) :\n- ${issues.join("\n- ")}`
  );
  return { ok: false, issues };
}

/** Accès typé à l'environnement (validation à la première utilisation). */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const result = validateEnv({ throwOnError: true });
  if (!result.env) throw new Error("Environnement invalide.");
  return result.env;
}

/** Variables exposables au navigateur : uniquement le préfixe NEXT_PUBLIC_. */
export function publicEnv(): Record<string, string> {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || "",
  };
}
