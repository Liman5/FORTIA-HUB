// ============================================================
// FORTIA HUB — HANDLER D'ÉCRITURE : MARKETPLACE
// ------------------------------------------------------------
// Adaptateur HTTP : contrôles de propriété puis services métier.
// ============================================================

import { NextResponse } from "next/server";
import {
  WriteError,
  assertContentOwnership,
  assertProductAccess,
  requireActorUser,
  requireStoreAccess,
} from "@/lib/server/writeAuthorization";
import { uuidOrNull } from "@/lib/validation/common";
import {
  createProductRecord,
  updateProductRecord,
  type ProductStoreRef,
} from "@/lib/modules/marketplace/products";
import { findVendorStore } from "@/lib/modules/marketplace/stores";
import {
  moderateContent,
  restoreContent,
  submitModerationAppeal,
} from "@/lib/modules/marketplace/moderation";
import type { WriteHandlerContext } from "../types";

export async function handleMarketplaceAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;

  switch (action) {
    case "create-product": {
      // Un vendeur ne peut publier que dans SA boutique (admin : ciblage libre).
      const storeRef = data.storeId || data.storeName;
      let store: ProductStoreRef | null = storeRef
        ? await requireStoreAccess(auth, storeRef)
        : null;

      if (!store && !auth.isAdmin) {
        const seller = requireActorUser(auth);
        store = await findVendorStore(seller.id);
        if (!store) {
          throw new WriteError(403, "Créez une boutique avant de publier un produit.");
        }
      }

      const vendorId = auth.isAdmin
        ? uuidOrNull(data.vendorId) || store?.vendorId || undefined
        : requireActorUser(auth).id;

      const id = await createProductRecord({ store, vendorId, data });
      return NextResponse.json({ success: true, id });
    }

    case "update-product": {
      await assertProductAccess(auth, data.id);
      const id = await updateProductRecord(String(data.id), data, {
        isAdmin: auth.isAdmin,
      });
      return NextResponse.json({ success: true, id });
    }

    case "moderate-content": {
      const targetType = data.targetType === "product" ? "product" : "course";
      if (!uuidOrNull(data.targetId)) {
        return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
      }
      await moderateContent(targetType, String(data.targetId), data.reason);
      return NextResponse.json({ success: true });
    }

    case "restore-content": {
      const targetType = data.targetType === "product" ? "product" : "course";
      if (!uuidOrNull(data.targetId)) {
        return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
      }
      await restoreContent(targetType, String(data.targetId));
      return NextResponse.json({ success: true });
    }

    case "appeal-moderation": {
      const targetType = data.targetType === "product" ? "product" : "course";
      if (!uuidOrNull(data.targetId)) {
        return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
      }
      await assertContentOwnership(auth, targetType, data.targetId);
      const message = String(data.message || "").trim().slice(0, 800);
      if (!message) {
        return NextResponse.json(
          { error: "Expliquez votre demande d'examen." },
          { status: 400 }
        );
      }
      await submitModerationAppeal(targetType, String(data.targetId), message);
      return NextResponse.json({ success: true });
    }
  }

  return null;
}
