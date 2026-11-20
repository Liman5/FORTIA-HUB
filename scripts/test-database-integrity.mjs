// ============================================================
// FORTIA HUB — TESTS D'INTÉGRITÉ DE LA BASE (Phase 4)
// ------------------------------------------------------------
// Vérifie les clés étrangères, les règles de suppression, les
// unicités et les cascades. Toutes les écritures sont annulées
// (ROLLBACK) : aucune donnée réelle n'est conservée.
// ============================================================

import crypto from "node:crypto";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    failures.push(`${label} — ${detail}`);
    console.log(`  KO  ${label} — ${detail}`);
  }
}

const id = () => crypto.randomUUID();
const tag = `p4-${Date.now().toString(36)}`;

async function scenario(name, fn) {
  await db.query("BEGIN");
  try {
    await fn();
  } catch (error) {
    failed += 1;
    failures.push(`${name} — ${error.message}`);
    console.log(`  KO  ${name} — ${error.message}`);
  } finally {
    await db.query("ROLLBACK");
  }
}

async function expectDatabaseError(sql, params, code, label) {
  try {
    await db.query(sql, params);
    check(false, label, `aucune erreur (attendu ${code})`);
  } catch (error) {
    check(error.code === code, label, `code=${error.code} attendu=${code}`);
  }
}

console.log("\n=== 1. Structure et contraintes ===");
const fk = await db.query(
  `SELECT conname, confdeltype FROM pg_constraint
   WHERE contype='f' AND connamespace='public'::regnamespace`
);
const fkMap = new Map(fk.rows.map((row) => [row.conname, row.confdeltype]));
check(fk.rows.length >= 64, "Au moins 64 clés étrangères", `n=${fk.rows.length}`);
check(fkMap.get("courses_center_id_fkey") === "n", "courses.center_id → SET NULL");
check(fkMap.get("course_chapters_course_id_fkey") === "c", "course_chapters.course_id → CASCADE");
check(fkMap.get("course_lessons_chapter_id_fkey") === "c", "course_lessons.chapter_id → CASCADE");
check(fkMap.get("products_store_id_fkey") === "n", "products.store_id → SET NULL");
check(fkMap.get("marketplace_order_items_order_id_fkey") === "r", "lignes de commande → RESTRICT");
check(fkMap.get("payment_transactions_order_id_fkey") === "r", "paiements → RESTRICT");
check(fkMap.get("refunds_order_id_fkey") === "r", "remboursements → RESTRICT");
check(fkMap.get("sessions_user_id_fkey") === "c", "sessions.user_id → CASCADE");
check(fkMap.get("course_lesson_progress_lesson_id_fkey") === "c", "progression leçon → CASCADE");

const uniques = await db.query(
  `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
   ('users_email_lower_key','certificates_user_course_key','product_reviews_user_product_key',
    'course_lesson_progress_user_lesson_key','entitlements_user_resource_key')`
);
check(uniques.rows.length === 5, "Cinq unicités métier présentes", `n=${uniques.rows.length}`);

const types = await db.query(
  `SELECT table_name, column_name, data_type FROM information_schema.columns
   WHERE table_schema='public' AND
     ((table_name='sessions' AND column_name IN ('user_id','admin_user_id')) OR
      (table_name='admin_users' AND column_name='id') OR
      (table_name='instructor_commissions' AND column_name='order_id') OR
      (table_name='entitlements' AND column_name='payment_id'))`
);
check(
  types.rows.every((row) => row.data_type === "uuid"),
  "Identifiants réconciliés en UUID",
  JSON.stringify(types.rows)
);

