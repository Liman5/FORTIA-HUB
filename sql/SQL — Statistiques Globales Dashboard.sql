-- ============================================================
-- FORTIA HUB — SQL STATISTIQUES GLOBALES DU DASHBOARD ADMIN
-- Ce fichier crée les tables et vues nécessaires au module
-- "Statistiques Globales" du panneau d'administration moderne.
-- ============================================================

-- ============================================================
-- 1. TABLE : admin_daily_stats (Historique quotidien des métriques)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  
  -- Revenus & Transactions
  total_revenue_usd DECIMAL(12,2) DEFAULT 0,
  platform_commissions_usd DECIMAL(12,2) DEFAULT 0,
  vendor_earnings_usd DECIMAL(12,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  successful_orders_count INTEGER DEFAULT 0,
  
  -- Contenus actifs
  active_courses_count INTEGER DEFAULT 0,
  active_products_count INTEGER DEFAULT 0,
  active_services_count INTEGER DEFAULT 0,
  active_stores_count INTEGER DEFAULT 0,
  active_instructors_count INTEGER DEFAULT 0,
  
  -- Utilisateurs & inscriptions
  new_users_count INTEGER DEFAULT 0,
  total_users_count INTEGER DEFAULT 0,
  kyc_submissions_count INTEGER DEFAULT 0,
  kyc_approved_count INTEGER DEFAULT 0,
  
  -- Support
  support_tickets_count INTEGER DEFAULT 0,
  support_resolved_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les requêtes de stats
CREATE INDEX IF NOT EXISTS idx_admin_daily_stats_date 
  ON public.admin_daily_stats(stat_date DESC);

-- Trigger de mise à jour automatique
-- Utilise set_updated_at() défini dans "SQL — Triggers.sql"
DROP TRIGGER IF EXISTS trg_admin_daily_stats_updated ON public.admin_daily_stats;
CREATE TRIGGER trg_admin_daily_stats_updated
  BEFORE UPDATE ON public.admin_daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. TABLE : admin_activity_log (Journal d'activité admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,              -- ex: 'course.created', 'store.approved'
  entity_type TEXT,                  -- ex: 'course', 'store', 'kyc'
  entity_id TEXT,
  entity_title TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created 
  ON public.admin_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action 
  ON public.admin_activity_log(action);

-- ============================================================
-- 3. VUE : Revenue agrégé par module
-- NOTE : utilise les vrais noms de tables du projet :
--   products, service_packages, service_quotes, marketplace_orders
--   et les valeurs exactes des enums (order_status = 'Paye')
-- ============================================================
CREATE OR REPLACE VIEW public.v_platform_revenue_summary AS
SELECT
  'marketplace' AS module_name,
  COALESCE(SUM(o.amount_usd), 0) AS revenue_usd,
  COALESCE(SUM(o.platform_commission_usd), 0) AS platform_fee_usd,
  COALESCE(SUM(o.vendor_earnings_usd), 0) AS net_vendor_earnings_usd,
  COUNT(o.id) AS transaction_count
FROM public.marketplace_orders o
WHERE o.status = 'Paye'

UNION ALL

SELECT
  'courses' AS module_name,
  COALESCE(SUM(c.price * c.students_count), 0) AS revenue_usd,
  0 AS platform_fee_usd,
  0 AS net_vendor_earnings_usd,
  COUNT(c.id) AS transaction_count
FROM public.courses c

UNION ALL

SELECT
  'digital_products' AS module_name,
  COALESCE(SUM(p.price * p.sales_count), 0) AS revenue_usd,
  0 AS platform_fee_usd,
  0 AS net_vendor_earnings_usd,
  COUNT(p.id) AS transaction_count
FROM public.products p

UNION ALL

SELECT
  'instructor_commissions' AS module_name,
  COALESCE(SUM(ic.amount_paid_usd), 0) AS revenue_usd,
  COALESCE(SUM(ic.platform_fee_usd), 0) AS platform_fee_usd,
  COALESCE(SUM(ic.instructor_earnings_usd), 0) AS net_vendor_earnings_usd,
  COUNT(ic.id) AS transaction_count
FROM public.instructor_commissions ic;

-- ============================================================
-- 4. VUE : Actions admin en attente (pour les badges sidebar)
-- NOTE : utilise les vrais noms de tables et valeurs d'enums
--   approval_status = 'En_attente', quote_status = 'Recu'
-- ============================================================
CREATE OR REPLACE VIEW public.v_admin_pending_actions AS
SELECT
  'kyc' AS action_type,
  COUNT(*) AS pending_count
FROM public.kyc_submissions
WHERE status = 'En_attente'

UNION ALL

SELECT
  'vendor_applications' AS action_type,
  COUNT(*) AS pending_count
FROM public.vendor_applications
WHERE status = 'En_attente'

UNION ALL

SELECT
  'payouts' AS action_type,
  COUNT(*) AS pending_count
FROM public.payout_requests
WHERE status = 'En_attente'

UNION ALL

SELECT
  'service_quotes' AS action_type,
  COUNT(*) AS pending_count
FROM public.service_quotes
WHERE status = 'Recu';

-- ============================================================
-- 5. VUE : Top performances (formations, produits, formateurs)
-- ============================================================
CREATE OR REPLACE VIEW public.v_top_performers AS
-- Top 10 formations par étudiants
SELECT
  'course' AS entity_type,
  c.id AS entity_id,
  c.title AS entity_title,
  c.students_count AS metric_value,
  c.price AS revenue_usd,
  c.rating AS rating,
  ROW_NUMBER() OVER (ORDER BY c.students_count DESC) AS rank
FROM public.courses c
ORDER BY c.students_count DESC
LIMIT 10;

-- ============================================================
-- 6. FONCTION : Revenus hebdomadaires (7 derniers jours)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_weekly_revenue(days_back INT DEFAULT 7)
RETURNS TABLE (
  day_label TEXT,
  revenue_usd DECIMAL(12,2),
  orders_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    SELECT CURRENT_DATE - (days_back - 1) AS day
    UNION ALL
    SELECT day + 1 FROM dates WHERE day < CURRENT_DATE
  )
  SELECT
    TO_CHAR(d.day, 'Day') AS day_label,
    COALESCE(SUM(o.amount_usd), 0) AS revenue_usd,
    COUNT(o.id)::BIGINT AS orders_count
  FROM dates d
  LEFT JOIN public.marketplace_orders o 
    ON DATE(o.created_at) = d.day
    AND o.status = 'Paye'
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;

-- ============================================================
-- 7. FONCTION : Statistiques globales instantanées
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_revenue_usd', COALESCE((SELECT SUM(amount_usd) FROM public.marketplace_orders WHERE status = 'Paye'), 0),
    'total_platform_commissions_usd', COALESCE((SELECT SUM(platform_commission_usd) FROM public.marketplace_orders WHERE status = 'Paye'), 0),
    'total_vendor_earnings_usd', COALESCE((SELECT SUM(vendor_earnings_usd) FROM public.marketplace_orders WHERE status = 'Paye'), 0),
    'total_students', COALESCE((SELECT SUM(students_count) FROM public.courses), 0),
    'total_courses', (SELECT COUNT(*) FROM public.courses),
    'total_products', (SELECT COUNT(*) FROM public.products),
    'total_services', (SELECT COUNT(*) FROM public.service_packages),
    'total_stores', (SELECT COUNT(*) FROM public.stores),
    'active_stores', (SELECT COUNT(*) FROM public.stores WHERE status = 'active'),
    'total_instructors', (SELECT COUNT(*) FROM public.training_centers),
    'active_instructors', (SELECT COUNT(*) FROM public.training_centers WHERE status = 'active'),
    'total_orders', (SELECT COUNT(*) FROM public.marketplace_orders),
    'paid_orders', (SELECT COUNT(*) FROM public.marketplace_orders WHERE status = 'Paye'),
    'pending_kyc', (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'En_attente'),
    'pending_vendor_applications', (SELECT COUNT(*) FROM public.vendor_applications WHERE status = 'En_attente'),
    'pending_payouts', (SELECT COUNT(*) FROM public.payout_requests WHERE status = 'En_attente'),
    'pending_quotes', (SELECT COUNT(*) FROM public.service_quotes WHERE status = 'Recu')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- ============================================================
-- 8. FONCTION : Journaliser une action admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_admin_email TEXT,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_title TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.admin_activity_log (
    admin_email, action, entity_type, entity_id, entity_title, details
  ) VALUES (
    p_admin_email, p_action, p_entity_type, p_entity_id, p_entity_title, p_details
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- ============================================================
-- 9. RLS POLICIES pour les nouvelles tables
-- ============================================================
ALTER TABLE public.admin_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire/écrire les stats
DROP POLICY IF EXISTS "Admins can manage daily stats" ON public.admin_daily_stats;
CREATE POLICY "Admins can manage daily stats"
  ON public.admin_daily_stats
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admins can manage activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can manage activity log"
  ON public.admin_activity_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- 10. GRANT PERMISSIONS
-- ============================================================
GRANT SELECT ON public.admin_daily_stats TO authenticated;
GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_revenue(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;