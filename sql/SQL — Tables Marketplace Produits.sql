-- ============================================================
-- FORTIA HUB — SQL 4 : TABLES MARKETPLACE & PRODUITS
-- Description : Boutiques, produits, fichiers, avis, candidatures, commandes, retraits, support
-- Ordre d'exécution : 4 (après SQL 3)
-- ============================================================

-- ========== STORES ==========
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT NOT NULL DEFAULT '',
  banner TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  categories TEXT[] NOT NULL DEFAULT '{}',
  status store_status NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  sales_count INTEGER NOT NULL DEFAULT 0,
  total_revenue_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== STORE_PAYOUT_INFO ==========
CREATE TABLE store_payout_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'mobile_money',  -- mobile_money | bank_transfer | paypal | crypto
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PRODUCTS ==========
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL DEFAULT 'FORTIA Digital Official Store',
  store_logo TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type product_type NOT NULL DEFAULT 'ebook',
  type_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10,2),
  file_format TEXT NOT NULL DEFAULT 'PDF',
  file_size TEXT NOT NULL DEFAULT '10 MB',
  image TEXT NOT NULL DEFAULT '',
  banner_image TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]',
  download_url TEXT NOT NULL DEFAULT '#',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PRODUCT_FILES ==========
CREATE TABLE product_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PRODUCT_REVIEWS ==========
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== VENDOR_APPLICATIONS ==========
CREATE TABLE vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  store_name TEXT NOT NULL,
  store_category TEXT NOT NULL,
  store_description TEXT NOT NULL DEFAULT '',
  experience_bio TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status approval_status NOT NULL DEFAULT 'En_attente',
  admin_notes TEXT NOT NULL DEFAULT ''
);

-- ========== MARKETPLACE_ORDERS ==========
CREATE TABLE marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL DEFAULT '',
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  store_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_commission_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  vendor_earnings_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_gateway TEXT NOT NULL DEFAULT 'Wave API',
  transaction_ref TEXT NOT NULL DEFAULT '',
  status order_status NOT NULL DEFAULT 'En_attente_API',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PAYOUT_REQUESTS ==========
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_fcfa NUMERIC(14,2) NOT NULL DEFAULT 0,
  payout_method TEXT NOT NULL DEFAULT '',
  account_details TEXT NOT NULL DEFAULT '',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status payout_status NOT NULL DEFAULT 'En_attente',
  transaction_hash_or_ref TEXT NOT NULL DEFAULT ''
);

-- ========== POST_PURCHASE_SUPPORT ==========
CREATE TABLE post_purchase_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL DEFAULT '',
  product_title TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone_contact TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forwarded_email TEXT NOT NULL DEFAULT '',
  status support_status NOT NULL DEFAULT 'Transmis_Enregistre'
);