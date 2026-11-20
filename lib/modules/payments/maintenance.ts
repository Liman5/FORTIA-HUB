// ============================================================
// FORTIA HUB — MAINTENANCE DES PAIEMENTS (Phase 2)
// ============================================================

import { expireEntitlements } from "./entitlements";
import { expireSubscriptions } from "./subscriptions";

/**
 * Expire les abonnements et droits temporaires arrivés à échéance.
 * Appelé par le cron de maintenance et par l'endpoint admin dédié.
 */
export async function runPaymentMaintenance(now: Date = new Date()) {
  const subscriptions = await expireSubscriptions(now);
  const entitlements = await expireEntitlements(now);
  return { subscriptions, entitlements };
}
