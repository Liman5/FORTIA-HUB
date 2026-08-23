import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

/**
 * POST /api/admin/auth
 * Authentifie un administrateur (email + mot de passe).
 * Retourne un token de session admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Recherche de l'admin
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Vérification du mot de passe (hash SHA-256 pour compatibilité simple)
    // NOTE : En production, utilisez bcrypt (voir SQL 16 pour le hash bcrypt)
    const passwordHash = createHash("sha256").update(password).digest("hex");
    if (admin.passwordHash !== passwordHash) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Création d'un token de session
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await prisma.session.create({
      data: {
        adminUserId: admin.id,
        token,
        expiresAt,
        userAgent: req.headers.get("user-agent") || "",
        ipAddress: req.headers.get("x-forwarded-for") || "",
      },
    });

    // Mise à jour du dernier login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Erreur d'authentification admin:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth
 * Vérifie la validité d'un token de session admin.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { adminUser: true },
    });

    if (!session || !session.adminUser || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: session.adminUser.id,
        email: session.adminUser.email,
        name: session.adminUser.name,
        role: session.adminUser.role,
      },
    });
  } catch (error: any) {
    console.error("Erreur de vérification admin:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth
 * Déconnecte un administrateur (invalide le token).
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur de déconnexion admin:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
