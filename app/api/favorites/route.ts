import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";

export const dynamic = "force-dynamic";

/**
 * /api/favorites
 * ------------------------------------------------------------
 * Favoris du membre CONNECTÉ uniquement (aucune donnée d'un autre compte).
 *   • GET  : liste des favoris (type + identifiant de ressource)
 *   • POST : ajoute ou retire un favori `{ resourceType, resourceId, action }`
 *
 * Les ressources autorisées sont les formations et les produits numériques.
 * La table `favorites` porte une clé unique (user, type, ressource) : aucun
 * doublon n'est possible, même en cas de double clic.
 */

const RESOURCE_TYPES = ["product", "course"] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeResourceType(value: unknown): ResourceType | null {
  const type = String(value || "").trim().toLowerCase();
  return (RESOURCE_TYPES as readonly string[]).includes(type) ? (type as ResourceType) : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { resourceType: true, resourceId: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      favorites: favorites.map((favorite) => ({
        resourceType: favorite.resourceType,
        resourceId: favorite.resourceId,
        createdAt: favorite.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[FAVORITES] Lecture impossible:", error);
    return NextResponse.json({ error: "Favoris indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const resourceType = normalizeResourceType(body?.resourceType);
    const resourceId = String(body?.resourceId || "");
    const action = String(body?.action || "add").toLowerCase();

    if (!resourceType || !UUID_PATTERN.test(resourceId)) {
      return NextResponse.json(
        { error: "Ressource invalide." },
        { status: 400 }
      );
    }

    if (action === "remove") {
      await prisma.favorite.deleteMany({
        where: { userId: user.id, resourceType, resourceId },
      });
      return NextResponse.json({ success: true, favorite: false, resourceType, resourceId });
    }

    await prisma.favorite.upsert({
      where: {
        userId_resourceType_resourceId: { userId: user.id, resourceType, resourceId },
      },
      create: { userId: user.id, resourceType, resourceId },
      update: {},
    });

    return NextResponse.json({ success: true, favorite: true, resourceType, resourceId });
  } catch (error: any) {
    console.error("[FAVORITES] Écriture impossible:", error);
    return NextResponse.json({ error: "Favori non enregistré." }, { status: 500 });
  }
}
