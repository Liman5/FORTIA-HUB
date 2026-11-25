// ============================================================
// FORTIA HUB — ANALYTICS VENDEUR & FORMATEUR (données réelles)
// ------------------------------------------------------------
// Toutes les valeurs proviennent de la base :
//   • marketplace_orders  → ventes, revenus, commandes
//   • product_events      → vues, clics, ajouts au panier
//   • courses / enrollments → formations et inscriptions
// Aucune donnée inventée : une série vide reste à zéro.
// ============================================================

import { prisma } from "@/lib/prisma";
import type {
  ProductAnalytics,
  RecentOrder,
  SellerOverview,
  TopItem,
  TrendPoint,
} from "@/lib/data/analyticsTypes";

export type { ProductAnalytics, RecentOrder, SellerOverview, TopItem, TrendPoint };

const RANGE_DAYS = 30;

function startOfRange(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (RANGE_DAYS - 1));
  return date;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptySeries(): TrendPoint[] {
  const points: TrendPoint[] = [];
  const start = startOfRange();
  for (let index = 0; index < RANGE_DAYS; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    points.push({ date: dayKey(day), orders: 0, revenue: 0, views: 0 });
  }
  return points;
}

function seriesMap(points: TrendPoint[]): Map<string, TrendPoint> {
  return new Map(points.map((point) => [point.date, point]));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Vue d'ensemble d'une boutique (vendeur connecté). */
export async function getVendorOverview(userId: string, email: string): Promise<SellerOverview> {
  const since = startOfRange();

  const stores = await prisma.store
    .findMany({
      where: {
        OR: [{ vendorId: userId }, { ownerEmail: { equals: email, mode: "insensitive" } }],
      },
      select: { id: true, name: true },
    })
    .catch(() => []);
  const storeIds = stores.map((store) => store.id);

  const products = await prisma.product
    .findMany({
      where:
        storeIds.length > 0
          ? { OR: [{ vendorId: userId }, { storeId: { in: storeIds } }] }
          : { vendorId: userId },
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        typeLabel: true,
        salesCount: true,
      },
    })
    .catch(() => []);
  const productIds = products.map((product) => product.id);

  const orders = await prisma.marketplaceOrder
    .findMany({
      where: {
        OR: [
          ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
          ...(productIds.length > 0 ? [{ productId: { in: productIds } }] : []),
        ],
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        buyerName: true,
        productId: true,
        productTitle: true,
        amountUsd: true,
        vendorEarningsUsd: true,
        status: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  const events = productIds.length
    ? await prisma.productEvent
        .findMany({
          where: { productId: { in: productIds }, createdAt: { gte: since } },
          select: { productId: true, eventType: true, createdAt: true },
        })
        .catch(() => [])
    : [];

  const paidOrders = orders.filter((order) => order.status === "Paye");
  const series = emptySeries();
  const byDay = seriesMap(series);

  for (const order of paidOrders) {
    const point = byDay.get(dayKey(order.createdAt));
    if (!point) continue;
    point.orders += 1;
    point.revenue += Number(order.amountUsd) || 0;
  }

  const perProduct = new Map<string, { views: number; clicks: number; carts: number }>();
  for (const event of events) {
    const key = String(event.productId || "");
    if (!key) continue;
    const entry = perProduct.get(key) || { views: 0, clicks: 0, carts: 0 };
    if (event.eventType === "view") entry.views += 1;
    else if (event.eventType === "click") entry.clicks += 1;
    else if (event.eventType === "add_to_cart") entry.carts += 1;
    perProduct.set(key, entry);
    if (event.eventType === "view") {
      const point = byDay.get(dayKey(event.createdAt));
      if (point) point.views += 1;
    }
  }

  const soldByProduct = new Map<string, { units: number; revenue: number }>();
  for (const order of paidOrders) {
    const key = String(order.productId || "");
    if (!key) continue;
    const entry = soldByProduct.get(key) || { units: 0, revenue: 0 };
    entry.units += 1;
    entry.revenue += Number(order.amountUsd) || 0;
    soldByProduct.set(key, entry);
  }

  const topItems: TopItem[] = products
    .map((product) => {
      const stats = perProduct.get(product.id) || { views: 0, clicks: 0, carts: 0 };
      const sold = soldByProduct.get(product.id) || { units: 0, revenue: 0 };
      return {
        id: product.id,
        title: product.title,
        image: product.image || "",
        price: Number(product.price) || 0,
        sales: sold.units || Number(product.salesCount) || 0,
        revenue: round2(sold.revenue),
        views: stats.views,
        clicks: stats.clicks,
        carts: stats.carts,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.views - a.views)
    .slice(0, 8);

  const totals = {
    views: [...perProduct.values()].reduce((sum, item) => sum + item.views, 0),
    clicks: [...perProduct.values()].reduce((sum, item) => sum + item.clicks, 0),
    carts: [...perProduct.values()].reduce((sum, item) => sum + item.carts, 0),
  };
  const amount = paidOrders.reduce((sum, order) => sum + (Number(order.amountUsd) || 0), 0);
  const earnings = paidOrders.reduce((sum, order) => sum + (Number(order.vendorEarningsUsd) || 0), 0);

  const categoryMap = new Map<string, number>();
  for (const product of products) {
    const label = String(product.typeLabel || "Autres");
    categoryMap.set(label, (categoryMap.get(label) || 0) + 1);
  }

  return {
    role: "vendor",
    currency: "USD",
    kpis: {
      revenue: round2(amount),
      earnings: round2(earnings),
      orders: paidOrders.length,
      items: products.length,
      views: totals.views,
      clicks: totals.clicks,
      carts: totals.carts,
      students: 0,
    },
    funnel: { views: totals.views, clicks: totals.clicks, carts: totals.carts, orders: paidOrders.length },
    series,
    topItems,
    recentOrders: orders.slice(0, 10).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      productTitle: order.productTitle,
      amount: round2(Number(order.amountUsd) || 0),
      earnings: round2(Number(order.vendorEarningsUsd) || 0),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
    categories: [...categoryMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

/** Vue d'ensemble d'un formateur / centre de formation. */
export async function getInstructorOverview(userId: string): Promise<SellerOverview> {
  const since = startOfRange();

  const centers = await prisma.trainingCenter
    .findMany({ where: { ownerId: userId }, select: { id: true } })
    .catch(() => []);
  const centerIds = centers.map((center) => center.id);

  const courses = await prisma.course
    .findMany({
      where:
        centerIds.length > 0
          ? { OR: [{ instructorId: userId }, { centerId: { in: centerIds } }] }
          : { instructorId: userId },
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        categoryLabel: true,
        studentsCount: true,
      },
    })
    .catch(() => []);
  const courseIds = courses.map((course) => course.id);

  const orders = courseIds.length
    ? await prisma.marketplaceOrder
        .findMany({
          where: { productId: { in: courseIds }, createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            buyerName: true,
            productId: true,
            productTitle: true,
            amountUsd: true,
            vendorEarningsUsd: true,
            status: true,
            createdAt: true,
          },
        })
        .catch(() => [])
    : [];

  const enrollments = courseIds.length
    ? await prisma.courseEnrollment
        .findMany({
          where: { courseId: { in: courseIds }, enrolledAt: { gte: since } },
          select: { courseId: true, enrolledAt: true },
        })
        .catch(() => [])
    : [];

  const paidOrders = orders.filter((order) => order.status === "Paye");
  const series = emptySeries();
  const byDay = seriesMap(series);

  for (const order of paidOrders) {
    const point = byDay.get(dayKey(order.createdAt));
    if (!point) continue;
    point.orders += 1;
    point.revenue += Number(order.amountUsd) || 0;
  }
  // Série « inscriptions » : réutilise le champ views (aucune vue de cours
  // n'est enregistrée en base pour le moment).
  for (const enrollment of enrollments) {
    const point = byDay.get(dayKey(enrollment.enrolledAt));
    if (point) point.views += 1;
  }

  const soldByCourse = new Map<string, { units: number; revenue: number }>();
  for (const order of paidOrders) {
    const key = String(order.productId || "");
    if (!key) continue;
    const entry = soldByCourse.get(key) || { units: 0, revenue: 0 };
    entry.units += 1;
    entry.revenue += Number(order.amountUsd) || 0;
    soldByCourse.set(key, entry);
  }

  const enrolledByCourse = new Map<string, number>();
  for (const enrollment of enrollments) {
    enrolledByCourse.set(enrollment.courseId, (enrolledByCourse.get(enrollment.courseId) || 0) + 1);
  }

  const topItems: TopItem[] = courses
    .map((course) => {
      const sold = soldByCourse.get(course.id) || { units: 0, revenue: 0 };
      return {
        id: course.id,
        title: course.title,
        image: course.image || "",
        price: Number(course.price) || 0,
        sales: Number(course.studentsCount) || sold.units,
        revenue: round2(sold.revenue),
        views: enrolledByCourse.get(course.id) || 0,
        clicks: 0,
        carts: 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales)
    .slice(0, 8);

  const amount = paidOrders.reduce((sum, order) => sum + (Number(order.amountUsd) || 0), 0);
  const earnings = paidOrders.reduce((sum, order) => sum + (Number(order.vendorEarningsUsd) || 0), 0);
  const studentsTotal = courses.reduce((sum, course) => sum + (Number(course.studentsCount) || 0), 0);

  const categoryMap = new Map<string, number>();
  for (const course of courses) {
    const label = String(course.categoryLabel || "Autres");
    categoryMap.set(label, (categoryMap.get(label) || 0) + 1);
  }

  return {
    role: "instructor",
    currency: "USD",
    kpis: {
      revenue: round2(amount),
      earnings: round2(earnings),
      orders: paidOrders.length,
      items: courses.length,
      views: enrollments.length,
      clicks: 0,
      carts: 0,
      students: studentsTotal,
    },
    funnel: {
      views: enrollments.length,
      clicks: 0,
      carts: 0,
      orders: paidOrders.length,
    },
    series,
    topItems,
    recentOrders: orders.slice(0, 10).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      productTitle: order.productTitle,
      amount: round2(Number(order.amountUsd) || 0),
      earnings: round2(Number(order.vendorEarningsUsd) || 0),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
    categories: [...categoryMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}


// ============================================================
// STATISTIQUES DÉTAILLÉES D'UN PRODUIT (propriétaire uniquement)
// ============================================================

/** Analyse d'un produit : réservée à son vendeur (ou au propriétaire de la boutique). */
export async function getProductAnalytics(
  userId: string,
  email: string,
  productId: string
): Promise<ProductAnalytics | null> {
  const product = await prisma.product
    .findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        typeLabel: true,
        isPublished: true,
        vendorId: true,
        storeId: true,
      },
    })
    .catch(() => null);
  if (!product) return null;

  let allowed = !!product.vendorId && product.vendorId === userId;
  if (!allowed && product.storeId) {
    const store = await prisma.store
      .findUnique({ where: { id: product.storeId }, select: { vendorId: true, ownerEmail: true } })
      .catch(() => null);
    allowed =
      (!!store?.vendorId && store.vendorId === userId) ||
      (!!store?.ownerEmail && store.ownerEmail.toLowerCase() === String(email || "").toLowerCase());
  }
  if (!allowed) return null;

  const since = startOfRange();
  const start = startOfRange();
  const days: { date: string; views: number; clicks: number; carts: number; sales: number }[] = [];
  for (let index = 0; index < RANGE_DAYS; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    days.push({ date: dayKey(day), views: 0, clicks: 0, carts: 0, sales: 0 });
  }
  const byDay = new Map(days.map((point) => [point.date, point]));

  const [events, orders] = await Promise.all([
    prisma.productEvent
      .findMany({
        where: { productId, createdAt: { gte: since } },
        select: { eventType: true, createdAt: true },
      })
      .catch(() => []),
    prisma.marketplaceOrder
      .findMany({
        where: { productId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          buyerName: true,
          productTitle: true,
          amountUsd: true,
          vendorEarningsUsd: true,
          status: true,
          createdAt: true,
        },
      })
      .catch(() => []),
  ]);

  const totals = { views: 0, clicks: 0, carts: 0, sales: 0, revenue: 0 };
  for (const event of events) {
    const point = byDay.get(dayKey(event.createdAt));
    if (event.eventType === "view") {
      totals.views += 1;
      if (point) point.views += 1;
    } else if (event.eventType === "click") {
      totals.clicks += 1;
      if (point) point.clicks += 1;
    } else if (event.eventType === "add_to_cart") {
      totals.carts += 1;
      if (point) point.carts += 1;
    }
  }

  const paidOrders = orders.filter((order) => order.status === "Paye");
  for (const order of paidOrders) {
    totals.sales += 1;
    totals.revenue += Number(order.amountUsd) || 0;
    const point = byDay.get(dayKey(order.createdAt));
    if (point) point.sales += 1;
  }
  totals.revenue = round2(totals.revenue);

  return {
    product: {
      id: product.id,
      title: product.title,
      image: product.image || "",
      price: Number(product.price) || 0,
      categoryLabel: product.typeLabel || "",
      isPublished: product.isPublished !== false,
    },
    totals,
    series: days,
    recentOrders: orders.slice(0, 8).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      productTitle: order.productTitle,
      amount: round2(Number(order.amountUsd) || 0),
      earnings: round2(Number(order.vendorEarningsUsd) || 0),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

