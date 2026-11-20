// ============================================================
// FORTIA HUB — DEVIS ET COMMANDES DE SERVICE (service métier)
// ============================================================

import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notifyUser";
import { UUID_PATTERN } from "@/lib/validation/common";
import { sendServiceOrderConfirmation } from "./emails";

export type QuoteWriteData = Record<string, any>;

export interface QuoteInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  serviceTitle?: string;
  serviceCategory?: string;
  details?: string;
  estimatedPrice?: number;
  deadline?: string;
}

export async function createQuote(input: QuoteInput): Promise<string> {
  const created = await prisma.serviceQuote.create({
    data: {
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone || "",
      serviceTitle: input.serviceTitle || "",
      serviceId: input.serviceCategory || undefined,
      details: input.details || "",
      estimatedPrice: input.estimatedPrice || 0,
      status: "Recu",
    } as never,
  });
  return created.id;
}

/** Prix serveur : le montant du service existant prime sur l'estimation client. */
export async function resolveServicePrice(
  serviceId: unknown,
  fallback: unknown
): Promise<{ price: number; serviceId?: string }> {
  const raw = serviceId ? String(serviceId) : "";
  const valid = UUID_PATTERN.test(raw) ? raw : "";
  let price = Math.max(0, Number(fallback) || 0);

  if (valid) {
    const service = await prisma.servicePackage
      .findUnique({ where: { id: valid }, select: { startingPrice: true } })
      .catch(() => null);
    if (service) price = Number(service.startingPrice || 0);
  }
  return { price, serviceId: valid || undefined };
}

export interface OrderServiceInput extends QuoteInput {
  estimatedPrice: number;
  serviceId?: string;
}

export interface OrderServiceResult {
  quoteId: string;
  orderNumber: string;
  emailSent: boolean;
}

/**
 * Commande de service : devis + notifications admin/client + e-mail.
 * L'identité et la validation d'entrée restent dans le handler.
 */
export async function orderService(input: OrderServiceInput): Promise<OrderServiceResult> {
  const orderNumber = "SVC-" + Date.now().toString(36).toUpperCase();
  const serviceTitle = String(input.serviceTitle || "Service").trim();
  const estimatedPrice = input.estimatedPrice;

  const quote = await prisma.serviceQuote.create({
    data: {
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone || "",
      serviceTitle,
      serviceId: input.serviceId,
      details: input.details || "",
      estimatedPrice,
      deadline: input.deadline || "",
      status: "Recu",
    } as never,
  });

  const notifDetails = input.details ? " Details: " + input.details : "";
  await prisma.notification.create({
    data: {
      title: "Nouvelle commande service",
      message:
        "Nouvelle commande service: " +
        input.clientName +
        " a commande " +
        serviceTitle +
        " (" +
        orderNumber +
        ") - montant estime " +
        estimatedPrice +
        "$." +
        notifDetails,
      type: "info",
      linkTab: "admin",
      isGlobal: true,
      isRead: false,
    } as never,
  });

  const clientUser = await prisma.user.findFirst({
    where: { email: input.clientEmail.toLowerCase() },
    select: { id: true },
  });
  if (clientUser) {
    await notifyUser(clientUser.id, {
      title: "Commande envoyée : " + serviceTitle,
      message:
        "Votre commande " +
        orderNumber +
        " a bien été reçue. Notre équipe vous contactera sous 24h pour valider le cahier des charges. Montant estimé : " +
        estimatedPrice +
        "$.",
      type: "success",
      linkTab: "member",
    });
  }

  const emailSent = await sendServiceOrderConfirmation({
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    serviceTitle,
    orderNumber,
    estimatedPrice,
    deadline: String(input.deadline || "3 a 5 jours"),
  });

  return { quoteId: quote.id, orderNumber, emailSent };
}
