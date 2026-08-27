// ============================================================
// FORTIA HUB — Outils (Function Calling) pour l'assistant Gemini
// ------------------------------------------------------------
// Chaque outil interroge directement Supabase (via Prisma) avec des
// requêtes précises, typées et limitées. Aucun SQL arbitraire n'est
// exposé à Gemini. Les données privées (profil, commandes, certificats,
// notifications, devis) sont strictement filtrées par l'identité de
// l'utilisateur connecté, résolue côté serveur (jamais depuis l'input
// de l'utilisateur ou de l'IA).
//
// Ce module est SIDE-SERVER uniquement (importé par la route API).
// ============================================================
import { prisma } from "@/lib/prisma";
import { Type, type FunctionDeclaration } from "@google/genai";

/** Identité résolue côté serveur (source de vérité = base de données). */
export interface AiToolUser {
  id: string;
  name: string;
  email: string;
}

export interface AiToolContext {
  user: AiToolUser | null;
}

const MAX_RESULTS = 10;

// ============================================================
// Helpers de sérialisation (Prisma → JSON pur pour Gemini)
// ============================================================
function cleanQuery(q: unknown): string | undefined {
  if (typeof q !== "string") return undefined;
  const t = q.trim();
  return t.length > 0 ? t : undefined;
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function iso(v: any): string {
  return v ? new Date(v).toISOString() : "";
}

function jsonField(v: any): unknown {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

/** Message générique renvoyé à Gemini quand l'utilisateur n'est pas connecté. */
function notAuthenticated() {
  return {
    error: "not_authenticated",
    message:
      "Vous devez être connecté(e) à votre compte FORTIA HUB pour consulter cette information.",
  };
}

type ToolHandler = (
  args: Record<string, unknown>,
  ctx: AiToolContext
) => Promise<unknown>;

interface AiTool {
  declaration: FunctionDeclaration;
  handler: ToolHandler;
}

// ============================================================
// OUTILS PUBLICS (données visibles sans connexion)
// ============================================================

const searchStores: AiTool = {
  declaration: {
    name: "search_stores",
    description:
      "Recherche les boutiques/vendeurs actuellement disponibles sur FORTIA HUB. À utiliser quand l'utilisateur demande quelles boutiques existent, quels vendeurs sont présents sur le marketplace, ou pour trouver une boutique précise.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (nom ou description de la boutique). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const stores = await prisma.store.findMany({
      where: {
        status: "active",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isVerified: "desc" }, { rating: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        categories: true,
        isVerified: true,
        rating: true,
        salesCount: true,
      },
    });
    return {
      stores: stores.map((s) => ({
        ...s,
        rating: num(s.rating),
      })),
      total: stores.length,
    };
  },
};


const searchProducts: AiTool = {
  declaration: {
    name: "search_products",
    description:
      "Recherche les produits numériques publiés et approuvés dans la boutique FORTIA HUB (eBooks, packs de prompts, templates Canva, etc.). À utiliser quand l'utilisateur demande quels produits sont disponibles, demande un produit précis ou un type de produit.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (titre du produit). Optionnel.",
        },
        type: {
          type: Type.STRING,
          description:
            "Type de produit souhaité, exemples : ebook, canva_template, ai_prompts, whitepaper, business_plan, contract, pitch_deck, premium_pack, course, service, software, template. Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const type = cleanQuery(args.type);
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        isApproved: true,
        ...(type ? { type: type as any } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ isPopular: "desc" }, { rating: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        title: true,
        slug: true,
        storeName: true,
        type: true,
        typeLabel: true,
        price: true,
        rating: true,
        image: true,
      },
    });
    return {
      products: products.map((p) => ({ ...p, price: num(p.price), rating: num(p.rating) })),
      total: products.length,
    };
  },
};


