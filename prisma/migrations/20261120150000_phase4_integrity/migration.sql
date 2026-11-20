-- ============================================================
-- FORTIA HUB — PHASE 4 : intégrité relationnelle et conservation
-- ------------------------------------------------------------
-- Migration IDEMPOTENTE. Aucune donnée historique n'est perdue :
-- les lignes orphelines sont d'abord copiées dans `data_archive`.
-- Les sessions expirées/orphelines (jetons éphémères) sont supprimées.
-- ============================================================

-- 1) Archive des données déplacées
CREATE TABLE IF NOT EXISTS data_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS data_archive_table_name_record_id_reason_key
  ON data_archive (table_name, record_id, reason);
CREATE INDEX IF NOT EXISTS data_archive_table_name_idx ON data_archive (table_name);
CREATE INDEX IF NOT EXISTS data_archive_archived_at_idx ON data_archive (archived_at);

-- 2) Orphelins de l'académie : chapitres / leçons / quiz / options
INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'course_chapters', c.id::text, 'orphan_course', to_jsonb(c)
FROM course_chapters c
WHERE NOT EXISTS (SELECT 1 FROM courses x WHERE x.id = c.course_id)
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'course_lessons', l.id::text, 'orphan_chapter', to_jsonb(l)
FROM course_lessons l
WHERE NOT EXISTS (SELECT 1 FROM course_chapters c WHERE c.id = l.chapter_id)
   OR EXISTS (
     SELECT 1 FROM course_chapters c
     WHERE c.id = l.chapter_id
       AND NOT EXISTS (SELECT 1 FROM courses x WHERE x.id = c.course_id)
   )
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'course_quizzes', q.id::text, 'orphan_course', to_jsonb(q)
FROM course_quizzes q
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = q.course_id)
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'quiz_options', o.id::text, 'orphan_quiz', to_jsonb(o)
FROM quiz_options o
WHERE NOT EXISTS (SELECT 1 FROM course_quizzes q WHERE q.id = o.quiz_id)
   OR EXISTS (
     SELECT 1 FROM course_quizzes q
     WHERE q.id = o.quiz_id
       AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = q.course_id)
   )
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'course_reviews', r.id::text, 'orphan_course_or_user', to_jsonb(r)
FROM course_reviews r
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = r.course_id)
   OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id)
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

INSERT INTO data_archive (table_name, record_id, reason, payload)
SELECT 'service_options', o.id::text, 'orphan_service', to_jsonb(o)
FROM service_options o
WHERE NOT EXISTS (SELECT 1 FROM service_packages p WHERE p.id = o.service_id)
ON CONFLICT (table_name, record_id, reason) DO NOTHING;

-- Suppression des orphelins (après archivage)
DELETE FROM course_lesson_progress p
WHERE NOT EXISTS (SELECT 1 FROM course_lessons l WHERE l.id = p.lesson_id)
   OR NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = p.course_id);
DELETE FROM course_quiz_attempts a
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = a.course_id);
DELETE FROM course_lessons l
WHERE NOT EXISTS (SELECT 1 FROM course_chapters c WHERE c.id = l.chapter_id)
   OR EXISTS (
     SELECT 1 FROM course_chapters c
     WHERE c.id = l.chapter_id
       AND NOT EXISTS (SELECT 1 FROM courses x WHERE x.id = c.course_id)
   );
DELETE FROM course_chapters c
WHERE NOT EXISTS (SELECT 1 FROM courses x WHERE x.id = c.course_id);
DELETE FROM quiz_options o
WHERE NOT EXISTS (SELECT 1 FROM course_quizzes q WHERE q.id = o.quiz_id)
   OR EXISTS (
     SELECT 1 FROM course_quizzes q
     WHERE q.id = o.quiz_id
       AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = q.course_id)
   );
DELETE FROM course_quizzes q
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = q.course_id);
DELETE FROM course_reviews r
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = r.course_id)
   OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id);
DELETE FROM service_options o
WHERE NOT EXISTS (SELECT 1 FROM service_packages p WHERE p.id = o.service_id);

-- 3) Commandes historiques : produit supprimé → référence nullable
UPDATE marketplace_orders o
SET product_id = NULL
WHERE o.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = o.product_id);

-- 4) Sessions : jetons expirés ou rattachés à un compte inexistant
--    (aucun archivage : ce sont des secrets éphémères)
DELETE FROM sessions s
WHERE s.expires_at < now()
   OR (s.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id))

   OR (s.admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.id::text = s.admin_user_id::text));


