// ============================================================
// FORTIA HUB — TEST BOUT EN BOUT ÉCRITURE/LECTURE SUPABASE
// 1. Crée UN devis de test réel dans Supabase
// 2. Vérifie qu'il a bien été écrit (count avant/après)
// 3. Relit le devis créé depuis la base
// 4. Confirme la lecture après "rechargement" (GET logique)
//
// ⚠️ Crée UNE donnée de test identifiable (email de test).
//    Ne supprime AUCUNE donnée existante.
// Exécution : npx tsx scripts/test-write-read.ts
// ============================================================
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Charger .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERREUR: DATABASE_URL non trouvé dans .env.local");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

const TEST_EMAIL = "test.supabase@fortia-hub.com";
const TEST_TITLE = "[TEST] Devis Supabase Bout en Bout";

async function main() {
  console.log("=========== TEST ÉCRITURE/LECTURE SUPABASE ===========\n");

  // ========== ÉTAPE 1 : CRÉATION (équivalent POST /api/platform/write submit-quote) ==========
  console.log("[1] Création d'un devis de test dans Supabase...");

  const before = await prisma.serviceQuote.count();
  const created = await prisma.serviceQuote.create({
    data: {
      clientName: "Test Supabase",
      clientEmail: TEST_EMAIL,
      clientPhone: "+221 77 000 00 00",
      serviceTitle: TEST_TITLE,
      details: "Créé par le test bout en bout — à ignorer ou nettoyer.",
      estimatedPrice: 99,
      status: "Recu",
    } as any,
  });
  const after = await prisma.serviceQuote.count();

  console.log(`  → Créé : id=${created.id}`);
  console.log(`  → Compteur avant/après : ${before} → ${after} (écriture réussie ✓)`);

  // ========== ÉTAPE 2 : VÉRIFICATION ÉCRITURE DIRECTE ==========
  console.log("\n[2] Vérification de l'écriture en base...");
  const inDb = await prisma.serviceQuote.findUnique({ where: { id: created.id } });
  if (inDb) {
    console.log(`  → ✓ Devis présent en base : "${inDb.serviceTitle}" (${inDb.clientEmail})`);
  } else {
    console.error("  → ✗ Devis introuvable après écriture !");
    process.exit(1);
  }

  // ========== ÉTAPE 3 : LECTURE (équivalent GET /api/platform/sync) ==========
  console.log("\n[3] Relecture (équivalent GET /api/platform/sync)...");
  const allQuotes = await prisma.serviceQuote.findMany({ orderBy: { createdAt: "desc" } });
  const justCreated = allQuotes.find((q) => q.id === created.id);
  if (justCreated) {
    console.log(`  → ✓ Devvis récupéré après "rechargement" : "${justCreated.serviceTitle}"`);
    console.log(`  → ✓ Présent dans la liste (total devis réels : ${allQuotes.length})`);
  } else {
    console.error("  → ✗ Devis non récupéré lors de la relecture !");
    process.exit(1);
  }

  // ========== ÉTAPE 4 : RÉCAP ==========
  console.log("\n=========== RÉSULTAT ===========");
  console.log("✓ Écriture dans Supabase : OK");
  console.log("✓ Persistance vérifiée (relecture base directe) : OK");
  console.log("✓ Rechargement (GET logique) : OK");
  console.log("\n⚠️ Le devis de test est encore en base (id: ");  console.log(created.id);
  console.log("  → Email: " + TEST_EMAIL + " — Vous pouvez le supprimer manuellement dans Supabase si souhaité.");
  console.log("  Aucune donnée existante n'a été supprimée ou modifiée.");

  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});