// ============================================================
// FORTIA HUB — TEST SOUMISSION CANDIDATURE VENDEUR
// Diagnostique pourquoi submit-vendor-app échoue (DEMANDE REFUSÉE)
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
  console.log("=== TEST SOUMISSION CANDIDATURE VENDEUR ===\n");

  // Simuler exactement ce que fait submit-vendor-app
  try {
    const created = await prisma.vendorApplication.create({
      data: {
        applicantName: "Test Vendeur",
        email: "test.vendor@fortia-hub.com",
        phone: "+221 77 000 00 00",
        storeName: "Test Shop",
        storeCategory: "Formations & Coaching",
        storeDescription: "Test",
        experienceBio: "Test",
        status: "En_attente",
      } as any,
    });
    console.log("✅ Success:", JSON.stringify(created));
  } catch (e: any) {
    console.error("❌ Erreur Prisma:", e.code || "", e.message?.slice(0, 500));
  }

  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});