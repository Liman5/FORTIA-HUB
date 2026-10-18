import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";


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
  try {
    const params = req.nextUrl.searchParams;
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

    return jsonSafe({
      success: true,
      data: {
        stores: publicStores,
        products,
        total,
        page,
        limit,
        hasMore: (page - 1) * limit + products.length < total,
      },
    });
  } catch (error: any) {
    console.error("[MARKETPLACE] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture de la boutique." }, { status: 500 });
  }
}
