import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  supabaseSendPasswordReset,
  supabaseEnsureAuthUser,
  isSupabaseAuthConfigured,
} from "@/lib/services/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Body : { email }
 * Envoie un email de réinitialisation via Supabase Auth.
 * Préparé pour être adapté plus tard à l'API Resend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "L'adresse e-mail est obligatoire." }, { status: 400 });
    }

    // 1. Vérifier que le compte existe dans la table users (Supabase)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Aucun compte n'est associé à cette adresse e-mail." },
        { status: 404 }
      );
    }

    // 2. S'assurer que le compte existe aussi dans auth.users (Supabase Auth)
    //    pour que l'email de réinitialisation puisse être envoyé.
    if (isSupabaseAuthConfigured()) {
      try {
        // Mot de passe provisoire (le login reste basé sur la table users)
        const tempPassword = `fh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await supabaseEnsureAuthUser(email, tempPassword);
      } catch (e: any) {
        console.warn("[FORGOT PASSWORD] Création du compte auth.users:", e?.message);
      }
    }

    // 3. Envoi de l'email de réinitialisation par Supabase Auth
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await supabaseSendPasswordReset(email, `${origin}/reset-password`);

    return NextResponse.json({
      success: true,
      message:
        "Un email de réinitialisation vous a été envoyé. Suivez le lien reçu pour définir un nouveau mot de passe.",
    });
  } catch (err: any) {
    console.error("[FORGOT PASSWORD] Erreur:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur lors de l'envoi de l'email de réinitialisation." },
      { status: 500 }
    );
  }
}
