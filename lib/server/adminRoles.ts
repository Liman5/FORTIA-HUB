// ============================================================
// FORTIA HUB — RÔLES D'ADMINISTRATION (source de vérité serveur)
// ------------------------------------------------------------
//   superadmin   → tout, y compris la gestion des comptes admin ;
//                  NE PEUT PAS être supprimé/désactivé/rétrogradé.
//   general      → tout modifier comme un superadmin, MAIS il peut être
//                  supprimé par un superadmin.
//   superviseur  → LECTURE SEULE (supervise sans modifier).
//   financier    → écritures limitées au domaine FINANCE.
//   kyc          → écritures limitées au domaine KYC.
// ============================================================

export type AdminRoleKey = "superadmin" | "general" | "superviseur" | "financier" | "kyc";

/** Domaines d'écriture (tout ce qui n'est ni finance ni KYC = contenu). */
export type AdminDomain = "finance" | "kyc" | "content";

export const ADMIN_ROLE_LABELS: Record<AdminRoleKey, string> = {
  superadmin: "Superadministrateur",
  general: "Administrateur général",
  superviseur: "Superviseur (lecture seule)",
  financier: "Administrateur financier",
  kyc: "Vérificateur KYC",
};

/** Normalise un rôle venant de la base (`super_admin`, `Admin`, …). */
export function normalizeAdminRole(role?: unknown): AdminRoleKey {
  const value = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (value === "superadmin" || value === "owner" || value === "root") return "superadmin";
  if (value === "superviseur" || value === "supervisor" || value === "superviseurlecture") {
    return "superviseur";
  }
  if (value === "financier" || value === "finance" || value === "financial") return "financier";
  if (
    value === "kyc" ||
    value === "kycverificateur" ||
    value === "verificateurkyc" ||
    value === "verificateur"
  ) {
    return "kyc";
  }
  // `admin`, `general`, `admingeneral`, inconnu → administrateur général
  return "general";
}

export function isSuperAdmin(role?: unknown): boolean {
  return normalizeAdminRole(role) === "superadmin";
}

/** Superviseur = lecture seule : aucune écriture autorisée. */
export function isReadOnlyAdmin(role?: unknown): boolean {
  return normalizeAdminRole(role) === "superviseur";
}

/**
 * Domaines dans lesquels ce rôle peut ÉCRIRE.
 * `null` = tous les domaines.
 */
export function adminWriteDomains(role?: unknown): AdminDomain[] | null {
  switch (normalizeAdminRole(role)) {
    case "superadmin":
    case "general":
      return null;
    case "superviseur":
      return [];
    case "financier":
      return ["finance"];
    case "kyc":
      return ["kyc"];
    default:
      return null;
  }
}

/** Ce rôle peut-il écrire dans ce domaine ? */
export function canWriteDomain(role: unknown, domain: AdminDomain): boolean {
  const domains = adminWriteDomains(role);
  if (domains === null) return true;
  return domains.includes(domain);
}

/** Actions d'écriture du domaine FINANCE. */
export const FINANCE_ACTIONS = new Set([
  "submit-order",
  "submit-payout",
  "approve-payout",
  "register-free-purchase",
  "pay-training-center-fee",
  "register-instructor-purchase",
  "register-course-media-storage",
  "save-commission-rule",
]);

/** Actions d'écriture du domaine KYC. */
export const KYC_ACTIONS = new Set(["submit-kyc", "approve-kyc", "approve-kyc-full"]);

/** Domaine d'une action d'écriture (défaut : contenu). */
export function actionDomain(action: string): AdminDomain {
  if (FINANCE_ACTIONS.has(action)) return "finance";
  if (KYC_ACTIONS.has(action)) return "kyc";
  return "content";
}
