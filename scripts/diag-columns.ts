// ============================================================
// FORTIA HUB — Vérifie les colonnes des tables formateur
// vs les colonnes attendues par Prisma (prisma/schema.prisma).
// ============================================================
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const EXPECTED: Record<string, string[]> = {
  training_centers: [
    "id", "owner_id", "center_name", "slug", "description", "logo", "banner",
    "status", "is_verified", "fee_paid", "fee_amount_usd", "storage_quota_gb",
    "storage_used_bytes", "pricing_config", "created_at", "updated_at",
  ],
  courses: [
    "id", "title", "slug", "instructor_id", "center_id", "category_id",
    "category_label", "description", "full_description", "level",
    "duration_hours", "lessons_count", "price", "rating", "reviews_count",
    "students_count", "image", "badge", "instructor_name", "instructor_role",
    "instructor_avatar", "learning_outcomes", "is_published", "is_featured",
    "created_at", "updated_at",
  ],
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    for (const [table, expectedCols] of Object.entries(EXPECTED)) {
      const r = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      const actual = r.rows.map((row: any) => row.column_name);
      const missing = expectedCols.filter((c) => !actual.includes(c));
      const extra = actual.filter((c) => !expectedCols.includes(c));
      console.log(`\n=== ${table} (${actual.length} colonnes) ===`);
      console.log(`  Manquantes (attendu mais absent) : ${missing.length ? missing.join(", ") : "AUCUNE ✅"}`);
      console.log(`  Extra (non attendues par Prisma) : ${extra.length ? extra.join(", ") : "AUCUNE ✅"}`);
    }
  } catch (err: any) {
    console.error("❌ Erreur:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();