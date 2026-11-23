// ============================================================
// FORTIA HUB — AFFICHAGE MONÉTAIRE (FCFA principal)
// ------------------------------------------------------------
// Règles :
//   • Les montants enregistrés en base restent en USD : ce module ne
//     modifie AUCUNE valeur, il ne fait que formater un affichage.
//   • Le FCFA (XOF) est TOUJOURS la monnaie principale affichée.
//   • L'équivalent USD est facultatif, discret, et n'apparaît que si
//     l'administrateur l'active ET qu'un taux est configuré (> 0).
//   • Aucun taux « inventé » : sans taux configuré, aucun équivalent
//     n'est affiché.
// ============================================================

/** Taux par défaut (FCFA pour 1 USD) — identique à la valeur historique. */
export const DEFAULT_CFA_RATE = 600;

export interface MoneyConfig {
  /** FCFA pour 1 USD (taux d'affichage configuré par l'admin). */
  rate: number;
  /** Afficher « ≈ x USD » sous le prix principal. */
  showSecondaryUsd: boolean;
}

/** Lit la configuration d'affichage depuis le contenu du site. */
export function resolveMoneyConfig(
  siteContent?: { fcfaRate?: number | string | null; showUsdSecondary?: boolean | null } | null
): MoneyConfig {
  const rawRate = Number(siteContent?.fcfaRate);
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : DEFAULT_CFA_RATE;
  return {
    rate,
    showSecondaryUsd: siteContent?.showUsdSecondary === true && rate > 0,
  };
}

/** Montant FCFA (entier) à partir d'un montant USD. */
export function usdToFcfa(usd: number, rate: number = DEFAULT_CFA_RATE): number {
  const amount = Number(usd) || 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_CFA_RATE;
  return Math.round(amount * safeRate);
}

/** « 25 000 FCFA » (ou « Gratuit » si le montant est nul). */
export function formatFcfa(usd: number, rate: number = DEFAULT_CFA_RATE): string {
  const amount = Number(usd) || 0;
  if (amount <= 0) return "Gratuit";
  return `${usdToFcfa(amount, rate).toLocaleString("fr-FR")} FCFA`;
}

/**
 * Prix principal + éventuel équivalent USD discret.
 * Retourne `{ primary, secondary? }` — `secondary` est absent si l'option
 * est désactivée : un seul prix est alors affiché.
 */
export function formatPricePair(
  usd: number,
  config: MoneyConfig
): { primary: string; secondary?: string } {
  const amount = Number(usd) || 0;
  const primary = formatFcfa(amount, config.rate);
  if (amount <= 0 || !config.showSecondaryUsd) return { primary };
  const secondary = `≈ ${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
  return { primary, secondary };
}
