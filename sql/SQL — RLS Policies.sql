-- ============================================================
-- FORTIA HUB — SQL 12 : RLS / SECURITY POLICIES
-- Description : Row Level Security pour chaque table
-- Rôles : anon (public), authenticated (utilisateur), seller (vendeur), admin
-- Ordre d'exécution : 12 (après SQL 11)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_payout_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_purchase_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelance_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RÔLE ANONYME (PUBLIC) — Lecture seule des données publiques
-- ============================================================

CREATE POLICY "Public read courses" ON courses FOR SELECT TO anon USING (is_published = TRUE);
CREATE POLICY "Public read course_categories" ON course_categories FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read chapters" ON course_chapters FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read lessons" ON course_lessons FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read quizzes" ON course_quizzes FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read quiz_options" ON quiz_options FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read products" ON products FOR SELECT TO anon USING (is_published = TRUE AND is_approved = TRUE);
CREATE POLICY "Public read product_files" ON product_files FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read stores" ON stores FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Public read store_payout_info" ON store_payout_info FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read freelance_profiles" ON freelance_profiles FOR SELECT TO anon USING (is_visible = TRUE);
CREATE POLICY "Public read freelance_services" ON freelance_services FOR SELECT TO anon USING (is_active = TRUE);
CREATE POLICY "Public read freelance_portfolio" ON freelance_portfolio FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read enterprise_profiles" ON enterprise_profiles FOR SELECT TO anon USING (is_visible = TRUE);
CREATE POLICY "Public read enterprise_team" ON enterprise_team FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read enterprise_portfolio" ON enterprise_portfolio FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read enterprise_services" ON enterprise_services FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read service_packages" ON service_packages FOR SELECT TO anon USING (is_active = TRUE);
CREATE POLICY "Public read service_options" ON service_options FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read blog_posts" ON blog_posts FOR SELECT TO anon USING (is_published = TRUE);
CREATE POLICY "Public read blog_categories" ON blog_categories FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read site_content" ON site_content FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read platform_stats" ON platform_stats FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Public read registration_fee_config" ON registration_fee_config FOR SELECT TO anon USING (fee_enabled = TRUE);
CREATE POLICY "Public read platform_config public keys" ON platform_config FOR SELECT TO anon USING (key IN ('currency_rates', 'platform_settings'));
CREATE POLICY "Public read active payment_gateways" ON payment_gateways FOR SELECT TO anon USING (is_active = TRUE);

-- ============================================================
-- RÔLE AUTHENTIFIÉ (UTILISATEUR CONNECTÉ)
-- ============================================================

-- Utilisateurs : lecture de son propre profil uniquement
CREATE POLICY "Users read own profile" ON users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Sessions : lecture/suppression de ses propres sessions
CREATE POLICY "Sessions read own" ON sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Sessions insert own" ON sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sessions delete own" ON sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- OTP : tous les utilisateurs peuvent lire/insérer (nécessaire avant auth.uid)
CREATE POLICY "OTP public insert" ON otp_codes FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "OTP read own email" ON otp_codes FOR SELECT TO authenticated USING (email = (SELECT email FROM users WHERE id = auth.uid()));

-- Inscriptions aux cours
CREATE POLICY "Enrollments read own" ON course_enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Enrollments insert own" ON course_enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Enrollments update own" ON course_enrollments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Avis cours : ses propres avis + lecture publique
CREATE POLICY "Course reviews insert own" ON course_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Course reviews update own" ON course_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Course reviews delete own" ON course_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Course reviews read public" ON course_reviews FOR SELECT TO authenticated USING (TRUE);

-- Certificats : ses propres certificats
CREATE POLICY "Certificates read own" ON certificates FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Commandes : ses propres commandes (par email)
CREATE POLICY "Orders read own" ON marketplace_orders FOR SELECT TO authenticated USING (buyer_email = (SELECT email FROM users WHERE id = auth.uid()));

-- Notifications : globales ou personnelles
CREATE POLICY "Notifications read" ON notifications FOR SELECT TO authenticated USING (is_global = TRUE OR user_id = auth.uid());
CREATE POLICY "Notifications update own" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- KYC : créer sa demande, lire sa demande
CREATE POLICY "KYC insert own" ON kyc_submissions FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "KYC read own" ON kyc_submissions FOR SELECT TO authenticated USING (applicant_id = auth.uid());

-- Candidatures vendeur : créer la sienne, lire la sienne
CREATE POLICY "Vendor applications insert own" ON vendor_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Vendor applications read own" ON vendor_applications FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Devis services : créer / lire sa demande
CREATE POLICY "Service quotes insert" ON service_quotes FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Service quotes read own" ON service_quotes FOR SELECT TO authenticated USING (client_email = (SELECT email FROM users WHERE id = auth.uid()));

