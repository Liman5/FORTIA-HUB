// ============================================================
// FORTIA HUB — RÉPONSES HTTP DU DOMAINE PAIEMENTS
// ============================================================

import { NextResponse } from "next/server";
import { PaymentError } from "./types";

/** Convertit une erreur métier en réponse HTTP (jamais de détail interne). */
export function paymentErrorResponse(error: unknown): NextResponse {
  if (error instanceof PaymentError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }
  console.error("[PAYMENTS] Erreur interne:", error);
  return NextResponse.json(
    { success: false, error: "Erreur interne. Veuillez réessayer." },
    { status: 500 }
  );
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
