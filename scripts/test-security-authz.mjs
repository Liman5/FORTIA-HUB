// ============================================================
// FORTIA HUB — TESTS HTTP AUTHENTIFIÉS (sécurité Phase 1)
// Prérequis : serveur `next start -p 3100` + .env.local.
// Exécution : npm run test:security
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local") });
const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const JWT_SECRET = process.env.JWT_SECRET || "";
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL,
  }),
});

const tag = `p1s-${Date.now().toString(36)}`;
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

async function jwtFor(subject, email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function createUser(label, options = {}) {
  const user = await prisma.user.create({
    data: {
      email: `${tag}-${label}@example.invalid`,
      passwordHash: "test-not-used",
      name: `Test ${label}`,
      accountType: options.accountType || "buyer",
      kycStatus: options.kycStatus || "non_soumis",
    },
  });
  const token = await jwtFor(user.id, user.email);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return { id: user.id, email: user.email, token };
}

async function createAdmin(role) {
  const admin = await prisma.adminUser.create({
    data: {
      email: `${tag}-${role}@admin.invalid`,
      passwordHash: "test-not-used",
      name: `Admin ${role}`,
      role,
    },
  });
  const token = await jwtFor(admin.id, admin.email);
  await prisma.session.create({
    data: { adminUserId: admin.id, token, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return { id: admin.id, email: admin.email, token };
}

async function api(action, data, auth = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth.cookie) headers.Cookie = `fh_session=${auth.cookie}`;
  if (auth.bearer) headers.Authorization = `Bearer ${auth.bearer}`;
  const response = await fetch(`${BASE_URL}/api/platform/write`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, data }),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text };
}

async function get(pathname, auth = {}) {
  const headers = {};
  if (auth.cookie) headers.Cookie = `fh_session=${auth.cookie}`;
  if (auth.bearer) headers.Authorization = `Bearer ${auth.bearer}`;
  const response = await fetch(`${BASE_URL}${pathname}`, { headers });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text };
}

const state = {
  users: [],
  admins: [],
  stores: [],
  centers: [],
  courses: [],
  products: [],
  notifications: [],
  payouts: [],
  vendorApps: [],
  kyc: [],
  profiles: [],
};

