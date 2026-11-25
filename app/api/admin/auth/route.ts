import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { AppError } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";
import { logger } from "@/lib/server/logger";

/** Durée de validité d'une session administrateur : 8 heures. */
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Applique les limites de connexion (IP puis adresse ciblée). */
async function applyLoginRateLimits(req: NextRequest, email: string): Promise<NextResponse | null> {
  try {
    await enforceRateLimit("adminLogin", req);
    await enforceRateLimit("adminLoginEmail", req, `email:${email}`);
    return null;
  } catch (error) {
    if (error instanceof AppError && error.status === 429) {
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }
    throw error;
  }
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * POST /api/admin/auth
 * Authentifie un administrateur (email + mot de passe) et retourne un token
 * de session valable 8 heures.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const limited = await applyLoginRateLimits(req, normalizedEmail);
    if (limited) return limited;

    const admin = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // bcrypt uniquement. Compatibilité TEMPORAIRE avec les comptes historiques
    // hachés en SHA-256 sans sel : si le mot de passe est correct, il est
    // immédiatement re-haché en bcrypt et enregistré (chemin supprimable une
    // fois tous les comptes migrés).
    const storedHash = String(admin.passwordHash || "");
    let passwordOk = false;

    if (
      storedHash.startsWith("$2a$") ||
      storedHash.startsWith("$2b$") ||
      storedHash.startsWith("$2y$")
    ) {
      passwordOk = await bcrypt.compare(password, storedHash);
    } else if (/^[0-9a-f]{64}$/i.test(storedHash)) {
      const candidate = createHash("sha256").update(String(password)).digest("hex");
      if (safeEqualHex(candidate, storedHash)) {
        passwordOk = true;
        const upgraded = await bcrypt.hash(String(password), 10);
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { passwordHash: upgraded },
        });
        logger.info("admin_password_rehashed", { adminId: admin.id });
      }
    }

    if (!passwordOk) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

    await prisma.session.create({
      data: {
        adminUserId: admin.id,
        token,
        expiresAt,
        userAgent: req.headers.get("user-agent") || "",
        ipAddress: req.headers.get("x-forwarded-for") || "",
      },
    });

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
  } catch (error: unknown) {
    logger.error("admin_auth_login_failed", {
      message: (error as Error)?.message,
      name: (error as Error)?.name,
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
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
  } catch (error: unknown) {
    logger.error("admin_auth_verify_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
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
  } catch (error: unknown) {
    logger.error("admin_auth_logout_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

