// ============================================================
// FORTIA HUB — DISPATCH DES ACTIONS D'ÉCRITURE (Phase 5)
// ------------------------------------------------------------
// L'autorisation, la validation Zod et l'invalidation de cache
// restent dans la route centrale. Ce fichier ne fait que router
// vers le handler du domaine compétent.
// ============================================================

import type { WriteActionHandler, WriteHandlerContext } from "./types";
import { handleSupportAction } from "./handlers/support";
import { handleProfilesAction } from "./handlers/profiles";
import { handleKycAction } from "./handlers/kyc";
import { handleVendorsAction } from "./handlers/vendors";
import { handleLearningAction } from "./handlers/learning";
import { handleAcademyAction } from "./handlers/academy";
import { handleMarketplaceAction } from "./handlers/marketplace";
import { handleContentAction } from "./handlers/content";
import { handleServicesAction } from "./handlers/services";
import { handleFinanceAction } from "./handlers/finance";
import { handleCentersAction } from "./handlers/centers";
import { handleNotificationsAction } from "./handlers/notifications";

const HANDLERS: WriteActionHandler[] = [
  handleSupportAction,
  handleProfilesAction,
  handleKycAction,
  handleVendorsAction,
  handleLearningAction,
  handleAcademyAction,
  handleMarketplaceAction,
  handleContentAction,
  handleServicesAction,
  handleFinanceAction,
  handleCentersAction,
  handleNotificationsAction,
];

/** Retourne la réponse du domaine compétent, ou null si aucune action ne correspond. */
export async function dispatchWriteAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  for (const handler of HANDLERS) {
    const response = await handler(action, context);
    if (response) return response;
  }
  return null;
}
