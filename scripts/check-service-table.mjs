import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL manquante"); process.exit(1); }

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'service_packages'
     ORDER BY ordinal_position`
  );
  console.log("COLONNES service_packages:");
  console.log(r.rows.map((x) => x.column_name).join(", "));

  const count = await client.query(`SELECT COUNT(*) FROM service_packages`);
  console.log("\nNOMBRE DE SERVICES:", count.rows[0].count);

  const rows = await client.query(`SELECT id, title, is_active FROM service_packages LIMIT 10`);
  console.log("\nSERVICES EXISTANTS:");
  rows.rows.forEach((r) => console.log(" -", r.id, "|", r.title, "| active:", r.is_active));
} catch (err) {
  console.error("ERR:", err.message);
  process.exit(1);
} finally {
  await client.end();
}