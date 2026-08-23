// ============================================================
// FORTIA HUB — DRY-RUN du POST /api/platform/sync
// Reproduit EXACTEMENT la logique du POST en mode { dryRun: true }
// sans aucune écriture en base.
// Exécution : npx tsx scripts/dry-run-sync.ts
// ============================================================
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Charger .env.local explicitement (dotenv/config charge .env par défaut)
config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERREUR: DATABASE_URL non trouvé dans .env.local");
  process.exit(1);
}
import { INITIAL_COURSES } from "../lib/data/academyData";
import { INITIAL_STORES, INITIAL_MARKETPLACE_PRODUCTS } from "../lib/data/marketplaceData";

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase dev self-signed
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=========== DRY-RUN — SEED UNIQUEMENT SI VIDE ===========");
  console.log("Aucune écriture ne sera effectuée.\n");

  const results: { created: Record<string, number>; skipped: Record<string, string> } = {
    created: {},
    skipped: {},
  };

  // 1. Catégories
  const categoriesFromMock = Array.from(
    new Map(
      INITIAL_COURSES.map((c) => [c.category, { code: c.category, label: c.categoryLabel || c.category }])
    ).values()
  );
  const catCount = await prisma.courseCategory.count();
  if (catCount === 0) results.created.categories = categoriesFromMock.length;
  else results.skipped.categories = `${catCount} déjà présent(s)`;

  // 2. Cours
  const courseCount = await prisma.course.count();
  if (courseCount === 0) results.created.courses = INITIAL_COURSES.length;
  else results.skipped.courses = `${courseCount} déjà présent(s)`;

  // 3. Boutiques
  const storeCount = await prisma.store.count();
  if (storeCount === 0) results.created.stores = INITIAL_STORES.length;
  else results.skipped.stores = `${storeCount} déjà présent(s)`;

  // 4. Produits
  const productCount = await prisma.product.count();
  if (productCount === 0 && INITIAL_MARKETPLACE_PRODUCTS?.length)
    results.created.products = INITIAL_MARKETPLACE_PRODUCTS.length;
  else results.skipped.products = `${productCount} déjà présent(s)`;

  const totalCreated = Object.values(results.created).reduce((a, b) => a + b, 0);
  const totalSkipped = Object.keys(results.skipped).length;

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        mode: "seedOnlyIfEmpty",
        created: results.created,
        skipped: results.skipped,
        summary: {
          totalCreated,
          totalSkippedTables: totalSkipped,
          note: "Aucune écriture effectuée (dry-run).",
        },
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});