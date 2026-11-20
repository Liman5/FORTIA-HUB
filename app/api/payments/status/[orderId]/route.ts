import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { getOrderForUser } from "@/lib/modules/payments/orders";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

function uiStatus(status: string): string {
  switch (status) {
    case "Paye":
      return "paid";
    case "Echoue":
      return "failed";
    case "Rembourse":
      return "refunded";
    case "Annule":
      return "cancelled";
    default:
      return "pending";
  }
}

/** GET /api/payments/status/[orderId] — statut réel (aucun droit accordé ici). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const admin = await requireAdmin(req).catch(() => null);
    const { orderId } = await params;

    const order = await getOrderForUser(orderId, {
      userId: user.id,
      email: user.email,
      isAdmin: !!admin,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: uiStatus(order.status),
        currency: order.currency,
        subtotalMinor: order.subtotalMinor,
        totalMinor: order.totalMinor,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          type: item.itemType,
          title: item.title,
          resourceId: item.resourceId,
          quantity: item.quantity,
          totalMinor: item.totalMinor,
        })),
        payments: order.payments.map((payment) => ({
          id: payment.id,
          provider: payment.provider,
          status: payment.status,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          checkoutUrl: payment.checkoutUrl,
          confirmedAt: payment.confirmedAt,
          failureReason: payment.failureReason,
          createdAt: payment.createdAt,
        })),
        refunds: order.refunds.map((refund) => ({
          id: refund.id,
          amountMinor: refund.amountMinor,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          createdAt: refund.createdAt,
        })),
        subscription: order.subscription,
      },
    });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
