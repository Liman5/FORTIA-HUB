-- ============================================================
-- FORTIA HUB — SQL 3 : TABLES ACADÉMIE / FORMATIONS
-- Description : Catégories, cours, chapitres, leçons, quiz, inscriptions, avis
-- Ordre d'exécution : 3 (après SQL 2)
-- ============================================================

-- ========== COURSE_CATEGORIES ==========
CREATE TABLE course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,          -- 'crypto', 'ai', 'canva', 'capcut', ...
  label TEXT NOT NULL,                -- 'Cryptomonnaie & Blockchain'
  description TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== TRAINING_CENTERS (Académie multi-formateurs) ==========
CREATE TABLE training_centers (
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
CREATE INDEX idx_training_centers_owner ON training_centers(owner_id);

-- ========== INSTRUCTOR_COMMISSIONS ==========
CREATE TABLE instructor_commissions (
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
CREATE INDEX idx_instructor_commissions_instructor ON instructor_commissions(instructor_id);
CREATE INDEX idx_instructor_commissions_course ON instructor_commissions(course_id);

-- ========== INSTRUCTOR_STORAGE_PURCHASES ==========
CREATE TABLE instructor_storage_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  center_id UUID REFERENCES training_centers(id) ON DELETE SET NULL,
  amount_gb INTEGER NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Paye',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_instructor_storage_instructor ON instructor_storage_purchases(instructor_id);

-- ========== COURSES ==========
CREATE TABLE courses (
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

-- ========== COURSE_CHAPTERS ==========
CREATE TABLE course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== COURSE_LESSONS ==========
CREATE TABLE course_lessons (
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

-- ========== COURSE_QUIZZES ==========
CREATE TABLE course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== QUIZ_OPTIONS ==========
CREATE TABLE quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ========== COURSE_ENROLLMENTS ==========
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- ========== COURSE_REVIEWS ==========
CREATE TABLE course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

-- ========== CERTIFICATES ==========
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT NOT NULL UNIQUE,  -- ex: 'FORTIA-2026-CRYP-9482'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  category TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  grade TEXT NOT NULL,
  qr_code_url TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);