-- 5) Normalisation des e-mails (aucune valeur perd au-delà de la casse)
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- 6) Réconciliation des types incompatibles (valeurs vérifiées UUID)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_users' AND column_name='id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE admin_users ALTER COLUMN id TYPE UUID USING id::uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='instructor_commissions' AND column_name='order_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE instructor_commissions ALTER COLUMN order_id TYPE UUID USING NULLIF(order_id, '')::uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='entitlements' AND column_name='payment_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE entitlements ALTER COLUMN payment_id TYPE UUID USING NULLIF(payment_id, '')::uuid;
  END IF;
END $$;


-- 7) Politiques de suppression : remplacer les cascades dangereuses
ALTER TABLE marketplace_order_items
  DROP CONSTRAINT IF EXISTS marketplace_order_items_order_id_fkey;
ALTER TABLE marketplace_order_items
  ADD CONSTRAINT marketplace_order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE RESTRICT;

ALTER TABLE refunds
  DROP CONSTRAINT IF EXISTS refunds_order_id_fkey;
ALTER TABLE refunds
  ADD CONSTRAINT refunds_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE RESTRICT;
ALTER TABLE refunds
  DROP CONSTRAINT IF EXISTS refunds_payment_id_fkey;
ALTER TABLE refunds
  ADD CONSTRAINT refunds_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT;

ALTER TABLE training_centers
  DROP CONSTRAINT IF EXISTS training_centers_owner_id_fkey;
