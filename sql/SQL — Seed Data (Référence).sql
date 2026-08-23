-- ============================================================
-- FORTIA HUB — SQL 16 : SEED DATA (RÉFÉRENCE)
-- Description : Données initiales reprenant les mock existants
-- Ordre d'exécution : 16 (après SQL 15)
-- ============================================================

-- ========== GATEWAYS DE PAIEMENT PAR DÉFAUT ==========
INSERT INTO payment_gateways (code, name, description, is_active, is_default, display_order, fee_structure, fee_value, min_amount_usd, supported_countries, bank_account_name, bank_account_number, bank_provider_name)
VALUES
  ('wave', 'Wave Sénégal', 'Paiement Mobile Money Wave', TRUE, TRUE, 1, 'percentage', 0, 1, ARRAY['SN', 'CI', 'BF', 'ML', 'TG', 'BJ'], 'FORTIA HUB', '+221 77 888 99 00', 'Wave'),
  ('orange_money', 'Orange Money', 'Paiement Mobile Money Orange', TRUE, FALSE, 2, 'percentage', 0, 1, ARRAY['SN', 'CI', 'BF', 'ML', 'TG', 'CM', 'MG'], 'FORTIA HUB', '+228 90 88 99 00', 'Orange Money'),
  ('mtn_money', 'MTN Mobile Money', 'Paiement Mobile Money MTN', TRUE, FALSE, 3, 'percentage', 0, 1, ARRAY['CI', 'CM', 'TG', 'UG', 'GH', 'ZA'], 'FORTIA HUB', 'MTN-MOMO-2026', 'MTN'),
  ('card_stripe', 'Carte Visa/Mastercard (Stripe)', 'Paiement par carte internationale', TRUE, FALSE, 4, 'percentage', 2.9, 1, ARRAY['*'], 'FORTIA HUB', 'STRIPE-ACCT', 'Stripe'),
  ('paypal', 'PayPal Express', 'Paiement international PayPal', TRUE, FALSE, 5, 'percentage', 3.5, 1, ARRAY['*'], 'FORTIA HUB', 'paypal@fortiahub.com', 'PayPal'),
  ('crypto_usdt_trc20', 'Crypto USDT (TRC20)', 'Paiement en cryptomonnaie USDT sur le réseau TRC20', TRUE, FALSE, 6, 'percentage', 0, 5, ARRAY['*'], 'FORTIA HUB', 'TYWvqoY3PAHPRa4RkLPLZCcnqokcZ4hN8v', 'TRON')
ON CONFLICT (code) DO NOTHING;

-- ========== CATÉGORIES DE COURS ==========
INSERT INTO course_categories (code, label, display_order) VALUES
  ('crypto', 'Cryptomonnaie & Blockchain', 1),
  ('ai', 'Intelligence Artificielle', 2),
  ('canva', 'Canva & Design Graphique', 3),
  ('capcut', 'Montage Vidéo CapCut', 4),
  ('marketing', 'Marketing Digital', 5),
  ('entrepreneurship', 'Entrepreneuriat & Coaching', 6),
  ('blockchain', 'Blockchain & Web3', 7),
  ('dev_web', 'Développement Web', 8),
  ('dev_mobile', 'Développement Mobile', 9),
  ('infographie', 'Infographie & Suite Adobe', 10),
  ('secretariat', 'Secrétariat Bureautique', 11),
  ('informatique', 'Informatique de Base', 12)
ON CONFLICT (code) DO NOTHING;

-- ========== CATÉGORIES DE BLOG ==========
INSERT INTO blog_categories (name, slug) VALUES
  ('Intelligence Artificielle', 'intelligence-artificielle'),
  ('Cryptomonnaie', 'cryptomonnaie'),
  ('Marketing Digital', 'marketing-digital'),
  ('Entrepreneuriat', 'entrepreneuriat')
ON CONFLICT (name) DO NOTHING;

-- ========== PACKS DE SERVICES ==========
INSERT INTO service_packages (title, category, description, starting_price, estimated_days, icon_name, deliverables) VALUES
  ('Création de Logos & Branding de Luxe', 'Design & Branding', 'Conception d''identités visuelles haute de gamme avec charte graphique complète, déclinaisons de logos et fichiers vectoriels.', 150, '3 à 5 jours', 'Palette', ARRAY['3 propositions de logos originaux vectoriels (AI, SVG, PNG, PDF)', 'Charte graphique (Palette de couleurs, typographies, règles d''usage)', 'Mockups d''application (Cartes de visite, enseigne, réseaux sociaux)', 'Cession complète des droits d''auteur']),
  ('Conception d''Affiches & Visuels Publicitaires', 'Design & Graphisme', 'Création visuelle percutante pour vos événements, lancements de produits, campagnes d''affichage et publicités sur réseaux.', 60, '2 jours', 'Image', ARRAY['Affiche haute résolution prête pour l''impression (CMJN 300 DPI)', 'Adaptations aux formats digitaux (Instagram, Facebook, WhatsApp)', 'Fichiers sources modifiables', 'Révisions illimitées jusqu''à satisfaction']),
  ('Rédaction & Design de White Papers', 'Rédaction & Stratégie', 'Élaboration de livres blancs institutionnels, présentations de projets blockchain/IA ou dossiers d''investissement d''élite.', 200, '5 à 7 jours', 'FileText', ARRAY['Rédaction technique et rédactionnelle haut niveau', 'Mise en page graphique soignée aux couleurs de votre marque', 'Schémas, infographies et tableaux statistiques intégrés', 'Export PDF interactif de haute qualité'])
ON CONFLICT DO NOTHING;

-- ========== ADMIN PAR DÉFAUT (mot de passe: FORTIA2026 hashé) ==========
-- Le hash ci-dessous est un exemple (bcrypt de 'FORTIA2026').
-- À remplacer par le vrai hash généré par votre système d'auth.
INSERT INTO admin_users (email, password_hash, name, role)
VALUES ('admin@fortiahub.com', '$2b$10$placeholder_hash_a_remplacer', 'FORTIA HUB Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ========== NOTE : FORMATIONS, PRODUITS, BOUTIQUES, BLOG ==========
-- Ces données volumineuses (11 formations, 8 produits, 4 boutiques, etc.)
-- seront seedées via le script Prisma (seed.ts) après création du schéma,
-- afin de garantir la cohérence des UUID et des relations.
-- Ce fichier SQL ne contient que les données de référence statiques ci-dessus.