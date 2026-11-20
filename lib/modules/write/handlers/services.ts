// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notifyUser";

import { EMAIL_PATTERN, FROM_EMAIL, resend } from "../helpers";
import type { WriteHandlerContext } from "../types";

export async function handleServicesAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
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
        const created = await prisma.serviceQuote.create({
          data: {
            clientName,
            clientEmail,
            clientPhone: data.phone || "",
            serviceTitle: data.serviceTitle || "",
            serviceId: data.serviceCategory || undefined,
            details: data.details || "",
            estimatedPrice: data.estimatedPrice || 0,
            status: "Recu",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "create-service": {
        const created = await prisma.servicePackage.create({
          data: {
            title: data.title || "Service sans titre",
            category: data.category || "",
            description: data.description || "",
            startingPrice: data.startingPrice || 0,
            estimatedDays: data.estimatedDays || "3 a 5 jours",
            iconName: data.iconName || "Briefcase",
            deliverables: data.deliverables || [],
            image: data.image || "",
            imagePosition: data.imagePosition || "50% 50%",
            images: Array.isArray(data.images) ? data.images : [],
            borderStyle: data.borderStyle || "gold",
            cardAnimation: data.cardAnimation || "fade-up",
            accentColor: data.accentColor || "#D69E25",
            badgeText: data.badgeText || "",
            featured: data.featured ?? false,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0,
          } as any,
        });

        if (Array.isArray(data.options)) {
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: created.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: created.id });
      }

    case "update-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const updated = await prisma.servicePackage.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            category: data.category ?? undefined,
            description: data.description ?? undefined,
            startingPrice: data.startingPrice ?? undefined,
            estimatedDays: data.estimatedDays ?? undefined,
            iconName: data.iconName ?? undefined,
            deliverables: data.deliverables ?? undefined,
            image: data.image ?? undefined,
            imagePosition: data.imagePosition ?? undefined,
            images: Array.isArray(data.images) ? data.images : undefined,
            borderStyle: data.borderStyle ?? undefined,
            cardAnimation: data.cardAnimation ?? undefined,
            accentColor: data.accentColor ?? undefined,
            badgeText: data.badgeText ?? undefined,
            featured: data.featured ?? undefined,
            isActive: data.isActive ?? undefined,
            displayOrder: data.displayOrder ?? undefined,
          } as any,
        });

        if (Array.isArray(data.options)) {
          await prisma.serviceOption.deleteMany({ where: { serviceId: data.id } });
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: data.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

    case "delete-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.servicePackage.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

    case "order-service": {
        const orderNumber = "SVC-" + Date.now().toString(36).toUpperCase();
        const serviceTitle = String(data.serviceTitle || data.title || "Service").trim();
        const clientName = String(data.clientName || "").trim();
        const clientEmail = String(data.clientEmail || "").trim().toLowerCase();
        const clientPhone = data.clientPhone || "";
        if (!clientName || !EMAIL_PATTERN.test(clientEmail)) {
          return NextResponse.json(
            { success: false, error: "Nom et adresse e-mail valides requis." },
            { status: 400 }
          );
        }

        const rawServiceId = data.serviceId ? String(data.serviceId) : "";
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawServiceId);

        // Prix recalculé depuis la base quand le service existe (le montant
        // envoyé par le navigateur n'est qu'une estimation).
        let estimatedPrice = Math.max(0, Number(data.estimatedPrice) || 0);
        if (isValidUuid) {
          const service = await prisma.servicePackage
            .findUnique({ where: { id: rawServiceId }, select: { startingPrice: true } })
            .catch(() => null);
          if (service) estimatedPrice = Number(service.startingPrice || 0);
        }

        // 1. Créer le devis (demande de service) visible côté admin
        const created = await prisma.serviceQuote.create({
          data: {
            clientName,
            clientEmail,
            clientPhone,
            serviceTitle,
            serviceId: isValidUuid ? rawServiceId : undefined,
            details: data.details || "",
            estimatedPrice,
            deadline: data.deadline || "",
            status: "Recu",
          } as any,
        });

        // 2. Notifier l'administration + le client (si compte existant)
        const notifDetails = data.details ? " Details: " + data.details : "";
        const notifMsg =
          "Nouvelle commande service: " + data.clientName + " a commande " +
          serviceTitle + " (" + orderNumber + ") - montant estime " +
          estimatedPrice + "$." + notifDetails;

        await prisma.notification.create({
          data: {
            title: "Nouvelle commande service",
            message: notifMsg,
            type: "info",
            linkTab: "admin",
            isGlobal: true,
            isRead: false,
          } as any,
        });

        // Notifier le client connecté (si son compte existe via email)
        let clientNotified = false;
        if (clientEmail) {
          const clientUser = await prisma.user.findFirst({
            where: { email: clientEmail.toLowerCase() },
          });
          if (clientUser) {
            await notifyUser(clientUser.id, {
              title: "Commande envoyée : " + serviceTitle,
              message: "Votre commande " + orderNumber + " a bien été reçue. Notre équipe vous contactera sous 24h pour valider le cahier des charges. Montant estimé : " + estimatedPrice + "$.",
              type: "success",
              linkTab: "member",
            });
            clientNotified = true;
          }
        }

        // 3. Email de confirmation (si Resend configuré)
        let emailSent = false;
        if (resend && clientEmail) {
          try {
            const priceUsd = estimatedPrice;
            const priceFcfa = (priceUsd * 600).toLocaleString("fr-FR");
            const emailHtml =
              "<div style='font-family:sans-serif;background:#010c22;color:#fff;padding:40px 16px;'>" +
              "<div style='max-width:560px;margin:0 auto;background:#021231;border:1px solid #1e293b;border-radius:16px;'>" +
              "<div style='background:#011d46;padding:32px 24px;text-align:center;border-bottom:2px solid #D69E25;'>" +
              "<h1 style='margin:0;color:#fff;font-size:26px;'>FORTIA <span style='color:#D69E25;'>HUB</span></h1>" +
              "</div>" +
              "<div style='padding:36px 32px;'>" +
              "<h2 style='margin:0 0 16px;color:#fff;font-size:22px;'>Votre commande a bien été reçue</h2>" +
              "<p style='color:#94a3b8;font-size:14px;'>Bonjour <strong style='color:#fff;'>" + (data.clientName || "") + "</strong>,</p>" +
              "<p style='color:#94a3b8;font-size:14px;'>Nous avons reçu votre commande du service <strong style='color:#D69E25;'>" + serviceTitle + "</strong>.</p>" +
              "<div style='background:#011D46;border:1px solid #334155;border-radius:12px;padding:20px;margin:24px 0;'>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>REFERENCE COMMANDE</p>" +
              "<p style='margin:0;color:#D69E25;font-size:18px;font-weight:800;'>" + orderNumber + "</p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Montant estime</p>" +
              "<p style='margin:0;color:#fff;font-size:20px;font-weight:800;'>" + priceUsd + "$ <span style='font-size:12px;color:#94a3b8;'>approx " + priceFcfa + " FCFA</span></p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Delai estime</p>" +
              "<p style='margin:0;color:#fff;font-size:14px;'>" + (data.deadline || "3 a 5 jours") + "</p>" +
              "</div>" +
              "<p style='color:#94a3b8;font-size:13px;'>Notre equipe va vous contacter rapidement par email ou WhatsApp.</p>" +
              "</div>" +
              "<div style='background:#011d46;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;'>" +
              "<p style='margin:0;color:#64748b;font-size:11px;'>FORTIA HUB © 2026 — Tous droits réservés</p>" +
              "</div>" +
              "</div>" +
              "</div>";

            const { data: emailData, error } = await resend.emails.send({
              from: FROM_EMAIL,
              to: [clientEmail],
              subject: "Commande reçue : " + serviceTitle,
              html: emailHtml,
            });
            if (error) {
              console.warn("[RESEND ORDER ERROR]", error);
            } else {
              emailSent = !!emailData?.id;
            }
          } catch (resendError: any) {
            console.warn("[RESEND ORDER EXCEPTION]", resendError);
          }
        }

        return NextResponse.json({
          success: true,
          id: created.id,
          orderNumber,
          emailSent,
          message: "Commande service créée avec succès",
        });
      }
  }
  return null;
}
