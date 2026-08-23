-- ============================================================
-- FORTIA HUB — SQL 2 : TABLES UTILISATEURS & AUTH
-- Description : Comptes utilisateurs, admins, sessions, OTP, suppressions
-- Ordre d'exécution : 2 (après SQL 1 — Enums)
-- ============================================================

-- ========== USERS ==========
CREATE TABLE users (
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
  enrolled_course_ids TEXT[] NOT NULL DEFAULT '{}',
  course_progress JSONB NOT NULL DEFAULT '{}',
  purchased_product_ids TEXT[] NOT NULL DEFAULT '{}',
  earned_certificates JSONB NOT NULL DEFAULT '[]',
  payment_history JSONB NOT NULL DEFAULT '[]',
  deletion_requested_at TIMESTAMPTZ,
  deletion_scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ADMIN_USERS ==========
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',  -- super_admin | manager
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SESSIONS ==========
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_user_check CHECK (
    (user_id IS NOT NULL AND admin_user_id IS NULL) OR
    (user_id IS NULL AND admin_user_id IS NOT NULL)
  )
);

-- ========== OTP_CODES ==========
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  sender TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PENDING_DELETIONS ==========
CREATE TABLE pending_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delete_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);