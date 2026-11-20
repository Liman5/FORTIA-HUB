-- ============================================================
-- FORTIA HUB — BASELINE TRIGGERS & FONCTIONS (base existante)
-- ------------------------------------------------------------
-- Généré depuis la base réelle après la migration Phase 4.
-- Ces objets ne sont pas gérés par Prisma migrate diff car il
-- n'introspecte pas les triggers. Idempotent (DROP/CREATE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_course_students()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE courses SET students_count = students_count + 1 WHERE id = NEW.course_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'Paye' AND (OLD.status IS NULL OR OLD.status <> 'Paye') THEN
    UPDATE products SET sales_count = sales_count + 1, reviews_count = reviews_count WHERE id = NEW.product_id;
    UPDATE stores SET sales_count = sales_count + 1, total_revenue_usd = total_revenue_usd + NEW.vendor_earnings_usd WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM certificates
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'Un certificat existe déjà pour cet étudiant et ce cours.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_pending_deletions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.delete_at <= NOW() AND NEW.processed = FALSE THEN
    DELETE FROM users WHERE id = NEW.user_id;
    UPDATE pending_deletions SET processed = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_platform_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_certificate_qr()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.qr_code_url = '' THEN
    NEW.qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || NEW.certificate_number;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at_commission_rules()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_course_lesson_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_service_packages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_site_banners_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS "trg_admin_daily_stats_updated" ON public."admin_daily_stats";
CREATE TRIGGER trg_admin_daily_stats_updated BEFORE UPDATE ON public.admin_daily_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_admin_users_updated_at" ON public."admin_users";
CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_blog_posts_updated_at" ON public."blog_posts";
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_certificate_qr" ON public."certificates";
CREATE TRIGGER trg_certificate_qr BEFORE INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION set_certificate_qr();

DROP TRIGGER IF EXISTS "trg_certificate_unique" ON public."certificates";
CREATE TRIGGER trg_certificate_unique BEFORE INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_certificate();

DROP TRIGGER IF EXISTS "trg_commission_rules_updated" ON public."commission_rules";
CREATE TRIGGER trg_commission_rules_updated BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at_commission_rules();

DROP TRIGGER IF EXISTS "trg_course_students_insert" ON public."course_enrollments";
CREATE TRIGGER trg_course_students_insert AFTER INSERT ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION increment_course_students();

DROP TRIGGER IF EXISTS "trg_course_lessons_count_delete" ON public."course_lessons";
CREATE TRIGGER trg_course_lessons_count_delete AFTER DELETE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION update_course_lesson_count();

DROP TRIGGER IF EXISTS "trg_course_lessons_count_insert" ON public."course_lessons";
CREATE TRIGGER trg_course_lessons_count_insert AFTER INSERT ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION update_course_lesson_count();

DROP TRIGGER IF EXISTS "trg_courses_updated_at" ON public."courses";
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_courses" ON public."courses";
CREATE TRIGGER trg_stats_courses AFTER INSERT OR DELETE OR UPDATE ON public.courses FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_stats_kyc" ON public."kyc_submissions";
CREATE TRIGGER trg_stats_kyc AFTER INSERT OR UPDATE ON public.kyc_submissions FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_marketplace_orders_updated_at" ON public."marketplace_orders";
CREATE TRIGGER trg_marketplace_orders_updated_at BEFORE UPDATE ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_order_paid_after_insert" ON public."marketplace_orders";
CREATE TRIGGER trg_order_paid_after_insert AFTER INSERT ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION on_order_paid();

DROP TRIGGER IF EXISTS "trg_stats_orders" ON public."marketplace_orders";
CREATE TRIGGER trg_stats_orders AFTER INSERT OR DELETE OR UPDATE ON public.marketplace_orders FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_payment_gateways_updated_at" ON public."payment_gateways";
CREATE TRIGGER trg_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_payment_transactions_updated_at" ON public."payment_transactions";
CREATE TRIGGER trg_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_process_deletions" ON public."pending_deletions";
CREATE TRIGGER trg_process_deletions AFTER INSERT OR UPDATE ON public.pending_deletions FOR EACH ROW EXECUTE FUNCTION process_pending_deletions();

DROP TRIGGER IF EXISTS "trg_platform_config_updated_at" ON public."platform_config";
CREATE TRIGGER trg_platform_config_updated_at BEFORE UPDATE ON public.platform_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_platform_stats_updated_at" ON public."platform_stats";
CREATE TRIGGER trg_platform_stats_updated_at BEFORE UPDATE ON public.platform_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_support" ON public."post_purchase_support";
CREATE TRIGGER trg_stats_support AFTER INSERT OR DELETE ON public.post_purchase_support FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_products_updated_at" ON public."products";
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_products" ON public."products";
CREATE TRIGGER trg_stats_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_registration_fee_updated_at" ON public."registration_fee_config";
CREATE TRIGGER trg_registration_fee_updated_at BEFORE UPDATE ON public.registration_fee_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_service_packages_updated_at" ON public."service_packages";
CREATE TRIGGER trg_service_packages_updated_at BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION update_service_packages_updated_at();

DROP TRIGGER IF EXISTS "trg_service_quotes_updated_at" ON public."service_quotes";
CREATE TRIGGER trg_service_quotes_updated_at BEFORE UPDATE ON public.service_quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_quotes" ON public."service_quotes";
CREATE TRIGGER trg_stats_quotes AFTER INSERT OR DELETE ON public.service_quotes FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_site_banners_updated_at" ON public."site_banners";
CREATE TRIGGER trg_site_banners_updated_at BEFORE UPDATE ON public.site_banners FOR EACH ROW EXECUTE FUNCTION update_site_banners_updated_at();

DROP TRIGGER IF EXISTS "trg_site_content_updated_at" ON public."site_content";
CREATE TRIGGER trg_site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_stores" ON public."stores";
CREATE TRIGGER trg_stats_stores AFTER INSERT OR DELETE OR UPDATE ON public.stores FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_stores_updated_at" ON public."stores";
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_users" ON public."users";
CREATE TRIGGER trg_stats_users AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();

DROP TRIGGER IF EXISTS "trg_users_updated_at" ON public."users";
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS "trg_stats_vendor_apps" ON public."vendor_applications";
CREATE TRIGGER trg_stats_vendor_apps AFTER INSERT OR UPDATE ON public.vendor_applications FOR EACH STATEMENT EXECUTE FUNCTION refresh_platform_stats();
