-- ============================================================
-- FORTIA HUB — Retrait du trigger de suppression immédiate
-- ------------------------------------------------------------
-- L'ancien trigger `trg_process_deletions` supprimait la ligne `users`
-- dès qu'une demande avait `delete_at <= now()` et `processed = false`,
-- ce qui contournait la rétention de 7 jours et empêchait
-- l'anonymisation contrôlée par le service applicatif.
-- La suppression différée est désormais exécutée par
-- `processDueDeletions()` / le cron de maintenance.
-- ============================================================

DROP TRIGGER IF EXISTS trg_process_deletions ON pending_deletions;
DROP FUNCTION IF EXISTS process_pending_deletions();