const searchCourses: AiTool = {
  declaration: {
    name: "search_courses",
    description:
      "Recherche les formations certifiantes publiées dans l'académie FORTIA HUB (Cryptomonnaie, IA, Canva, CapCut, Marketing Digital, Entrepreneuriat...). À utiliser quand l'utilisateur demande quelles formations sont disponibles ou un détail sur une formation précise.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (titre ou catégorie de la formation). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { categoryLabel: { contains: q, mode: "insensitive" } },
                { instructorName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        title: true,
        slug: true,
        categoryLabel: true,
        level: true,
        price: true,
        durationHours: true,
        lessonsCount: true,
        rating: true,
        instructorName: true,
      },
    });
    return {
      courses: courses.map((c) => ({ ...c, price: num(c.price), rating: num(c.rating) })),
      total: courses.length,
    };
  },
};

const searchFreelanceProfiles: AiTool = {
  declaration: {
    name: "search_freelance_profiles",
    description:
      "Recherche les profils freelance visibles sur FORTIA HUB (designers, développeurs, community managers...). À utiliser quand l'utilisateur cherche un freelance, un prestataire ou un expert.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (nom, métier ou catégorie). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const profiles = await prisma.freelanceProfile.findMany({
      where: {
        isVisible: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { skills: { has: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ rating: "desc" }, { completedJobs: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        name: true,
        title: true,
        category: true,
        location: true,
        rating: true,
        hourlyRate: true,
        completedJobs: true,
        badge: true,
      },
    });
    return {
      freelances: profiles.map((f) => ({ ...f, rating: num(f.rating), hourlyRate: num(f.hourlyRate) })),
      total: profiles.length,
    };
  },
};


const searchEnterprises: AiTool = {
  declaration: {
    name: "search_enterprises",
    description:
      "Recherche les entreprises/agences visibles sur FORTIA HUB. À utiliser quand l'utilisateur cherche une entreprise, une agence partenaire ou un prestataire entreprise.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (nom de l'entreprise, secteur ou pays). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const profiles = await prisma.enterpriseProfile.findMany({
      where: {
        isVisible: true,
        ...(q
          ? {
              OR: [
                { companyName: { contains: q, mode: "insensitive" } },
                { sector: { contains: q, mode: "insensitive" } },
                { country: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ badge: "desc" }, { verifiedDocuments: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        companyName: true,
        tagline: true,
        sector: true,
        country: true,
        badge: true,
        contactEmail: true,
      },
    });
    return { enterprises: profiles, total: profiles.length };
  },
};

const searchServicePackages: AiTool = {
  declaration: {
    name: "search_service_packages",
    description:
      "Recherche les prestations de services d'agence proposées par FORTIA HUB (création de logo, design, rédaction white paper, montage vidéo, community management...). À utiliser quand l'utilisateur demande quels services/prestations sont proposés.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (titre ou catégorie du service). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const packages = await prisma.servicePackage.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        startingPrice: true,
        estimatedDays: true,
        deliverables: true,
        featured: true,
      },
    });
    return {
      services: packages.map((p) => ({ ...p, startingPrice: num(p.startingPrice) })),
      total: packages.length,
    };
  },
};

const searchBlogPosts: AiTool = {
  declaration: {
    name: "search_blog_posts",
    description:
      "Recherche les articles publiés dans le blog FORTIA HUB (actualités, guides, conseils). À utiliser quand l'utilisateur demande les derniers articles, des actualités ou un article précis.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Texte de recherche (titre ou catégorie de l'article). Optionnel.",
        },
      },
    },
  },
  handler: async (args) => {
    const q = cleanQuery(args.query);
    const posts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { date: "desc" },
      take: MAX_RESULTS,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        date: true,
        readTime: true,
        authorName: true,
      },
    });
    return { posts, total: posts.length };
  },
};


