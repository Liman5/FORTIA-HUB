import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProductDetail } from "@/components/pages/ProductDetail";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * Fiche produit — /product/[slug]
 * ------------------------------------------------------------
 * Rendue CÔTÉ SERVEUR (données lues directement en base) : la page existe,
 * est partageable et référençable, même sans JavaScript.
 * Les parties interactives (panier, téléchargement sécurisé) sont confiées au
 * composant client `ProductDetail`.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product
    .findFirst({ where: { slug }, select: { title: true, description: true } })
    .catch(() => null);

  return {
    title: product ? `${product.title} | FORTIA HUB` : "Produit | FORTIA HUB",
    description: product?.description || "Produit numérique disponible sur FORTIA HUB.",
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Les slugs réels peuvent contenir « & », « : » ou des accents : selon le
  // navigateur, le paramètre arrive encodé ou décodé. On teste les deux formes.
  const candidates = Array.from(
    new Set([
      slug,
      (() => {
        try {
          return decodeURIComponent(slug);
        } catch {
          return slug;
        }
      })(),
    ])
  );

  // La colonne `id` est un UUID : on ne l'interroge que si la valeur y ressemble
  // (sinon PostgreSQL rejette la comparaison et la requête entière échoue).
  const looksLikeUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const filters: { slug?: { in: string[] }; id?: { in: string[] } }[] = [
    { slug: { in: candidates } },
  ];
  const uuids = candidates.filter(looksLikeUuid);
  if (uuids.length > 0) filters.push({ id: { in: uuids } });

  const product = await prisma.product
    .findFirst({
      where: { OR: filters },
      include: { files: { orderBy: { displayOrder: "asc" } } },
    })
    .catch(() => null);

  if (!product) {
    notFound();
  }

  // Un produit NON PUBLIÉ reste accessible à son vendeur et à l'administration,
  // mais jamais à un visiteur anonyme (ni à un autre utilisateur).
  if (!product.isPublished) {
    const cookieStore = await cookies();
    const requestLike = { cookies: cookieStore } as unknown as NextRequest;
    const [viewer, admin] = await Promise.all([
      getCurrentUser(requestLike),
      requireAdmin(requestLike),
    ]);
    const isOwner = !!product.vendorId && product.vendorId === viewer?.id;
    if (!admin && !isOwner) notFound();
  }

  let features: string[] = [];
  try {
    const parsed = JSON.parse(String(product.features || "[]"));
    if (Array.isArray(parsed)) features = parsed.map((f: unknown) => String(f));
  } catch {
    features = [];
  }

  const serialized = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    typeLabel: product.typeLabel || String(product.type),
    description: product.description || "",
    fullDescription: product.fullDescription || "",
    price: Number(product.price || 0),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    rating: Number(product.rating || 0),
    reviewsCount: Number(product.reviewsCount || 0),
    salesCount: Number(product.salesCount || 0),
    image: product.image || "",
    bannerImage: product.bannerImage || "",
    fileFormat: product.fileFormat || "",
    fileSize: product.fileSize || "",
    features,
    storeName: product.storeName || "",
    storeLogo: product.storeLogo || "",
    createdAt: product.createdAt ? product.createdAt.toISOString() : "",
    files: (product.files || []).map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileSize: file.fileSize || "",
      mimeType: file.mimeType || "",
    })),
  };

  return (
    <AppShell>
      <ProductDetail product={serialized} />
    </AppShell>
  );
}
