-- ============================================================
-- FORTIA HUB — SQL 5 : TABLES FREELANCE
-- Description : Profils freelances, services proposés, portfolio
-- Ordre d'exécution : 5 (après SQL 4)
-- ============================================================

-- ========== FREELANCE_PROFILES ==========
CREATE TABLE freelance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  badge badge_type NOT NULL DEFAULT 'none',
  badge_label TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  skills TEXT[] NOT NULL DEFAULT '{}',
  kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
  registration_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  can_receive_payments BOOLEAN NOT NULL DEFAULT FALSE,
  can_sell_services BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT NOT NULL DEFAULT '',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== FREELANCE_SERVICES ==========
CREATE TABLE freelance_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelance_id UUID NOT NULL REFERENCES freelance_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_days INTEGER NOT NULL DEFAULT 3,
  image TEXT NOT NULL DEFAULT '',
  orders_completed INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== FREELANCE_PORTFOLIO ==========
CREATE TABLE freelance_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelance_id UUID NOT NULL REFERENCES freelance_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);