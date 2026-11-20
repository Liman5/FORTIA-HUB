import { NextResponse } from "next/server";
import { listPaymentProviders } from "@/lib/modules/payments/providers";

export const dynamic = "force-dynamic";

/** GET /api/payments/providers — moyens de paiement disponibles. */
export async function GET() {
  const providers = listPaymentProviders();
  return NextResponse.json({
    success: true,
    data: {
      providers,
      available: providers.filter((provider) => provider.configured).map((p) => p.code),
    },
  });
}
