import fs from "node:fs";
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const functions = await db.query(`
  SELECT DISTINCT p.oid, p.proname
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname = 'public'
  ORDER BY p.proname
`);

const triggers = await db.query(`
  SELECT t.tgname, c.relname AS table_name, pg_get_triggerdef(t.oid) AS definition
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname = 'public'
  ORDER BY c.relname, t.tgname
`);

const chunks = [
  "-- ============================================================",
  "-- FORTIA HUB — BASELINE TRIGGERS & FONCTIONS (base existante)",
  "-- ------------------------------------------------------------",
  "-- Généré depuis la base réelle après la migration Phase 4.",
  "-- Ces objets ne sont pas gérés par Prisma migrate diff car il",
  "-- n'introspecte pas les triggers. Idempotent (DROP/CREATE).",
  "-- ============================================================",
  "",
];

for (const fn of functions.rows) {
  const definition = await db.query("SELECT pg_get_functiondef($1::oid) AS ddl", [fn.oid]);
  chunks.push(definition.rows[0].ddl.trim() + ";", "");
}

for (const trigger of triggers.rows) {
  chunks.push(
    `DROP TRIGGER IF EXISTS ${JSON.stringify(trigger.tgname)} ON public.${JSON.stringify(trigger.table_name)};`,
    trigger.definition.trim() + ";",
    ""
  );
}

const outPath = "prisma/migrations/00000000000001_baseline_triggers/migration.sql";
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, chunks.join("\n"), "utf8");
console.log(`Généré ${outPath} : ${functions.rows.length} fonctions, ${triggers.rows.length} triggers`);
await db.end();
