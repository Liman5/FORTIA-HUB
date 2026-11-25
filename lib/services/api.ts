import { UserProfile } from "@/lib/types";
import { validateEmailFormat } from "@/lib/utils/authValidation";

export const SENDER_EMAIL_OFFICIAL = "Fortia Hub <onboarding@resend.dev>";

export interface OtpSendResponse {
  success: boolean;
  message: string;
  sender: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  error?: string;
  /** Jeton signé à transmettre à l'inscription (preuve de vérification). */
  verificationToken?: string;
}

/**
 * Configuration publique du parcours d'authentification.
 * Sert uniquement à savoir si la vérification d'e-mail est exigée
 * (interrupteur temporaire de phase de test).
 */
export async function apiGetAuthConfig(): Promise<{ emailVerificationRequired: boolean }> {
  try {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) throw new Error("config indisponible");
    const data = await response.json();
    if (typeof data?.emailVerificationRequired === "boolean") {
      return { emailVerificationRequired: data.emailVerificationRequired };
    }
    return { emailVerificationRequired: true };
  } catch {
    // Échec réseau/serveur : on conserve le comportement sûr (vérification exigée).
    return { emailVerificationRequired: true };
  }
}

/** Réponse de login : peut exiger une étape 2FA avant de créer la session. */
export interface LoginResult {
  user?: Partial<UserProfile>;
  needsTwoFactor?: boolean;
  twoFactorToken?: string;
  message?: string;
}

/**
 * Demande l'envoi d'un code de vérification à 6 chiffres.
 * ⚠️ Le code est généré côté serveur et n'est JAMAIS renvoyé au navigateur.
 */
export async function apiSendOtp(email: string): Promise<OtpSendResponse> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp", email }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || `Code de vérification envoyé à ${email}`,
        sender: data.sender || SENDER_EMAIL_OFFICIAL,
      };
    }
    if (data?.error) {
      return { success: false, message: String(data.error), sender: SENDER_EMAIL_OFFICIAL };
    }
  } catch (err) {
    // Erreur réseau — aucune simulation d'envoi
  }

  return {
    success: false,
    message: "Impossible d'envoyer le code de vérification. Vérifiez votre connexion et réessayez.",
    sender: SENDER_EMAIL_OFFICIAL,
  };
}

/**
 * Vérifie le code à 6 chiffres auprès du serveur (aucune comparaison locale).
 * En cas de succès, le serveur renvoie le jeton signé exigé par l'inscription.
 */
export async function apiVerifyOtp(email: string, code: string): Promise<OtpVerifyResponse> {
  const cleanCode = String(code || "").trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      message: "Format invalide : Le code de vérification doit comporter exactement 6 chiffres.",
    };
  }

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-otp", email, otp: cleanCode }),
    });
    const data = await response.json();

    if (response.ok && data.success && typeof data.verificationToken === "string") {
      return {
        success: true,
        message: data.message || "Adresse e-mail vérifiée.",
        verificationToken: data.verificationToken,
      };
    }

    return {
      success: false,
      message:
        data?.error ||
        "Code de vérification invalide ou expiré. Demandez un nouveau code puis réessayez.",
    };
  } catch (err) {
    return {
      success: false,
      message: "Vérification impossible pour le moment. Vérifiez votre connexion et réessayez.",
    };
  }
}

export interface AuthRegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  accountType?: "buyer" | "freelance" | "enterprise" | "admin" | "superadmin" | "super_admin";
  /** Jeton signé renvoyé par la vérification du code e-mail. */
  verificationToken?: string;
}

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Checks email availability against the backend (Supabase)
 */
export async function apiCheckEmailAvailability(email: string): Promise<{ available: boolean; error?: string }> {
  // Client-side domain format validation
  const formatResult = validateEmailFormat(email);
  if (!formatResult.isValid) {
    return {
      available: false,
      error: formatResult.errorMessage || "Format d'adresse e-mail invalide.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Backend REST check (vérification réelle dans Supabase)
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-email", email: normalizedEmail }),
    });
    const data = await response.json();
    if (!response.ok || !data.available) {
      return {
        available: false,
        error: data.error || "Adresse e-mail non disponible.",
      };
    }
    return { available: true };
  } catch (err) {
    // Erreur réseau : aucune disponibilité simulée
    return {
      available: false,
      error: "Impossible de vérifier la disponibilité de l'adresse e-mail. Vérifiez votre connexion et réessayez.",
    };
  }
}

/**
 * Register user via Backend REST API (/api/auth)
 */
export async function apiRegisterUser(
  payload: AuthRegisterPayload
): Promise<ApiResponse<{ user: Partial<UserProfile> }>> {
  // Validate email domain format
  const formatResult = validateEmailFormat(payload.email);
  if (!formatResult.isValid) {
    return {
      success: false,
      error: formatResult.errorMessage || "Format de domaine d'adresse e-mail non valide.",
    };
  }

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", ...payload }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erreur lors de l'inscription.",
      };
    }

    return {
      success: true,
      data: { user: data.user },
    };
  } catch (err) {
    // Erreur réseau : aucune inscription simulée
    return {
      success: false,
      error: "Impossible de créer le compte. Vérifiez votre connexion et réessayez.",
    };
  }
}

