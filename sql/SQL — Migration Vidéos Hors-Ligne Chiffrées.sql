-- ============================================================
-- FORTIA HUB — Migration : Vidéos de formation hors-ligne chiffrées
-- Ajoute la protection optionnelle par code secret du formateur
-- (seul le HASH du code est stocké, jamais le code en clair).
-- ============================================================

ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS video_protected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_code_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS course_lessons_protected_idx ON course_lessons (video_protected);
