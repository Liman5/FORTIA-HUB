import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { createOrder } from "@/lib/modules/payments/orders";
import { resolveOrderItems } from "@/lib/modules/payments/pricing";
import { startPayment } from "@/lib/modules/payments/payments";
import {
  getDefaultProviderCode,
  getPaymentProvider,
} from "@/lib/modules/payments/providers";
import { checkoutSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { AppError, unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * • Entrées validées par Zod (aucun montant client utilisé).
 * • Commande gratuite → droits accordés immédiatement.
 * • Commande payante → tentative de paiement + redirection fournisseur.
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) {
    throw unauthorizedError("Connectez-vous pour finaliser votre commande.");
  }

  await enforceRateLimit("checkout", req, user.id);

  const body = parseOrThrow(checkoutSchema, await req.json().catch(() => null));

  const requestedProvider = (body.provider || "").trim().toLowerCase();
  const providerCode = requestedProvider || getDefaultProviderCode() || "";
  const provider = providerCode ? getPaymentProvider(providerCode) : null;

  // Détermine si la commande est payante AVANT de créer quoi que ce soit.
  const pricing = await resolveOrderItems(body.items);
  const needsPayment = pricing.subtotalMinor > 0;

  if (needsPayment && !provider) {
    throw new AppError(
      503,
      "NO_PROVIDER",
      "Aucun moyen de paiement n'est disponible sur le serveur."
    );
  }
  if (needsPayment && provider && !provider.isConfigured()) {
    throw new AppError(
      503,
      "PROVIDER_NOT_CONFIGURED",
      "Ce moyen de paiement n'est pas configuré sur le serveur."
    );
  }

  const order = await createOrder({
    buyer: {
      userId: user.id,
      name: body.buyer?.name || user.name || "Client FORTIA",
      email: body.buyer?.email || user.email,
      phone: body.buyer?.phone || user.phone || "",
    },
    items: body.items,
  });

  if (!order.requiresPayment) {
    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: "paid",
      totalMinor: order.totalMinor,
      currency: order.currency,
      requiresRedirect: false,
      checkoutUrl: "",
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin)
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");

  const payment = await startPayment({
    orderId: order.orderId,
    userId: user.id,
    providerCode,
    successUrl: `${appUrl}/payments/return?order_id=${order.orderId}`,
    cancelUrl: `${appUrl}/payments/cancel?order_id=${order.orderId}`,
  });

  return NextResponse.json({
    success: true,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    status: "pending",
    totalMinor: order.totalMinor,
    currency: order.currency,
    provider: payment.provider,
    paymentId: payment.paymentId,
    requiresRedirect: !!payment.checkoutUrl,
    checkoutUrl: payment.checkoutUrl,
    message: "Commande créée. Le paiement doit encore être confirmé par le fournisseur.",
  });
});

