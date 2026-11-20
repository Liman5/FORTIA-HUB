// ============================================================
// FORTIA HUB — TESTS DE LA PHASE 2 (paiements, entitlements,
// abonnements, remboursements)
// ------------------------------------------------------------
// Prérequis :
//   • serveur démarré : npx next start -p 3100
//   • .env.local : PAYMENTS_SANDBOX_ENABLED=true,
//     SANDBOX_WEBHOOK_SECRET=…, JWT_SECRET, DATABASE_URL
// Le fournisseur « sandbox » ne débite RIEN : les webhooks sont
// signés HMAC par ce script, comme le ferait le fournisseur.
// ============================================================

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local") });
config({ path: path.join(ROOT, ".env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "";
const SANDBOX_SECRET = process.env.SANDBOX_WEBHOOK_SECRET || "";

if (!connectionString) throw new Error("DATABASE_URL manquant");
if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");
if (!SANDBOX_SECRET) throw new Error("SANDBOX_WEBHOOK_SECRET manquant");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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

const tag = `p2-${Date.now().toString(36)}`;
const state = {
  userA: null,
  userB: null,
  tokenA: "",
  tokenB: "",
  adminToken: "",
  adminId: "",
  coursePaid: null,
  courseFree: null,
  product: null,
  plan: null,
  centerA: null,
  centerB: null,
  orderIds: [],
};

async function makeSession(userId, email) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(JWT_SECRET));
  await prisma.session.create({
    data: { userId, token, expiresAt: new Date(Date.now() + 3600_000) },
  });
  return token;
}

async function api(pathname, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Cookie: `fh_session=${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function adminApi(pathname, { method = "GET", body, token = state.adminToken } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

function signSandbox(rawBody) {
  return crypto.createHmac("sha256", SANDBOX_SECRET).update(rawBody).digest("hex");
}

async function sendWebhook(event) {
  const raw = JSON.stringify(event);
  return api("/api/payments/webhook/sandbox", {
    method: "POST",
    body: event,
    headers: { "x-sandbox-signature": signSandbox(raw) },
  });
}

async function entitlementActive(userId, resourceType, resourceId) {
  const row = await prisma.entitlement.findUnique({
    where: {
      userId_resourceType_resourceId: { userId, resourceType, resourceId },
    },
  });
  if (!row || row.status !== "active") return false;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

async function setup() {
  console.log("\n=== SETUP (données de test isolées) ===");
  state.userA = await prisma.user.create({
    data: {
      email: `${tag}-a@example.invalid`,
      passwordHash: "test-not-used",
      name: "Test Paiement A",
      accountType: "buyer",
    },
  });
  state.userB = await prisma.user.create({
    data: {
      email: `${tag}-b@example.invalid`,
      passwordHash: "test-not-used",
      name: "Test Paiement B",
      accountType: "buyer",
    },
  });
  state.tokenA = await makeSession(state.userA.id, state.userA.email);
  state.tokenB = await makeSession(state.userB.id, state.userB.email);

  state.coursePaid = await prisma.course.create({
    data: {
      title: `${tag} Formation payante`,
      slug: `${tag}-paid`,
      categoryLabel: "Test",
      description: "Test",
      price: 12.5,
      isPublished: true,
      instructorId: state.userA.id,
      instructorName: "Test A",
    },
  });
  state.courseFree = await prisma.course.create({
    data: {
      title: `${tag} Formation gratuite`,
      slug: `${tag}-free`,
      categoryLabel: "Test",
      price: 0,
      isPublished: true,
      instructorId: state.userA.id,
    },
  });
  state.product = await prisma.product.create({
    data: {
      title: `${tag} Produit`,
      slug: `${tag}-product`,
      typeLabel: "Test",
      price: 5,
      isPublished: true,
      isApproved: true,
      vendorId: state.userA.id,
      storeName: "Test Store",
    },
  });
  state.plan = await prisma.subscriptionPlan.create({
    data: {
      code: `${tag}-plan`,
      name: "Formule test",
      amountMinor: 999,
      currency: "USD",
      interval: "month",
    },
  });
  state.centerA = await prisma.trainingCenter.create({
    data: {
      ownerId: state.userA.id,
      centerName: `${tag} Centre A`,
      slug: `${tag}-center-a`,
      status: "active",
      feePaid: true,
      storageQuotaGb: 4,
    },
  });
  state.centerB = await prisma.trainingCenter.create({
    data: {
      ownerId: state.userB.id,
      centerName: `${tag} Centre B`,
      slug: `${tag}-center-b`,
      status: "active",
      feePaid: true,
      storageQuotaGb: 4,
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      email: `${tag}-admin@example.invalid`,
      passwordHash: "test-not-used",
      name: "Test Admin",
      role: "general",
      isActive: true,
    },
  });
  state.adminId = admin.id;
  state.adminToken = `admin-${crypto.randomBytes(24).toString("hex")}`;
  await prisma.session.create({
    data: {
      adminUserId: admin.id,
      token: state.adminToken,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  console.log(`  utilisateurs: ${state.userA.id} / ${state.userB.id}`);
  console.log(`  formation payante: ${state.coursePaid.id}`);
  console.log(`  produit: ${state.product.id}`);
}

async function cleanup() {
  console.log("\n=== CLEANUP ===");
  if (cleanup.done) {
    console.log("  Déjà effectué.");
    return;
  }
  cleanup.done = true;
  try {
    const orderIds = state.orderIds.filter(Boolean);
    if (orderIds.length > 0) {
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.marketplaceOrder.deleteMany({ where: { id: { in: orderIds } } });
    }
    const centerIds = [state.centerA?.id, state.centerB?.id].filter(Boolean);
    if (centerIds.length > 0) {
      await prisma.instructorStoragePurchase.deleteMany({
        where: { centerId: { in: centerIds } },
      });
      await prisma.entitlement.deleteMany({
        where: { resourceId: { in: centerIds.map((id) => `center:${id}`) } },
      });
    }
    const userIds = [state.userA?.id, state.userB?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.entitlement.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.course.deleteMany({
        where: { id: { in: [state.coursePaid?.id, state.courseFree?.id].filter(Boolean) } },
      });
      if (state.product?.id) {
        await prisma.product.deleteMany({ where: { id: state.product.id } });
      }
      await prisma.trainingCenter.deleteMany({ where: { id: { in: centerIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (state.plan) {
      await prisma.subscriptionPlan.deleteMany({ where: { id: state.plan.id } });
    }
    if (state.adminId) {
      await prisma.session.deleteMany({ where: { adminUserId: state.adminId } });
      await prisma.adminUser.deleteMany({ where: { id: state.adminId } });
    }
    await prisma.paymentWebhook.deleteMany({
      where: { eventId: { startsWith: `evt-${tag}` } },
    });
    console.log("  Données de test supprimées.");
  } catch (error) {
    console.log("  ATTENTION cleanup partiel:", error?.message);
  }
}

async function run() {
  await setup();
  try {
    console.log("\n=== 1. Moyens de paiement ===");
    const providers = await api("/api/payments/providers");
    const available = providers.json?.data?.available || [];
    check(providers.status === 200 && available.includes("sandbox"), "Sandbox configuré", `body=${providers.text.slice(0, 120)}`);
    check(!available.includes("stripe"), "Stripe indisponible sans clés (aucun faux succès)", `available=${available.join(",")}`);

    console.log("\n=== 2. Commandes & prix serveur ===");
    const anon = await api("/api/payments/checkout", {
      method: "POST",
      body: { items: [{ type: "course", id: state.coursePaid.id }] },
    });
    check(anon.status === 401, "Checkout anonyme → 401", `status=${anon.status}`);

    const checkout = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "course", id: state.coursePaid.id, price: 0.01, amountUsd: 0.01 }],
        buyer: { name: "Test A", email: state.userA.email, phone: "+22890000000" },
      },
    });
    check(checkout.status === 200 && checkout.json?.success, "Checkout formation créé", `body=${checkout.text.slice(0, 160)}`);
    check(checkout.json?.status === "pending", "Statut en attente (pas payé)", `status=${checkout.json?.status}`);
    check(checkout.json?.totalMinor === 1250, "Prix recalculé côté serveur (1250)", `total=${checkout.json?.totalMinor}`);

    const order1 = checkout.json?.orderId;
    const paymentId1 = checkout.json?.paymentId;
    state.orderIds.push(order1);
    check(!(await entitlementActive(state.userA.id, "course", state.coursePaid.id)), "Aucun droit AVANT confirmation");

    console.log("\n=== 3. Webhooks (signature, montant, idempotence) ===");
    const bad = await api("/api/payments/webhook/sandbox", {
      method: "POST",
      body: { id: `evt-${tag}-bad`, type: "payment.succeeded", paymentId: paymentId1, amountMinor: 1250, currency: "USD" },
      headers: { "x-sandbox-signature": "deadbeef" },
    });
    check(bad.status === 400, "Signature invalide → 400", `status=${bad.status}`);
    check(!(await entitlementActive(state.userA.id, "course", state.coursePaid.id)), "Signature invalide : aucun droit");

    const wrong = await sendWebhook({
      id: `evt-${tag}-wrong`,
      type: "payment.succeeded",
      paymentId: paymentId1,
      amountMinor: 1,
      currency: "USD",
    });
    check(wrong.status === 409, "Montant incorrect → 409", `status=${wrong.status} body=${wrong.text.slice(0, 120)}`);
    const pendingPayment = paymentId1
      ? await prisma.paymentTransaction.findUnique({ where: { id: paymentId1 } })
      : null;
    check(pendingPayment?.status === "En_attente", "Paiement toujours en attente après montant incorrect", `status=${pendingPayment?.status}`);
    check(!(await entitlementActive(state.userA.id, "course", state.coursePaid.id)), "Montant incorrect : aucun droit");

    const okEvent = {
      id: `evt-${tag}-ok`,
      type: "payment.succeeded",
      paymentId: paymentId1,
      amountMinor: 1250,
      currency: "USD",
    };
    const ok = await sendWebhook(okEvent);
    check(ok.status === 200 && ok.json?.processed === true, "Webhook valide → 200 traité", `body=${ok.text.slice(0, 160)}`);
    check(await entitlementActive(state.userA.id, "course", state.coursePaid.id), "Droit formation accordé après confirmation");
    const paidOrder = await prisma.marketplaceOrder.findUnique({ where: { id: order1 } });
    check(paidOrder?.status === "Paye", "Commande Paye", `status=${paidOrder?.status}`);

    const duplicate = await sendWebhook(okEvent);
    check(duplicate.status === 200 && duplicate.json?.duplicate === true, "Webhook rejoué → duplicate", `body=${duplicate.text.slice(0, 120)}`);
    const count1 = await prisma.entitlement.count({
      where: { userId: state.userA.id, resourceType: "course", resourceId: state.coursePaid.id },
    });
    check(count1 === 1, "Un seul entitlement (pas de doublon)", `count=${count1}`);

    const concurrent = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        sendWebhook({
          id: `evt-${tag}-c${index}`,
          type: "payment.succeeded",
          paymentId: paymentId1,
          amountMinor: 1250,
          currency: "USD",
        })
      )
    );
    check(
      concurrent.every((result) => result.status === 200),
      "Événements concurrents acceptés",
      concurrent.map((r) => r.status).join(",")
    );
    const count2 = await prisma.entitlement.count({
      where: { userId: state.userA.id, resourceType: "course", resourceId: state.coursePaid.id },
    });
    check(count2 === 1, "Concurrence : toujours un seul entitlement", `count=${count2}`);

    console.log("\n=== 4. Gratuit & produit numérique ===");
    const free = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "course", id: state.courseFree.id }],
        buyer: { name: "Test A", email: state.userA.email },
      },
    });
    check(
      free.json?.status === "paid" && free.json?.totalMinor === 0,
      "Formation gratuite : accès immédiat",
      `body=${free.text.slice(0, 160)}`
    );
    state.orderIds.push(free.json?.orderId);
    check(await entitlementActive(state.userA.id, "course", state.courseFree.id), "Droit gratuit accordé");

    const productCheckout = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "product", id: state.product.id, price: 0, amountUsd: 0 }],
        buyer: { name: "Test A", email: state.userA.email },
      },
    });
    check(productCheckout.json?.totalMinor === 500, "Prix produit serveur (500)", `total=${productCheckout.json?.totalMinor}`);
    state.orderIds.push(productCheckout.json?.orderId);
    const productOrderId = productCheckout.json?.orderId;
    const productWebhook = await sendWebhook({
      id: `evt-${tag}-prod`,
      type: "payment.succeeded",
      paymentId: productCheckout.json?.paymentId,
      amountMinor: 500,
      currency: "USD",
    });
    check(productWebhook.status === 200, "Paiement produit confirmé", `status=${productWebhook.status}`);
    check(await entitlementActive(state.userA.id, "product", state.product.id), "Droit produit accordé");

    const cachedAccess = await prisma.user.findUnique({
      where: { id: state.userA.id },
      select: { enrolledCourseIds: true, purchasedProductIds: true },
    });
    check(
      Boolean(cachedAccess?.enrolledCourseIds?.includes(state.coursePaid.id)),
      "Cache d'affichage formation synchronisé"
    );
    check(
      Boolean(cachedAccess?.purchasedProductIds?.includes(state.product.id)),
      "Cache d'affichage produit synchronisé"
    );

    console.log("\n=== 5. Abonnements ===");
    const subCheckout = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "subscription", planCode: state.plan.code }],
        buyer: { name: "Test A", email: state.userA.email },
      },
    });
    check(subCheckout.json?.totalMinor === 999, "Prix abonnement serveur (999)", `total=${subCheckout.json?.totalMinor}`);
    state.orderIds.push(subCheckout.json?.orderId);
    const subOrderId = subCheckout.json?.orderId;
    const subWebhook = await sendWebhook({
      id: `evt-${tag}-sub`,
      type: "payment.succeeded",
      paymentId: subCheckout.json?.paymentId,
      amountMinor: 999,
      currency: "USD",
    });
    check(subWebhook.status === 200, "Paiement abonnement confirmé", `status=${subWebhook.status}`);
    const subscription = await prisma.subscription.findFirst({ where: { orderId: subOrderId } });
    check(subscription?.status === "active", "Abonnement actif", `status=${subscription?.status}`);
    check(!!subscription?.currentPeriodEnd, "Période de validité définie");
    check(
      await entitlementActive(state.userA.id, "subscription", state.plan.code),
      "Droit abonnement actif"
    );

    const list = await api("/api/subscriptions", { token: state.tokenA });
    check(
      !!list.json?.data?.subscriptions?.some((row) => row.id === subscription?.id),
      "Abonnement listé côté membre",
      `body=${list.text.slice(0, 160)}`
    );

    const cancel = await api("/api/subscriptions", {
      method: "POST",
      token: state.tokenA,
      body: { subscriptionId: subscription?.id },
    });
    check(
      cancel.status === 200 && cancel.json?.data?.cancelAtPeriodEnd === true,
      "Annulation en fin de période",
      `body=${cancel.text.slice(0, 160)}`
    );
    check(cancel.json?.data?.status === "cancelled", "Statut cancelled (accès jusqu'à échéance)", `status=${cancel.json?.data?.status}`);
    check(
      await entitlementActive(state.userA.id, "subscription", state.plan.code),
      "Droit conservé jusqu'à la fin de la période"
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { currentPeriodEnd: new Date(Date.now() - 60_000) },
    });
    const expire = await adminApi("/api/admin/payments/expire", { method: "POST" });
    check(
      expire.status === 200 && Number(expire.json?.data?.subscriptions || 0) >= 1,
      "Expiration exécutée par l'admin",
      `body=${expire.text.slice(0, 160)}`
    );
    const expiredSubscription = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    check(expiredSubscription?.status === "expired", "Abonnement expiré", `status=${expiredSubscription?.status}`);
    check(
      !(await entitlementActive(state.userA.id, "subscription", state.plan.code)),
      "Droit abonnement révoqué après expiration"
    );

    console.log("\n=== 6. Stockage formateur ===");
    const storageCheckout = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "storage", planCode: "storage_10gb", centerId: state.centerA.id }],
      },
    });
    check(storageCheckout.json?.totalMinor === 300, "Prix stockage serveur (300)", `total=${storageCheckout.json?.totalMinor}`);
    state.orderIds.push(storageCheckout.json?.orderId);

    const forbidden = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenA,
      body: {
        provider: "sandbox",
        items: [{ type: "storage", planCode: "storage_10gb", centerId: state.centerB.id }],
      },
    });
    check(forbidden.status === 403, "Stockage d'un centre d'autrui → 403", `status=${forbidden.status}`);

    const storageWebhook = await sendWebhook({
      id: `evt-${tag}-storage`,
      type: "payment.succeeded",
      paymentId: storageCheckout.json?.paymentId,
      amountMinor: 300,
      currency: "USD",
    });
    check(storageWebhook.status === 200, "Paiement stockage confirmé", `status=${storageWebhook.status}`);
    const centerAfter = await prisma.trainingCenter.findUnique({ where: { id: state.centerA.id } });
    check(centerAfter?.storageQuotaGb === 14, "Quota de stockage +10 GB", `quota=${centerAfter?.storageQuotaGb}`);
    const purchase = await prisma.instructorStoragePurchase.findFirst({
      where: { centerId: state.centerA.id },
    });
    check(!!purchase, "Achat de stockage tracé");

    console.log("\n=== 7. Remboursements ===");
    const memberRefund = await adminApi("/api/admin/refunds", {
      method: "POST",
      body: { orderId: productOrderId, reason: "test" },
      token: state.tokenA,
    });
    check(
      [401, 403].includes(memberRefund.status),
      "Membre ne peut pas rembourser → 401/403",
      `status=${memberRefund.status}`
    );

    const partial = await adminApi("/api/admin/refunds", {
      method: "POST",
      body: { orderId: order1, amountMinor: 500, reason: "Remboursement partiel de test" },
    });
    check(
      partial.status === 200 && partial.json?.data?.refund?.status === "succeeded",
      "Remboursement partiel réussi",
      `body=${partial.text.slice(0, 160)}`
    );
    const partialOrder = await prisma.marketplaceOrder.findUnique({ where: { id: order1 } });
    check(partialOrder?.status === "Paye", "Remboursement partiel : commande toujours payée", `status=${partialOrder?.status}`);
    check(
      await entitlementActive(state.userA.id, "course", state.coursePaid.id),
      "Remboursement partiel : droit maintenu"
    );

    const refund = await adminApi("/api/admin/refunds", {
      method: "POST",
      body: { orderId: productOrderId, reason: "Remboursement intégral de test" },
    });
    check(
      refund.status === 200 && refund.json?.data?.refund?.status === "succeeded",
      "Remboursement intégral réussi",
      `body=${refund.text.slice(0, 160)}`
    );
    const refundedOrder = await prisma.marketplaceOrder.findUnique({ where: { id: productOrderId } });
    check(refundedOrder?.status === "Rembourse", "Commande Rembourse", `status=${refundedOrder?.status}`);
    check(
      !(await entitlementActive(state.userA.id, "product", state.product.id)),
      "Droit produit révoqué après remboursement"
    );

    console.log("\n=== 8. Sécurité (aucun contournement) ===");
    const otherStatus = await api(`/api/payments/status/${order1}`, { token: state.tokenB });
    check(otherStatus.status === 403, "Statut d'une commande d'autrui → 403", `status=${otherStatus.status}`);

    const selfGrant = await api("/api/platform/write", {
      method: "POST",
      token: state.tokenB,
      body: {
        action: "sync-user-learning",
        data: {
          enrolledCourseIds: [state.coursePaid.id],
          purchasedProductIds: [state.product.id],
        },
      },
    });
    check(selfGrant.status === 200, "sync-user-learning accepté (progression seulement)", `status=${selfGrant.status}`);
    check(
      !(await entitlementActive(state.userB.id, "course", state.coursePaid.id)),
      "Aucun droit auto-attribué (formation)"
    );
    check(
      !(await entitlementActive(state.userB.id, "product", state.product.id)),
      "Aucun droit auto-attribué (produit)"
    );

    for (const action of [
      "submit-order",
      "register-free-purchase",
      "register-instructor-purchase",
      "pay-training-center-fee",
    ]) {
      const legacy = await api("/api/platform/write", {
        method: "POST",
        token: state.tokenA,
        body: { action, data: { id: order1 } },
      });
      check(legacy.status === 410, `${action} neutralisé → 410`, `status=${legacy.status}`);
    }

    const tamper = await api("/api/payments/checkout", {
      method: "POST",
      token: state.tokenB,
      body: {
        provider: "sandbox",
        items: [{ type: "product", id: state.product.id, price: 0, amountUsd: 0 }],
        buyer: { name: "Test B", email: state.userB.email },
      },
    });
    state.orderIds.push(tamper.json?.orderId);
    check(tamper.json?.totalMinor === 500, "Montant client ignoré (500)", `total=${tamper.json?.totalMinor}`);

    console.log(`\n=== RÉSULTAT : ${passed} réussis / ${failed} échoués ===`);
    if (failures.length > 0) {
      console.log(failures.map((failure) => ` - ${failure}`).join("\n"));
    }
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
  process.exitCode = failed === 0 ? 0 : 1;
}

run().catch(async (error) => {
  console.error("ERREUR FATALE:", error);
  await cleanup();
  await prisma.$disconnect();
  process.exitCode = 1;
});





