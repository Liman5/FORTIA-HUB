// ============================================================
// FORTIA HUB — DIAGNOSTIC ENUMS SUPABASE
// Liste les types enum PostgreSQL existants et le type de
// la colonne status de service_quotes.
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
  console.log("=== DIAGNOSTIC ENUMS SUPABASE ===\n");

  const types = await prisma.$queryRawUnsafe(
    "SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname"
  );
  console.log("Enums existants :");
  console.log(JSON.stringify(types, null, 2));

  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'service_quotes' AND column_name = 'status'"
  );
  console.log("\nColonne status de service_quotes :");
  console.log(JSON.stringify(cols, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message?.slice(0, 300));
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});