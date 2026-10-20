import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ============================================================
// FORTIA HUB — Prisma Client (connexion Supabase / PostgreSQL)
// Prisma 7 nécessite un driver adapter pour se connecter.
// On utilise PrismaPg avec DATABASE_URL.
// Singleton pour éviter les connexions multiples en dev.
// ============================================================

const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

// Adapter requis par Prisma 7 (driver PostgreSQL)
// En dev, Supabase utilise un certificat self-signed → on désactive
// la vérification SSL uniquement dans l'environnement de développement.
const adapter = new PrismaPg({
  connectionString,
  ssl:
    process.env.NODE_ENV === "development"
      ? { rejectUnauthorized: false }
      : undefined,
  // Pool borné : au démarrage, l'app demande plusieurs domaines en parallèle.
  // Sans limite explicite, le pool sature et Prisma renvoie P2039
  // (« Timed out fetching a new connection from the connection pool »).
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
  keepAlive: true,
});

// ============================================================
// Journalisation Prisma
// ------------------------------------------------------------
// Par défaut : uniquement les ERREURS (les requêtes SQL ne sont plus
// affichées dans la console de `npm run dev`).
// Pour les voir ponctuellement pendant un diagnostic :
//   PRISMA_LOG_QUERIES=true   dans .env.local
// ============================================================
const prismaLog: ("query" | "info" | "warn" | "error")[] =
  process.env.PRISMA_LOG_QUERIES === "true"
    ? ["query", "warn", "error"]
    : ["error"];

// Singleton Prisma pour éviter les connexions multiples en dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: prismaLog,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;