const getPlatformSettings: AiTool = {
  declaration: {
    name: "get_platform_settings",
    description:
      "Récupère les paramètres publics de la plateforme FORTIA HUB : coordonnées de contact (email, téléphone, horaires de support), statistiques affichées et configuration des frais d'inscription. À utiliser quand l'utilisateur demande comment contacter FORTIA HUB, les horaires de support ou les frais.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async () => {
    const [siteContent, feeConfig, configs] = await Promise.all([
      prisma.siteContent.findFirst({
        select: {
          contactEmail: true,
          contactPhone: true,
          supportHours: true,
          topAnnouncementBanner: true,
          statStudents: true,
          statSuccessRate: true,
          statModules: true,
        },
      }),
      prisma.registrationFeeConfig.findFirst({
        select: {
          freelanceFeeUsd: true,
          freelanceFeeFcfa: true,
          enterpriseFeeUsd: true,
          enterpriseFeeFcfa: true,
          buyerFeeUsd: true,
          feeEnabled: true,
        },
      }),
      prisma.platformConfig.findMany({
        take: 50,
        select: { key: true, value: true, description: true },
      }),
    ]);

    return {
      contact: siteContent
        ? {
            email: siteContent.contactEmail,
            phone: siteContent.contactPhone,
            supportHours: siteContent.supportHours,
            announcement: siteContent.topAnnouncementBanner,
          }
        : null,
      stats: siteContent
        ? {
            students: siteContent.statStudents,
            successRate: siteContent.statSuccessRate,
            modules: siteContent.statModules,
          }
        : null,
      registrationFees: feeConfig
        ? {
            enabled: feeConfig.feeEnabled,
            buyerFeeUsd: num(feeConfig.buyerFeeUsd),
            freelanceFeeUsd: num(feeConfig.freelanceFeeUsd),
            freelanceFeeFcfa: num(feeConfig.freelanceFeeFcfa),
            enterpriseFeeUsd: num(feeConfig.enterpriseFeeUsd),
            enterpriseFeeFcfa: num(feeConfig.enterpriseFeeFcfa),
          }
        : null,
      platformConfigs: configs.map((c) => ({ key: c.key, value: jsonField(c.value), description: c.description })),
    };
  },
};


// ============================================================
// OUTILS PRIVÉS (uniquement pour l'utilisateur connecté)
// L'identité provient du contexte serveur (ctx.user), jamais des
// arguments de l'IA ou de l'utilisateur : aucune donnée privée
// d'un autre utilisateur ne peut être consultée.
// ============================================================

const getMyProfile: AiTool = {
  declaration: {
    name: "get_my_profile",
    description:
      "Récupère les informations de base du compte FORTIA HUB actuellement connecté (nom, email, téléphone, type de compte, badge). À utiliser quand l'utilisateur demande des informations sur son propre compte ou son profil.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async (_args, ctx) => {
    if (!ctx.user) return notAuthenticated();
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        accountType: true,
        badge: true,
        createdAt: true,
      },
    });
    if (!user) return { error: "user_not_found", message: "Ce compte n'existe plus." };
    return { profile: { ...user, createdAt: iso(user.createdAt) } };
  },
};

const getMyOrders: AiTool = {
  declaration: {
    name: "get_my_orders",
    description:
      "Récupère les commandes de l'utilisateur actuellement connecté sur FORTIA HUB (numéro de commande, produit, boutique, montant, statut). À utiliser quand l'utilisateur demande « mes commandes », son historique d'achats ou le statut d'une commande.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async (_args, ctx) => {
    if (!ctx.user) return notAuthenticated();
    const orders = await prisma.marketplaceOrder.findMany({
      where: {
        OR: [{ buyerUserId: ctx.user.id }, { buyerEmail: ctx.user.email }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        productTitle: true,
        storeName: true,
        amountUsd: true,
        status: true,
        paymentGateway: true,
        createdAt: true,
      },
    });
    return {
      orders: orders.map((o) => ({ ...o, amountUsd: num(o.amountUsd), createdAt: iso(o.createdAt) })),
      total: orders.length,
    };
  },
};

const getMyCertificates: AiTool = {
  declaration: {
    name: "get_my_certificates",
    description:
      "Récupère les certificats numériques officiels de l'utilisateur actuellement connecté (numéro de certificat, formation, date, mention, vérifié). À utiliser quand l'utilisateur demande « mes certificats », ses attestations ou ses diplômes obtenus.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async (_args, ctx) => {
    if (!ctx.user) return notAuthenticated();
    const certificates = await prisma.certificate.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        certificateNumber: true,
        courseTitle: true,
        category: true,
        issueDate: true,
        grade: true,
        verified: true,
      },
    });
    return { certificates, total: certificates.length };
  },
};


