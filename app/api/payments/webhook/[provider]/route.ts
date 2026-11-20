import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/modules/payments/webhooks";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/payments/webhook/[provider]
 * Corps BRUT (signature calculée sur les octets exacts).
 * Aucun retour navigateur ne passe par ici : seul le fournisseur appelle.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawBody = await req.text();
    const result = await handlePaymentWebhook(provider, rawBody, req.headers);
    return NextResponse.json(
      { success: true, received: result.body.received, processed: result.body.processed, duplicate: result.body.duplicate },
      { status: result.status }
    );
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
