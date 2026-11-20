// ============================================================
// FORTIA HUB — E-MAIL DE CONFIRMATION DE COMMANDE SERVICE
// ============================================================

import { sendEmail } from "@/lib/server/email";

export interface ServiceOrderEmailInput {
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  orderNumber: string;
  estimatedPrice: number;
  deadline: string;
}

export function buildServiceOrderEmail(input: ServiceOrderEmailInput): string {
  const priceFcfa = (input.estimatedPrice * 600).toLocaleString("fr-FR");
  return (
    "<div style='font-family:sans-serif;background:#010c22;color:#fff;padding:40px 16px;'>" +
    "<div style='max-width:560px;margin:0 auto;background:#021231;border:1px solid #1e293b;border-radius:16px;'>" +
    "<div style='background:#011d46;padding:32px 24px;text-align:center;border-bottom:2px solid #D69E25;'>" +
    "<h1 style='margin:0;color:#fff;font-size:26px;'>FORTIA <span style='color:#D69E25;'>HUB</span></h1>" +
    "</div>" +
    "<div style='padding:36px 32px;'>" +
    "<h2 style='margin:0 0 16px;color:#fff;font-size:22px;'>Votre commande a bien été reçue</h2>" +
    `<p style='color:#94a3b8;font-size:14px;'>Bonjour <strong style='color:#fff;'>${input.clientName}</strong>,</p>` +
    `<p style='color:#94a3b8;font-size:14px;'>Nous avons reçu votre commande du service <strong style='color:#D69E25;'>${input.serviceTitle}</strong>.</p>` +
    "<div style='background:#011D46;border:1px solid #334155;border-radius:12px;padding:20px;margin:24px 0;'>" +
    "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>REFERENCE COMMANDE</p>" +
    `<p style='margin:0;color:#D69E25;font-size:18px;font-weight:800;'>${input.orderNumber}</p>` +
    "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
    "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Montant estime</p>" +
    `<p style='margin:0;color:#fff;font-size:20px;font-weight:800;'>${input.estimatedPrice}$ <span style='font-size:12px;color:#94a3b8;'>approx ${priceFcfa} FCFA</span></p>` +
    "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
    "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Delai estime</p>" +
    `<p style='margin:0;color:#fff;font-size:14px;'>${input.deadline || "3 a 5 jours"}</p>` +
    "</div>" +
    "<p style='color:#94a3b8;font-size:13px;'>Notre equipe va vous contacter rapidement par email ou WhatsApp.</p>" +
    "</div>" +
    "<div style='background:#011d46;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;'>" +
    "<p style='margin:0;color:#64748b;font-size:11px;'>FORTIA HUB © 2026 — Tous droits réservés</p>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

export async function sendServiceOrderConfirmation(
  input: ServiceOrderEmailInput
): Promise<boolean> {
  return sendEmail({
    to: input.clientEmail,
    subject: "Commande reçue : " + input.serviceTitle,
    html: buildServiceOrderEmail(input),
  });
}
