-- ============================================================
-- FORTIA HUB — MIGRATION FORMATEURS (AUTONOME & SÉCURISÉ)
-- Exécutez CE fichier en entier dans l'éditeur SQL Supabase.
-- 
-- ✅ Sans erreur sur base VIERGE : crée les enums users nécessaires,
--    la table users, puis tout le système formateur.
-- ✅ Sans erreur sur base EXISTANTE : ignore ce qui existe déjà
--    (IF NOT EXISTS / DO EXCEPTION / ADD COLUMN IF NOT EXISTS).
--
-- ORDRE CORRIGÉ : users → training_centers → courses →
--                 instructor_commissions → instructor_storage_purchases
-- ============================================================

-- Extension requise pour gen_random_uuid() (déjà active sur Supabase par défaut)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== 1. ENUMS (créés seulement s'ils n'existent pas) ==========
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('buyer','freelance','enterprise','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE badge_type AS ENUM ('green','gold','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('non_soumis','en_attente','approuve','rejete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lesson_type AS ENUM ('video','article','quiz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('Debutant','Intermediaire','Avance','Expert','Tous_niveaux');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== 2. USERS (créée seulement si absente) ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  account_type user_role NOT NULL DEFAULT 'buyer',
  badge badge_type NOT NULL DEFAULT 'none',
  badge_label TEXT NOT NULL DEFAULT '',
  kyc_status kyc_status NOT NULL DEFAULT 'non_soumis',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  enrolled_course_ids JSONB NOT NULL DEFAULT '[]',
  course_progress JSONB NOT NULL DEFAULT '{}',
  purchased_product_ids JSONB NOT NULL DEFAULT '[]',
  earned_certificates JSONB NOT NULL DEFAULT '[]',
  payment_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 3. TRAINING_CENTERS (centres de formation) ==========
CREATE TABLE IF NOT EXISTS training_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  center_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  banner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  fee_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 2,
  storage_quota_gb INTEGER NOT NULL DEFAULT 4,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  pricing_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_centers_owner ON training_centers(owner_id);

-- ========== 4. COURSE_CATEGORIES (avant courses — référencée par courses) ==========
CREATE TABLE IF NOT EXISTS course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 5. COURSES (avec colonnes multi-formateurs) ==========
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  category_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  level course_level NOT NULL DEFAULT 'Tous_niveaux',
  duration_hours INTEGER NOT NULL DEFAULT 0,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  students_count INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL DEFAULT '',
  instructor_name TEXT NOT NULL DEFAULT '',
  instructor_role TEXT NOT NULL DEFAULT '',
  instructor_avatar TEXT NOT NULL DEFAULT '',
  learning_outcomes JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 6. INSTRUCTOR_COMMISSIONS (revenus formateur / plateforme) ==========
CREATE TABLE IF NOT EXISTS instructor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
  order_id UUID,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  course_title TEXT NOT NULL,
  amount_paid_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  instructor_earnings_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'En_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_instructor_commissions_instructor ON instructor_commissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_commissions_course ON instructor_commissions(course_id);

-- ========== 7. INSTRUCTOR_STORAGE_PURCHASES (achat espace vidéo) ==========
CREATE TABLE IF NOT EXISTS instructor_storage_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
  amount_gb INTEGER NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Paye',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_instructor_storage_instructor ON instructor_storage_purchases(instructor_id);

-- ========== 8. SÉCURISATION : si courses existait déjà SANS les colonnes formateur → on les ajoute :
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL;

-- ========== 9. CHAPITRES / LEÇONS / QUIZ ==========
CREATE TABLE IF NOT EXISTS course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '15 min',
  type lesson_type NOT NULL DEFAULT 'video',
  video_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- ✅ FIN — Le système multi-formateurs est maintenant en base.
-- Si vous démarrez un projet NEUF, exécutez ensuite les autres
-- fichiers SQL dans l'ordre : 4 Marketplace, 5 Freelance, etc.
-- ============================================================