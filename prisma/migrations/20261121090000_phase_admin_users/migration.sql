-- ============================================================
-- FORTIA HUB — Administration des utilisateurs
-- Statuts de compte, demandes de suppression, journal admin.
-- Migration additive, compatible avec l'existant.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS users_account_status_idx ON users (account_status);
CREATE INDEX IF NOT EXISTS users_deletion_scheduled_for_idx ON users (deletion_scheduled_for);

ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'user';
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE pending_deletions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS pending_deletions_status_idx ON pending_deletions (status);
CREATE INDEX IF NOT EXISTS pending_deletions_user_id_idx ON pending_deletions (user_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_user_id TEXT,
  target_email TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_created_idx
  ON admin_audit_logs (target_user_id, created_at);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_created_idx
  ON admin_audit_logs (action, created_at);
