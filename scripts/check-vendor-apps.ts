// ============================================================
// FORTIA HUB — Vérifier les candidatures en base
// ============================================================
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
});

async function main() {
  console.log("=== CANDIDATURES EN BASE ===\n");
  const apps = await prisma.vendorApplication.findMany({ take: 10, orderBy: { submittedAt: "desc" } });
  console.log("Total : " + apps.length);
  apps.forEach((a: any) =>
    console.log("  -", a.storeName, "|", a.email, "|", a.status, "|", a.submittedAt)
  );
  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});