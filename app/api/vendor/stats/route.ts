import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendor/stats?storeId=…
 * Statistiques RÉELLES de la boutique (propriétaire ou administrateur) :
 *   • événements : vues, clics, ajouts au panier (7 derniers jours + total)
 *   • ventes : commandes, revenus, série quotidienne sur 7 jours
 *   • top produits : par nombre de ventes
 * Aucune donnée fictive : tout provient de la base.
 */
export async function GET(req: NextRequest) {
  const viewer = await getCurrentUser(req).catch(() => null);
  const admin = await requireAdmin(req).catch(() => null);
  if (!viewer && !admin) {
    return jsonSafe({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const storeIdParam = req.nextUrl.searchParams.get("storeId") || "";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Résolution de la boutique : id (UUID), sinon par e-mail du propriétaire.
  let store: { id: string; name: string; ownerEmail: string | null } | null = null;
  if (UUID.test(storeIdParam)) {
    store = await prisma.store
      .findUnique({ where: { id: storeIdParam }, select: { id: true, name: true, ownerEmail: true } })
      .catch(() => null);
  } else if (storeIdParam) {
    store = await prisma.store
      .findFirst({ where: { name: storeIdParam }, select: { id: true, name: true, ownerEmail: true } })
      .catch(() => null);
  }
  if (!store && viewer?.email) {
    store = await prisma.store
      .findFirst({
        where: { ownerEmail: { equals: viewer.email, mode: "insensitive" } },
        select: { id: true, name: true, ownerEmail: true },
      })
      .catch(() => null);
  }
  if (!store) {
    return jsonSafe({ success: true, data: { store: null, events: null, sales: null, topProducts: [] } });
  }

  // Autorisation : propriétaire de la boutique ou administrateur.
  const isOwner =
    !!viewer?.email &&
    !!store.ownerEmail &&
    viewer.email.toLowerCase() === store.ownerEmail.toLowerCase();
  if (!isOwner && !admin) {
    return jsonSafe({ success: false, error: "Accès refusé à cette boutique." }, { status: 403 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [events7d, eventsTotal, orders, topProducts] = await Promise.all([
      prisma.productEvent
        .groupBy({ by: ["eventType"], where: { storeId: store.id, createdAt: { gte: since } }, _count: { _all: true } })
        .catch(() => [] as never[]),
      prisma.productEvent
        .groupBy({ by: ["eventType"], where: { storeId: store.id }, _count: { _all: true } })
        .catch(() => [] as never[]),
      prisma.marketplaceOrder
        .findMany({
          where: { storeId: store.id },
          select: { amountUsd: true, createdAt: true, productTitle: true },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => [] as never[]),
      prisma.product
        .findMany({
          where: { storeId: store.id },
          select: { id: true, title: true, salesCount: true, price: true },
          orderBy: { salesCount: "desc" },
          take: 5,
        })
        .catch(() => [] as never[]),
    ]);

    const toCounts = (rows: { eventType: string; _count: { _all: number } }[]) => ({
      views: rows.find((r) => r.eventType === "view")?._count?._all || 0,
      clicks: rows.find((r) => r.eventType === "click")?._count?._all || 0,
      cartAdds: rows.find((r) => r.eventType === "add_to_cart")?._count?._all || 0,
    });

    // Série quotidienne sur 7 jours (commandes réelles)
    const days: { date: string; orders: number; revenueUsd: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      const dayOrders = (orders as any[]).filter(
        (o) => new Date(o.createdAt).toISOString().slice(0, 10) === key
      );
      days.push({
        date: key,
        orders: dayOrders.length,
        revenueUsd:
          Math.round(dayOrders.reduce((sum, o) => sum + (Number(o.amountUsd) || 0), 0) * 100) / 100,
      });
    }

    return jsonSafe({
      success: true,
      data: {
        store,
        events: { last7d: toCounts(events7d as never[]), total: toCounts(eventsTotal as never[]) },
        sales: {
          ordersCount: (orders as any[]).length,
          revenueUsd:
            Math.round((orders as any[]).reduce((sum, o) => sum + (Number(o.amountUsd) || 0), 0) * 100) / 100,
          days,
        },
        topProducts,
      },
    });
  } catch (error) {
    console.error("[VENDOR STATS] Erreur :", error);
    return jsonSafe({ success: false, error: "Statistiques indisponibles." }, { status: 500 });
  }
}