try {
  // ---------- SETUP ----------
  const owner = await createUser("owner");
  const other = await createUser("other");
  const entitledViewer = await createUser("entitled");
  const contentAdmin = await createUser("content", { accountType: "admin" });
  const financeAdmin = await createAdmin("financier");
  const kycAdmin = await createAdmin("kyc");
  const supervisor = await createAdmin("superviseur");
  state.users.push(owner, other, entitledViewer, contentAdmin);
  state.admins.push(financeAdmin, kycAdmin, supervisor);

  const ownerStore = await prisma.store.create({
    data: {
      vendorId: owner.id,
      ownerName: owner.email,
      ownerEmail: owner.email,
      name: `Boutique ${tag}`,
      slug: `boutique-${tag}`,
      status: "active",
      totalRevenueUsd: 100,
    },
  });
  const otherStore = await prisma.store.create({
    data: {
      vendorId: other.id,
      ownerName: other.email,
      ownerEmail: other.email,
      name: `Boutique other ${tag}`,
      slug: `boutique-other-${tag}`,
      status: "active",
      totalRevenueUsd: 100,
    },
  });
  state.stores.push(ownerStore, otherStore);

  const course = await prisma.course.create({
    data: {
      title: `Cours ${tag}`,
      slug: `cours-${tag}`,
      instructorId: owner.id,
      categoryLabel: "Test",
      price: 50,
      isPublished: true,
      chapters: {
        create: {
          title: "Chapitre",
          lessons: {
            create: {
              title: "Leçon",
              type: "video",
              videoUrl: "https://secret.example/video.mp4",
            },
          },
        },
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });
  state.courses.push(course);
  const lessonId = course.chapters[0]?.lessons[0]?.id;

  const product = await prisma.product.create({
    data: {
      storeId: ownerStore.id,
      vendorId: owner.id,
      storeName: ownerStore.name,
      title: `Produit ${tag}`,
      slug: `produit-${tag}`,
      type: "ebook",
      typeLabel: "Ebook",
      price: 25,
      isPublished: true,
      downloadUrl: "https://secret.example/download.pdf",
    },
  });
  state.products.push(product);
  await prisma.productFile.create({
    data: {
      productId: product.id,
      fileName: "livrable.pdf",
      fileUrl: "https://secret.example/file.pdf",
      fileSize: "1 MB",
      mimeType: "application/pdf",
    },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: owner.id,
      title: "Notification test",
      message: "Réservée au propriétaire",
      type: "info",
      isRead: false,
    },
  });
  state.notifications.push(notification);

  const center = await prisma.trainingCenter.create({
    data: {
      ownerId: owner.id,
      centerName: `Centre ${tag}`,
      slug: `centre-${tag}`,
      status: "pending",
    },
  });
  state.centers.push(center);

  const kyc = await prisma.kycSubmission.create({
    data: {
      applicantType: "freelance",
      applicantId: owner.id,
      applicantName: "Test KYC",
      documentType: "CNI",
      documentNumber: "TEST-1234",
      email: owner.email,
      status: "En_attente",
    },
  });
  state.kyc.push(kyc);

  const reservedAdmin = await createAdmin("reserved");
  state.admins.push(reservedAdmin);
  const reservedRegister = await fetch(`${BASE_URL}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      email: reservedAdmin.email,
      password: "Test1234!",
      name: "Tentative admin",
      accountType: "buyer",
    }),
  });
  check(
    reservedRegister.status === 400,
    "inscription publique d'un e-mail admin refusée",
    `status=${reservedRegister.status}`
  );


  console.log("\n=== 1. Profils et identité ===");
  const selfProfile = await api("update-profile", { name: "Nom modifié" }, { cookie: owner.token });
  check(selfProfile.status === 200, "membre modifie son propre profil", selfProfile.text);
  const foreignProfile = await api(
    "update-profile",
    { id: other.id, name: "Piraté" },
    { cookie: owner.token }
  );
  check(foreignProfile.status === 403, "membre ne modifie pas le profil d'autrui", foreignProfile.text);
  const supervisorWrite = await api(
    "update-profile",
    { name: "Superviseur" },
    { bearer: supervisor.token }
  );
  check(supervisorWrite.status === 403, "superviseur en lecture seule refusé", supervisorWrite.text);

  console.log("\n=== 2. Formations, produits, boutiques, centres ===");
  const foreignCourse = await api(
    "update-course",
    { id: course.id, title: "Piraté" },
    { cookie: other.token }
  );
  check(foreignCourse.status === 403, "autre membre ne modifie pas la formation", foreignCourse.text);
  const ownCourse = await api(
    "update-course",
    { id: course.id, title: "Titre propriétaire" },
    { cookie: owner.token }
  );
  check(ownCourse.status === 200, "propriétaire modifie sa formation", ownCourse.text);
  await prisma.course.update({
    where: { id: course.id },
    data: { rating: 4.5, reviewsCount: 7 },
  });
  const privilegedCourseFields = await api(
    "update-course",
    { id: course.id, rating: 1, reviewsCount: 999, isFeatured: true },
    { cookie: owner.token }
  );
  const courseAfterPrivileged = await prisma.course.findUnique({ where: { id: course.id } });
  check(
    privilegedCourseFields.status === 200 &&
      Number(courseAfterPrivileged?.rating) === 4.5 &&
      courseAfterPrivileged?.reviewsCount === 7 &&
      courseAfterPrivileged?.isFeatured === false,
    "propriétaire ne peut pas modifier note/avis/mise en avant",
    privilegedCourseFields.text
  );

  const foreignProduct = await api(
    "update-product",
    { id: product.id, title: "Piraté" },
    { cookie: other.token }
  );
  check(foreignProduct.status === 403, "autre vendeur ne modifie pas le produit", foreignProduct.text);
  const ownProduct = await api(
    "update-product",
    { id: product.id, title: "Produit propriétaire" },
    { cookie: owner.token }
  );
  check(ownProduct.status === 200, "propriétaire modifie son produit", ownProduct.text);

  const foreignStore = await api(
    "update-store",
    { storeId: otherStore.id, description: "Piraté" },
    { cookie: owner.token }
  );
  check(foreignStore.status === 403, "autre vendeur ne modifie pas la boutique", foreignStore.text);

  const foreignCenter = await api(
    "update-training-center-config",
    { centerId: center.id, description: "Piraté" },
    { cookie: other.token }
  );
  check(foreignCenter.status === 403, "autre membre ne modifie pas le centre", foreignCenter.text);
  const ownCenter = await api(
    "update-training-center-config",
    { centerId: center.id, description: "Mon centre" },
    { cookie: owner.token }
  );
  check(ownCenter.status === 200, "propriétaire modifie son centre", ownCenter.text);

  console.log("\n=== 3. KYC et flags de vérification ===");
  const freelance = await api(
    "update-freelance-profile",
    { name: "Freelance Test" },
    { cookie: owner.token }
  );
  check(freelance.status === 200, "membre crée son profil freelance", freelance.text);
  const profile = await prisma.freelanceProfile.findFirst({ where: { userId: owner.id } });
  state.profiles.push(profile);
  check(profile?.kycVerified === false, "KYC non auto-attribué (freelance)");
  check(profile?.canSellServices === false, "vente non auto-activée (freelance)");

  const kycByFinance = await api(
    "approve-kyc",
    { id: kyc.id },
    { bearer: financeAdmin.token }
  );
  check(kycByFinance.status === 403, "admin finance ne peut pas approuver un KYC", kycByFinance.text);
  const kycByKyc = await api("approve-kyc", { id: kyc.id }, { bearer: kycAdmin.token });
  check(kycByKyc.status === 200, "admin KYC approuve le dossier", kycByKyc.text);

  const kycSubmit = await api(
    "submit-kyc",
    { applicantType: "freelance", firstName: "Test", lastName: "KYC" },
    { cookie: owner.token }
  );
  check(kycSubmit.status === 200, "membre dépose son propre KYC", kycSubmit.text);
  if (kycSubmit.json?.id) state.kyc.push({ id: kycSubmit.json.id });

  console.log("\n=== 4. Finance, retraits, commissions ===");
  const foreignPayout = await api(
    "submit-payout",
    { storeId: otherStore.id, amountUsd: 10 },
    { cookie: owner.token }
  );
  check(foreignPayout.status === 403, "retrait sur la boutique d'autrui refusé", foreignPayout.text);

  const payout = await api(
    "submit-payout",
    { storeId: ownerStore.id, amountUsd: 40, amountFcfa: 1 },
    { cookie: owner.token }
  );
  check(payout.status === 200, "retrait valide créé", payout.text);
  if (payout.json?.id) state.payouts.push({ id: payout.json.id });
  const storedPayout = payout.json?.id
    ? await prisma.payoutRequest.findUnique({ where: { id: payout.json.id } })
    : null;
  check(Number(storedPayout?.amountFcfa) === 24000, "FCFA calculé côté serveur");

  const overBalance = await api(
    "submit-payout",
    { storeId: ownerStore.id, amountUsd: 80 },
    { cookie: owner.token }
  );
  check(overBalance.status === 409, "retrait supérieur au solde refusé", overBalance.text);

  const approveByContent = await api(
    "approve-payout",
    { id: payout.json?.id },
    { bearer: kycAdmin.token }
  );
  check(approveByContent.status === 403, "admin KYC ne peut pas approuver un retrait", approveByContent.text);
  const approveByFinance = await api(
    "approve-payout",
    { id: payout.json?.id },
    { bearer: financeAdmin.token }
  );
  check(approveByFinance.status === 200, "admin finance approuve le retrait", approveByFinance.text);
  const approveAgain = await api(
    "approve-payout",
    { id: payout.json?.id },
    { bearer: financeAdmin.token }
  );
  check(approveAgain.status === 409, "double approbation refusée", approveAgain.text);

  const commissionByKyc = await api(
    "save-commission-rule",
    { scope: "general", mode: "percent", value: 10 },
    { bearer: kycAdmin.token }
  );
  check(commissionByKyc.status === 403, "admin KYC ne peut pas modifier les commissions", commissionByKyc.text);
  const commissionByFinance = await api(
    "save-commission-rule",
    { scope: "general", mode: "percent", value: 10 },
    { bearer: financeAdmin.token }
  );
  check(commissionByFinance.status === 200, "admin finance modifie les commissions", commissionByFinance.text);

  console.log("\n=== 5. Contenus, modération, notifications ===");
  const bannerByKyc = await api(
    "create-banner",
    { title: `Bannière ${tag}` },
    { bearer: kycAdmin.token }
  );
  check(bannerByKyc.status === 403, "admin KYC ne peut pas créer de bannière", bannerByKyc.text);
  const bannerByContent = await api(
    "create-banner",
    { title: `Bannière ${tag}` },
    { cookie: contentAdmin.token }
  );
  check(bannerByContent.status === 200, "admin contenu crée une bannière", bannerByContent.text);

  const foreignNotification = await api(
    "mark-notification-read",
    { id: notification.id },
    { cookie: other.token }
  );
  check(foreignNotification.status === 403, "notification d'autrui refusée", foreignNotification.text);
  const ownNotification = await api(
    "mark-notification-read",
    { id: notification.id },
    { cookie: owner.token }
  );
  check(ownNotification.status === 200, "destinataire lit sa notification", ownNotification.text);

  console.log("\n=== 6. Candidature vendeur : double approbation ===");
  const vendorApp = await api("submit-vendor-app", {
    storeName: `Candidature ${tag}`,
    applicantName: "Candidat Test",
    email: `${tag}-candidat@example.invalid`,
    phone: "+22890000000",
  });
  check(vendorApp.status === 200, "candidature vendeur publique acceptée", vendorApp.text);
  if (vendorApp.json?.id) state.vendorApps.push({ id: vendorApp.json.id });
  const approveVendor = await api(
    "approve-vendor-app",
    { id: vendorApp.json?.id },
    { cookie: contentAdmin.token }
  );
  check(approveVendor.status === 200, "admin contenu approuve la candidature", approveVendor.text);
  const approveVendorAgain = await api(
    "approve-vendor-app",
    { id: vendorApp.json?.id },
    { cookie: contentAdmin.token }
  );
  check(approveVendorAgain.status === 409, "seconde approbation refusée", approveVendorAgain.text);
  if (approveVendor.json?.storeId) state.stores.push({ id: approveVendor.json.storeId });

  console.log("\n=== 7. Fuites de contenus payants ===");
  const anonymousMarket = await get("/api/marketplace");
  const publicProduct = (anonymousMarket.json?.data?.products || []).find(
    (row) => row.id === product.id
  );
  check(!!publicProduct, "produit visible dans la marketplace");
  check(publicProduct?.downloadUrl === undefined, "downloadUrl absent de la marketplace publique");

  const anonymousBootstrap = await get("/api/bootstrap");
  const bootstrapProduct = (anonymousBootstrap.json?.data?.products || []).find(
    (row) => row.id === product.id
  );
  check(bootstrapProduct?.downloadUrl === undefined, "downloadUrl absent du bootstrap public");

  const anonymousCourse = await get(`/api/catalog/course/${course.id}`);
  const anonymousLesson = anonymousCourse.json?.data?.chapters?.[0]?.lessons?.[0];
  check(anonymousCourse.status === 200, "détail formation accessible");
  check(anonymousLesson?.videoUrl === "", "videoUrl masquée sans droit");
  check(anonymousLesson?.content === "", "contenu masqué sans droit");

  await prisma.entitlement.create({
    data: {
      userId: entitledViewer.id,
      resourceType: "course",
      resourceId: course.id,
      status: "active",
      source: "admin",
    },
  });
  const entitledCourse = await get(`/api/catalog/course/${course.id}`, {
    cookie: entitledViewer.token,
  });
  const entitledLesson = entitledCourse.json?.data?.chapters?.[0]?.lessons?.[0];
  check(
    entitledLesson?.videoUrl === "https://secret.example/video.mp4",
    "videoUrl servie au titulaire du droit"
  );

  const anonymousSync = await get("/api/platform/sync");
  check(anonymousSync.status === 401, "platform/sync réservé aux admins", `status=${anonymousSync.status}`);

  const anonymousProductPage = await get(`/product/${product.slug}`);
  check(
    anonymousProductPage.status === 200 && !anonymousProductPage.text.includes("secret.example/file.pdf"),
    "fichier livrable absent de la page produit publique"
  );
} finally {
  // ---------- CLEANUP ----------
  const userIds = state.users.map((user) => user.id).filter(Boolean);
  const adminIds = state.admins.map((admin) => admin.id).filter(Boolean);
  const productIds = state.products.map((row) => row.id).filter(Boolean);
  const courseIds = state.courses.map((row) => row.id).filter(Boolean);
  const centerIds = state.centers.map((row) => row.id).filter(Boolean);

  await prisma.siteBanner.deleteMany({ where: { title: `Bannière ${tag}` } }).catch(() => {});
  await prisma.entitlement.deleteMany({ where: { resourceId: { in: courseIds } } }).catch(() => {});
  await prisma.payoutRequest.deleteMany({
    where: { id: { in: state.payouts.map((row) => row.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.vendorApplication.deleteMany({
    where: { id: { in: state.vendorApps.map((row) => row.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.kycSubmission.deleteMany({
    where: { id: { in: state.kyc.map((row) => row.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.notification.deleteMany({
    where: { id: { in: state.notifications.map((row) => row.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.freelanceProfile.deleteMany({
    where: { id: { in: state.profiles.map((row) => row?.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.product.deleteMany({ where: { id: { in: productIds } } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } }).catch(() => {});
  await prisma.trainingCenter.deleteMany({ where: { id: { in: centerIds } } }).catch(() => {});
  await prisma.store.deleteMany({
    where: { id: { in: state.stores.map((row) => row.id).filter(Boolean) } },
  }).catch(() => {});
  await prisma.session.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { adminUserId: { in: adminIds } }] },
  }).catch(() => {});
  await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  await prisma.$disconnect();
}

console.log(`\n=== RÉSULTAT : ${passed} réussis / ${failed} échoués ===`);
process.exit(failed === 0 ? 0 : 1);






