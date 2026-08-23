-- ============================================================
-- FORTIA HUB — SQL 13 : TRIGGERS
-- Description : Mises à jour automatiques des compteurs et données agrégées
-- Ordre d'exécution : 13 (après SQL 12)
-- ============================================================

-- ========== HELPER : updated_at automatique ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_packages_updated_at BEFORE UPDATE ON service_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_quotes_updated_at BEFORE UPDATE ON service_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_marketplace_orders_updated_at BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payment_gateways_updated_at BEFORE UPDATE ON payment_gateways
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_content_updated_at BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_config_updated_at BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_registration_fee_updated_at BEFORE UPDATE ON registration_fee_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_stats_updated_at BEFORE UPDATE ON platform_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== TRIGGER : Compter les leçons d'un cours ==========
CREATE OR REPLACE FUNCTION update_course_lesson_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE courses SET lessons_count = (
    SELECT COUNT(*) FROM course_lessons cl
    JOIN course_chapters cc ON cl.chapter_id = cc.id
    WHERE cc.course_id = courses.id
  ) WHERE id IN (
    SELECT cc.course_id FROM course_chapters cc WHERE cc.id = COALESCE(NEW.chapter_id, OLD.chapter_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_course_lessons_count_insert AFTER INSERT ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_course_lesson_count();

CREATE TRIGGER trg_course_lessons_count_delete AFTER DELETE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_course_lesson_count();

-- ========== TRIGGER : Inscription → incrémente students_count ==========
CREATE OR REPLACE FUNCTION increment_course_students()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE courses SET students_count = students_count + 1 WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_course_students_insert AFTER INSERT ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION increment_course_students();

-- ========== TRIGGER : Commande payée → met à jour compteurs produits/boutiques ==========
CREATE OR REPLACE FUNCTION on_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'Paye' AND (OLD.status IS NULL OR OLD.status <> 'Paye') THEN
    UPDATE products SET sales_count = sales_count + 1, reviews_count = reviews_count WHERE id = NEW.product_id;
    UPDATE stores SET sales_count = sales_count + 1, total_revenue_usd = total_revenue_usd + NEW.vendor_earnings_usd WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_paid_after_insert AFTER INSERT ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION on_order_paid();

CREATE TRIGGER trg_order_paid_after_update AFTER UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION on_order_paid();

-- ========== TRIGGER : Plateforme stats agrégées ==========
CREATE OR REPLACE FUNCTION refresh_platform_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE platform_stats SET
    total_users = (SELECT COUNT(*) FROM users),
    total_admins = (SELECT COUNT(*) FROM admin_users),
    total_courses = (SELECT COUNT(*) FROM courses),
    total_products = (SELECT COUNT(*) FROM products),
    total_stores = (SELECT COUNT(*) FROM stores),
    total_orders = (SELECT COUNT(*) FROM marketplace_orders),
    total_revenue_usd = (SELECT COALESCE(SUM(amount_usd), 0) FROM marketplace_orders),
    total_commissions_usd = (SELECT COALESCE(SUM(platform_commission_usd), 0) FROM marketplace_orders),
    total_payouts_usd = (SELECT COALESCE(SUM(amount_usd), 0) FROM payout_requests WHERE status = 'Paye'),
    total_certificates = (SELECT COUNT(*) FROM certificates),
    total_kyc_pending = (SELECT COUNT(*) FROM kyc_submissions WHERE status = 'En_attente'),
    total_vendor_applications_pending = (SELECT COUNT(*) FROM vendor_applications WHERE status = 'En_attente'),
    total_support_submissions = (SELECT COUNT(*) FROM post_purchase_support),
    total_service_quotes = (SELECT COUNT(*) FROM service_quotes)
  WHERE id = (SELECT id FROM platform_stats LIMIT 1);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_stats_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_courses AFTER INSERT OR UPDATE OR DELETE ON courses
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_products AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_stores AFTER INSERT OR UPDATE OR DELETE ON stores
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_orders AFTER INSERT OR UPDATE OR DELETE ON marketplace_orders
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_kyc AFTER INSERT OR UPDATE ON kyc_submissions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_vendor_apps AFTER INSERT OR UPDATE ON vendor_applications
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_support AFTER INSERT OR DELETE ON post_purchase_support
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

CREATE TRIGGER trg_stats_quotes AFTER INSERT OR DELETE ON service_quotes
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

-- ========== TRIGGER : Suppression définitive après 24h ==========
CREATE OR REPLACE FUNCTION process_pending_deletions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delete_at <= NOW() AND NEW.processed = FALSE THEN
    DELETE FROM users WHERE id = NEW.user_id;
    UPDATE pending_deletions SET processed = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_deletions AFTER INSERT OR UPDATE ON pending_deletions
  FOR EACH ROW EXECUTE FUNCTION process_pending_deletions();

-- ========== TRIGGER : Badge par défaut après approbation KYC ==========
-- Déjà géré dans la RPC rpc_approve_kyc (SQL 11)
-- ========== TRIGGER : Certificat unique par étudiant+cours ==========
CREATE OR REPLACE FUNCTION prevent_duplicate_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM certificates
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'Un certificat existe déjà pour cet étudiant et ce cours.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_certificate_unique BEFORE INSERT ON certificates
  FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_certificate();

-- ========== TRIGGER : Génération QR automatique ==========
CREATE OR REPLACE FUNCTION set_certificate_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_code_url = '' THEN
    NEW.qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || NEW.certificate_number;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_certificate_qr BEFORE INSERT ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_certificate_qr();