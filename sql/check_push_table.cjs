// Vérifie que la table push_subscriptions existe et est utilisable
const { config } = require("dotenv");
const path = require("path");
config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'push_subscriptions' ORDER BY ordinal_position"
    );
    console.log("PUSH_TABLE_COLUMNS:");
    res.rows.forEach((r) => console.log("  " + r.column_name + " -> " + r.data_type));
    const cnt = await client.query("SELECT count(*)::int AS c FROM push_subscriptions");
    console.log("PUSH_TABLE_ROWS=" + cnt.rows[0].c);
  } catch (e) {
    console.error("PUSH_TABLE_ERROR", e.message);
  } finally {
    await client.end();
  }
})();
