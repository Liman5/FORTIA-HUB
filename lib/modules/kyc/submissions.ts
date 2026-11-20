// ============================================================
// FORTIA HUB — DOSSIERS KYC (service métier)
// ------------------------------------------------------------
// Dépôt et décision d'un dossier. Les contrôles de rôle restent
// dans le handler / l'autorisation centrale.
// ============================================================

import { prisma } from "@/lib/prisma";

export type KycWriteData = Record<string, any>;

const MAX_FILE_URL_LENGTH = 2000;

/** Les DataURL base64 ne sont jamais stockées dans la table. */
export function sanitizeKycFileUrl(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  return raw.startsWith("data:") ? "" : raw.slice(0, MAX_FILE_URL_LENGTH);
}

export interface KycApplicant {
  /** UUID réel de l'utilisateur (jamais un identifiant fabriqué côté client). */
  id?: string | null;
  email?: string | null;
}

export async function submitKycSubmission(
  applicant: KycApplicant,
  data: KycWriteData
): Promise<string> {
  const created = await prisma.kycSubmission.create({
    data: {
      applicantType: data.applicantType || "freelance",
      applicantId: applicant.id || undefined,
      applicantName: data.applicantName || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      repRole: data.repRole || "",
      email: applicant.email || data.email || "",
      phone: data.phone || "",
      country: data.country || "",
      address: data.address || "",
      documentType: data.documentType || "CNI",
      documentNumber: data.documentNumber || "",
      idExpirationDate: data.idExpirationDate || "",
      idRectoUrl: sanitizeKycFileUrl(data.idRectoUrl),
      idVersoUrl: sanitizeKycFileUrl(data.idVersoUrl),
      selfieUrl: sanitizeKycFileUrl(data.selfieUrl),
      companyName: data.companyName || "",
      legalForm: data.legalForm || "",
      rccmNumber: data.rccmNumber || "",
      companyDocUrl: sanitizeKycFileUrl(data.companyDocUrl),
      documentFileUrl: sanitizeKycFileUrl(data.documentFileUrl),
      status: "En_attente",
    } as never,
  });
  return created.id;
}

export async function approveKycSubmissionById(kycId: string): Promise<string> {
  const updated = await prisma.kycSubmission.update({
    where: { id: kycId },
    data: { status: "Approuve" } as never,
  });
  return updated.id;
}
