// ============================================================
// FORTIA HUB — MONNAIE (Phase 2)
// ------------------------------------------------------------
// Tous les montants internes sont des ENTIERS en unités mineures :
//   USD 12,50 → 1250     XOF 5000 → 5000 (pas de subdivision)
// Aucun calcul métier ne doit utiliser de nombre flottant.
// ============================================================

/** Nombre de décimales par devise. XOF/XAF n'ont pas de subdivision. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  GHS: 2,
  NGN: 2,
  CAD: 2,
  XOF: 0,
  XAF: 0,
  JPY: 0,
};

export const DEFAULT_CURRENCY = "USD";

export function normalizeCurrency(currency?: string | null): string {
  const code = String(currency || DEFAULT_CURRENCY).trim().toUpperCase();
  return CURRENCY_EXPONENTS[code] !== undefined ? code : DEFAULT_CURRENCY;
}

export function currencyExponent(currency?: string | null): number {
  return CURRENCY_EXPONENTS[normalizeCurrency(currency)] ?? 2;
}

/**
 * Convertit un montant « décimal » (Prisma Decimal, number, string) en unités
 * mineures. Arrondi au plus proche : jamais de troncature silencieuse.
 */
export function toMinorUnits(
  value: unknown,
  currency?: string | null
): number {
  const exponent = currencyExponent(currency);
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw)) return 0;
  const factor = 10 ** exponent;
  return Math.round(raw * factor);
}

/** Convertit des unités mineures en montant décimal (affichage / legacy). */
export function fromMinorUnits(minor: number, currency?: string | null): number {
  const exponent = currencyExponent(currency);
  const factor = 10 ** exponent;
  return Math.round(Number(minor) || 0) / factor;
}

/** Formate un montant lisible (jamais utilisé pour un calcul). */
export function formatMoney(minor: number, currency?: string | null): string {
  const code = normalizeCurrency(currency);
  const value = fromMinorUnits(minor, code);
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: code,
      minimumFractionDigits: currencyExponent(code),
    }).format(value);
  } catch {
    return `${value.toFixed(currencyExponent(code))} ${code}`;
  }
}

/** Deux montants sont-ils identiques (même devise, mêmes unités mineures) ? */
export function sameAmount(
  aMinor: number,
  aCurrency: string,
  bMinor: number,
  bCurrency: string
): boolean {
  return (
    normalizeCurrency(aCurrency) === normalizeCurrency(bCurrency) &&
    Math.round(Number(aMinor)) === Math.round(Number(bMinor))
  );
}
