// ============================================================
// FORTIA HUB — TYPES DES HANDLERS D'ÉCRITURE (Phase 5)
// ============================================================

import type { NextRequest } from "next/server";
import type { WriteActorContext } from "@/lib/server/writeAuthorization";

/** Données validées par Zod, hétérogènes selon l'action (route historique). */
export type WriteActionData = Record<string, unknown> & { [key: string]: any };

export interface WriteHandlerContext {
  req: NextRequest;
  auth: WriteActorContext;
  data: WriteActionData;
}

/**
 * Un handler retourne une réponse si l'action lui appartient,
 * ou `null` pour laisser le dispatch au domaine suivant.
 */
export type WriteActionHandler = (
  action: string,
  context: WriteHandlerContext
) => Promise<Response | null>;
