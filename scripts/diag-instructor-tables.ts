// ============================================================
// FORTIA HUB — Diagnostic tables formateur en base
// Vérifie si les tables formateur et colonnes existent réellement.
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
    // 1. Tables formateur attendues
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    const allTables = tables.rows.map((r: any) => r.table_name);
    console.log("Tables présentes touchant le formateur :");
    ["training_centers", "instructor_commissions", "instructor_storage_purchases", "courses", "users"].forEach((t) => {
      console.log(`  ${allTables.includes(t) ? "✅" : "❌ MANQUANTE"} ${t}`);
    });

    // 2. Colonnes courses (instructor_id / center_id)
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'courses'
       ORDER BY ordinal_position`
    );
    const courseCols = cols.rows.map((r: any) => r.column_name);
    console.log("\nColonnes formateur sur courses :");
    ["instructor_id", "center_id"].forEach((c) => {
      console.log(`  ${courseCols.includes(c) ? "✅" : "❌ MANQUANTE"} ${c}`);
    });

    // 3. Test d'insertion minimum sur training_centers (si elle existe)
    if (allTables.includes("training_centers")) {
      const ins = await client.query(
        `INSERT INTO training_centers (center_name, slug, status) VALUES ('Diag Test', 'diag-test-' || floor(random()*1000000)::int, 'pending')
         RETURNING id, center_name, status, fee_paid`
      );
      console.log("\n✅ Insertion training_centers OK :", ins.rows[0]);
      await client.query(`DELETE FROM training_centers WHERE id = $1`, [ins.rows[0].id]);
      console.log("Nettoyé.");
    } else {
      console.log("\n❌ training_centers n'existe pas — le 500 du sync vient de là.");
    }
  } catch (err: any) {
    console.error("❌ Erreur diagnostic:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();