-- Support post-achat : créer une soumission
CREATE POLICY "Support insert" ON post_purchase_support FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Demandes de suppression : l'utilisateur peut demander pour lui-même
CREATE POLICY "Pending deletions insert own" ON pending_deletions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Pending deletions read own" ON pending_deletions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- RÔLE VENDEUR / BOUTIQUE (store owner)
-- ============================================================

-- Boutique : gérer sa propre boutique
CREATE POLICY "Store owner manage own store" ON stores FOR ALL TO authenticated
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- Payout info de sa boutique
CREATE POLICY "Store owner manage payout info" ON store_payout_info FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));

-- Produits : CRUD de sa boutique
CREATE POLICY "Vendor products read own" ON products FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));
CREATE POLICY "Vendor products insert own" ON products FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));
CREATE POLICY "Vendor products update own" ON products FOR UPDATE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));
CREATE POLICY "Vendor products delete own" ON products FOR DELETE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));

-- Fichiers produits de sa boutique
CREATE POLICY "Vendor product_files manage own" ON product_files FOR ALL TO authenticated
  USING (product_id IN (SELECT p.id FROM products p JOIN stores s ON p.store_id = s.id WHERE s.vendor_id = auth.uid()))
  WITH CHECK (product_id IN (SELECT p.id FROM products p JOIN stores s ON p.store_id = s.id WHERE s.vendor_id = auth.uid()));

-- Commandes de sa boutique
CREATE POLICY "Vendor orders read own" ON marketplace_orders FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));

-- Retraits de sa boutique
CREATE POLICY "Vendor payout insert own" ON payout_requests FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));
CREATE POLICY "Vendor payout read own" ON payout_requests FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE vendor_id = auth.uid()));

-- Profil freelance : gérer le sien
CREATE POLICY "Freelance manage own profile" ON freelance_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Services freelance de son profil
CREATE POLICY "Freelance manage own services" ON freelance_services FOR ALL TO authenticated
  USING (freelance_id IN (SELECT id FROM freelance_profiles WHERE user_id = auth.uid()))
  WITH CHECK (freelance_id IN (SELECT id FROM freelance_profiles WHERE user_id = auth.uid()));

-- Portfolio freelance
CREATE POLICY "Freelance manage own portfolio" ON freelance_portfolio FOR ALL TO authenticated
  USING (freelance_id IN (SELECT id FROM freelance_profiles WHERE user_id = auth.uid()))
  WITH CHECK (freelance_id IN (SELECT id FROM freelance_profiles WHERE user_id = auth.uid()));

-- Profil entreprise : gérer le sien
CREATE POLICY "Enterprise manage own profile" ON enterprise_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RÔLE ADMINISTRATEUR (service_role / admin_users)
-- ============================================================

-- Les admins ont un accès total via le rôle service_role (Supabase).
-- Pour une table admin_users séparée, on utilise une fonction helper.
-- NOTE : La fonction est créée dans le schéma `public` (et non `auth`)
-- car le schéma `auth` est réservé à Supabase et interdit en écriture.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND is_active = TRUE
  );
$$;

-- Alias de compatibilité (si le schéma auth est accessible)
-- GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- Policy générique pour les RPC: les fonctions sont SECURITY DEFINER et
-- utilisent rpc_ (préfixe) pour garantir un accès contrôlé.

-- Lecture complète admin sur les tables sensibles (via service_role)
CREATE POLICY "Admin full access users" ON users FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access admin_users" ON admin_users FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access products" ON products FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access stores" ON stores FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access marketplace_orders" ON marketplace_orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access payout_requests" ON payout_requests FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access kyc_submissions" ON kyc_submissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access vendor_applications" ON vendor_applications FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access blog_posts" ON blog_posts FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access notifications" ON notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access payment_gateways" ON payment_gateways FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access payment_transactions" ON payment_transactions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access payment_webhooks" ON payment_webhooks FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access service_quotes" ON service_quotes FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access post_purchase_support" ON post_purchase_support FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access site_content" ON site_content FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access platform_config" ON platform_config FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access platform_stats" ON platform_stats FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access registration_fee_config" ON registration_fee_config FOR ALL USING (public.is_admin());


-- ============================================================
-- NOTE IMPORTANTE SUR auth.uid()
-- ============================================================
-- Ce fichier RLS est conçu pour Supabase (auth.uid()).
-- Si vous utilisez Prisma avec votre propre auth, remplacez auth.uid()
-- par la fonction équivalente de votre système (ex: current_setting('app.user_id')).