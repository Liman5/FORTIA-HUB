import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local") });
const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const tag = `p6-${Date.now().toString(36)}`;
let passed = 0;
let failed = 0;
function check(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.log(`  KO  ${label} — ${detail}`);
  }
}
async function api(action, data, token) {
  const response = await fetch(`${BASE_URL}/api/platform/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `fh_session=${token}` },
    body: JSON.stringify({ action, data }),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text };
}

const user = await prisma.user.create({
  data: {
    email: `${tag}@example.invalid`,
    passwordHash: "test-not-used",
    name: "Formateur Phase 6",
    accountType: "buyer",
  },
});
const token = await new SignJWT({ email: user.email })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(user.id)
  .setIssuedAt()
  .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
  .sign(new TextEncoder().encode(JWT_SECRET));
await prisma.session.create({
  data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3_600_000) },
});

let courseId = "";
let storeId = "";
let productId = "";
try {
  const store = await prisma.store.create({
    data: {
      vendorId: user.id,
      ownerName: "Formateur Phase 6",
      ownerEmail: user.email,
      name: `Boutique ${tag}`,
      slug: `boutique-${tag}`,
      status: "pending",
    },
    select: { id: true },
  });
  storeId = store.id;

  const created = await api(
    "submit-course-by-instructor",
    {
      title: `TEST P6 ${tag}`,
      price: 12,
      chapters: [{ title: "Chapitre A", lessons: [{ title: "Leçon A", type: "video" }] }],
      quiz: [{ question: "Q1 ?", options: ["A", "B"], correctAnswer: 1 }],
    },
    token
  );
  courseId = String(created.json?.id || "");
  check(created.status === 200 && !!courseId, "création formation via service", created.text);

  const stored = courseId
    ? await prisma.course.findUnique({
        where: { id: courseId },
        include: { chapters: { include: { lessons: true } }, quizzes: { include: { options: true } } },
      })
    : null;
  check(!!stored, "formation persistée");
  check(stored?.chapters.length === 1, "un chapitre créé");
  check(stored?.chapters[0]?.lessons.length === 1, "une leçon créée");
  check(stored?.quizzes.length === 1, "un quiz créé");
  check(stored?.quizzes[0]?.options.length === 2, "deux options de quiz");

  const updated = await api(
    "update-course",
    {
      id: courseId,
      title: `TEST P6 MAJ ${tag}`,
      chapters: [{ title: "Chapitre B", lessons: [{ title: "Leçon B" }] }],
      quiz: [],
    },
    token
  );
  check(updated.status === 200, "mise à jour formation via service", updated.text);
  const afterUpdate = await prisma.course.findUnique({
    where: { id: courseId },
    include: { chapters: { include: { lessons: true } }, quizzes: true },
  });
  check(afterUpdate?.title === `TEST P6 MAJ ${tag}`, "titre mis à jour");
  check(afterUpdate?.chapters.length === 1, "chapitres remplacés (1)");
  check(afterUpdate?.chapters[0]?.lessons[0]?.title === "Leçon B", "leçon remplacée");
  check(afterUpdate?.quizzes.length === 0, "quiz remplacés (0)");

  const deleted = await api("delete-course", { id: courseId }, token);
  check(deleted.status === 200 && deleted.json?.archived === true, "archivage + suppression", deleted.text);
  const gone = await prisma.course.findUnique({ where: { id: courseId } });
  check(gone === null, "formation supprimée");
  const archive = await prisma.dataArchive.findFirst({
    where: { tableName: "courses", recordId: courseId },
  });
  check(!!archive, "snapshot d'archive présent");

  // ---- Marketplace : création et mise à jour d'un produit via service ----
  const product = await api(
    "create-product",
    {
      storeId,
      title: `Produit P6 ${tag}`,
      price: 9,
      type: "ebook",
      typeLabel: "Ebook",
    },
    token
  );
  productId = String(product.json?.id || "");
  check(product.status === 200 && !!productId, "création produit via service", product.text);

  const storedProduct = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : null;
  check(storedProduct?.title === `Produit P6 ${tag}`, "produit persisté");
  check(storedProduct?.vendorId === user.id, "vendeur imposé par la session");
  check(storedProduct?.storeId === storeId, "produit rattaché à la boutique");

  const productUpdate = await api(
    "update-product",
    { id: productId, title: `Produit P6 MAJ ${tag}`, price: 11 },
    token
  );
  check(productUpdate.status === 200, "mise à jour produit via service", productUpdate.text);
  const updatedProduct = await prisma.product.findUnique({ where: { id: productId } });
  check(updatedProduct?.title === `Produit P6 MAJ ${tag}`, "titre produit mis à jour");
  check(Number(updatedProduct?.price) === 11, "prix produit mis à jour");
} finally {
  if (productId) await prisma.product.deleteMany({ where: { id: productId } }).catch(() => {});
  if (storeId) await prisma.store.deleteMany({ where: { id: storeId } }).catch(() => {});
  if (courseId) {
    await prisma.dataArchive.deleteMany({ where: { tableName: "courses", recordId: courseId } });
    await prisma.courseChapter.deleteMany({ where: { courseId } }).catch(() => {});
    await prisma.course.deleteMany({ where: { id: courseId } }).catch(() => {});
  }
  await prisma.courseCategory.findMany({ where: { code: `test-${tag}` } }).then(async (rows) => {
    for (const row of rows) await prisma.courseCategory.delete({ where: { id: row.id } });
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}

console.log(`\n=== RÉSULTAT : ${passed} réussis / ${failed} échoués ===`);
process.exit(failed === 0 ? 0 : 1);
