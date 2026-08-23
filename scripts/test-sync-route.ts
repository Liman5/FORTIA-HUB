// ============================================================
// FORTIA HUB — Reproduit EXACTEMENT les requêtes de GET /api/platform/sync
// pour identifier la requête qui plante (cause du 500).
// ============================================================
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function safe(label: string, fn: () => Promise<any>) {
  try {
    const r = await fn();
    const count = Array.isArray(r) ? r.length : r ? 1 : 0;
    console.log(`✅ ${label} → ${count}`);
    return r;
  } catch (e: any) {
    console.log(`❌ ${label} → ERREUR: ${e?.message || e}`);
  }
}

async function main() {
  // ========== FORMATIONS & ACADÉMIE ==========
  await safe("trainingCenter.findMany", () => prisma.trainingCenter.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("instructorCommission.findMany", () => prisma.instructorCommission.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("instructorStoragePurchase.findMany", () => prisma.instructorStoragePurchase.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("course.findMany (avec chapitres/quiz)", () => prisma.course.findMany({
    include: {
      category: true,
      chapters: { orderBy: { displayOrder: "asc" }, include: { lessons: { orderBy: { displayOrder: "asc" } } } },
      quizzes: { orderBy: { displayOrder: "asc" }, include: { options: true } },
    },
    orderBy: { createdAt: "desc" },
  }));
  await safe("courseCategory.findMany", () => prisma.courseCategory.findMany({ orderBy: { displayOrder: "asc" } }));

  // ========== MARKETPLACE ==========
  await safe("store.findMany", () => prisma.store.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("product.findMany", () => prisma.product.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("marketplaceOrder.findMany", () => prisma.marketplaceOrder.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("payoutRequest.findMany", () => prisma.payoutRequest.findMany({ orderBy: { requestedAt: "desc" } }));
  await safe("vendorApplication.findMany", () => prisma.vendorApplication.findMany({ orderBy: { submittedAt: "desc" } }));

  // ========== FREELANCE & ENTREPRISES ==========
  await safe("freelanceProfile.findMany", () => prisma.freelanceProfile.findMany({ include: { services: true, portfolio: true } }));
  await safe("enterpriseProfile.findMany", () => prisma.enterpriseProfile.findMany({ include: { team: true, portfolio: true, services: true } }));

  // ========== BLOG ==========
  await safe("blogPost.findMany", () => prisma.blogPost.findMany({ include: { blogCategory: true }, orderBy: { date: "desc" } }));
  await safe("blogCategory.findMany", () => prisma.blogCategory.findMany());

  // ========== SERVICES & SUPPORT ==========
  await safe("servicePackage.findMany", () => prisma.servicePackage.findMany({ include: { options: true } }));
  await safe("serviceQuote.findMany", () => prisma.serviceQuote.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("postPurchaseSupport.findMany", () => prisma.postPurchaseSupport.findMany({ orderBy: { submittedAt: "desc" } }));
  await safe("kycSubmission.findMany", () => prisma.kycSubmission.findMany({ orderBy: { submittedAt: "desc" } }));

  // ========== NOTIFICATIONS & CONTENU ==========
  await safe("notification.findMany", () => prisma.notification.findMany({ orderBy: { createdAt: "desc" } }));
  await safe("siteContent.findMany", () => prisma.siteContent.findMany());

  // ========== CONFIG ==========
  await safe("registrationFeeConfig.findFirst", () => prisma.registrationFeeConfig.findFirst());
  await safe("platformConfig.findMany", () => prisma.platformConfig.findMany());
  await safe("platformStats.findFirst", () => prisma.platformStats.findFirst());

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur globale:", e?.message || e);
  await prisma.$disconnect();
  process.exit(1);
});