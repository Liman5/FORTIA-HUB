// ============================================================
// FORTIA HUB — REPLAY DES MIGRATIONS DANS UN SCHÉMA JETABLE
// ------------------------------------------------------------
// Exécute baseline + triggers + phases 2/3/4 dans un schéma
// `migtest` puis ROLLBACK : aucune donnée réelle n'est touchée.
// Vérifie que l'historique complet peut être rejoué sur une base neuve.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const files = [
  "00000000000000_baseline/migration.sql",
  "00000000000001_baseline_triggers/migration.sql",
  "20261120090000_phase2_payments/migration.sql",
  "20261120120000_phase3_academy_progress/migration.sql",
  "20261120150000_phase4_integrity/migration.sql",
  "20261120160000_phase4_order_trigger/migration.sql",
];

function toTestSchema(sql) {
  return sql
    .replaceAll('"public".', '"migtest".')
    .replaceAll("'public'", "'migtest'")
    .replaceAll("ON public.", "ON migtest.")
    .replaceAll("public.", "migtest.")
    .replaceAll('CREATE SCHEMA IF NOT EXISTS "public"', 'CREATE SCHEMA IF NOT EXISTS "migtest"');
}

await db.query("BEGIN");
try {
  await db.query("CREATE SCHEMA IF NOT EXISTS migtest");
  await db.query("SET search_path TO migtest");
  for (const file of files) {
    const fullPath = path.join("prisma/migrations", file);
    const sql = toTestSchema(fs.readFileSync(fullPath, "utf8"));
    process.stdout.write(`Replay ${file}... `);
    await db.query(sql);
    console.log("OK");
  }
  const tables = await db.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='migtest'`
  );
  const fks = await db.query(
    `SELECT count(*)::int AS n FROM pg_constraint
     WHERE contype='f' AND connamespace='migtest'::regnamespace`
  );
  console.log(`Schéma rejoué : ${tables.rows[0].n} tables, ${fks.rows[0].n} clés étrangères.`);
  console.log("MIGRATIONS REPRODUCTIBLES — rollback effectué.");
} catch (error) {
  console.error("\nECHEC DU REPLAY:", error.message);
  console.error("position:", error.position, "detail:", error.detail);
  process.exitCode = 1;
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
