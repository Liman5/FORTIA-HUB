-- ============================================================
-- FORTIA HUB — SQL 8 : TABLES BLOG
-- Description : Catégories de blog et articles
-- Ordre d'exécution : 8 (après SQL 7)
-- ============================================================

-- ========== BLOG_CATEGORIES ==========
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,          -- 'Intelligence Artificielle', 'Cryptomonnaie', ...
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== BLOG_POSTS ==========
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  author_avatar TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  read_time TEXT NOT NULL DEFAULT '5 min',
  image TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);