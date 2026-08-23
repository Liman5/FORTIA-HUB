-- ============================================================
-- FORTIA HUB — SQL 6 : TABLES ENTREPRISES
-- Description : Profils entreprises, équipes, portfolio, services, KYC
-- Ordre d'exécution : 6 (après SQL 5)
-- ============================================================

-- ========== ENTERPRISE_PROFILES ==========
CREATE TABLE enterprise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  badge badge_type NOT NULL DEFAULT 'none',
  badge_label TEXT NOT NULL DEFAULT 'Badge Doré (Société Certifiée)',
  sector TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  verified_documents BOOLEAN NOT NULL DEFAULT FALSE,
  registration_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  can_receive_payments BOOLEAN NOT NULL DEFAULT FALSE,
  can_sell_services BOOLEAN NOT NULL DEFAULT FALSE,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ENTERPRISE_TEAM ==========
CREATE TABLE enterprise_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ========== ENTERPRISE_PORTFOLIO ==========
CREATE TABLE enterprise_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ========== ENTERPRISE_SERVICES ==========
CREATE TABLE enterprise_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ========== KYC_SUBMISSIONS ==========
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_type applicant_type NOT NULL,
  applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  rep_role TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL,  -- CNI, Passeport, Permis, RCCM, NINEA
  document_number TEXT NOT NULL,
  id_expiration_date TEXT NOT NULL DEFAULT '',
  id_recto_url TEXT NOT NULL DEFAULT '',
  id_verso_url TEXT NOT NULL DEFAULT '',
  selfie_url TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  legal_form TEXT NOT NULL DEFAULT '',
  rccm_number TEXT NOT NULL DEFAULT '',
  company_doc_url TEXT NOT NULL DEFAULT '',
  document_file_url TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status approval_status NOT NULL DEFAULT 'En_attente',
  admin_notes TEXT NOT NULL DEFAULT '',
  rejection_reason TEXT NOT NULL DEFAULT ''
);