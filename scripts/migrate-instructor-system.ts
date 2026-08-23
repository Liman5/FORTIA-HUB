// ============================================================
// FORTIA HUB — Migration Académie multi-formateurs
// Crée : training_centers, instructor_commissions,
//        instructor_storage_purchases
// Ajoute : courses.instructor_id, courses.center_id
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
    // 1. Colonnes sur courses (idempotent)
    const instructorCol = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='instructor_id'`
    );
    if (instructorCol.rows.length === 0) {
      await client.query(`ALTER TABLE courses ADD COLUMN instructor_id UUID REFERENCES users(id) ON DELETE SET NULL`);
      console.log("✅ courses.instructor_id ajouté");
    }
    const centerCol = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='center_id'`
    );
    if (centerCol.rows.length === 0) {
      await client.query(`ALTER TABLE courses ADD COLUMN center_id UUID`);
      console.log("✅ courses.center_id ajouté");
    }

    // 2. Table training_centers
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_centers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        center_name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        logo TEXT NOT NULL DEFAULT '',
        banner TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
        fee_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 2,
        storage_quota_gb INTEGER NOT NULL DEFAULT 4,
        storage_used_bytes BIGINT NOT NULL DEFAULT 0,
        pricing_config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS training_centers_owner_id_idx ON training_centers(owner_id)`);
    console.log("✅ Table training_centers prête");

    // 3. Table instructor_commissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS instructor_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instructor_id UUID NOT NULL,
        center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
        order_id TEXT,
        course_id UUID,
        course_title TEXT NOT NULL DEFAULT '',
        amount_paid_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
        platform_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
        instructor_earnings_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'En_attente',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS instructor_commissions_instructor_id_idx ON instructor_commissions(instructor_id)`);
    console.log("✅ Table instructor_commissions prête");

    // 4. Table instructor_storage_purchases
    await client.query(`
      CREATE TABLE IF NOT EXISTS instructor_storage_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instructor_id UUID NOT NULL,
        center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
        amount_gb INTEGER NOT NULL,
        amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Paye',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS instructor_storage_purchases_instructor_id_idx ON instructor_storage_purchases(instructor_id)`);
    console.log("✅ Table instructor_storage_purchases prête");

    console.log("🎉 Migration Académie multi-formateurs terminée");
  } catch (err: any) {
    console.error("❌ Erreur migration:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();