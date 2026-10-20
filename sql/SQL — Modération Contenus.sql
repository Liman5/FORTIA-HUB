-- ================================================================
--  FORTIA HUB — Modération des contenus (formations & produits)
--  Suspension immédiate, gel des fonds, motif et demande d'examen.
--  Script idempotent (Supabase → SQL Editor).
-- ================================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS moderation_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS moderation_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS funds_frozen BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS appeal_status TEXT NOT NULL DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS appeal_message TEXT NOT NULL DEFAULT '';

ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS funds_frozen BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS appeal_status TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS appeal_message TEXT NOT NULL DEFAULT '';
