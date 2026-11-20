// ============================================================
// FORTIA HUB — BOUTIQUES (service métier marketplace)
// ============================================================

import { prisma } from "@/lib/prisma";

export interface StoreSummary {
  id: string;
  name: string;
  vendorId: string | null;
  logo: string;
}

/** Boutique d'un vendeur (une seule attendue : la première créée). */
export async function findVendorStore(vendorId: string): Promise<StoreSummary | null> {
  return prisma.store.findFirst({
    where: { vendorId },
    select: { id: true, name: true, vendorId: true, logo: true },
  });
}
