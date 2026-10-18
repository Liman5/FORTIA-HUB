// ============================================================
// FORTIA HUB — COMMISSIONS DE LA PLATEFORME (logique serveur)
// ------------------------------------------------------------
// Un taux par PORTÉE de vente :
//   general          → taux par défaut (repli si rien d'autre n'est actif)
//   digital_product  → produits numériques
//   course           → formations
//   service          → prestations de l'agence
//   storage          → stockage vidéo des formateurs
//
// Deux modes :
//   percent → pourcentage du montant de la vente
//   fixed   → montant fixe en USD, prélevé une fois par vente
//
// Le calcul est TOUJOURS refait côté serveur (jamais celui envoyé par
// le navigateur, qui pouvait annoncer 0 $ de commission).
// ============================================================
import { prisma } from "@/lib/prisma";

export type SaleScope = "general" | "digital_product" | "course" | "service" | "storage";
export type CommissionMode = "percent" | "fixed";

export interface CommissionRuleView {
  scope: SaleScope;
  mode: CommissionMode;
  value: number;
  isActive: boolean;
  label: string;
  updatedAt?: string;
}

/** Portées proposées dans l'administration (ordre d'affichage). */
export const SALE_SCOPES: SaleScope[] = [
  "general",
  "digital_product",
  "course",
  "service",
  "storage",
];

export const SALE_SCOPE_LABELS: Record<SaleScope, string> = {
  general: "Taux général (par défaut)",
  digital_product: "Produits numériques",
  course: "Formations",
  service: "Prestations de services",
  storage: "Stockage vidéo (formateurs)",
};

/** Repli si la table est vide ou absente : 10 % général. */
export const DEFAULT_COMMISSION_RULE: CommissionRuleView = {
  scope: "general",
  mode: "percent",
  value: 10,
  isActive: true,
  label: "Taux général plateforme",
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function isSaleScope(value: unknown): value is SaleScope {
  return typeof value === "string" && (SALE_SCOPES as string[]).includes(value);
}

/** Normalise une ligne Prisma (Decimal → nombre). */
function toView(row: {
  scope: string;
  mode: string;
  value: unknown;
  isActive: boolean;
  label: string;
  updatedAt?: Date | null;
}): CommissionRuleView {
  return {
    scope: isSaleScope(row.scope) ? row.scope : "general",
    mode: row.mode === "fixed" ? "fixed" : "percent",
    value: Number(row.value) || 0,
    isActive: row.isActive !== false,
    label: row.label || SALE_SCOPE_LABELS[(row.scope as SaleScope) || "general"] || "",
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
  };
}

/** Toutes les règles connues (complétées par les portées manquantes). */
export async function listCommissionRules(): Promise<CommissionRuleView[]> {
  let rows: Awaited<ReturnType<typeof prisma.commissionRule.findMany>> = [];
  try {
    rows = await prisma.commissionRule.findMany({ orderBy: { scope: "asc" } });
  } catch {
    // Table pas encore migrée : on retombe proprement sur le taux par défaut.
    return [DEFAULT_COMMISSION_RULE];
  }

  const byScope = new Map<SaleScope, CommissionRuleView>();
  rows.forEach((row) => {
    const view = toView(row as never);
    byScope.set(view.scope, view);
  });

  return SALE_SCOPES.map(
    (scope) =>
      byScope.get(scope) || {
        scope,
        mode: "percent",
        value: DEFAULT_COMMISSION_RULE.value,
        isActive: false,
        label: SALE_SCOPE_LABELS[scope],
      }
  );
}

/** Règle à appliquer pour une vente : taux du type, sinon taux général actif. */
export async function resolveCommissionRule(scope: SaleScope): Promise<CommissionRuleView> {
  const rules = await listCommissionRules();
  const own = rules.find((rule) => rule.scope === scope && rule.isActive);
  if (own) return own;

  const general = rules.find((rule) => rule.scope === "general" && rule.isActive);
  return general || DEFAULT_COMMISSION_RULE;
}

/** Montant de commission + part vendeur, bornés au montant de la vente. */
export function computeCommissionUsd(
  amountUsd: number,
  rule: CommissionRuleView
): { commissionUsd: number; vendorUsd: number; effectivePercent: number } {
  const amount = Math.max(0, Number(amountUsd) || 0);
  const rawValue = Math.max(0, Number(rule.value) || 0);
  const rawCommission = rule.mode === "fixed" ? rawValue : (amount * rawValue) / 100;
  const commission = Math.min(rawCommission, amount);

  return {
    commissionUsd: round2(commission),
    vendorUsd: round2(amount - commission),
    effectivePercent: amount > 0 ? round2((commission / amount) * 100) : 0,
  };
}

/** Enregistre (ou met à jour) le taux d'une portée. */
export async function saveCommissionRule(input: {
  scope: SaleScope;
  mode: CommissionMode;
  value: number;
  isActive: boolean;
}): Promise<CommissionRuleView> {
  const label = SALE_SCOPE_LABELS[input.scope] || "";
  const saved = await prisma.commissionRule.upsert({
    where: { scope: input.scope },
    update: {
      mode: input.mode,
      value: input.value,
      isActive: input.isActive,
      label,
    },
    create: {
      scope: input.scope,
      mode: input.mode,
      value: input.value,
      isActive: input.isActive,
      label,
    },
  });

  return toView(saved as never);
}