const orphans = await db.query(`
  SELECT
    (SELECT count(*)::int FROM course_chapters c WHERE NOT EXISTS (SELECT 1 FROM courses x WHERE x.id=c.course_id)) AS chapters,
    (SELECT count(*)::int FROM course_lessons l WHERE NOT EXISTS (SELECT 1 FROM course_chapters c WHERE c.id=l.chapter_id)) AS lessons,
    (SELECT count(*)::int FROM course_quizzes q WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id=q.course_id)) AS quizzes,
    (SELECT count(*)::int FROM quiz_options o WHERE NOT EXISTS (SELECT 1 FROM course_quizzes q WHERE q.id=o.quiz_id)) AS options,
    (SELECT count(*)::int FROM course_reviews r WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id=r.course_id)) AS reviews,
    (SELECT count(*)::int FROM sessions s WHERE s.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=s.user_id)) AS sessions,
    (SELECT count(*)::int FROM marketplace_orders o WHERE o.product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id=o.product_id)) AS order_product
`);
check(
  Object.values(orphans.rows[0]).every((value) => value === 0),
  "Aucune donnée orpheline",
  JSON.stringify(orphans.rows[0])
);

console.log("\n=== 2. Unicité e-mail insensible à la casse ===");
await scenario("email_lower_unique", async () => {
  const email = `${tag}-dup@example.invalid`;
  await db.query(
    `INSERT INTO users (id,email,password_hash,name,account_type) VALUES ($1,$2,'x','A','buyer')`,
    [id(), email.toUpperCase()]
  );
  await expectDatabaseError(
    `INSERT INTO users (id,email,password_hash,name,account_type) VALUES ($1,$2,'x','B','buyer')`,
    [id(), email.toLowerCase()],
    "23505",
    "Deux e-mails identiques (casse différente) refusés"
  );
});

console.log("\n=== 3. Suppression d'une commande avec lignes ===");
await scenario("order_restrict", async () => {
  const orderId = id();
  await db.query(
    `INSERT INTO marketplace_orders (id,order_number,buyer_name,buyer_email,store_name,product_title,currency,subtotal_minor,total_minor)
     VALUES ($1,$2,'Test','test@example.invalid','Boutique','Produit','USD',100,100)`,
    [orderId, `${tag}-ORD`]
  );
  await db.query(
    `INSERT INTO marketplace_order_items (id,order_id,item_type,title,unit_price_minor,quantity,total_minor)
     VALUES ($1,$2,'product','Produit',100,1,100)`,
    [id(), orderId]
  );
  await expectDatabaseError(
    `DELETE FROM marketplace_orders WHERE id=$1`,
    [orderId],
    "23503",
    "Commande avec lignes non supprimable (RESTRICT)"
  );
});

console.log("\n=== 4. Cascade formation → contenu, conservation attestation ===");
await scenario("course_cascade", async () => {
  const userId = id();
  const courseId = id();
  const chapterId = id();
  const lessonId = id();
  await db.query(
    `INSERT INTO users (id,email,password_hash,name,account_type) VALUES ($1,$2,'x','Étudiant','buyer')`,
    [userId, `${tag}-student@example.invalid`]
  );
  await db.query(
    `INSERT INTO courses (id,title,slug,category_label,price,is_published) VALUES ($1,'Cours test',$2,'Test',0,true)`,
    [courseId, `${tag}-course`]
  );
  await db.query(
    `INSERT INTO course_chapters (id,course_id,title,display_order) VALUES ($1,$2,'Chapitre',1)`,
    [chapterId, courseId]
  );
  await db.query(
    `INSERT INTO course_lessons (id,chapter_id,title,type,content,display_order) VALUES ($1,$2,'Leçon','article','x',1)`,
    [lessonId, chapterId]
  );
  await db.query(
    `INSERT INTO certificates (id,certificate_number,user_id,course_id,student_name,course_title,category,issue_date,grade,verified)
     VALUES ($1,$2,$3,$4,'Étudiant','Cours test','Test','20 novembre 2026','Bien',true)`,
    [id(), `${tag}-CERT`, userId, courseId]
  );

  await db.query(`DELETE FROM courses WHERE id=$1`, [courseId]);
  const lesson = await db.query(`SELECT count(*)::int AS n FROM course_lessons WHERE id=$1`, [lessonId]);
  const certificate = await db.query(
    `SELECT course_id FROM certificates WHERE user_id=$1`,
    [userId]
  );
  check(lesson.rows[0].n === 0, "Leçons supprimées avec la formation (CASCADE)");
  check(certificate.rows[0]?.course_id === null, "Attestation conservée, cours détaché (SET NULL)");
});

