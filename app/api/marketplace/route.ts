import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { readResponseCache, writeResponseCache } from "@/lib/server/responseCache";
import { toPublicProducts } from "@/lib/modules/marketplace/publicView";


export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace
 * ------------------------------------------------------------
 * Boutique : boutiques (SANS coordonnées de paiement) et produits,
 * paginés. Les commandes, retraits et candidatures restent exclusifs à
 * `/api/platform/admin-sync`.
 *
 * Paramètres : page, limit (défaut 24), q, type, storeId
 */
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const cacheKey = `GET /api/marketplace${req.nextUrl.search}`;

  // Cache serveur 15 s pour les visiteurs ANONYMES uniquement (aucun cookie
  // de session) : le contenu est alors identique pour tous, et c'est la route
  // la plus appelée au démarrage. Un membre connecté n'est jamais servi
  // depuis ce cache (il peut voir des brouillons de son propre espace).
  const hasSession = Boolean(req.cookies.get("fh_session")?.value);
  const cached = hasSession ? null : readResponseCache(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  try {
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(
      Math.max(1, Number(params.get("limit") || DEFAULT_LIMIT)),
      MAX_LIMIT
    );
    const q = (params.get("q") || "").trim();
    const type = (params.get("type") || "").trim();
    const storeId = (params.get("storeId") || "").trim();

    // Les produits NON PUBLIÉS (brouillons des vendeurs) ne doivent pas
    // apparaître dans la boutique publique. Un visiteur anonyme ne voit donc
    // que les produits publiés ; un utilisateur connecté (vendeur, formateur,
    // administrateur) continue de voir l'ensemble, comme dans son espace.
    const [viewer, admin] = await Promise.all([getCurrentUser(req), requireAdmin(req)]);
    const isAnonymous = !viewer && !admin;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (isAnonymous) where.isPublished = true;
    if (storeId) where.storeId = storeId;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { storeName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, products, stores] = await Promise.all([
      prisma.product.count({ where }).catch(() => 0),
      prisma.product
        .findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
        .catch(() => [] as never[]),
      prisma.store.findMany({ orderBy: { createdAt: "desc" } }).catch(() => [] as never[]),
    ]);

    // Les coordonnées de retrait (Wave / OM / IBAN / USDT) ne sortent JAMAIS ici
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicStores = (stores as any[]).map((store) => {
      const { payoutInfo, ...rest } = store || {};
      return { ...rest, payoutMethod: payoutInfo?.method || "" };
    });

    const safeProducts = toPublicProducts(products as Record<string, any>[], {
      viewerId: viewer?.id,
      isAdmin: !!admin,
    });

    const response = jsonSafe({
      success: true,
      data: {
        stores: publicStores,
        products: safeProducts,
        total,
        page,
        limit,
        hasMore: (page - 1) * limit + products.length < total,
      },
    });

    // Mise en cache réservée aux visiteurs anonymes (jamais pour un membre).
    const body = await response.text();
    if (isAnonymous) writeResponseCache(cacheKey, body);

    return new Response(body, {
      headers: { "Content-Type": "application/json", "X-Cache": isAnonymous ? "MISS" : "BYPASS" },
    });
  } catch (error: any) {
    console.error("[MARKETPLACE] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture de la boutique." }, { status: 500 });
  }
}
