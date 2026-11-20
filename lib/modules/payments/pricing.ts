// ============================================================
// FORTIA HUB — PRIX (calcul 100 % serveur)
// ------------------------------------------------------------
// Aucun montant fourni par le navigateur n'est utilisé.
// Les prix viennent des tables courses / products / price_plans /
// subscription_plans / service_packages.
// ============================================================

import { prisma } from "@/lib/prisma";
import { normalizeCurrency, toMinorUnits } from "./money";
import { PaymentError, type CreateOrderItemInput, type ResolvedOrderItem } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 20;
const MAX_QUANTITY = 20;

function requireUuid(value: unknown, label: string): string {
  const id = String(value || "").trim();
  if (!UUID_PATTERN.test(id)) {
    throw new PaymentError(400, "INVALID_ITEM", `${label} invalide.`);
  }
  return id;
}

function normalizeQuantity(value: unknown, max = MAX_QUANTITY): number {
  const quantity = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > max) {
    throw new PaymentError(400, "INVALID_QUANTITY", "Quantité invalide.");
  }
  return quantity;
}

export interface ResolvedPricing {
  items: ResolvedOrderItem[];
  currency: string;
  subtotalMinor: number;
}

/**
 * Résout les articles du panier en prix serveur.
 * Lève une PaymentError 400/404/409 si un article est invalide.
 */
export async function resolveOrderItems(input: unknown): Promise<ResolvedPricing> {
  if (!Array.isArray(input) || input.length === 0) {
    throw new PaymentError(400, "EMPTY_ORDER", "Le panier est vide.");
  }
  if (input.length > MAX_ITEMS) {
    throw new PaymentError(400, "TOO_MANY_ITEMS", "Trop d'articles dans la commande.");
  }

  const items: ResolvedOrderItem[] = [];

  for (const raw of input as CreateOrderItemInput[]) {
    const type = String(raw?.type || "").trim().toLowerCase() as CreateOrderItemInput["type"];
    const quantity = normalizeQuantity(
      raw?.quantity,
      type === "course" || type === "product" ? 1 : MAX_QUANTITY
    );

    if (type === "course") {
      const id = requireUuid(raw?.id, "Formation");
      const course = await prisma.course.findFirst({
        where: { id, isPublished: true },
        select: { id: true, title: true, price: true, instructorId: true, centerId: true },
      });
      if (!course) {
        throw new PaymentError(404, "COURSE_NOT_FOUND", "Formation introuvable ou non publiée.");
      }
      const unitPriceMinor = toMinorUnits(course.price, "USD");
      items.push({
        type,
        resourceId: course.id,
        title: course.title,
        unitPriceMinor,
        quantity: 1,
        totalMinor: unitPriceMinor,
        currency: "USD",
        metadata: { instructorId: course.instructorId || "", centerId: course.centerId || "" },
      });
      continue;
    }

    if (type === "product") {
      const id = requireUuid(raw?.id, "Produit");
      const product = await prisma.product.findFirst({
        where: { id, isPublished: true },
        select: { id: true, title: true, price: true, storeId: true, vendorId: true },
      });
      if (!product) {
        throw new PaymentError(404, "PRODUCT_NOT_FOUND", "Produit introuvable ou non publié.");
      }
      const unitPriceMinor = toMinorUnits(product.price, "USD");
      items.push({
        type,
        resourceId: product.id,
        title: product.title,
        unitPriceMinor,
        quantity: 1,
        totalMinor: unitPriceMinor,
        currency: "USD",
        metadata: { storeId: product.storeId || "", vendorId: product.vendorId || "" },
      });
      continue;
    }

    if (type === "subscription") {
      const code = String(raw?.planCode || "").trim();
      if (!code) throw new PaymentError(400, "PLAN_REQUIRED", "Formule d'abonnement requise.");
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { code, isActive: true },
      });
      if (!plan) {
        throw new PaymentError(404, "PLAN_NOT_FOUND", "Formule d'abonnement introuvable.");
      }
      const currency = normalizeCurrency(plan.currency);
      const totalMinor = plan.amountMinor * quantity;
      items.push({
        type,
        resourceId: plan.code,
        title: plan.name,
        unitPriceMinor: plan.amountMinor,
        quantity,
        totalMinor,
        currency,
        metadata: { planId: plan.id, planCode: plan.code, interval: plan.interval },
      });
      continue;
    }

    if (type === "storage" || type === "feature") {
      const code = String(raw?.planCode || "").trim();
      if (!code) throw new PaymentError(400, "PLAN_REQUIRED", "Tarif requis.");
      const plan = await prisma.pricePlan.findFirst({
        where: { code, isActive: true },
      });
      if (!plan) {
        throw new PaymentError(404, "PLAN_NOT_FOUND", "Tarif introuvable ou inactif.");
      }
      const currency = normalizeCurrency(plan.currency);
      const totalMinor = plan.amountMinor * quantity;
      items.push({
        type,
        resourceId: plan.code,
        title: plan.label,
        unitPriceMinor: plan.amountMinor,
        quantity,
        totalMinor,
        currency,
        metadata: {
          planCode: plan.code,
          gb: Number((plan.metadata as { gb?: number })?.gb || 0),
          centerId: String(raw.centerId || ""),
        },
      });
      continue;
    }

    if (type === "service") {
      const id = requireUuid(raw?.id, "Service");
      const service = await prisma.servicePackage.findFirst({
        where: { id, isActive: true },
        select: { id: true, title: true, startingPrice: true },
      });
      if (!service) {
        throw new PaymentError(404, "SERVICE_NOT_FOUND", "Service introuvable ou inactif.");
      }
      const unitPriceMinor = toMinorUnits(service.startingPrice, "USD");
      items.push({
        type,
        resourceId: service.id,
        title: service.title,
        unitPriceMinor,
        quantity,
        totalMinor: unitPriceMinor * quantity,
        currency: "USD",
        metadata: { serviceId: service.id },
      });
      continue;
    }

    throw new PaymentError(400, "INVALID_ITEM", "Type d'article non pris en charge.");
  }

  const currencies = Array.from(new Set(items.map((item) => item.currency)));
  if (currencies.length > 1) {
    throw new PaymentError(
      400,
      "MIXED_CURRENCIES",
      "Une commande ne peut pas mélanger plusieurs devises."
    );
  }

  const subtotalMinor = items.reduce((sum, item) => sum + item.totalMinor, 0);
  return { items, currency: currencies[0] || "USD", subtotalMinor };
}