console.log("\n=== 5. Suppression utilisateur : historique préservé ===");
await scenario("user_set_null", async () => {
  const userId = id();
  const storeId = id();
  const productId = id();
  await db.query(
    `INSERT INTO users (id,email,password_hash,name,account_type) VALUES ($1,$2,'x','Vendeur','buyer')`,
    [userId, `${tag}-vendor@example.invalid`]
  );
  await db.query(
    `INSERT INTO stores (id,vendor_id,owner_name,owner_email,name,slug) VALUES ($1,$2,'Vendeur',$3,'Boutique',$4)`,
    [storeId, userId, `${tag}-vendor@example.invalid`, `${tag}-store`]
  );
  await db.query(
    `INSERT INTO products (id,store_id,vendor_id,store_name,title,slug,type_label,price) VALUES ($1,$2,$3,'Boutique','Produit',$4,'PDF',10)`,
    [productId, storeId, userId, `${tag}-product`]
  );

  await db.query(`DELETE FROM users WHERE id=$1`, [userId]);
  const store = await db.query(`SELECT vendor_id FROM stores WHERE id=$1`, [storeId]);
  const product = await db.query(`SELECT vendor_id, store_id FROM products WHERE id=$1`, [productId]);
  check(store.rows[0]?.vendor_id === null, "Boutique conservée sans propriétaire");
  check(product.rows[0]?.vendor_id === null, "Produit conservé sans vendeur");
  check(product.rows[0]?.store_id === storeId, "Lien produit → boutique conservé");
});

console.log("\n=== 6. Paiement → entitlement SET NULL ===");
await scenario("payment_entitlement", async () => {
  const userId = id();
  const orderId = id();
  const paymentId = id();
  const entitlementId = id();
  await db.query(
    `INSERT INTO users (id,email,password_hash,name,account_type) VALUES ($1,$2,'x','Acheteur','buyer')`,
    [userId, `${tag}-buyer@example.invalid`]
  );
  await db.query(
    `INSERT INTO marketplace_orders (id,order_number,buyer_name,buyer_email,store_name,product_title,status,currency,subtotal_minor,total_minor)
     VALUES ($1,$2,'Acheteur',$3,'Boutique','Produit','Paye','USD',100,100)`,
    [orderId, `${tag}-ORD2`, `${tag}-buyer@example.invalid`]
  );
  await db.query(
    `INSERT INTO payment_transactions (id,order_id,user_id,transaction_ref,provider,amount_minor,currency,status)
     VALUES ($1,$2,$3,$4,'sandbox',100,'USD','Valide')`,
    [paymentId, orderId, userId, `${tag}-PAY`]
  );
  await db.query(
    `INSERT INTO entitlements (id,user_id,resource_type,resource_id,status,source,payment_id)
     VALUES ($1,$2,'product','resource','active','order',$3)`,
    [entitlementId, userId, paymentId]
  );

  await db.query(`DELETE FROM payment_transactions WHERE id=$1`, [paymentId]);
  const entitlement = await db.query(
    `SELECT payment_id, status FROM entitlements WHERE id=$1`,
    [entitlementId]
  );
  check(entitlement.rows[0]?.payment_id === null, "Droit conservé, paiement détaché (SET NULL)");
});

console.log(`\n=== RÉSULTAT : ${passed} réussis / ${failed} échoués ===`);
if (failures.length > 0) console.log(failures.map((failure) => ` - ${failure}`).join("\n"));
await db.end();
process.exitCode = failed === 0 ? 0 : 1;

