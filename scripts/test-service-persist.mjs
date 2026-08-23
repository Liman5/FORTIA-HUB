// Test la persistance réelle d'un service agence en base via Prisma
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL non trouvé");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Créer un service de test
  const created = await prisma.servicePackage.create({
    data: {
      title: "TEST_PERSIST_" + Date.now(),
      category: "Design & Graphisme",
      description: "Service de test pour vérifier la persistance",
      startingPrice: 10,
      estimatedDays: "3 jours",
      iconName: "Briefcase",
      deliverables: ["Livrable test"],
      borderStyle: "gold",
      cardAnimation: "fade-up",
      accentColor: "#D69E25",
      badgeText: "",
      featured: false,
      isActive: true,
      displayOrder: 1,
    },
  });
  console.log("✅ SERVICE CRÉÉ: id =", created.id);

  // 2. Le relire depuis la base pour confirmer
  const read = await prisma.servicePackage.findUnique({ where: { id: created.id } });
  console.log("✅ RELU DEPUIS LA BASE:", read ? read.title : "INTROUVABLE !");

  // 3. Le supprimer (nettoyage)
  await prisma.servicePackage.delete({ where: { id: created.id } });
  console.log("✅ SERVICE SUPPRIMÉ (nettoyage)");
}

main()
  .catch((e) => {
    console.error("❌ ERREUR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());