const getMyNotifications: AiTool = {
  declaration: {
    name: "get_my_notifications",
    description:
      "Récupère les notifications récentes de l'utilisateur actuellement connecté sur FORTIA HUB. À utiliser quand l'utilisateur demande ses notifications ou s'il a des messages.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async (_args, ctx) => {
    if (!ctx.user) return notAuthenticated();
    const notifications = await prisma.notification.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        linkTab: true,
        createdAt: true,
      },
    });
    return {
      notifications: notifications.map((n) => ({ ...n, createdAt: iso(n.createdAt) })),
      total: notifications.length,
    };
  },
};

const getMyServiceQuotes: AiTool = {
  declaration: {
    name: "get_my_service_quotes",
    description:
      "Récupère les demandes de devis de services d'agence soumises par l'utilisateur actuellement connecté (service, montant estimé, statut). À utiliser quand l'utilisateur demande « mes devis » ou le statut de ses demandes de prestation.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  handler: async (_args, ctx) => {
    if (!ctx.user) return notAuthenticated();
    const quotes = await prisma.serviceQuote.findMany({
      where: { clientEmail: ctx.user.email },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        serviceTitle: true,
        estimatedPrice: true,
        status: true,
        createdAt: true,
      },
    });
    return {
      quotes: quotes.map((q) => ({ ...q, estimatedPrice: num(q.estimatedPrice), createdAt: iso(q.createdAt) })),
      total: quotes.length,
    };
  },
};

// ============================================================
// REGISTRE & POINT D'ENTRÉE
// ============================================================

const AI_TOOLS: Record<string, AiTool> = {
  search_stores: searchStores,
  search_products: searchProducts,
  search_courses: searchCourses,
  search_freelance_profiles: searchFreelanceProfiles,
  search_enterprises: searchEnterprises,
  search_service_packages: searchServicePackages,
  search_blog_posts: searchBlogPosts,
  get_platform_settings: getPlatformSettings,
  get_my_profile: getMyProfile,
  get_my_orders: getMyOrders,
  get_my_certificates: getMyCertificates,
  get_my_notifications: getMyNotifications,
  get_my_service_quotes: getMyServiceQuotes,
};

/** Déclarations envoyées à Gemini (une par outil autorisé). */
export const AI_TOOL_DECLARATIONS: FunctionDeclaration[] = Object.values(AI_TOOLS).map(
  (t) => t.declaration
);

/**
 * Exécute un outil demandé par Gemini.
 * - Le nom de l'outil doit correspondre à un outil enregistré (allow-list).
 * - Les erreurs sont capturées et renvoyées à Gemini sous forme de message
 *   structuré : Gemini ne doit jamais inventer une information.
 */
export async function executeAiTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AiToolContext
): Promise<{ output?: unknown; error?: string; message?: string }> {
  const tool = AI_TOOLS[name];
  if (!tool) {
    return {
      error: "unknown_tool",
      message: `L'outil "${name}" n'existe pas ou n'est pas autorisé.`,
    };
  }
  try {
    const output = await tool.handler(args ?? {}, ctx);
    return { output };
  } catch (err: any) {
    console.error(`[AI Tools] Échec de l'outil "${name}":`, err?.message);
    return {
      error: "tool_error",
      message: `L'outil "${name}" n'a pas pu accéder aux données. Répondez à l'utilisateur que l'information demandée n'est pas disponible pour le moment, sans inventer de données.`,
    };
  }
}

