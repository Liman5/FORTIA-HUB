import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { createOrder } from "@/lib/modules/payments/orders";
import { resolveOrderItems } from "@/lib/modules/payments/pricing";
import { startPayment } from "@/lib/modules/payments/payments";
import {
  getDefaultProviderCode,
  getPaymentProvider,
} from "@/lib/modules/payments/providers";
import {
  EMAIL_PATTERN,
  paymentErrorResponse,
} from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Body : { items: CreateOrderItemInput[], provider?: string, buyer?: {...} }
 *
 * • Le montant est calculé côté serveur (jamais depuis le navigateur).
 * • Commande gratuite → droits accordés immédiatement.
 * • Commande payante → tentative de paiement + redirection fournisseur.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Connectez-vous pour finaliser votre commande.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Le panier est vide.", code: "EMPTY_ORDER" },
        { status: 400 }
      );
    }

    const buyerEmail = String(body.buyer?.email || user.email || "")
      .trim()
      .toLowerCase();
    if (!EMAIL_PATTERN.test(buyerEmail)) {
      return NextResponse.json(
        { success: false, error: "Adresse e-mail invalide.", code: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    const requestedProvider = String(body.provider || "").trim().toLowerCase();
    const providerCode = requestedProvider || getDefaultProviderCode() || "";
    const provider = providerCode ? getPaymentProvider(providerCode) : null;

    // Détermine si la commande est payante AVANT de créer quoi que ce soit.
    const pricing = await resolveOrderItems(body.items);
    const needsPayment = pricing.subtotalMinor > 0;

    if (needsPayment && !provider) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun moyen de paiement n'est disponible sur le serveur.",
          code: "NO_PROVIDER",
        },
        { status: 503 }
      );
    }
    if (needsPayment && provider && !provider.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Ce moyen de paiement n'est pas configuré sur le serveur.",
          code: "PROVIDER_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const order = await createOrder({
      buyer: {
        userId: user.id,
        name: String(body.buyer?.name || user.name || "Client FORTIA"),
        email: buyerEmail,
        phone: String(body.buyer?.phone || user.phone || ""),
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
      providerCode: providerCode,
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
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
