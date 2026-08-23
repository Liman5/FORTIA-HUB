-- ============================================================
-- FORTIA HUB — SQL 11 : RPC (FONCTIONS STOCKÉES)
-- Description : Fonctions réutilisables : stats, KYC, commandes, paiements, certificats
-- Ordre d'exécution : 11 (après SQL 10)
-- ============================================================

-- ========== 1. STATISTIQUES ADMIN ==========
CREATE OR REPLACE FUNCTION rpc_get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users WHERE is_active = TRUE),
    'total_courses', (SELECT COUNT(*) FROM courses),
    'total_products', (SELECT COUNT(*) FROM products),
    'total_stores', (SELECT COUNT(*) FROM stores),
    'total_orders', (SELECT COUNT(*) FROM marketplace_orders),
    'total_revenue_usd', (SELECT COALESCE(SUM(amount_usd), 0) FROM marketplace_orders),
    'total_commissions_usd', (SELECT COALESCE(SUM(platform_commission_usd), 0) FROM marketplace_orders),
    'total_payouts_usd', (SELECT COALESCE(SUM(amount_usd), 0) FROM payout_requests WHERE status = 'Paye'),
    'total_certificates', (SELECT COUNT(*) FROM certificates),
    'total_kyc_pending', (SELECT COUNT(*) FROM kyc_submissions WHERE status = 'En_attente'),
    'total_vendor_apps_pending', (SELECT COUNT(*) FROM vendor_applications WHERE status = 'En_attente'),
    'total_support_submissions', (SELECT COUNT(*) FROM post_purchase_support),
    'total_service_quotes', (SELECT COUNT(*) FROM service_quotes)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 2. VOLUME MARKETPLACE ==========
CREATE OR REPLACE FUNCTION rpc_get_marketplace_volume()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_volume_usd', (SELECT COALESCE(SUM(amount_usd), 0) FROM marketplace_orders),
    'total_commissions_usd', (SELECT COALESCE(SUM(platform_commission_usd), 0) FROM marketplace_orders),
    'total_vendor_earnings_usd', (SELECT COALESCE(SUM(vendor_earnings_usd), 0) FROM marketplace_orders),
    'active_stores', (SELECT COUNT(*) FROM stores WHERE status = 'active'),
    'pending_stores', (SELECT COUNT(*) FROM stores WHERE status = 'pending'),
    'total_sales_count', (SELECT COALESCE(SUM(sales_count), 0) FROM stores)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 3. STATS COURS ==========
