// ============================================================
// FORTIA HUB — DIAGNOSTIC CONTENU RÉEL TABLES
// Affiche les enregistrements réels de service_packages, courses,
// products pour identifier d'éventuelles données mock résiduelles.
// Aucune écriture.
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
  console.log("=== DIAGNOSTIC CONTENU RÉEL ===\n");

  const services = await prisma.servicePackage.findMany({ take: 10, select: { id: true, title: true, category: true, startingPrice: true } });
  console.log("service_packages (" + services.length + ") :");
  services.forEach((s: any) => console.log("  -", s.title, "|", s.category, "|", Number(s.startingPrice), "$"));

  const courses = await prisma.course.findMany({ take: 5, select: { id: true, title: true } });
  console.log("\ncourses (" + courses.length + ") :");
  courses.forEach((c: any) => console.log("  -", c.title));

  const products = await prisma.product.findMany({ take: 5, select: { id: true, title: true } });
  console.log("\nproducts (" + products.length + ") :");
  products.forEach((p: any) => console.log("  -", p.title));

  await prisma.$disconnect();
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});