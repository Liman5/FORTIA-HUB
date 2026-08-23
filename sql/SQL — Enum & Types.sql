-- ============================================================
-- FORTIA HUB — SQL 1 : ENUM & TYPES
-- Description : Types ENUM réutilisables dans toute la base
-- Ordre d'exécution : 1
-- ============================================================

-- ========== UTILISATEURS & AUTH ==========
CREATE TYPE user_role AS ENUM (
  'buyer',        -- Acheteur
  'freelance',    -- Freelance
  'enterprise',   -- Entreprise
  'admin'         -- Administrateur
);

CREATE TYPE badge_type AS ENUM (
  'green',  -- Badge Vert (Freelance vérifié)
  'gold',   -- Badge Doré (Entreprise certifiée)
  'none'    -- Aucun badge
);

CREATE TYPE kyc_status AS ENUM (
  'non_soumis',
  'en_attente',
  'approuve',
  'rejete'
);

-- ========== ACADÉMIE ==========
CREATE TYPE lesson_type AS ENUM (
  'video',
  'article',
  'quiz'
);

CREATE TYPE course_level AS ENUM (
  'Debutant',
  'Intermediaire',
  'Avance',
  'Expert',
  'Tous_niveaux'
);

-- ========== MARKETPLACE & PRODUITS ==========
CREATE TYPE product_type AS ENUM (
  'ebook',
  'canva_template',
  'ai_prompts',
  'whitepaper',
  'business_plan',
  'contract',
  'pitch_deck',
  'premium_pack',
  'course',
  'service',
  'software',
  'template'
);

CREATE TYPE store_status AS ENUM (
  'active',
  'pending',
  'suspended'
);

-- ========== COMMANDES & PAIEMENTS ==========
CREATE TYPE order_status AS ENUM (
  'Paye',
  'En_attente_API',
  'Echoue',
  'Rembourse'
);

CREATE TYPE payment_status AS ENUM (
  'Valide',
  'En_attente',
  'Echoue',
  'Rembourse'
);

CREATE TYPE payment_gateway_code AS ENUM (
  'wave',
  'orange_money',
  'mtn_money',
  'card_stripe',
  'paypal',
  'crypto_usdt_trc20'
);

CREATE TYPE payout_status AS ENUM (
  'En_attente',
  'Paye',
  'Rejete'
);

-- ========== KYC / CANDIDATURES / SUPPORT ==========
CREATE TYPE applicant_type AS ENUM (
  'freelance',
  'enterprise'
);

CREATE TYPE approval_status AS ENUM (
  'En_attente',
  'Approuve',
  'Rejete'
);

CREATE TYPE support_status AS ENUM (
  'Transmis_Enregistre',
  'En_cours',
  'Resolu'
);

-- ========== SERVICES ==========
CREATE TYPE quote_status AS ENUM (
  'Recu',
  'En_cours_analyse',
  'Devis_valide',
  'En_realisation'
);

-- ========== NOTIFICATIONS ==========
CREATE TYPE notification_type AS ENUM (
  'info',
  'success',
  'warning'
);

-- ========== PAIEMENT GATEWAY CONFIG ==========
CREATE TYPE gateway_fee_struct AS ENUM (
  'percentage',
  'fixed',
  'mixed'
);