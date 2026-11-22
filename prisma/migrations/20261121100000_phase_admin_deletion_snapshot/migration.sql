-- ============================================================
-- FORTIA HUB — Snapshot du statut lors d'une demande de suppression
-- Permet de restaurer correctement un compte suspendu/bloqué si la
-- demande est annulée, au lieu de le réactiver par erreur.
-- ============================================================

ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS previous_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS previous_is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS previous_suspended_until TIMESTAMPTZ;

-- Les demandes existantes ne portent pas de snapshot : on déduit un état
-- sûr depuis le compte associé, sans jamais réactiver un compte bloqué.
UPDATE pending_deletions pd
SET previous_status = COALESCE(u.account_status, 'active'),
    previous_is_active = COALESCE(u.is_active, true),
    previous_suspended_until = u.suspended_until
FROM users u
WHERE u.id = pd.user_id
  AND pd.previous_status = 'active'
  AND pd.previous_is_active = true;
