import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { validateEmailFormat } from "@/lib/utils/authValidation";
import { prisma } from "@/lib/prisma";
import { supabaseEnsureAuthUser } from "@/lib/services/supabaseAuth";
import {
  createUserSession,
  setSessionCookie,
  getCurrentUser,
} from "@/lib/services/authSession";
import {
  createTwoFactorChallenge,
  createTwoFactorSetup,
  getTwoFactorSecret,
  isTwoFactorEnabled,
  saveTwoFactorProfile,
  verifyTwoFactorChallenge,
  verifyTwoFactorCode,
} from "@/lib/services/twoFactor";
import { notifyUser } from "@/lib/services/notifyUser";
import { isRetryableDbError, withDbRetry } from "@/lib/server/dbRetry";
import { clientIp, rateLimitPersistent } from "@/lib/server/rateLimit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

const activeOtpsStore = new Map<
  string,
  { otpCode: string; expiresAt: number; sender: string }
>();

const pendingDeletionsStore = new Map<
  string,
  { email: string; requestedAt: number; deleteAt: number }
>();

function generateOtpEmailHtml(otpCode: string, recipientEmail: string) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de vérification - Fortia Hub</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #010c22; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #010c22; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #021231; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="background-color: #011d46; padding: 32px 24px; text-align: center; border-bottom: 2px solid #D69E25;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">
                FORTIA <span style="color: #D69E25;">HUB</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                LEARN. BUILD. SUCCEED.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 22px; font-weight: 700; text-align: center;">
                Code de vérification
              </h2>
              <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6; text-align: center;">
                Bonjour,<br>
                Voici votre code de vérification à 6 chiffres pour sécuriser votre inscription ou connexion sur la plateforme <strong style="color: #ffffff;">Fortia Hub</strong>.
              </p>
              <div style="background: linear-gradient(135deg, #011a3e 0%, #03245a 100%); border: 2px solid #D69E25; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3); padding-left: 10px;">
                  ${otpCode}
                </div>
              </div>
              <div style="background-color: rgba(214, 158, 37, 0.1); border-left: 4px solid #D69E25; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0; color: #fbbf24; font-size: 13px; font-weight: 600;">
                  ⏱️ Ce code de vérification expire dans 10 minutes.
                </p>
              </div>
              <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; color: #f87171; font-size: 12px; line-height: 1.5;">
                  🔒 <strong>Avertissement de sécurité :</strong> Ne partagez JAMAIS ce code avec quiconque. L'équipe Fortia Hub ne vous demandera jamais votre code OTP.
                </p>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #010d24; padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; font-weight: 600;">
                © ${new Date().getFullYear()} Fortia Hub — Plateforme Académique & Services
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                Message envoyé à <span style="color: #94a3b8;">${recipientEmail}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// GET /api/auth/users - list registered users (Supabase / Prisma)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        accountType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ count: users.length, users });
  } catch (err: any) {
    console.warn("[AUTH] Base inaccessible pour la liste des utilisateurs:", err?.message);
    return NextResponse.json({ count: 0, users: [] });
  }
}

