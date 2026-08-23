// ============================================================
// FORTIA HUB — VÉRIFICATION CONNEXION SUPABASE (LECTURE SEULE)
// Affiche le nombre d'enregistrements par table réelle.
// Aucune écriture, aucune création, aucune suppression.
// Exécution : npx tsx scripts/check-supabase.ts
// ============================================================
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Charger .env.local explicitement
config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERREUR: DATABASE_URL non trouvé dans .env.local");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase dev self-signed
});

const prisma = new PrismaClient({ adapter });

async function countTable(name: string, fn: () => Promise<number>) {
  try {
    const n = await fn();
    console.log(`  ${name.padEnd(28)} ${String(n).padStart(5)}`);
  } catch (e: any) {
    console.log(`  ${name.padEnd(28)}  ERREUR: ${e.message?.slice(0, 60)}`);
  }
}

async function main() {
  console.log("=========== CONNEXION SUPABASE — LECTURE SEULE ===========");
  console.log("Aucune écriture n'est effectuée.\n");
  console.log("Tables réelles dans Supabase (compteurs) :\n");

  // Utilisateurs & Auth
  await countTable("users", () => prisma.user.count());
  await countTable("admin_users", () => prisma.adminUser.count());
  await countTable("sessions", () => prisma.session.count());
  await countTable("otp_codes", () => prisma.otpCode.count());

  // Académie
  await countTable("course_categories", () => prisma.courseCategory.count());
  await countTable("courses", () => prisma.course.count());
  await countTable("course_chapters", () => prisma.courseChapter.count());
  await countTable("course_lessons", () => prisma.courseLesson.count());
  await countTable("course_enrollments", () => prisma.courseEnrollment.count());
  await countTable("certificates", () => prisma.certificate.count());

  // Marketplace
  await countTable("stores", () => prisma.store.count());
  await countTable("store_payout_info", () => prisma.storePayoutInfo.count());
  await countTable("products", () => prisma.product.count());
  await countTable("marketplace_orders", () => prisma.marketplaceOrder.count());
  await countTable("vendor_applications", () => prisma.vendorApplication.count());
  await countTable("payout_requests", () => prisma.payoutRequest.count());

  // Freelance & Entreprises
  await countTable("freelance_profiles", () => prisma.freelanceProfile.count());
  await countTable("freelance_services", () => prisma.freelanceService.count());
  await countTable("enterprise_profiles", () => prisma.enterpriseProfile.count());

  // KYC / Services / Blog
  await countTable("kyc_submissions", () => prisma.kycSubmission.count());
  await countTable("service_packages", () => prisma.servicePackage.count());
  await countTable("service_quotes", () => prisma.serviceQuote.count());
  await countTable("blog_categories", () => prisma.blogCategory.count());
  await countTable("blog_posts", () => prisma.blogPost.count());

  // Notifications / Contenu / Config
  await countTable("notifications", () => prisma.notification.count());
  await countTable("site_content", () => prisma.siteContent.count());
  await countTable("platform_config", () => prisma.platformConfig.count());
  await countTable("platform_stats", () => prisma.platformStats.count());
  await countTable("payment_gateways", () => prisma.paymentGateway.count());
  await countTable("payment_transactions", () => prisma.paymentTransaction.count());

  // Échantillon : vérifier que les données existantes sont bien lisibles
  console.log("\nÉchantillons (lecture réelle) :\n");

  const users = await prisma.user.findMany({ take: 3, select: { email: true, name: true, accountType: true } });
  console.log("  users (3 premiers):", JSON.stringify(users));

  const courses = await prisma.course.findMany({ take: 3, select: { title: true, isPublished: true } });
  console.log("  courses (3 premiers):", JSON.stringify(courses));

  const products = await prisma.product.findMany({ take: 3, select: { title: true, price: true } });
  console.log("  products (3 premiers):", JSON.stringify(products));

  await prisma.$disconnect();
  console.log("\n=========== VÉRIFICATION TERMINÉE (aucune écriture) ===========");
}

main().catch(async (e: any) => {
  console.error("ERREUR:", e.code || "", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});