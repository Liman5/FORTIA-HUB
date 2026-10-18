"use client";

// ============================================================
// FORTIA HUB — CONTEXTES DE DOMAINE & SÉLECTEURS (Phase 3)
// ------------------------------------------------------------
// Chaque domaine est exposé par SON PROPRE contexte. Un composant qui
// n'a besoin que du panier (useCommerce) n'est plus re-rendu lorsque le
// catalogue ou la session changent.
//
// Les hooks de domaine sont volontairement typés à partir du module
// correspondant : impossible de désynchroniser le type et l'implémentation.
//
// ⚠️ Le contexte global `useAppStore()` reste disponible et inchangé :
// la migration des composants est progressive et sans rupture.
// ============================================================

import { createContext, useContext } from "react";
import type { useUiDomain } from "./useUiDomain";
import type { useAuthDomain } from "./useAuthDomain";
import type { useMarketplaceDomain } from "./useMarketplaceDomain";
import type { useCatalogDomain } from "./useCatalogDomain";
import type { useCommerceDomain } from "./useCommerceDomain";

export type CommerceValue = ReturnType<typeof useCommerceDomain>;
export const CommerceValueContext = createContext<CommerceValue | null>(null);

export type UiValue = ReturnType<typeof useUiDomain>;
export const UiValueContext = createContext<UiValue | null>(null);

export type AuthValue = ReturnType<typeof useAuthDomain>;
export const AuthValueContext = createContext<AuthValue | null>(null);

export type MarketplaceValue = ReturnType<typeof useMarketplaceDomain>;
export const MarketplaceValueContext = createContext<MarketplaceValue | null>(null);

export type CatalogValue = ReturnType<typeof useCatalogDomain>;
export const CatalogValueContext = createContext<CatalogValue | null>(null);

function missing(name: string): never {
  throw new Error(`${name} doit être utilisé à l'intérieur de <AppStoreProvider>`);
}

/** Sélecteur du domaine : commerce */
export function useCommerce(): CommerceValue {
  const value = useContext(CommerceValueContext);
  if (!value) missing("useCommerce");
  return value as CommerceValue;
}

/** Sélecteur du domaine : ui */
export function useUi(): UiValue {
  const value = useContext(UiValueContext);
  if (!value) missing("useUi");
  return value as UiValue;
}

/** Sélecteur du domaine : auth */
export function useAuth(): AuthValue {
  const value = useContext(AuthValueContext);
  if (!value) missing("useAuth");
  return value as AuthValue;
}

/** Sélecteur du domaine : marketplace */
export function useMarketplace(): MarketplaceValue {
  const value = useContext(MarketplaceValueContext);
  if (!value) missing("useMarketplace");
  return value as MarketplaceValue;
}

/** Sélecteur du domaine : catalog */
export function useCatalog(): CatalogValue {
  const value = useContext(CatalogValueContext);
  if (!value) missing("useCatalog");
  return value as CatalogValue;
}