// POST /api/auth - unified auth endpoint (action-based routing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ===== Protection anti-abus (force brute / robots) =====
    // Connexion : 10 essais / 5 min par IP. Inscription & OTP : 8 / 10 min.
    const ip = clientIp(request);
    const guardedActions = ["login", "register", "verify-otp", "send-otp"];
    if (guardedActions.includes(String(body?.action))) {
      const isLogin = body.action === "login";
      const wait = await rateLimitPersistent(
        `${body.action}:${ip}`,
        isLogin ? 10 : 8,
        isLogin ? 5 * 60 * 1000 : 10 * 60 * 1000
      );
      if (wait) {
        return NextResponse.json(
          {
            error: `Trop de tentatives. Réessayez dans ${wait} seconde(s).`,
            code: "RATE_LIMITED",
          },
          { status: 429, headers: { "Retry-After": String(wait) } }
        );
      }
    }

    // ====== CHECK-EMAIL ======
    if (body.action === "check-email") {
      const { email } = body;
      const formatResult = validateEmailFormat(email);
      if (!formatResult.isValid) {
        return NextResponse.json(
          { available: false, error: formatResult.errorMessage },
          { status: 400 }
        );
      }
      const normalizedEmail = email.trim().toLowerCase();

      // Vérification dans Supabase (Prisma)
      try {
        const existingInDb = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (existingInDb) {
          return NextResponse.json(
            {
              available: false,
              error:
                "Refusé : Cette adresse e-mail est déjà inscrite sur la plateforme. Une seule inscription est autorisée par adresse e-mail.",
            },
            { status: 400 }
          );
        }
      } catch (dbError: any) {
        console.warn("[AUTH] Base inaccessible pour la vérification d'email:", dbError?.message);
        return NextResponse.json(
          { error: "Base de données inaccessible. Impossible de vérifier l'adresse e-mail." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        available: true,
        message: "Adresse e-mail disponible pour l'inscription.",
      });
    }

    // ====== SEND-OTP ======
    if (body.action === "send-otp") {
      const { email, otpCode } = body;
      const formatResult = validateEmailFormat(email);
      if (!formatResult.isValid) {
        return NextResponse.json(
          { success: false, error: formatResult.errorMessage },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const code =
        otpCode && /^\d{6}$/.test(otpCode)
          ? otpCode
          : Math.floor(100000 + Math.random() * 900000).toString();

      const expiresAt = Date.now() + 10 * 60 * 1000;
      activeOtpsStore.set(normalizedEmail, { otpCode: code, sender: FROM_EMAIL, expiresAt });

      let emailSent = false;
      let resendId = null;

      if (resend) {
        try {
          const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [normalizedEmail],
            subject: `${code} est votre code de vérification Fortia Hub`,
            html: generateOtpEmailHtml(code, normalizedEmail),
          });
          if (error) {
            console.warn("[RESEND API NOTICE]", error);
          } else if (data?.id) {
            emailSent = true;
            resendId = data.id;
          }
        } catch (resendError: any) {
          console.warn("[RESEND EXCEPTION]", resendError);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Code de vérification à 6 chiffres envoyé à ${normalizedEmail} depuis ${FROM_EMAIL}`,
        sender: FROM_EMAIL,
        otpCode: code,
        emailSent,
        resendId,
      });
    }

    // ====== VERIFY-OTP ======
    if (body.action === "verify-otp") {
      const { email, otp } = body;
      if (!email || !otp) {
        return NextResponse.json(
          { success: false, error: "L'adresse e-mail et le code OTP sont requis." },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const storedData = activeOtpsStore.get(normalizedEmail);

      if (!/^\d{6}$/.test(otp.trim())) {
        return NextResponse.json(
          { success: false, error: "Refusé : Le code OTP doit comporter exactement 6 chiffres." },
          { status: 400 }
        );
      }

      if (!storedData) {
        return NextResponse.json(
          { success: false, error: "Aucun code OTP actif trouvé pour cet e-mail. Veuillez demander un nouveau code." },
          { status: 400 }
        );
      }

      if (Date.now() > storedData.expiresAt) {
        activeOtpsStore.delete(normalizedEmail);
        return NextResponse.json(
          { success: false, error: "Ce code de vérification a expiré (durée de validité : 10 minutes). Veuillez demander un nouveau code." },
          { status: 400 }
        );
      }

      if (storedData.otpCode === otp.trim()) {
        activeOtpsStore.delete(normalizedEmail);
        return NextResponse.json({ success: true, message: "Code OTP validé avec succès !" });
      }

      return NextResponse.json(
        { success: false, error: `Code OTP incorrect. Veuillez saisir le code à 6 chiffres reçu par e-mail depuis ${FROM_EMAIL}.` },
        { status: 400 }
      );
    }

    // ====== REGISTER ======
    if (body.action === "register") {
      const { email, password, name, phone, accountType } = body;

      const formatResult = validateEmailFormat(email);
      if (!formatResult.isValid) {
        return NextResponse.json(
          { error: `Refusé : ${formatResult.errorMessage}` },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string") {
        return NextResponse.json({ error: "Refusé : Un mot de passe est obligatoire." }, { status: 400 });
      }

      const hasMinLength = password.length >= 6;
      const hasUppercase = /[A-Z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasDigit || !hasSymbol) {
        const missing: string[] = [];
        if (!hasMinLength) missing.push("au moins 6 caractères");
        if (!hasUppercase) missing.push("1 lettre majuscule (A-Z)");
        if (!hasDigit) missing.push("1 chiffre (0-9)");
        if (!hasSymbol) missing.push("1 symbole ou caractère spécial (!@#$%...)");
        return NextResponse.json(
          { error: `Refusé : Le mot de passe ne respecte pas les critères de sécurité requis. Manquant : ${missing.join(", ")}.` },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Hachage BCrypt du mot de passe
      const passwordHash = await bcrypt.hash(password, 10);

      // Enregistrement dans Supabase (Prisma)
      try {
        const existingInDb = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (existingInDb) {
          return NextResponse.json(
            {
              error:
                "Refusé : Cette adresse e-mail est déjà inscrite sur la plateforme. Une seule inscription est autorisée par adresse e-mail.",
            },
            { status: 400 }
          );
        }

        // ⚠️ SÉCURITÉ : le type de compte envoyé par le navigateur ne doit JAMAIS
        // pouvoir créer un administrateur. Seuls les rôles publics sont acceptés ;
        // tout le reste retombe sur « buyer ».
        const PUBLIC_ACCOUNT_TYPES = ["buyer", "freelance", "enterprise"] as const;
        const requestedType = String(accountType || "").trim().toLowerCase();
        const safeAccountType = (PUBLIC_ACCOUNT_TYPES as readonly string[]).includes(requestedType)
          ? (requestedType as (typeof PUBLIC_ACCOUNT_TYPES)[number])
          : "buyer";

        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: name || normalizedEmail.split("@")[0],
            phone: phone || "",
            accountType: safeAccountType,
          },
        });

        // Création du compte dans Supabase Auth (best-effort) pour permettre
        // la réinitialisation de mot de passe par email ultérieurement.
        try {
          await supabaseEnsureAuthUser(newUser.email, password);
        } catch (e: any) {
          console.warn("[AUTH] Impossible de créer le compte Supabase Auth:", e?.message);
        }

        // === Session JWT (cookie HttpOnly) : connexion automatique après inscription ===
        let sessionToken: string | null = null;
        let sessionExpiresAt: Date | null = null;
        try {
          const session = await createUserSession(
            { id: newUser.id, email: newUser.email },
            request
          );
          sessionToken = session.token;
          sessionExpiresAt = session.expiresAt;
        } catch (e: any) {
          console.warn("[AUTH] Impossible de créer la session:", e?.message);
        }

        const response = NextResponse.json(
          {
            message: "Inscription réussie !",
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              phone: newUser.phone,
              avatar: newUser.avatar || "",
              badge: newUser.badge || "none",
              accountType: newUser.accountType,
              twoFactorEnabled: false,
            },
          },
          { status: 201 }
        );

        if (sessionToken && sessionExpiresAt) {
          setSessionCookie(response, sessionToken, sessionExpiresAt);
        }
        return response;
      } catch (dbError: any) {
        console.warn("[AUTH] Base inaccessible pour l'inscription:", dbError?.message);
        return NextResponse.json(
          { error: "Base de données inaccessible. Impossible de créer le compte." },
          { status: 500 }
        );
      }
    }

    // ====== LOGIN ======
    if (body.action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json(
          { error: "Connexion refusée : L'adresse e-mail et le mot de passe sont obligatoires." },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const pendingDeletion = pendingDeletionsStore.get(normalizedEmail);
      if (pendingDeletion) {
        const now = Date.now();
        if (now >= pendingDeletion.deleteAt) {
          pendingDeletionsStore.delete(normalizedEmail);
          return NextResponse.json(
            { error: "Connexion impossible : Votre compte a été définitivement supprimé à l'issue du délai de 24 heures." },
            { status: 403 }
          );
        } else {
          const remainingMs = pendingDeletion.deleteAt - now;
          const hours = Math.floor(remainingMs / (1000 * 60 * 60));
          const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          return NextResponse.json(
            { error: `Connexion impossible : Votre demande de suppression définitive de compte est en cours. Temps restant : ${hours}h ${mins}min. La connexion est strictement interdite durant ce délai.` },
            { status: 403 }
          );
        }
      }

      // Connexion via Supabase (Prisma + bcrypt)
      try {
        // Lecture résiliente : si le pool est saturé (P2039), on réessaie
        // au lieu d'afficher « service momentanément indisponible ».
        const user = await withDbRetry(() =>
          prisma.user.findUnique({
            where: { email: normalizedEmail },
          })
        );

        if (!user) {
          return NextResponse.json(
            { error: "Connexion refusée : Adresse e-mail ou mot de passe incorrect." },
            { status: 401 }
          );
        }

        // Un compte sans mot de passe (import, compte social) doit être guidé
        // vers la réinitialisation — bcrypt lèverait une exception technique.
        const storedHash = String(user.passwordHash || "");
        if (!/^\$2[aby]\$/.test(storedHash)) {
          return NextResponse.json(
            {
              error:
                "Ce compte n'a pas de mot de passe défini. Utilisez « Mot de passe oublié » pour en créer un, ou contactez le support FORTIA HUB.",
            },
            { status: 401 }
          );
        }

        const passwordMatches = await bcrypt.compare(password, storedHash);
        if (!passwordMatches) {
          return NextResponse.json(
            { error: "Connexion refusée : Adresse e-mail ou mot de passe incorrect." },
            { status: 401 }
          );
        }

        // === 2FA TOTP (Google Authenticator) ===
        const twoFactorEnabled = await isTwoFactorEnabled(user.id);
        if (twoFactorEnabled) {
          const challenge = await createTwoFactorChallenge(user.id);

          return NextResponse.json({
            needsTwoFactor: true,
            twoFactorToken: challenge,
            message:
              "Authentification à deux facteurs : saisissez le code à 6 chiffres de votre application Google Authenticator.",
            emailSent: false,
          });
        }

        // === Session JWT (cookie HttpOnly) ===
        let sessionToken: string | null = null;
        let sessionExpiresAt: Date | null = null;
        try {
          const session = await createUserSession(
            { id: user.id, email: user.email },
            request
          );
          sessionToken = session.token;
          sessionExpiresAt = session.expiresAt;
        } catch (e: any) {
          console.warn("[AUTH] Impossible de créer la session:", e?.message);
        }

        const response = NextResponse.json({
          message: "Connexion réussie !",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar || "",
            badge: user.badge || "none",
            accountType: user.accountType,
            kycStatus: user.kycStatus || "non_soumis",
            twoFactorEnabled: false,
          },
        });

        if (sessionToken && sessionExpiresAt) {
          setSessionCookie(response, sessionToken, sessionExpiresAt);
        }
        return response;
      } catch (dbError: any) {
        // Journalisation précise (code Prisma) pour diagnostiquer sans deviner.
        const code = String(dbError?.code || "");
        console.error("[AUTH] Échec technique de la connexion:", {
          code,
          message: dbError?.message,
        });

        if (isRetryableDbError(dbError)) {
          return NextResponse.json(
            {
              error:
                "Le serveur est momentanément très sollicité. Réessayez dans quelques secondes — vos identifiants n'ont pas été refusés.",
              code: "SERVER_BUSY",
            },
            { status: 503 }
          );
        }

        return NextResponse.json(
          {
            error:
              "Connexion impossible pour une raison technique. Réessayez, puis contactez le support FORTIA HUB si le problème persiste.",
            code: code || "AUTH_ERROR",
          },
          { status: 500 }
        );
      }
    }

    // ====== DELETE-ACCOUNT ======
    if (body.action === "delete-account") {
      const { email } = body;
      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { success: false, error: "L'adresse e-mail est obligatoire pour demander la suppression." },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const requestedAt = Date.now();
      const deleteAt = requestedAt + 24 * 60 * 60 * 1000;

      pendingDeletionsStore.set(normalizedEmail, { email: normalizedEmail, requestedAt, deleteAt });

      return NextResponse.json({
        success: true,
        message:
          "Demande de suppression définitive enregistrée. Le processus prend 24 heures avant la suppression irréversible. Durant ce délai, la connexion est strictement impossible.",
        requestedAt: new Date(requestedAt).toISOString(),
        deleteAt: new Date(deleteAt).toISOString(),
      });
    }

    // ====== VERIFY-2FA ======
    // Deuxième étape de connexion : l'utilisateur envoie le code de sécurité
    // reçu par e-mail + le défi JWT reçu lors du login. Si tout est valide,
    // la session est créée et l'utilisateur accède enfin à son compte.
    if (body.action === "verify-2fa") {
      const { token, otp } = body;
      if (!token || !otp) {
        return NextResponse.json(
          { success: false, error: "Le code de sécurité et la session 2FA sont requis." },
          { status: 400 }
        );
      }
      if (!/^\d{6}$/.test(String(otp).trim())) {
        return NextResponse.json(
          { success: false, error: "Le code de sécurité doit comporter exactement 6 chiffres." },
          { status: 400 }
        );
      }

      const userId = await verifyTwoFactorChallenge(token);
      if (!userId) {
        return NextResponse.json(
          { success: false, error: "Session 2FA invalide ou expirée. Veuillez vous reconnecter." },
          { status: 401 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Compte introuvable." },
          { status: 404 }
        );
      }

      // Vérification TOTP (Google Authenticator) contre le secret enregistré
      const codeValid = await verifyTwoFactorCode(user.id, String(otp).trim());
      if (!codeValid) {
        return NextResponse.json(
          { success: false, error: "Code Google Authenticator incorrect ou expiré. Veuillez réessayer." },
          { status: 400 }
        );
      }

      // Session JWT (cookie HttpOnly)
      let sessionToken: string | null = null;
      let sessionExpiresAt: Date | null = null;
      try {
        const session = await createUserSession({ id: user.id, email: user.email }, request);
        sessionToken = session.token;
        sessionExpiresAt = session.expiresAt;
      } catch (e: any) {
        console.warn("[2FA] Impossible de créer la session:", e?.message);
      }

      const response = NextResponse.json({
        success: true,
        message: "Authentification à deux facteurs validée !",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar || "",
          badge: user.badge || "none",
          accountType: user.accountType,
          kycStatus: user.kycStatus || "non_soumis",
          twoFactorEnabled: true,
        },
      });

      if (sessionToken && sessionExpiresAt) {
        setSessionCookie(response, sessionToken, sessionExpiresAt);
      }
      return response;
    }

    // ====== GET-2FA-STATUS ======
    // Retourne l'état 2FA de l'utilisateur connecté (paramètres membre).
    if (body.action === "get-2fa-status") {
      const current = await getCurrentUser(request);
      if (!current) {
        return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
      }
      const enabled = await isTwoFactorEnabled(current.id);
      return NextResponse.json({ twoFactorEnabled: enabled });
    }

    // ====== 2FA-SETUP (Google Authenticator) ======
    // Génère la clé secrète TOTP à afficher dans les Paramètres (QR + clé à copier).
    if (body.action === "2fa-setup") {
      const current = await getCurrentUser(request);
      if (!current) {
        return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
      }
      const { secret, otpauthUrl } = await createTwoFactorSetup(current.id, current.email);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        otpauthUrl
      )}`;
      return NextResponse.json({ success: true, secret, otpauthUrl, qrCodeUrl });
    }

    // ====== TOGGLE-2FA (TOTP Google Authenticator) ======
    // Activation : le code doit correspondre à l'application Google Authenticator
    // (la clé secrète est déjà enregistrée par `2fa-setup`). Désactivation :
    // vérifie le code courant avant de retirer le secret.
    if (body.action === "toggle-2fa") {
      const { enabled, otp } = body;
      const current = await getCurrentUser(request);
      if (!current) {
        return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
      }
      if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
        return NextResponse.json(
          { error: "Le code Google Authenticator doit comporter exactement 6 chiffres." },
          { status: 400 }
        );
      }

      const codeValid = await verifyTwoFactorCode(current.id, String(otp).trim());
      if (!codeValid) {
        return NextResponse.json(
          { error: "Code Google Authenticator incorrect. Vérifiez le code affiché dans votre application." },
          { status: 400 }
        );
      }

      if (enabled) {
        // Conserve le secret (déchiffré) enregistré lors du setup et active la 2FA
        const secret = await getTwoFactorSecret(current.id);
        await saveTwoFactorProfile(current.id, { enabled: true, secret });
        await notifyUser(current.id, {
          title: "2FA activée 🔐",
          message: "L'authentification à deux facteurs est active. Un code Google Authenticator sera demandé à chaque connexion.",
          type: "success",
          linkTab: "member",
        });
      } else {
        await saveTwoFactorProfile(current.id, { enabled: false, secret: "" });
        await notifyUser(current.id, {
          title: "2FA désactivée",
          message: "L'authentification à deux facteurs a été désactivée sur votre compte.",
          type: "info",
          linkTab: "member",
        });
      }

      return NextResponse.json({
        success: true,
        twoFactorEnabled: !!enabled,
        message: enabled
          ? "Authentification à deux facteurs activée. Un code Google Authenticator vous sera demandé à chaque connexion."
          : "Authentification à deux facteurs désactivée.",
      });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur serveur.", details: err.message },
      { status: 500 }
    );
  }
}