import { UserProfile } from "@/lib/types";
import { validateEmailFormat } from "@/lib/utils/authValidation";

export const SENDER_EMAIL_OFFICIAL = "Fortia Hub <onboarding@resend.dev>";

export interface OtpSendResponse {
  success: boolean;
  message: string;
  sender: string;
  otpCode?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  error?: string;
}

/** Réponse de login : peut exiger une étape 2FA avant de créer la session. */
export interface LoginResult {
  user?: Partial<UserProfile>;
  needsTwoFactor?: boolean;
  twoFactorToken?: string;
  message?: string;
}

/**
 * Sends a 6-digit OTP email via Resend to the registrant
 */
export async function apiSendOtp(email: string): Promise<OtpSendResponse> {
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp", email, otpCode: generatedCode }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || `Code de vérification envoyé à ${email}`,
        sender: data.sender || SENDER_EMAIL_OFFICIAL,
        otpCode: data.otpCode || generatedCode,
      };
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
 * Verifies the 6-digit numeric OTP code
 */
export async function apiVerifyOtp(
  email: string,
  code: string,
  expectedCode: string
): Promise<OtpVerifyResponse> {
  const cleanCode = code.trim();

  // Enforce 6 numeric digits rule strictly
  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      message: "Format invalide : Le code OTP doit comporter exactement 6 chiffres.",
    };
  }

  if (cleanCode !== expectedCode.trim()) {
    return {
      success: false,
      message:
        "Code OTP incorrect. Veuillez vérifier le code à 6 chiffres envoyé à votre adresse e-mail.",
    };
  }

  return {
    success: true,
    message: "Code OTP validé avec succès !",
  };
}

export interface AuthRegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  accountType?: "buyer" | "freelance" | "enterprise";
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
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", ...payload }),
      });

      const data = await response.json().catch(() => null);

      // Service momentanément indisponible → nouvelle tentative automatique
      if (response.status === 503 && attempt < MAX_ATTEMPTS - 1) {
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
      // Erreur réseau : on réessaie avant d'abandonner
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return {
        success: false,
        error:
          "Connexion impossible pour le moment. Vérifiez votre connexion internet puis réessayez.",
      };
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
 * Retourne la clé à copier + l'URL otpauth + l'image du QR Code.
 */
export async function apiTwoFactorSetup(): Promise<{
  success: boolean;
  secret?: string;
  otpauthUrl?: string;
  qrCodeUrl?: string;
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
      qrCodeUrl: data.qrCodeUrl || "",
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
 * Request permanent 24-hour delayed account deletion (/api/auth)
 */
export async function apiDeleteAccount(
  email: string
): Promise<ApiResponse<{ requestedAt: string; deleteAt: string }>> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-account", email: normalizedEmail }),
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