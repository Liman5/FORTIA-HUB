// Tests HTTP réels de la gestion centralisée des utilisateurs.
// Prérequis : serveur `next start -p 3100` + .env.local.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local") });
const BASE = process.env.BASE_URL || "http://localhost:3100";
const SECRET = process.env.JWT_SECRET || "";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL }) });
const tag = `adm-${Date.now().toString(36)}`;
let passed = 0, failed = 0;
function check(ok, label, detail = "") {
  if (ok) { passed += 1; console.log(`  OK  ${label}`); }
  else { failed += 1; console.log(`  KO  ${label} — ${detail}`); }
}
async function jwt(id, email) {
  return new SignJWT({ email }).setProtectedHeader({ alg: "HS256" }).setSubject(id)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(SECRET));
}
async function sessionUser(label) {
  const user = await prisma.user.create({ data: { email: `${tag}-${label}@example.invalid`, passwordHash: "test", name: `Test ${label}` } });
  const token = await jwt(user.id, user.email);
  await prisma.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600_000) } });
  return { id: user.id, email: user.email, token };
}
async function sessionAdmin(label, role) {
  const admin = await prisma.adminUser.create({ data: { email: `${tag}-${label}@admin.invalid`, passwordHash: "test", name: `Admin ${label}`, role } });
  const token = await jwt(admin.id, admin.email);
  await prisma.session.create({ data: { adminUserId: admin.id, token, expiresAt: new Date(Date.now() + 3600_000) } });
  return { id: admin.id, email: admin.email, token };
}
async function request(method, pathname, token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `fh_session=${token}`;
  }
  const response = await fetch(`${BASE}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: response.status, json };
}
const state = { users: [], admins: [], orders: [] };

try {
  const general = await sessionAdmin("general", "general");
  const finance = await sessionAdmin("finance", "financier");
  const target = await sessionUser("target");
  const other = await sessionUser("other");
  const selfUser = await sessionUser("self");
  state.admins.push(general.id, finance.id);
  state.users.push(target.id, other.id, selfUser.id);

  const order = await prisma.marketplaceOrder.create({
    data: {
      orderNumber: `${tag}-ORD`, buyerName: "Test target", buyerEmail: target.email,
      buyerUserId: target.id, storeName: "FORTIA HUB", productTitle: "Produit test",
      amountUsd: 10, status: "Paye", currency: "USD", totalMinor: 1000,
    },
  });
  state.orders.push(order.id);

  let r = await request("GET", "/api/admin/platform-users");
  check(r.status === 401, "Liste refusée sans authentification", `${r.status}`);
  r = await request("GET", "/api/admin/platform-users", other.token);
  check(r.status === 403, "Liste refusée à un membre", `${r.status}`);
  r = await request("GET", "/api/admin/platform-users", finance.token);
  check(r.status === 403, "Liste refusée à un admin sans permission", `${r.status}`);
  r = await request("GET", `/api/admin/platform-users?q=${encodeURIComponent(target.email)}`, general.token);
  check(r.status === 200 && r.json?.data?.users?.some((u) => u.id === target.id), "Recherche serveur par e-mail", `${r.status}`);
  r = await request("GET", "/api/admin/platform-users?role=member&status=active&page=1&limit=10", general.token);
  check(r.status === 200 && r.json?.data?.pagination?.limit === 10 && typeof r.json?.data?.stats?.total === "number", "Pagination, filtres et statistiques", `${r.status}`);
  r = await request("GET", `/api/admin/platform-users/${target.id}`, general.token);
  check(r.status === 200 && r.json?.data?.user?.purchases?.length >= 1, "Fiche détaillée et historique", `${r.status}`);

  // Mise à jour du profil membre via la même API que l'écran Profil.
  r = await request("POST", "/api/platform/write", other.token, {
    action: "update-profile",
    data: { name: "Membre Modifié", phone: "+22501020304" },
  });
  const updatedOther = await prisma.user.findUnique({ where: { id: other.id }, select: { name: true, phone: true } });
  check(r.status === 200 && updatedOther?.name === "Membre Modifié" && updatedOther?.phone === "+22501020304", "Mise à jour du profil membre", `${r.status}`);

  r = await request("PATCH", `/api/admin/platform-users/${target.id}`, general.token, { action: "suspend", reason: "Test suspension" });
  check(r.status === 200 && r.json?.data?.user?.isActive === false && r.json?.data?.user?.accountStatus === "suspended", "Suspension réelle", `${r.status}`);
  r = await request("GET", "/api/me", target.token);
  check(r.status === 401, "Session refusée après suspension", `${r.status}`);

  r = await request("PATCH", `/api/admin/platform-users/${target.id}`, general.token, { action: "block", reason: "Test blocage" });
  check(r.status === 200 && r.json?.data?.user?.accountStatus === "blocked", "Blocage réel", `${r.status}`);
  r = await request("PATCH", `/api/admin/platform-users/${target.id}`, general.token, { action: "reactivate", reason: "Fin test" });
  check(r.status === 200 && r.json?.data?.user?.isActive === true, "Réactivation", `${r.status}`);

  // Un compte bloqué qui demande une suppression puis l'annule doit rester bloqué.
  r = await request("PATCH", `/api/admin/platform-users/${target.id}`, general.token, { action: "block", reason: "Modération sécurité" });
  check(r.status === 200 && r.json?.data?.user?.accountStatus === "blocked", "Blocage avant demande de suppression", `${r.status}`);
  r = await request("POST", `/api/admin/platform-users/${target.id}/deletion`, general.token, { reason: "Suppression pendant blocage" });
  const blockedDeletionId = r.json?.data?.id;
  r = await request("DELETE", `/api/admin/platform-users/${target.id}/deletion`, general.token, { requestId: blockedDeletionId });
  const restoredBlocked = await prisma.user.findUnique({ where: { id: target.id } });
  check(r.status === 200 && restoredBlocked?.accountStatus === "blocked" && restoredBlocked?.isActive === false, "Annulation restaure le statut bloqué", `${restoredBlocked?.accountStatus}/${restoredBlocked?.isActive}`);
  r = await request("PATCH", `/api/admin/platform-users/${target.id}`, general.token, { action: "reactivate", reason: "Reprise test" });
  check(r.status === 200 && r.json?.data?.user?.accountStatus === "active", "Réactivation après restauration", `${r.status}`);

  r = await request("POST", `/api/admin/platform-users/${target.id}/deletion`, general.token, { reason: "Test suppression admin" });
  check(r.status === 200 && new Date(r.json?.data?.deleteAt).getTime() - Date.now() >= 6.9 * 86400000, "Suppression admin différée 7 jours", `${r.status}`);
  const requestId = r.json?.data?.id;
  r = await request("POST", `/api/admin/platform-users/${target.id}/deletion`, general.token, { reason: "Repeat" });
  check(r.status === 200 && r.json?.data?.alreadyRequested === true, "Demande idempotente", `${r.status}`);
  r = await request("POST", `/api/admin/deletion-requests/${requestId}`, general.token, { action: "process" });
  check(r.status === 409, "Exécution refusée avant le délai", `${r.status}`);
  r = await request("DELETE", `/api/admin/platform-users/${target.id}/deletion`, general.token, { requestId });
  check(r.status === 200 && r.json?.data?.cancelled === true, "Annulation dans le délai", `${r.status}`);
  const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
  check(refreshed?.deletionScheduledFor === null, "Annulation nettoie les dates", String(refreshed?.accountStatus));

  r = await request("POST", "/api/account/deletion", selfUser.token, { email: other.email, reason: "Test self" });
  check(r.status === 200 && new Date(r.json?.data?.deleteAt).getTime() - Date.now() >= 6.9 * 86400000, "Demande utilisateur 7 jours", `${r.status}`);
  const mine = await prisma.pendingDeletion.findFirst({ where: { userId: selfUser.id, status: "pending" } });
  const otherPending = await prisma.pendingDeletion.findFirst({ where: { userId: other.id, status: "pending" } });
  check(!!mine && !otherPending, "Email du body ignoré (session imposée)");
  r = await request("DELETE", "/api/account/deletion", selfUser.token, { requestId: mine?.id });
  check(r.status === 200, "Annulation utilisateur", `${r.status}`);

  r = await request("POST", `/api/admin/platform-users/${target.id}/deletion`, general.token, { reason: "Test exécution" });
  const execId = r.json?.data?.id;
  await prisma.pendingDeletion.update({ where: { id: execId }, data: { deleteAt: new Date(Date.now() - 1000) } });
  r = await request("POST", `/api/admin/deletion-requests/${execId}`, general.token, { action: "process" });
  check(r.status === 200 && r.json?.data?.processed === true, "Exécution après échéance", `${r.status}`);
  const anonymized = await prisma.user.findUnique({ where: { id: target.id } });
  const orderStill = await prisma.marketplaceOrder.findUnique({ where: { id: order.id } });
  check(anonymized?.email.startsWith("deleted+") && anonymized?.accountStatus === "anonymized" && anonymized?.isActive === false, "Anonymisation du compte");
  check(!!orderStill && orderStill.amountUsd.toString() === "10", "Historique financier conservé");
  const logs = await prisma.adminAuditLog.count({ where: { targetUserId: target.id } });
  check(logs >= 4, "Journal d'audit alimenté", String(logs));

  await cleanup();
  console.log(`\nRÉSULTAT: ${passed} réussis / ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
} catch (error) {
  failed += 1;
  console.error("Erreur pendant les tests:", error);
  await cleanup();
  console.log(`\nRÉSULTAT: ${passed} réussis / ${failed} échoués`);
  process.exit(1);
}

async function cleanup() {
  try {
    await prisma.pendingDeletion.deleteMany({ where: { userId: { in: state.users } } });
    await prisma.adminAuditLog.deleteMany({ where: { OR: [{ targetUserId: { in: state.users } }, { actorId: { in: state.admins } }] } });
    await prisma.marketplaceOrder.deleteMany({ where: { id: { in: state.orders } } });
    await prisma.session.deleteMany({ where: { OR: [{ userId: { in: state.users } }, { adminUserId: { in: state.admins } }] } });
    await prisma.user.deleteMany({ where: { id: { in: state.users } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: state.admins } } });
  } catch (error) {
    console.error("Nettoyage partiel:", error);
  } finally {
    await prisma.$disconnect();
  }
}