/**
 * Login user via Backend REST API (/api/auth)
 * Si l'utilisateur a activé la 2FA, la réponse contient `needsTwoFactor`
 * et `twoFactorToken` : il faut alors appeler `apiVerifyTwoFactor`.
 * Résilient : réessaie automatiquement si le service est momentanément
 * indisponible (503 / réseau) au lieu de forcer l'utilisateur à attendre.
 */
export async function apiLoginUser(
  payload: AuthLoginPayload
): Promise<ApiResponse<LoginResult>> {
  const MAX_ATTEMPTS = 3;
  /** Délai maximal par tentative : sur mobile, une requête peut rester bloquée. */
  const ATTEMPT_TIMEOUT_MS = 20_000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", ...payload }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      // Service momentanément indisponible → nouvelle tentative automatique
      if ((response.status === 503 || response.status === 504) && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data?.error ||
            "Connexion impossible. Vérifiez vos identifiants et réessayez.",
        };
      }

      if (data.needsTwoFactor) {
        return {
          success: true,
          data: {
            needsTwoFactor: true,
            twoFactorToken: data.twoFactorToken,
            message: data.message,
          },
        };
      }

      return {
        success: true,
        data: { user: data.user },
      };
    } catch (err) {
      // Erreur réseau (ou délai dépassé) : on réessaie avant d'abandonner
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return {
        success: false,
        error:
          "Connexion impossible pour le moment. Vérifiez votre connexion internet puis réessayez.",
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { success: false, error: "Connexion impossible. Réessayez." };
}

/**
 * Deuxième étape du login 2FA : envoie le code reçu par e-mail + le défi JWT.
 * En cas de succès, la session est créée côté serveur.
 */
export async function apiVerifyTwoFactor(
  token: string,
  otp: string
): Promise<ApiResponse<{ user: Partial<UserProfile> }>> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-2fa", token, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || "Code de sécurité invalide." };
    }
    return { success: true, data: { user: data.user } };
  } catch (err) {
    return {
      success: false,
      error: "Impossible de valider le code de sécurité. Vérifiez votre connexion.",
    };
  }
}

/** Retourne l'état 2FA de l'utilisateur connecté. */
export async function apiGetTwoFactorStatus(): Promise<{ enabled: boolean }> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-2fa-status" }),
    });
    const data = await response.json();
    return { enabled: data?.twoFactorEnabled === true };
  } catch (err) {
    return { enabled: false };
  }
}

/**
 * Génère la clé secrète TOTP (Google Authenticator) pour le compte connecté.
 * Retourne la clé à copier et l'URL otpauth : le QR code est généré
 * localement dans le navigateur (aucun service tiers).
 */
export async function apiTwoFactorSetup(): Promise<{
  success: boolean;
  secret?: string;
  otpauthUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "2fa-setup" }),
    });
    const data = await response.json();
    if (!response.ok || !data?.secret) {
      return { success: false, error: data?.error || "Impossible de générer la clé 2FA." };
    }
    return {
      success: true,
      secret: data.secret,
      otpauthUrl: data.otpauthUrl || "",
    };
  } catch (err) {
    return { success: false, error: "Impossible de générer la clé 2FA. Vérifiez votre connexion." };
  }
}

/**
 * Active/désactive la 2FA pour l'utilisateur connecté.
 * Nécessite un code OTP fraîchement envoyé via `apiSendOtp(email)`.
 */
export async function apiToggleTwoFactor(
  enabled: boolean,
  otp: string
): Promise<ApiResponse<{ twoFactorEnabled: boolean }>> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-2fa", enabled, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || "Impossible de modifier la 2FA." };
    }
    return { success: true, data: { twoFactorEnabled: data.twoFactorEnabled === true } };
  } catch (err) {
    return {
      success: false,
      error: "Impossible de modifier la 2FA. Vérifiez votre connexion.",
    };
  }
}

/**
 * Demande de suppression différée (7 jours) du compte connecté.
 * Le paramètre email est conservé pour compatibilité d'appel mais n'est
 * JAMAIS utilisé : le serveur identifie l'utilisateur par sa session.
 */
export async function apiDeleteAccount(
  _email: string
): Promise<ApiResponse<{ requestedAt: string; deleteAt: string }>> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-account" }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        data: {
          requestedAt: data.requestedAt,
          deleteAt: data.deleteAt,
        },
      };
    }
    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erreur lors de la demande de suppression du compte.",
      };
    }
  } catch (err) {
    // Erreur réseau : aucune demande simulée
  }

  return {
    success: false,
    error: "Impossible de demander la suppression du compte. Vérifiez votre connexion et réessayez.",
  };
}

/**
 * Fetch synchronized platform state from backend (/api/platform/sync)
 */
export async function apiFetchPlatformSync() {
  try {
    const response = await fetch("/api/platform/sync");
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // ignore offline
  }
  return null;
}

/**
 * AI Assistant endpoint (/api/ai-assistant)
 * Retourne la réponse du serveur telle quelle : `{ text, isFallback }` en cas
 * de succès, ou `{ error, code, isFallback }` en cas d'erreur (notamment 429 :
 * limite gratuite de la Gemini API atteinte).
 */
export async function apiAiAssistant(prompt: string, category?: string, context?: any) {
  try {
    const response = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, category, context }),
    });
    return await response.json();
  } catch (e) {
    console.error("Erreur réseau API AI Assistant:", e);
    return {
      text: "",
      isFallback: true,
      error: "Le service d'assistance IA est actuellement indisponible. Réessayez plus tard.",
    };
  }
}