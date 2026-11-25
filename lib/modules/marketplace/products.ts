// ============================================================
// FORTIA HUB — PRODUITS (service métier marketplace)
// ============================================================

import { prisma } from "@/lib/prisma";

export interface ProductStoreRef {
  id: string;
  name: string;
  vendorId: string | null;
  logo?: string | null;
}

export type ProductWriteData = Record<string, any>;

export interface CreateProductInput {
  store: ProductStoreRef | null;
  vendorId?: string;
  data: ProductWriteData;
}

export async function createProductRecord(input: CreateProductInput): Promise<string> {
  const { store, data } = input;
  const created = await prisma.product.create({
    data: {
      storeId: store?.id || undefined,
      vendorId: input.vendorId,
      storeName: store?.name || data.storeName || "FORTIA Digital Official Store",
      storeLogo: data.storeLogo || store?.logo || "",
      title: data.title || "Produit sans titre",
      slug: data.slug || "produit-" + Date.now(),
      type: data.type || "ebook",
      typeLabel: data.typeLabel || data.type || "Produit Numérique",
      description: data.description || "",
      fullDescription: data.fullDescription || "",
      price: data.price || 0,
      originalPrice: data.originalPrice,
      fileFormat: data.fileFormat || "PDF",
      fileSize: data.fileSize || "10 MB",
      image: data.image || "",
      bannerImage: data.bannerImage || "",
      images: Array.isArray(data.images) ? data.images.map(String).filter(Boolean) : [],
      features: data.features || [],
      downloadUrl: data.downloadUrl || "#",
      isPublished: data.isPublished ?? true,
      isApproved: data.isApproved ?? true,
      isPopular: data.isPopular ?? false,
      rating: 5.0,
      reviewsCount: 0,
      salesCount: 0,
    } as never,
  });
  return created.id;
}

/** La modération (approbation / mise en avant) reste réservée aux admins. */
export async function updateProductRecord(
  productId: string,
  data: ProductWriteData,
  options: { isAdmin: boolean }
): Promise<string> {
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      title: data.title ?? undefined,
      description: data.description ?? undefined,
      fullDescription: data.fullDescription ?? undefined,
      price: data.price ?? undefined,
      originalPrice: data.originalPrice ?? undefined,
      fileFormat: data.fileFormat ?? undefined,
      fileSize: data.fileSize ?? undefined,
      image: data.image ?? undefined,
      bannerImage: data.bannerImage ?? undefined,
      images: Array.isArray(data.images) ? data.images.map(String).filter(Boolean) : undefined,
      features: data.features ?? undefined,
      downloadUrl: data.downloadUrl ?? undefined,
      isPublished: data.isPublished ?? undefined,
      isApproved: options.isAdmin ? (data.isApproved ?? undefined) : undefined,
      isPopular: options.isAdmin ? (data.isPopular ?? undefined) : undefined,
    } as never,
  });
  return updated.id;
}
