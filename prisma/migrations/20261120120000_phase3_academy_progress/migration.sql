-- ============================================================
-- FORTIA HUB — PHASE 3 : progression réelle et tentatives de quiz
-- Migration additive (aucune donnée existante modifiée).
-- ============================================================

CREATE TABLE IF NOT EXISTS course_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_lesson_progress_user_lesson_key UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS course_lesson_progress_user_course_idx
  ON course_lesson_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS course_lesson_progress_course_idx
  ON course_lesson_progress (course_id);

CREATE TABLE IF NOT EXISTS course_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_quiz_attempts_user_course_idx
  ON course_quiz_attempts (user_id, course_id);
CREATE INDEX IF NOT EXISTS course_quiz_attempts_course_idx
  ON course_quiz_attempts (course_id);
