// ============================================================
// FORTIA HUB — Migration ciblée : ajout buyer_user_id
// Ajoute la colonne buyer_user_id sur marketplace_orders
// avec la clé étrangère vers users(id) et l'index.
// ============================================================
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquante dans .env.local");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    // 1. Détecter le type réel de users.id (text ou uuid)
    const idType = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'`
    );
    const usersIdType = idType.rows[0]?.data_type || "text";
    console.log(`Type users.id détecté : ${usersIdType}`);

    // 2. Vérifier si la colonne existe déjà
    const existing = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_orders' AND column_name = 'buyer_user_id'`
    );

    if (existing.rows.length === 0) {
      // 3. Ajouter la colonne avec le même type que users.id
      const colType = usersIdType === "uuid" ? "UUID" : "TEXT";
      await client.query(`ALTER TABLE marketplace_orders ADD COLUMN buyer_user_id ${colType}`);
      console.log(`Colonne buyer_user_id (${colType}) ajoutée sur marketplace_orders`);
    } else {
      console.log("Colonne buyer_user_id déjà présente");
    }

    // 4. Créer l'index
    await client.query(
      `CREATE INDEX IF NOT EXISTS marketplace_orders_buyer_user_id_idx ON marketplace_orders(buyer_user_id)`
    );
    console.log("Index marketplace_orders_buyer_user_id_idx créé/vérifié");

    // 5. Créer la contrainte de clé étrangère (si pas déjà présente)
    const fkExists = await client.query(
      `SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'marketplace_orders' AND constraint_name = 'marketplace_orders_buyer_user_id_fkey'`
    );
    if (fkExists.rows.length === 0) {
      await client.query(
        `ALTER TABLE marketplace_orders ADD CONSTRAINT marketplace_orders_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE SET NULL`
      );
      console.log("Clé étrangère marketplace_orders_buyer_user_id_fkey créée");
    } else {
      console.log("Clé étrangère déjà présente");
    }

    console.log("✅ Migration buyer_user_id terminée avec succès");
  } catch (err: any) {
    console.error("❌ Erreur migration :", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();