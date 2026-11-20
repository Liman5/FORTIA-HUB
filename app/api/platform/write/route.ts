// ============================================================
// FORTIA HUB — ROUTE D'ÉCRITURE CENTRALE (adaptateur Phase 5)
// ------------------------------------------------------------
// Cette route ne contient PLUS de logique métier.
//   1. lit et valide l'enveloppe (Zod) ;
//   2. refuse les actions de paiement historiques (410) ;
//   3. applique la politique d'accès Phase 1A ;
//   4. valide les données de l'action ;
//   5. distribue au handler du domaine (lib/modules/write/handlers).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { authorizeWriteAction, logWriteFailure, toWriteErrorResponse } from "@/lib/server/writeAuthorization";
import { invalidateResponseCache } from "@/lib/server/responseCache";
import { writeActionSchemas, writeDataSchema, writeEnvelopeSchema } from "@/lib/validation/write";
import { parseOrThrow } from "@/lib/validation/common";
import { isAppError, requestIdOf, toErrorResponse } from "@/lib/server/errors";
import { dispatchWriteAction } from "@/lib/modules/write/dispatch";
import type { WriteActionData } from "@/lib/modules/write/types";

export const dynamic = "force-dynamic";

/**
 * Actions simulées de la Phase 2 : définitivement neutralisées.
 * Conservées ici uniquement pour renvoyer 410 avant toute exécution.
 */
const DEPRECATED_WRITE_ACTIONS = new Set<string>([
  "submit-order",
  "register-free-purchase",
  "register-instructor-purchase",
  "pay-training-center-fee",
]);

export async function POST(req: NextRequest) {
  let actionName = "";
  try {
    const body = await req.json();
    actionName = String(body?.action || "");

    if (!actionName || !body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return NextResponse.json(
        { success: false, error: "Action et données requises." },
        { status: 400 }
      );
    }

    if (DEPRECATED_WRITE_ACTIONS.has(actionName)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ce parcours de paiement est remplacé par /api/payments/checkout.",
          code: "ENDPOINT_MOVED",
        },
        { status: 410 }
      );
    }

    const envelope = parseOrThrow(writeEnvelopeSchema, body);
    const rawData = envelope.data as WriteActionData;

    // Autorisation AVANT toute validation métier (401/403 sans détail de schéma).
    const auth = await authorizeWriteAction(req, actionName, rawData);

    // Validation du schéma propre à l'action.
    const data = parseOrThrow(
      writeActionSchemas[actionName] ?? writeDataSchema,
      rawData
    ) as WriteActionData;

    invalidateResponseCache();

    const response = await dispatchWriteAction(actionName, { req, auth, data });
    if (response) return response;

    return NextResponse.json(
      { error: "Action inconnue: " + actionName },
      { status: 400 }
    );
  } catch (error: unknown) {
    logWriteFailure(actionName, error);
    if (isAppError(error)) {
      return toErrorResponse(error, {
        requestId: requestIdOf(req),
        route: req.nextUrl.pathname,
        method: req.method,
      });
    }
    const { status, body } = toWriteErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
