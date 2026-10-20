-- ================================================================
--  FORTIA HUB — Style éditorial des articles de blog
--  À exécuter dans Supabase → SQL Editor (script idempotent)
-- ================================================================
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#D69E25';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover_style TEXT NOT NULL DEFAULT 'image';