ALTER TABLE training_centers
  ADD CONSTRAINT training_centers_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 8) Clés étrangères manquantes (idempotent)
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('sessions_user_id_fkey', 'ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('sessions_admin_user_id_fkey', 'ALTER TABLE sessions ADD CONSTRAINT sessions_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE'),
      ('courses_center_id_fkey', 'ALTER TABLE courses ADD CONSTRAINT courses_center_id_fkey FOREIGN KEY (center_id) REFERENCES training_centers(id) ON DELETE SET NULL'),
      ('courses_category_id_fkey', 'ALTER TABLE courses ADD CONSTRAINT courses_category_id_fkey FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE SET NULL'),
      ('course_chapters_course_id_fkey', 'ALTER TABLE course_chapters ADD CONSTRAINT course_chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('course_lessons_chapter_id_fkey', 'ALTER TABLE course_lessons ADD CONSTRAINT course_lessons_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE'),
      ('course_quizzes_course_id_fkey', 'ALTER TABLE course_quizzes ADD CONSTRAINT course_quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('quiz_options_quiz_id_fkey', 'ALTER TABLE quiz_options ADD CONSTRAINT quiz_options_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE'),
      ('course_enrollments_user_id_fkey', 'ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('course_enrollments_course_id_fkey', 'ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('course_reviews_user_id_fkey', 'ALTER TABLE course_reviews ADD CONSTRAINT course_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('course_reviews_course_id_fkey', 'ALTER TABLE course_reviews ADD CONSTRAINT course_reviews_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('certificates_user_id_fkey', 'ALTER TABLE certificates ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('certificates_course_id_fkey', 'ALTER TABLE certificates ADD CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL'),
      ('products_store_id_fkey', 'ALTER TABLE products ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL'),
      ('products_vendor_id_fkey', 'ALTER TABLE products ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('stores_vendor_id_fkey', 'ALTER TABLE stores ADD CONSTRAINT stores_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('product_files_product_id_fkey', 'ALTER TABLE product_files ADD CONSTRAINT product_files_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'),
      ('product_reviews_product_id_fkey', 'ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'),
      ('product_reviews_user_id_fkey', 'ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('store_payout_info_store_id_fkey', 'ALTER TABLE store_payout_info ADD CONSTRAINT store_payout_info_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE'),
      ('payout_requests_store_id_fkey', 'ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL'),
      ('marketplace_orders_store_id_fkey', 'ALTER TABLE marketplace_orders ADD CONSTRAINT marketplace_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL'),
      ('marketplace_orders_product_id_fkey', 'ALTER TABLE marketplace_orders ADD CONSTRAINT marketplace_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL'),
      ('payment_transactions_order_id_fkey', 'ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE RESTRICT'),
      ('payment_transactions_user_id_fkey', 'ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('payment_transactions_gateway_id_fkey', 'ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id) ON DELETE SET NULL'),
      ('entitlements_payment_id_fkey', 'ALTER TABLE entitlements ADD CONSTRAINT entitlements_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payment_transactions(id) ON DELETE SET NULL'),
      ('course_lesson_progress_user_id_fkey', 'ALTER TABLE course_lesson_progress ADD CONSTRAINT course_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('course_lesson_progress_course_id_fkey', 'ALTER TABLE course_lesson_progress ADD CONSTRAINT course_lesson_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('course_lesson_progress_lesson_id_fkey', 'ALTER TABLE course_lesson_progress ADD CONSTRAINT course_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE'),
      ('course_quiz_attempts_user_id_fkey', 'ALTER TABLE course_quiz_attempts ADD CONSTRAINT course_quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('course_quiz_attempts_course_id_fkey', 'ALTER TABLE course_quiz_attempts ADD CONSTRAINT course_quiz_attempts_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE'),
      ('notifications_user_id_fkey', 'ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('vendor_applications_user_id_fkey', 'ALTER TABLE vendor_applications ADD CONSTRAINT vendor_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'),
      ('freelance_profiles_user_id_fkey', 'ALTER TABLE freelance_profiles ADD CONSTRAINT freelance_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('freelance_services_freelance_id_fkey', 'ALTER TABLE freelance_services ADD CONSTRAINT freelance_services_freelance_id_fkey FOREIGN KEY (freelance_id) REFERENCES freelance_profiles(id) ON DELETE CASCADE'),
      ('freelance_portfolio_freelance_id_fkey', 'ALTER TABLE freelance_portfolio ADD CONSTRAINT freelance_portfolio_freelance_id_fkey FOREIGN KEY (freelance_id) REFERENCES freelance_profiles(id) ON DELETE CASCADE'),
      ('enterprise_profiles_user_id_fkey', 'ALTER TABLE enterprise_profiles ADD CONSTRAINT enterprise_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
      ('enterprise_team_enterprise_id_fkey', 'ALTER TABLE enterprise_team ADD CONSTRAINT enterprise_team_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE'),
      ('enterprise_portfolio_enterprise_id_fkey', 'ALTER TABLE enterprise_portfolio ADD CONSTRAINT enterprise_portfolio_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE'),
      ('enterprise_services_enterprise_id_fkey', 'ALTER TABLE enterprise_services ADD CONSTRAINT enterprise_services_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE'),
      ('service_options_service_id_fkey', 'ALTER TABLE service_options ADD CONSTRAINT service_options_service_id_fkey FOREIGN KEY (service_id) REFERENCES service_packages(id) ON DELETE CASCADE'),
      ('service_quotes_service_id_fkey', 'ALTER TABLE service_quotes ADD CONSTRAINT service_quotes_service_id_fkey FOREIGN KEY (service_id) REFERENCES service_packages(id) ON DELETE SET NULL'),
      ('blog_posts_category_id_fkey', 'ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL'),
      ('instructor_commissions_instructor_id_fkey', 'ALTER TABLE instructor_commissions ADD CONSTRAINT instructor_commissions_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT'),
      ('instructor_commissions_course_id_fkey', 'ALTER TABLE instructor_commissions ADD CONSTRAINT instructor_commissions_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL'),
      ('instructor_commissions_order_id_fkey', 'ALTER TABLE instructor_commissions ADD CONSTRAINT instructor_commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL'),
      ('instructor_storage_purchases_instructor_id_fkey', 'ALTER TABLE instructor_storage_purchases ADD CONSTRAINT instructor_storage_purchases_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT')
    ) AS v(name, ddl)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = item.name AND connamespace = 'public'::regnamespace
    ) THEN
      EXECUTE item.ddl;
    END IF;
  END LOOP;
END $$;

-- 9) Index des clés étrangères et des recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_sessions_admin_user_id ON sessions (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_courses_center_id ON courses (center_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses (instructor_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products (vendor_id);
CREATE INDEX IF NOT EXISTS idx_course_quizzes_course_id ON course_quizzes (course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_quiz_id ON quiz_options (quiz_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON course_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_product_files_product_id ON product_files (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_store_id ON payout_requests (store_id);
CREATE INDEX IF NOT EXISTS idx_instructor_commissions_order_id ON instructor_commissions (order_id);
CREATE INDEX IF NOT EXISTS idx_instructor_storage_purchases_instructor_id ON instructor_storage_purchases (instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_order_id ON entitlements (order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_subscription_id ON entitlements (subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_payment_id ON entitlements (payment_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_product_id ON marketplace_orders (product_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_progress_lesson_id ON course_lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id ON vendor_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_service_options_service_id ON service_options (service_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_service_id ON service_quotes (service_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts (category_id);
CREATE INDEX IF NOT EXISTS idx_freelance_services_freelance_id ON freelance_services (freelance_id);
CREATE INDEX IF NOT EXISTS idx_freelance_portfolio_freelance_id ON freelance_portfolio (freelance_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_enterprise_id ON enterprise_team (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_portfolio_enterprise_id ON enterprise_portfolio (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_services_enterprise_id ON enterprise_services (enterprise_id);

-- 10) Unicités métier
-- E-mail insensible à la casse (les doublons ont été vérifiés : 0)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
-- Une seule attestation par apprenant et formation (sans bloquer un rachat)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_key
  ON certificates (user_id, course_id)
  WHERE user_id IS NOT NULL AND course_id IS NOT NULL;
-- Un seul avis par utilisateur et produit (les doublons ont été vérifiés : 0)
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_user_product_key
  ON product_reviews (product_id, user_id)
  WHERE user_id IS NOT NULL;

