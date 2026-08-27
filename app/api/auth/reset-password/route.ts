import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  decodeSupabaseToken,
  supabaseUpdatePassword,
} from "@/lib/services/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Body : { accessToken, password }
 * - Valide le token du lien de réinitialisation (Supabase Auth) et met à jour
 *   le mot de passe dans auth.users.
 * - Synchronise la table users (hash bcrypt) pour que la connexion Prisma
 *   fonctionne avec le nouveau mot de passe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = String(body?.accessToken || "");
    const password = String(body?.password || "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide ou expiré." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        {
          error:
            "Le nouveau mot de passe doit contenir au moins 6 caractères, une majuscule et un chiffre.",
        },
        { status: 400 }
      );
    }

    // 1. Mise à jour du mot de passe dans Supabase Auth (valide le token recovery)
    try {
      await supabaseUpdatePassword(accessToken, password);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message || "Lien de réinitialisation invalide ou expiré." },
        { status: 401 }
      );
    }

    // 2. Synchronisation avec la table users (login Prisma + bcrypt)
    const payload = decodeSupabaseToken(accessToken);
    const email = payload?.email || payload?.user_metadata?.email;
    if (email) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez vous connecter.",
    });
  } catch (err: any) {
    console.error("[RESET PASSWORD] Erreur:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur lors de la réinitialisation du mot de passe." },
      { status: 500 }
    );
  }
}
