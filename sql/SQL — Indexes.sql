-- ============================================================
-- FORTIA HUB — SQL 14 : INDEXES
-- Description : Index de performance pour les requêtes fréquentes
-- Ordre d'exécution : 14 (après SQL 13)
-- ============================================================

-- ========== UTILISATEURS & AUTH ==========
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_badge ON users(badge);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE UNIQUE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_pending_deletions_delete_at ON pending_deletions(delete_at);
CREATE INDEX idx_pending_deletions_processed ON pending_deletions(processed);

-- ========== ACADÉMIE ==========
CREATE UNIQUE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_category_id ON courses(category_id);
CREATE INDEX idx_courses_is_published ON courses(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_course_chapters_course_id ON course_chapters(course_id);
CREATE INDEX idx_course_lessons_chapter_id ON course_lessons(chapter_id);
CREATE INDEX idx_course_quizzes_course_id ON course_quizzes(course_id);
CREATE INDEX idx_quiz_options_quiz_id ON quiz_options(quiz_id);
CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_reviews_course_id ON course_reviews(course_id);
CREATE UNIQUE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);

-- ========== MARKETPLACE ==========
CREATE UNIQUE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_vendor_id ON stores(vendor_id);
CREATE INDEX idx_stores_status ON stores(status) WHERE status = 'active';
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_is_published_approved ON products(is_published, is_approved) WHERE is_published = TRUE AND is_approved = TRUE;
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_product_files_product_id ON product_files(product_id);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_vendor_apps_status ON vendor_applications(status);
CREATE INDEX idx_vendor_apps_submitted_at ON vendor_applications(submitted_at DESC);
CREATE UNIQUE INDEX idx_orders_order_number ON marketplace_orders(order_number);
CREATE INDEX idx_orders_store_id ON marketplace_orders(store_id);
CREATE INDEX idx_orders_buyer_email ON marketplace_orders(buyer_email);
CREATE INDEX idx_orders_created_at ON marketplace_orders(created_at DESC);
CREATE INDEX idx_orders_status ON marketplace_orders(status);
CREATE INDEX idx_payout_requests_store_id ON payout_requests(store_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status) WHERE status = 'En_attente';

-- ========== FREELANCE ==========
CREATE INDEX idx_freelance_profiles_user_id ON freelance_profiles(user_id);
CREATE INDEX idx_freelance_profiles_category ON freelance_profiles(category);
CREATE INDEX idx_freelance_profiles_badge ON freelance_profiles(badge);
CREATE INDEX idx_freelance_services_freelance_id ON freelance_services(freelance_id);
CREATE INDEX idx_freelance_portfolio_freelance_id ON freelance_portfolio(freelance_id);

-- ========== ENTREPRISES ==========
CREATE INDEX idx_enterprise_profiles_user_id ON enterprise_profiles(user_id);
CREATE INDEX idx_enterprise_profiles_sector ON enterprise_profiles(sector);
CREATE INDEX idx_enterprise_team_enterprise_id ON enterprise_team(enterprise_id);
CREATE INDEX idx_enterprise_portfolio_enterprise_id ON enterprise_portfolio(enterprise_id);
CREATE INDEX idx_enterprise_services_enterprise_id ON enterprise_services(enterprise_id);
CREATE INDEX idx_kyc_submissions_status ON kyc_submissions(status) WHERE status = 'En_attente';
CREATE INDEX idx_kyc_submissions_applicant_id ON kyc_submissions(applicant_id);

-- ========== SERVICES ==========
CREATE INDEX idx_service_options_service_id ON service_options(service_id);
CREATE INDEX idx_service_quotes_status ON service_quotes(status);
CREATE INDEX idx_service_quotes_created_at ON service_quotes(created_at DESC);

-- ========== BLOG ==========
CREATE UNIQUE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_blog_posts_date ON blog_posts(date DESC);

-- ========== NOTIFICATIONS & CONTENU ==========
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_global ON notifications(is_global) WHERE is_global = TRUE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ========== PAIEMENTS ==========
CREATE INDEX idx_payment_gateways_is_active ON payment_gateways(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_payment_gateways_code ON payment_gateways(code);
CREATE UNIQUE INDEX idx_transactions_ref ON payment_transactions(transaction_ref);
CREATE INDEX idx_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_transactions_gateway_id ON payment_transactions(gateway_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_webhooks_gateway_code ON payment_webhooks(gateway_code);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed) WHERE processed = FALSE;
CREATE UNIQUE INDEX idx_platform_config_key ON platform_config(key);