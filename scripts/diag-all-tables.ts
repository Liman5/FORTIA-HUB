// ============================================================
// FORTIA HUB — Liste toutes les tables en base pour comparer
// avec les modèles Prisma interrogés par /api/platform/sync
// ============================================================
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const r = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    const tables = r.rows.map((row: any) => row.table_name);

    console.log("=== TOUTES LES TABLES EN BASE (" + tables.length + ") ===");
    console.log(tables.join(", "));

    // Tables interrogées par la route sync (prisma models)
    const syncNeeds = [
      "training_centers",
      "instructor_commissions",
      "instructor_storage_purchases",
      "courses",
      "course_categories",
      "stores",
      "products",
      "marketplace_orders",
      "payout_requests",
      "vendor_applications",
      "freelance_profiles",
      "enterprise_profiles",
      "blog_posts",
      "blog_categories",
      "service_packages",
      "service_quotes",
      "post_purchase_support",
      "kyc_submissions",
      "notifications",
      "site_content",
      "registration_fee_config",
      "platform_config",
      "platform_stats",
    ];

    console.log("\n=== BESOINS DE LA ROUTE SYNC ===");
    syncNeeds.forEach((t) => {
      console.log(`  ${tables.includes(t) ? "✅" : "❌ MANQUANTE"} ${t}`);
    });
  } catch (err: any) {
    console.error("❌ Erreur:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();