CREATE OR REPLACE FUNCTION rpc_get_course_stats(course_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'students_count', (SELECT COUNT(*) FROM course_enrollments WHERE course_id = course_uuid),
    'avg_progress', (SELECT COALESCE(AVG(progress), 0) FROM course_enrollments WHERE course_id = course_uuid),
    'completed_count', (SELECT COUNT(*) FROM course_enrollments WHERE course_id = course_uuid AND completed_at IS NOT NULL),
    'avg_rating', (SELECT COALESCE(AVG(rating), 0) FROM course_reviews WHERE course_id = course_uuid),
    'reviews_count', (SELECT COUNT(*) FROM course_reviews WHERE course_id = course_uuid)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 4. REVENUS BOUTIQUE ==========
CREATE OR REPLACE FUNCTION rpc_get_store_revenue(store_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'gross_revenue_usd', (SELECT COALESCE(SUM(amount_usd), 0) FROM marketplace_orders WHERE store_id = store_uuid),
    'net_earnings_usd', (SELECT COALESCE(SUM(vendor_earnings_usd), 0) FROM marketplace_orders WHERE store_id = store_uuid),
    'orders_count', (SELECT COUNT(*) FROM marketplace_orders WHERE store_id = store_uuid),
    'pending_payouts_usd', (SELECT COALESCE(SUM(amount_usd), 0) FROM payout_requests WHERE store_id = store_uuid AND status = 'En_attente')
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 5. PROFIL UTILISATEUR COMPLET ==========
CREATE OR REPLACE FUNCTION rpc_get_user_profile(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', (SELECT row_to_json(u) FROM users u WHERE u.id = user_uuid),
    'enrollments', (SELECT jsonb_agg(row_to_json(e)) FROM course_enrollments e WHERE e.user_id = user_uuid),
    'certificates', (SELECT jsonb_agg(row_to_json(c)) FROM certificates c WHERE c.user_id = user_uuid),
    'orders', (SELECT jsonb_agg(row_to_json(o)) FROM marketplace_orders o WHERE o.buyer_email = (SELECT email FROM users WHERE id = user_uuid)),
    'freelance_profile', (SELECT row_to_json(f) FROM freelance_profiles f WHERE f.user_id = user_uuid),
    'enterprise_profile', (SELECT row_to_json(e2) FROM enterprise_profiles e2 WHERE e2.user_id = user_uuid)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 6. APPROBATION KYC (avec badge auto) ==========
CREATE OR REPLACE FUNCTION rpc_approve_kyc(kyc_uuid UUID, admin_note TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  kyc_record kyc_submissions%ROWTYPE;
  target_user_id UUID;
BEGIN
  SELECT * INTO kyc_record FROM kyc_submissions WHERE id = kyc_uuid;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  target_user_id := kyc_record.applicant_id;

  -- Mettre à jour la soumission KYC
  UPDATE kyc_submissions
  SET status = 'Approuve', admin_notes = admin_note
  WHERE id = kyc_uuid;

  -- Attribuer le badge selon le type d'utilisateur
  IF kyc_record.applicant_type = 'freelance' THEN
    UPDATE users SET badge = 'green', badge_label = 'Badge Vert (Compte Vérifié Actif)', kyc_status = 'approuve'
    WHERE id = target_user_id;

    UPDATE freelance_profiles
    SET kyc_verified = TRUE, registration_fee_paid = TRUE, can_receive_payments = TRUE, can_sell_services = TRUE, badge = 'green'
    WHERE user_id = target_user_id;
  ELSE
    UPDATE users SET badge = 'gold', badge_label = 'Badge Doré (Société Certifiée)', kyc_status = 'approuve'
    WHERE id = target_user_id;

    UPDATE enterprise_profiles
    SET verified_documents = TRUE, registration_fee_paid = TRUE, can_receive_payments = TRUE, can_sell_services = TRUE, badge = 'gold'
    WHERE user_id = target_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- ========== 7. REJET KYC ==========
CREATE OR REPLACE FUNCTION rpc_reject_kyc(kyc_uuid UUID, reject_reason TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE kyc_submissions
  SET status = 'Rejete', rejection_reason = reject_reason
  WHERE id = kyc_uuid;

  RETURN FOUND;
END;
$$;

-- ========== 8. VALIDATION CANDIDATURE VENDEUR + CRÉATION BOUTIQUE ==========
CREATE OR REPLACE FUNCTION rpc_approve_vendor_application(app_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record vendor_applications%ROWTYPE;
  new_store_id UUID;
BEGIN
  SELECT * INTO app_record FROM vendor_applications WHERE id = app_uuid;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE vendor_applications SET status = 'Approuve' WHERE id = app_uuid;

  INSERT INTO stores (
    vendor_id, owner_name, owner_email, owner_phone, name, slug,
    description, categories, status, is_verified, created_at
  ) VALUES (
    app_record.user_id, app_record.applicant_name, app_record.email, app_record.phone,
    app_record.store_name,
    LOWER(REPLACE(app_record.store_name, ' ', '-')),
    app_record.store_description,
    ARRAY[app_record.store_category],
    'active', TRUE, NOW()
  ) RETURNING id INTO new_store_id;

  RETURN TRUE;
END;
$$;

-- ========== 9. SUPPRESSION COMPTE DIFFÉRÉE 24H ==========
CREATE OR REPLACE FUNCTION rpc_request_account_deletion(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  delete_at TIMESTAMPTZ;
BEGIN
  SELECT email INTO user_email FROM users WHERE id = user_uuid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  delete_at := NOW() + INTERVAL '24 hours';

  INSERT INTO pending_deletions (user_id, email, delete_at)
  VALUES (user_uuid, user_email, delete_at)
  ON CONFLICT DO NOTHING;

  UPDATE users SET deletion_requested_at = NOW(), deletion_scheduled_for = delete_at
  WHERE id = user_uuid;

  RETURN jsonb_build_object(
    'email', user_email,
    'requested_at', NOW(),
    'delete_at', delete_at
  );
END;
$$;

-- ========== 10. CRÉATION COMMANDE + COMMISSIONS AUTO ==========
CREATE OR REPLACE FUNCTION rpc_create_order(
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_store_id UUID,
  p_product_id UUID,
  p_amount_usd NUMERIC,
  p_gateway TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  commission_pct NUMERIC;
  commission_amount NUMERIC;
  vendor_earn NUMERIC;
  new_order_id UUID;
  new_order_number TEXT;
BEGIN
  -- Récupérer la commission par défaut depuis platform_config
  SELECT COALESCE((value->>'default_percentage')::NUMERIC, 10) INTO commission_pct
  FROM platform_config WHERE key = 'platform_commission';

  commission_amount := ROUND((p_amount_usd * commission_pct / 100), 2);
  vendor_earn := p_amount_usd - commission_amount;
  new_order_number := 'CHAR-2026-' || FLOOR(1000 + random() * 9000)::TEXT;

  INSERT INTO marketplace_orders (
    order_number, buyer_name, buyer_email, buyer_phone,
    store_id, store_name, product_id, product_title,
    amount_usd, platform_commission_usd, vendor_earnings_usd,
    payment_gateway, status, created_at
  )
  SELECT
    new_order_number, p_buyer_name, p_buyer_email, p_buyer_phone,
    p_store_id, s.name, p_product_id, p.title,
    p_amount_usd, commission_amount, vendor_earn,
    p_gateway, 'Paye', NOW()
  FROM stores s, products p
  WHERE s.id = p_store_id AND p.id = p_product_id
  RETURNING id INTO new_order_id;

  -- Mettre à jour les compteurs
  UPDATE products SET sales_count = sales_count + 1 WHERE id = p_product_id;
  UPDATE stores SET sales_count = sales_count + 1, total_revenue_usd = total_revenue_usd + vendor_earn WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'order_id', new_order_id,
    'order_number', new_order_number,
    'commission_usd', commission_amount,
    'vendor_earnings_usd', vendor_earn
  );
END;
$$;

-- ========== 11. VALIDATION RETRAIT ==========
CREATE OR REPLACE FUNCTION rpc_approve_payout(payout_uuid UUID, tx_ref TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payout_requests
  SET status = 'Paye', transaction_hash_or_ref = tx_ref
  WHERE id = payout_uuid;

  RETURN FOUND;
END;
$$;

-- ========== 12. SOLDE BOUTIQUE ==========
CREATE OR REPLACE FUNCTION rpc_get_wallet_balance(store_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  earned NUMERIC;
  paid_out NUMERIC;
BEGIN
  SELECT COALESCE(SUM(vendor_earnings_usd), 0) INTO earned
  FROM marketplace_orders WHERE store_id = store_uuid;

  SELECT COALESCE(SUM(amount_usd), 0) INTO paid_out
  FROM payout_requests WHERE store_id = store_uuid AND status = 'Paye';

  RETURN earned - paid_out;
END;
$$;

-- ========== 13. TRAITEMENT CALLBACK PAIEMENT ==========
CREATE OR REPLACE FUNCTION rpc_process_payment_callback(
  p_gateway_code TEXT,
  p_transaction_ref TEXT,
  p_status payment_status
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payment_transactions
  SET status = p_status,
      gateway_response = gateway_response || jsonb_build_object('webhook_processed_at', NOW())
  WHERE transaction_ref = p_transaction_ref;

  RETURN FOUND;
END;
$$;

-- ========== 14. VÉRIFICATION CERTIFICAT ==========
CREATE OR REPLACE FUNCTION rpc_verify_certificate(p_cert_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cert certificates%ROWTYPE;
BEGIN
  SELECT * INTO cert FROM certificates WHERE certificate_number = p_cert_number;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', FALSE, 'message', 'Certificat introuvable.');
  END IF;

  RETURN jsonb_build_object(
    'valid', cert.verified,
    'certificate_number', cert.certificate_number,
    'student_name', cert.student_name,
    'course_title', cert.course_title,
    'category', cert.category,
    'issue_date', cert.issue_date,
    'grade', cert.grade
  );
END;
$$;

-- ========== 15. GÉNÉRATION CERTIFICAT ==========
CREATE OR REPLACE FUNCTION rpc_generate_certificate(user_uuid UUID, course_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  u users%ROWTYPE;
  c courses%ROWTYPE;
  cert_number TEXT;
  category_text TEXT;
BEGIN
  SELECT * INTO u FROM users WHERE id = user_uuid;
  SELECT * INTO c FROM courses WHERE id = course_uuid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  category_text := UPPER(LEFT(SPLIT_PART(c.category_label, ' ', 1), 3));
  cert_number := 'FORTIA-2026-' || category_text || '-' || FLOOR(1000 + random() * 9000)::TEXT;

  INSERT INTO certificates (
    certificate_number, user_id, course_id, student_name, course_title,
    category, issue_date, grade, qr_code_url, verified, created_at
  ) VALUES (
    cert_number, user_uuid, course_uuid, u.name, c.title,
    c.category_label, TO_CHAR(NOW(), 'DD Month YYYY'), 'Mention Très Bien (96%)',
    'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || cert_number,
    TRUE, NOW()
  );

  RETURN cert_number;
END;
$$;

-- ========== 16. DONNÉES PUBLIQUES DE SYNCHRONISATION ==========
CREATE OR REPLACE FUNCTION rpc_get_public_platform_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'site_content', (SELECT row_to_json(sc) FROM site_content sc LIMIT 1),
    'courses', (SELECT jsonb_agg(row_to_json(c)) FROM courses c WHERE is_published = TRUE),
    'products', (SELECT jsonb_agg(row_to_json(p)) FROM products p WHERE is_published = TRUE AND is_approved = TRUE),
    'stores', (SELECT jsonb_agg(row_to_json(s)) FROM stores s WHERE status = 'active'),
    'freelances', (SELECT jsonb_agg(row_to_json(f)) FROM freelance_profiles f WHERE is_visible = TRUE),
    'enterprises', (SELECT jsonb_agg(row_to_json(e)) FROM enterprise_profiles e WHERE is_visible = TRUE),
    'blog_posts', (SELECT jsonb_agg(row_to_json(b)) FROM blog_posts b WHERE is_published = TRUE),
    'services', (SELECT jsonb_agg(row_to_json(sp)) FROM service_packages sp WHERE is_active = TRUE),
    'fee_config', (SELECT row_to_json(fc) FROM registration_fee_config fc LIMIT 1),
    'payment_gateways_public', (SELECT jsonb_agg(jsonb_build_object('code', code, 'name', name, 'is_active', is_active, 'display_order', display_order)) FROM payment_gateways WHERE is_active = TRUE)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== 17. RECHERCHE PRODUITS ==========
CREATE OR REPLACE FUNCTION rpc_search_products(
  p_query TEXT DEFAULT '',
  p_category TEXT DEFAULT '',
  p_store_id UUID DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.* FROM products p
  WHERE p.is_published = TRUE AND p.is_approved = TRUE
    AND (p_query = '' OR p.title ILIKE '%' || p_query || '%' OR p.description ILIKE '%' || p_query || '%')
    AND (p_category = '' OR p.type::TEXT = p_category)
    AND (p_store_id IS NULL OR p.store_id = p_store_id)
  ORDER BY p.created_at DESC;
END;
$$;

-- ========== 18. LISTE GATEWAYS ACTIFS ==========
CREATE OR REPLACE FUNCTION rpc_get_active_payment_gateways()
RETURNS SETOF payment_gateways
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM payment_gateways
  WHERE is_active = TRUE
  ORDER BY display_order ASC;
END;
$$;