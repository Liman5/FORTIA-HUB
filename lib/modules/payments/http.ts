// ============================================================
// FORTIA HUB — RÉPONSES HTTP DU DOMAINE PAIEMENTS
// ------------------------------------------------------------
// Délègue à la gestion d'erreurs centralisée (même format, requestId,
// aucun détail interne exposé).
// ============================================================

import { randomUUID } from "node:crypto";
import { requestIdOf, toErrorResponse } from "@/lib/server/errors";

export function paymentErrorResponse(error: unknown, request?: Request) {
  return toErrorResponse(error, {
    requestId: request ? requestIdOf(request) : randomUUID(),
    route: request ? new URL(request.url).pathname : "payments",
    method: request?.method,
  });
}

