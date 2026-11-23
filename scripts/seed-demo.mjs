// ============================================================
// FORTIA HUB - SEED DE DEMONSTRATION
// ------------------------------------------------------------
// Insere un jeu de donnees REELLEMENT en base (memes tables que la
// production) pour visualiser la plateforme :
//   · categories de formations + formations + chapitres/lecons
//   · boutiques + produits numeriques
//   · centres de formation
//   · profils de freelances (NON verifies : aucun KYC force)
//   · bannieres du site
//
// Regles :
//   · idempotent (re-executable sans doublon) ;
//   · ne supprime ni ne modifie aucune donnee reelle ;
//   · chaque ligne creee porte `is_demo = true` -> purge possible
//     depuis l'Admin (voir /api/admin/demo-data) ;
//   · aucune fausse note, aucun faux nombre d'eleves, aucune fausse
//     verification KYC.
//
// Usage :  npm run seed:demo
// ============================================================

import { config } from "dotenv";
import crypto from "node:crypto";
import pg from "pg";

config({ path: ".env.local" });

/** Image CDN (hote deja autorise dans next.config.mjs). */
const IMG = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** UUID deterministe : upserts idempotents sur les tables sans cle metier. */
function demoUuid(seed) {
  const hex = crypto.createHash("md5").update(`fortia-demo:${seed}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    "8" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

const CATEGORIES = [
  { code: "demo-business", label: "Business & Entrepreneuriat", icon: "Briefcase", order: 1 },
  { code: "demo-ia", label: "Intelligence artificielle", icon: "Sparkles", order: 2 },
  { code: "demo-design", label: "Design & Création", icon: "PenTool", order: 3 },
  { code: "demo-marketing", label: "Marketing digital", icon: "Megaphone", order: 4 },
  { code: "demo-dev", label: "Développement web", icon: "Code2", order: 5 },
  { code: "demo-finance", label: "Finance & Gestion", icon: "Wallet", order: 6 },
];

const COURSES = [
  { slug: "demo-lancer-son-business-en-ligne", title: "Lancer son business en ligne", category: "demo-business", level: "Debutant", price: 49, hours: 6, image: IMG("1504384308090-c894fdcc538d"), description: "De l'idée au premier client : structurer une offre digitale claire.", full: "Validation d'idée, construction de l'offre, fixation du prix et premières actions commerciales. Chaque chapitre est accompagné d'une fiche de travail." },
  { slug: "demo-marketing-digital-fondamentaux", title: "Marketing digital : les fondamentaux", category: "demo-marketing", level: "Debutant", price: 39, hours: 5, image: IMG("1531403009284-440f080d1e12"), description: "Positionnement, tunnel de conversion, contenus et mesure des résultats.", full: "Définir un positionnement, construire un tunnel simple, produire des contenus utiles et suivre les indicateurs qui comptent réellement." },
  { slug: "demo-ia-pour-entrepreneurs", title: "L'IA au service de l'entrepreneur", category: "demo-ia", level: "Intermediaire", price: 59, hours: 4, image: IMG("1516321318423-f06f85e504b3"), description: "Rédiger, analyser et automatiser les tâches répétitives avec l'IA.", full: "Méthode pratique : rédaction assistée, synthèse de documents, préparation de réunions et automatisations simples." },
  { slug: "demo-design-canva-pro", title: "Design graphique avec Canva", category: "demo-design", level: "Debutant", price: 25, hours: 3, image: IMG("1503676260728-1c00da094a0b"), description: "Créer des visuels professionnels cohérents sans être graphiste.", full: "Grilles, typographies, couleurs et hiérarchie visuelle : les règles essentielles pour des supports propres et cohérents." },
  { slug: "demo-developpement-web-fondamentaux", title: "Développement web : les fondamentaux", category: "demo-dev", level: "Debutant", price: 79, hours: 10, image: IMG("1498050108023-c5249f4df085"), description: "HTML, CSS et logique JavaScript pour construire une page web.", full: "Structure HTML, mise en page CSS, comportements JavaScript et bonnes pratiques d'accessibilité." },
  { slug: "demo-finance-personnelle", title: "Gérer ses finances personnelles", category: "demo-finance", level: "Tous_niveaux", price: 0, hours: 2, image: IMG("1554224155-6726b3ff858f"), description: "Formation gratuite : budget, épargne de précaution et suivi des dépenses.", full: "Construire un budget réaliste, prioriser l'épargne et suivre ses dépenses sans tableur complexe." },
  { slug: "demo-montage-video-capcut", title: "Montage vidéo avec CapCut", category: "demo-design", level: "Debutant", price: 19, hours: 3, image: IMG("1552581234-26160f608093"), description: "Monter des vidéos courtes nettes : rythme, sous-titres, son et export.", full: "Découpage, transitions sobres, sous-titres lisibles, niveau audio et réglages d'export adaptés aux réseaux sociaux." },
  { slug: "demo-seo-et-contenu", title: "SEO et stratégie de contenu", category: "demo-marketing", level: "Intermediaire", price: 45, hours: 5, image: IMG("1499750310107-5fef28a66643"), description: "Structurer un site et des contenus pour être trouvé par les bons visiteurs.", full: "Recherche de mots-clés, architecture de pages, rédaction utile, maillage interne et suivi des positions." },
  { slug: "demo-react-nextjs", title: "React et Next.js en pratique", category: "demo-dev", level: "Avance", price: 89, hours: 12, image: IMG("1587620962725-abab7fe55159"), description: "Composants, état, routage et rendu serveur pour une application réelle.", full: "Composants et props, gestion d'état, rendu serveur, appels de données et organisation d'un projet maintenable." },
  { slug: "demo-community-management", title: "Animer une communauté", category: "demo-marketing", level: "Intermediaire", price: 35, hours: 4, image: IMG("1522202176988-66273c2fd55f"), description: "Planifier, modérer et faire grandir une communauté en ligne saine.", full: "Calendrier éditorial, règles de modération, tonalité de marque et mesure de l'engagement réel." },
];


const STORES = [
  { slug: "demo-atelier-digital", name: "Atelier Digital (démo)", owner: "Atelier Digital", email: "demo.atelier@fortia-hub.test", logo: IMG("1521737604893-d14cc237f11d", 400), banner: IMG("1497366216548-37526070297c"), description: "Ressources professionnelles prêtes à l'emploi." },
  { slug: "demo-studio-creatif", name: "Studio Créatif (démo)", owner: "Studio Créatif", email: "demo.studio@fortia-hub.test", logo: IMG("1556761175-b413da4baf72", 400), banner: IMG("1517048676732-d65bc937f952"), description: "Templates, visuels et kits de communication." },
  { slug: "demo-press-kit", name: "Press Kit (démo)", owner: "Press Kit", email: "demo.press@fortia-hub.test", logo: IMG("1454165804606-c3d57bc86b40", 400), banner: IMG("1523240795612-9a054b0db644"), description: "Documents, contrats et modèles de gestion." },
];

const PRODUCTS = [
  { slug: "demo-guide-freelancing", store: 0, type: "ebook", label: "Ebook", title: "Guide du freelancing au Bénin", price: 12, original: 18, format: "PDF", size: "6,4 Mo", image: IMG("1497633762265-9d179a990aa6", 800), description: "Cadre juridique, tarification et prospection pour indépendants.", features: ["Modèles de devis et factures", "Grille de tarification", "Checklist de démarrage"] },
  { slug: "demo-prompts-ia-entrepreneurs", store: 1, type: "ai_prompts", label: "Prompts IA", title: "50 prompts IA pour entrepreneurs", price: 9, original: null, format: "PDF + TXT", size: "1,2 Mo", image: IMG("1516321318423-f06f85e504b3", 800), description: "Prompts testés pour rédiger, analyser et préparer vos décisions.", features: ["50 prompts classés par usage", "Exemples de réponses", "Guide d'utilisation"] },
  { slug: "demo-pack-templates-instagram", store: 1, type: "canva_template", label: "Canva", title: "Pack 30 templates Instagram", price: 15, original: 25, format: "Canva", size: "Lien Canva", image: IMG("1503676260728-1c00da094a0b", 800), description: "Publications cohérentes pour une marque, modifiables en quelques minutes.", features: ["30 modèles éditables", "Palette de couleurs", "Guide de personnalisation"] },
  { slug: "demo-etude-marche-numerique", store: 2, type: "whitepaper", label: "Étude", title: "Étude : le numérique en Afrique de l'Ouest", price: 0, original: null, format: "PDF", size: "3,1 Mo", image: IMG("1554224155-6726b3ff858f", 800), description: "Panorama gratuit des usages et des opportunités digitales.", features: ["Synthèse en 12 pages", "Données sourcées", "Lecture gratuite"] },
  { slug: "demo-business-plan", store: 2, type: "business_plan", label: "Business plan", title: "Modèle de business plan complet", price: 25, original: null, format: "Excel + Word", size: "2,8 Mo", image: IMG("1553877522-43269d4ea984", 800), description: "Structure, hypothèses financières et présentation prête à compléter.", features: ["Modèle financier sur 3 ans", "Trame rédactionnelle", "Exemple rempli"] },
  { slug: "demo-contrat-prestation", store: 2, type: "contract", label: "Contrat", title: "Contrat de prestation freelance", price: 8, original: null, format: "Word + PDF", size: "480 Ko", image: IMG("1556742049-0cfed4f6a45d", 800), description: "Contrat clair : périmètre, délais, paiement et confidentialité.", features: ["Version Word modifiable", "Clauses commentées", "Annexe de devis"] },
  { slug: "demo-pitch-deck", store: 1, type: "pitch_deck", label: "Pitch deck", title: "Pitch deck investisseurs (12 slides)", price: 19, original: 29, format: "Canva + PDF", size: "Lien Canva", image: IMG("1542744173-8e7e53415bb0", 800), description: "Une trame sobre pour présenter un projet en 12 slides.", features: ["12 slides structurées", "Graphiques éditables", "Notes du présentateur"] },
];


const MORE_PRODUCTS = [
  { slug: "demo-pack-createur", store: 1, type: "premium_pack", label: "Pack premium", title: "Pack Créateur : 120 visuels", price: 39, original: 59, format: "ZIP", size: "240 Mo", image: IMG("1519389950473-47ba0277781c", 800), description: "Un ensemble complet de visuels pour lancer une communication.", features: ["120 visuels haute définition", "Formats carré et vertical", "Licence commerciale"] },
  { slug: "demo-tableau-gestion", store: 0, type: "template", label: "Tableur", title: "Tableau de bord de gestion", price: 14, original: null, format: "Excel", size: "900 Ko", image: IMG("1461749280684-dccba630e2f6", 800), description: "Suivi des ventes, des charges et de la trésorerie en un écran.", features: ["Tableau de bord automatisé", "Catégories de dépenses", "Notice d'utilisation"] },
  { slug: "demo-kit-presentation", store: 1, type: "canva_template", label: "Canva", title: "Kit de présentation professionnelle", price: 11, original: null, format: "Canva", size: "Lien Canva", image: IMG("1524178232363-1fb2b075b655", 800), description: "Un modèle de présentation clair, imprimable et projetable.", features: ["20 diapositives", "Deux variantes de couleurs", "Guide de mise en page"] },
  { slug: "demo-guide-montage-capcut", store: 0, type: "ebook", label: "Ebook", title: "Guide du montage vidéo sur CapCut", price: 10, original: null, format: "PDF", size: "5,2 Mo", image: IMG("1552581234-26160f608093", 800), description: "Méthode pas à pas pour des vidéos courtes propres et rythmées.", features: ["Réglages d'export", "Banque de transitions sobres", "Checklist avant publication"] },
  { slug: "demo-prompts-seo", store: 1, type: "ai_prompts", label: "Prompts IA", title: "100 prompts de rédaction SEO", price: 13, original: null, format: "PDF", size: "1,8 Mo", image: IMG("1499750310107-5fef28a66643", 800), description: "Structurer titres, plans et contenus utiles pour le référencement.", features: ["100 prompts classés", "Modèles de plans d'articles", "Bonnes pratiques éditoriales"] },
  { slug: "demo-modele-notion-projet", store: 2, type: "template", label: "Modèle", title: "Modèle de gestion de projet", price: 17, original: null, format: "Notion", size: "Lien Notion", image: IMG("1523240795612-9a054b0db644", 800), description: "Tâches, échéances et suivi d'avancement dans un espace unique.", features: ["Tableau de suivi", "Vues par échéance", "Modèle de compte-rendu"] },
  { slug: "demo-ebook-financer-projet", store: 2, type: "ebook", label: "Ebook", title: "Financer son projet : les bases", price: 0, original: null, format: "PDF", size: "2,2 Mo", image: IMG("1454165804606-c3d57bc86b40", 800), description: "Ressource gratuite : sources de financement et préparation du dossier.", features: ["Panorama des financements", "Trame de dossier", "Erreurs à éviter"] },
];

const ALL_PRODUCTS = [...PRODUCTS, ...MORE_PRODUCTS];

const CENTERS = [
  { slug: "demo-centre-digital-cotonou", name: "Centre Digital Cotonou (démo)", logo: IMG("1497366216548-37526070297c", 400), banner: IMG("1524178232363-1fb2b075b655"), description: "Formations professionnelles aux métiers du numérique et de la gestion." },
  { slug: "demo-academie-creative", name: "Académie Créative (démo)", logo: IMG("1556761175-b413da4baf72", 400), banner: IMG("1503676260728-1c00da094a0b"), description: "Design, image et communication pour créateurs et indépendants." },
  { slug: "demo-institut-tech", name: "Institut Tech (démo)", logo: IMG("1517048676732-d65bc937f952", 400), banner: IMG("1498050108023-c5249f4df085"), description: "Développement web, données et fondamentaux techniques." },
];

const FREELANCES = [
  { key: "awa", name: "Awa Sossou (démo)", title: "Graphiste et spécialiste Canva", avatar: IMG("1573496359142-b8d87734a5a2", 400), category: "Design", skills: ["Canva", "Identité visuelle", "Réseaux sociaux"], location: "Cotonou", rate: 18, bio: "Création de visuels et de chartes graphiques pour petites structures." },
  { key: "karim", name: "Karim Adjovi (démo)", title: "Développeur web front-end", avatar: IMG("1500648767791-00dcc994a43e", 400), category: "Développement", skills: ["React", "Next.js", "Intégration"], location: "Porto-Novo", rate: 25, bio: "Intégration de pages rapides et accessibles." },
  { key: "nadia", name: "Nadia Kpogli (démo)", title: "Consultante marketing digital", avatar: IMG("1494790108377-be9c29b29330", 400), category: "Marketing", skills: ["Stratégie", "Contenu", "Analyse"], location: "Abidjan", rate: 30, bio: "Structuration d'acquisition et pilotage des campagnes." },
  { key: "joseph", name: "Joseph Mensah (démo)", title: "Monteur vidéo", avatar: IMG("1519085360753-af0119f7cbe7", 400), category: "Vidéo", skills: ["CapCut", "Cadrage", "Sous-titrage"], location: "Lomé", rate: 15, bio: "Montage de formats courts pour marques et créateurs." },
];

const BANNERS = [
  { key: "academy", title: "Formations certifiantes", subtitle: "Des parcours en vidéo et en PDF, avec attestation vérifiable.", image: IMG("1524178232363-1fb2b075b655", 1600), label: "Explorer les formations", link: "/academy", order: 1 },
  { key: "marketplace", title: "Ressources numériques", subtitle: "Ebooks, modèles et kits prêts à télécharger.", image: IMG("1497633762265-9d179a990aa6", 1600), label: "Voir la boutique", link: "/marketplace", order: 2 },
  { key: "centres", title: "Centres de formation", subtitle: "Découvrez les centres et leurs parcours.", image: IMG("1521737604893-d14cc237f11d", 1600), label: "Voir les centres", link: "/centres", order: 3 },
];


// ------------------------------------------------------------
// INSERTION
// ------------------------------------------------------------
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const lessonContent = (courseTitle, chapter, lesson) =>
  [
    `# ${courseTitle}`,
    "",
    `## Chapitre ${chapter} — leçon ${lesson}`,
    "",
    "Ce support de démonstration présente la méthode pas à pas : objectif de la leçon, points clés,",
    "exemple concret et exercice d'application. Le contenu réel est rédigé par le formateur.",
    "",
    "- Comprendre l'objectif de la leçon",
    "- Appliquer la méthode sur un cas simple",
    "- Vérifier le résultat avant de passer à la suite",
  ].join("\n");

await client.query("BEGIN");
try {
  /* ------------------------- 1. Catégories ------------------------- */
  const categoryIds = new Map();
  for (const category of CATEGORIES) {
    const res = await client.query(
      `INSERT INTO course_categories (code, label, description, icon_name, display_order, is_active, is_demo)
       VALUES ($1, $2, $3, $4, $5, true, true)
       ON CONFLICT (code) DO UPDATE SET
         label = EXCLUDED.label,
         description = EXCLUDED.description,
         icon_name = EXCLUDED.icon_name,
         display_order = EXCLUDED.display_order,
         is_active = true,
         is_demo = true
       RETURNING id`,
      [category.code, category.label, "Catégorie de démonstration (supprimable depuis l'Admin).", category.icon, category.order]
    );
    categoryIds.set(category.code, res.rows[0].id);
  }

  /* --------------- 2. Formations + chapitres + leçons --------------- */
  for (const course of COURSES) {
    const res = await client.query(
      `INSERT INTO courses (
         title, slug, category_id, category_label, description, full_description,
         level, duration_hours, lessons_count, price, image,
         instructor_name, instructor_role, learning_outcomes,
         is_published, is_featured, is_demo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::course_level,$8,4,$9,$10,$11,$12,$13::jsonb,true,false,true)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         category_id = EXCLUDED.category_id,
         category_label = EXCLUDED.category_label,
         description = EXCLUDED.description,
         full_description = EXCLUDED.full_description,
         level = EXCLUDED.level,
         duration_hours = EXCLUDED.duration_hours,
         lessons_count = EXCLUDED.lessons_count,
         price = EXCLUDED.price,
         image = EXCLUDED.image,
         instructor_name = EXCLUDED.instructor_name,
         instructor_role = EXCLUDED.instructor_role,
         learning_outcomes = EXCLUDED.learning_outcomes,
         is_published = true,
         is_demo = true,
         updated_at = now()
       RETURNING id`,
      [
        course.title,
        course.slug,
        categoryIds.get(course.category),
        CATEGORIES.find((c) => c.code === course.category)?.label || "",
        course.description,
        course.full,
        course.level,
        course.hours,
        course.price,
        course.image,
        "Équipe pédagogique (démo)",
        "Formateur",
        JSON.stringify([
          "Comprendre les notions clés",
          "Appliquer la méthode sur un cas réel",
          "Repartir avec une fiche de travail",
        ]),
      ]
    );
    const courseId = res.rows[0].id;

    // Chapitres/leçons : recréés à chaque exécution (contenu de démonstration).
    await client.query(`DELETE FROM course_chapters WHERE course_id = $1`, [courseId]);

    const chapterTitles = ["Fondamentaux", "Mise en pratique"];
    for (let index = 0; index < chapterTitles.length; index += 1) {
      const chapter = await client.query(
        `INSERT INTO course_chapters (course_id, title, display_order)
         VALUES ($1, $2, $3) RETURNING id`,
        [courseId, `Chapitre ${index + 1} : ${chapterTitles[index]}`, index + 1]
      );
      for (let lesson = 1; lesson <= 2; lesson += 1) {
        await client.query(
          `INSERT INTO course_lessons (chapter_id, title, duration, type, content, display_order)
           VALUES ($1, $2, $3, 'article', $4, $5)`,
          [
            chapter.rows[0].id,
            `Leçon ${lesson} — ${chapterTitles[index]}`,
            "12 min",
            lessonContent(course.title, index + 1, lesson),
            lesson,
          ]
        );
      }
    }
  }


  /* ------------------------- 3. Boutiques ------------------------- */
  const storeIds = [];
  for (const store of STORES) {
    const res = await client.query(
      `INSERT INTO stores (owner_name, owner_email, name, slug, logo, banner, description, status, is_verified, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', false, true)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         logo = EXCLUDED.logo,
         banner = EXCLUDED.banner,
         description = EXCLUDED.description,
         status = 'active',
         is_demo = true,
         updated_at = now()
       RETURNING id`,
      [store.owner, store.email, store.name, store.slug, store.logo, store.banner, store.description]
    );
    storeIds.push(res.rows[0].id);
  }

  /* -------------------- 4. Produits numériques -------------------- */
  for (const product of ALL_PRODUCTS) {
    const storeId = storeIds[product.store];
    const store = STORES[product.store];
    await client.query(
      `INSERT INTO products (
         store_id, store_name, title, slug, type, type_label, description, full_description,
         price, original_price, file_format, file_size, image, banner_image, features,
         download_url, is_published, is_approved, is_demo
       ) VALUES ($1,$2,$3,$4,$5::product_type,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,'#',true,true,true)
       ON CONFLICT (slug) DO UPDATE SET
         store_id = EXCLUDED.store_id,
         store_name = EXCLUDED.store_name,
         title = EXCLUDED.title,
         type = EXCLUDED.type,
         type_label = EXCLUDED.type_label,
         description = EXCLUDED.description,
         full_description = EXCLUDED.full_description,
         price = EXCLUDED.price,
         original_price = EXCLUDED.original_price,
         file_format = EXCLUDED.file_format,
         file_size = EXCLUDED.file_size,
         image = EXCLUDED.image,
         banner_image = EXCLUDED.banner_image,
         features = EXCLUDED.features,
         is_published = true,
         is_approved = true,
         is_demo = true,
         updated_at = now()`,
      [
        storeId,
        store.name,
        product.title,
        product.slug,
        product.type,
        product.label,
        product.description,
        product.description,
        product.price,
        product.original,
        product.format,
        product.size,
        product.image,
        product.image,
        JSON.stringify(product.features),
      ]
    );
  }

  /* --------------------- 5. Centres de formation ------------------- */
  for (const center of CENTERS) {
    await client.query(
      `INSERT INTO training_centers (center_name, slug, description, logo, banner, status, is_verified, is_demo)
       VALUES ($1, $2, $3, $4, $5, 'active', false, true)
       ON CONFLICT (slug) DO UPDATE SET
         center_name = EXCLUDED.center_name,
         description = EXCLUDED.description,
         logo = EXCLUDED.logo,
         banner = EXCLUDED.banner,
         status = 'active',
         is_demo = true,
         updated_at = now()`,
      [center.name, center.slug, center.description, center.logo, center.banner]
    );
  }


  /* ------------------ 6. Profils de freelances ------------------- */
  // Volontairement NON vérifiés : aucun KYC ni droit de vente n'est accordé.
  for (const profile of FREELANCES) {
    await client.query(
      `INSERT INTO freelance_profiles (
         id, name, title, bio, avatar, category, rating, completed_jobs, hourly_rate,
         skills, kyc_verified, registration_fee_paid, can_receive_payments, can_sell_services,
         location, is_visible, is_demo
       ) VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8,false,false,false,false,$9,true,true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         title = EXCLUDED.title,
         bio = EXCLUDED.bio,
         avatar = EXCLUDED.avatar,
         category = EXCLUDED.category,
         hourly_rate = EXCLUDED.hourly_rate,
         skills = EXCLUDED.skills,
         location = EXCLUDED.location,
         is_visible = true,
         is_demo = true,
         updated_at = now()`,
      [
        demoUuid(`freelance-${profile.key}`),
        profile.name,
        profile.title,
        profile.bio,
        profile.avatar,
        profile.category,
        profile.rate,
        profile.skills,
        profile.location,
      ]
    );
  }

  /* --------------------- 7. Bannières du site --------------------- */
  for (const banner of BANNERS) {
    await client.query(
      `INSERT INTO site_banners (
         id, title, subtitle, image_url, button_label, button_link, link_target,
         is_active, display_order, is_demo
       ) VALUES ($1,$2,$3,$4,$5,$6,'internal',true,$7,true)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         image_url = EXCLUDED.image_url,
         button_label = EXCLUDED.button_label,
         button_link = EXCLUDED.button_link,
         is_active = true,
         display_order = EXCLUDED.display_order,
         is_demo = true,
         updated_at = now()`,
      [
        demoUuid(`banner-${banner.key}`),
        banner.title,
        banner.subtitle,
        banner.image,
        banner.label,
        banner.link,
        banner.order,
      ]
    );
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\nECHEC DU SEED :", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

/* ------------------------- 8. Récapitulatif ------------------------ */
const summary = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await summary.connect();
const counts = await summary.query(`
  select
    (select count(*) from course_categories where is_demo) as categories,
    (select count(*) from courses where is_demo) as courses,
    (select count(*) from course_lessons l
       join course_chapters c on c.id = l.chapter_id
       join courses co on co.id = c.course_id
      where co.is_demo) as lessons,
    (select count(*) from stores where is_demo) as stores,
    (select count(*) from products where is_demo) as products,
    (select count(*) from training_centers where is_demo) as centers,
    (select count(*) from freelance_profiles where is_demo) as freelances,
    (select count(*) from site_banners where is_demo) as banners
`);
const row = counts.rows[0];
await summary.end();

console.log("SEED DE DEMONSTRATION TERMINE");
console.log(`  Categories : ${row.categories}`);
console.log(`  Formations : ${row.courses} (${row.lessons} lecons)`);
console.log(`  Boutiques  : ${row.stores}`);
console.log(`  Produits   : ${row.products}`);
console.log(`  Centres    : ${row.centers}`);
console.log(`  Freelances : ${row.freelances} (non verifies)`);
console.log(`  Bannieres  : ${row.banners}`);
console.log("Suppression : Admin > Donnees de demonstration.");

