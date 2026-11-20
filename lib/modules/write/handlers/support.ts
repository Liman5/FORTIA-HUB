// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { EMAIL_PATTERN } from "@/lib/validation/common";
import type { WriteHandlerContext } from "../types";

export async function handleSupportAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "submit-support": {
        // Action publique : commande + e-mail valides obligatoires.
        const supportEmail = String(data.email || "").trim().toLowerCase();
        const orderNumber = String(data.orderNumber || "").trim();
        if (!orderNumber || !EMAIL_PATTERN.test(supportEmail)) {
          return NextResponse.json(
            { success: false, error: "Numéro de commande et e-mail valides requis." },
            { status: 400 }
          );
        }
        const created = await prisma.postPurchaseSupport.create({
          data: {
            orderNumber,
            productTitle: data.productTitle || "",
            lastName: data.lastName || "",
            firstName: data.firstName || "",
            phoneContact: data.phoneContact || "",
            email: supportEmail,
            notes: data.notes || "",
            forwardedEmail: data.forwardedEmail || "",
            status: "Transmis_Enregistre",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }
  }
  return null;
}
