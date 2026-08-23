import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { validateEmailFormat } from "@/lib/utils/authValidation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

// Fallback in-memory (utilisé uniquement si la base Supabase est inaccessible)
let usersStore: Array<{
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  accountType?: string;
  createdAt: string;
}> = [];

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

// GET /api/auth/users - list registered users
export async function GET() {
  return NextResponse.json({
    count: usersStore.length,
    users: usersStore.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      accountType: u.accountType,
      createdAt: u.createdAt,
    })),
  });
}

// POST /api/auth - unified auth endpoint (action-based routing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
        console.warn("[AUTH] Base inaccessible, fallback mémoire:", dbError?.message);
        const existingUser = usersStore.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        );
        if (existingUser) {
          return NextResponse.json(
            {
              available: false,
              error:
                "Refusé : Cette adresse e-mail est déjà inscrite sur la plateforme. Une seule inscription est autorisée par adresse e-mail.",
            },
            { status: 400 }
          );
        }
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

        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: name || normalizedEmail.split("@")[0],
            phone: phone || "",
            accountType: accountType || "buyer",
          },
        });

        return NextResponse.json(
          {
            message: "Inscription réussie !",
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              phone: newUser.phone,
              accountType: newUser.accountType,
            },
          },
          { status: 201 }
        );
      } catch (dbError: any) {
        console.warn("[AUTH] Base inaccessible, fallback mémoire:", dbError?.message);

        // Fallback mémoire
        const existingUser = usersStore.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        );
        if (existingUser) {
          return NextResponse.json(
            {
              error:
                "Refusé : Cette adresse e-mail est déjà inscrite sur la plateforme. Une seule inscription est autorisée par adresse e-mail.",
            },
            { status: 400 }
          );
        }

        const newUser = {
          id: `usr-${Date.now()}`,
          email: normalizedEmail,
          password,
          name: name || normalizedEmail.split("@")[0],
          phone: phone || "",
          accountType: accountType || "buyer",
          createdAt: new Date().toISOString(),
        };
        usersStore.push(newUser);

        return NextResponse.json(
          {
            message: "Inscription réussie !",
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              phone: newUser.phone,
              accountType: newUser.accountType,
            },
          },
          { status: 201 }
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
          usersStore = usersStore.filter((u) => u.email.toLowerCase() !== normalizedEmail);
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
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          return NextResponse.json(
            { error: "Connexion refusée : Adresse e-mail ou mot de passe incorrect." },
            { status: 401 }
          );
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          return NextResponse.json(
            { error: "Connexion refusée : Adresse e-mail ou mot de passe incorrect." },
            { status: 401 }
          );
        }

        return NextResponse.json({
          message: "Connexion réussie !",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            accountType: user.accountType,
          },
        });
      } catch (dbError: any) {
        console.warn("[AUTH] Base inaccessible, fallback mémoire:", dbError?.message);

        // Fallback mémoire
        const user = usersStore.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!user || user.password !== password) {
          return NextResponse.json(
            { error: "Connexion refusée : Adresse e-mail ou mot de passe incorrect." },
            { status: 401 }
          );
        }

        return NextResponse.json({
          message: "Connexion réussie !",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            accountType: user.accountType,
          },
        });
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

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur serveur.", details: err.message },
      { status: 500 }
    );
  }
}