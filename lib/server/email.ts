// ============================================================
// FORTIA HUB — ENVOI D'E-MAILS (infrastructure partagée)
// ------------------------------------------------------------
// Seul point de création du client Resend. Les modules métier
// (services, …) ne connaissent ni la clé ni le fournisseur.
// ============================================================

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const client = apiKey ? new Resend(apiKey) : null;

export const SENDER_EMAIL =
  process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return !!client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoie un e-mail transactionnel. Ne lève jamais : renvoie false si
 * Resend n'est pas configuré ou si l'envoi échoue (le parcours métier
 * ne doit pas échouer pour un e-mail).
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!client || !input.to) return false;
  try {
    const { data, error } = await client.emails.send({
      from: SENDER_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.warn("[EMAIL] Envoi refusé:", error.message || "erreur fournisseur");
      return false;
    }
    return !!data?.id;
  } catch (error) {
    console.warn("[EMAIL] Exception d'envoi:", (error as Error)?.message || "inconnue");
    return false;
  }
}
