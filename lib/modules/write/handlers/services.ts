// ============================================================
// FORTIA HUB — HANDLER D'ÉCRITURE : SERVICES
// ------------------------------------------------------------
// Adaptateur HTTP : validation d'entrée puis services métier.
// ============================================================

import { NextResponse } from "next/server";
import { EMAIL_PATTERN } from "@/lib/validation/common";
import {
  createServiceRecord,
  deleteServiceRecord,
  updateServiceRecord,
} from "@/lib/modules/services/catalog";
import {
  createQuote,
  orderService,
  resolveServicePrice,
} from "@/lib/modules/services/quotes";
import type { WriteHandlerContext } from "../types";

export async function handleServicesAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { data } = context;

  switch (action) {
    case "submit-quote": {
      // Action publique : champs obligatoires validés (anti-spam).
      const clientName = String(data.clientName || "").trim();
      const clientEmail = String(data.clientEmail || "").trim().toLowerCase();
      if (!clientName || !EMAIL_PATTERN.test(clientEmail)) {
        return NextResponse.json(
          { success: false, error: "Nom et adresse e-mail valides requis." },
          { status: 400 }
        );
      }
      const id = await createQuote({
        clientName,
        clientEmail,
        clientPhone: data.phone,
        serviceTitle: data.serviceTitle,
        serviceCategory: data.serviceCategory,
        details: data.details,
        estimatedPrice: Math.max(0, Number(data.estimatedPrice) || 0),
      });
      return NextResponse.json({ success: true, id });
    }

    case "create-service": {
      const id = await createServiceRecord(data);
      return NextResponse.json({ success: true, id });
    }

    case "update-service": {
      if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      const id = await updateServiceRecord(data);
      return NextResponse.json({ success: true, id });
    }

    case "delete-service": {
      if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      await deleteServiceRecord(String(data.id));
      return NextResponse.json({ success: true });
    }

    case "order-service": {
      const clientName = String(data.clientName || "").trim();
      const clientEmail = String(data.clientEmail || "").trim().toLowerCase();
      if (!clientName || !EMAIL_PATTERN.test(clientEmail)) {
        return NextResponse.json(
          { success: false, error: "Nom et adresse e-mail valides requis." },
          { status: 400 }
        );
      }

      const price = await resolveServicePrice(data.serviceId, data.estimatedPrice);
      const result = await orderService({
        clientName,
        clientEmail,
        clientPhone: data.clientPhone,
        serviceTitle: data.serviceTitle || data.title,
        details: data.details,
        deadline: data.deadline,
        estimatedPrice: price.price,
        serviceId: price.serviceId,
      });

      return NextResponse.json({
        success: true,
        id: result.quoteId,
        orderNumber: result.orderNumber,
        emailSent: result.emailSent,
        message: "Commande service créée avec succès",
      });
    }
  }

  return null;
}
