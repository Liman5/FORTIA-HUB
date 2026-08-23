import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ============================================================
// FORTIA HUB — Prisma Client (connexion Supabase / PostgreSQL)
// Prisma 7 nécessite un driver adapter pour se connecter.
// On utilise PrismaPg avec DATABASE_URL.
// Singleton pour éviter les connexions multiples en dev.
// ============================================================

const connectionString = process.env.DATABASE_URL;

// Adapter requis par Prisma 7 (driver PostgreSQL)
// En dev, Supabase utilise un certificat self-signed → on désactive
// la vérification SSL uniquement dans l'environnement de développement.
const adapter = new PrismaPg({
  connectionString,
  ssl:
    process.env.NODE_ENV === "development"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Singleton Prisma pour éviter les connexions multiples en dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;