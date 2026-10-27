"use client";

// ============================================================
// FORTIA HUB — DOMAINE « PANIER & PAIEMENT »
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx` (Phase 2). Ce module possède :
//   • son propre état   : panier (persisté), articles et fenêtre de paiement
//   • ses propres actions : ajout/retrait/vidage, validation du paiement,
//                         commande d'un service freelance
//
// ⚠️ Le panier est une PAGE (`/cart`) : aucune fenêtre « panier » ici. Seul le
// GUICHET DE PAIEMENT reste une fenêtre (Wave, Orange Money, carte, PayPal,
// crypto), ouverte depuis la page.
//
// Il reçoit explicitement de la façade les quelques valeurs dont il dépend
// (session, profil, commandes) : aucune dépendance cachée, donc un bug de
// paiement ne peut plus se propager au reste de l'application.
// ============================================================

import { useCallback, useEffect, useState, useMemo } from "react";
import type {
  CartItem,
  FreelanceProfile,
  FreelanceService,
  MarketplaceOrder,
  UserProfile,
} from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { trackProductEvent } from "@/lib/services/track";

/** Clé de stockage local du panier : le panier survit au rechargement de /cart. */
const CART_STORAGE_KEY = "fortia_cart";

export interface CommerceDomainDeps {
  isUserLoggedIn: boolean;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setMarketplaceOrders: React.Dispatch<React.SetStateAction<MarketplaceOrder[]>>;
}

export function useCommerceDomain({
  isUserLoggedIn,
  userProfile,
  setUserProfile,
  setMarketplaceOrders,
}: CommerceDomainDeps) {
  // --- État du panier et du paiement ---
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // --- Persistance du panier (page /cart : il survit au rechargement) ---
  // ⚠️ Deux points essentiels :
  //   1. la lecture locale se fait APRÈS le montage (la lire pendant le rendu
  //      provoquerait une divergence serveur/client « Hydration failed ») ;
  //   2. la sauvegarde est conditionnée par un ÉTAT (`cartHydrated`) et non par
  //      une `ref` : en mode strict (développement) les effets sont exécutés
  //      deux fois — une `ref` serait déjà « vraie » au 2ᵉ passage et la
  //      sauvegarde écraserait le panier restauré par une liste vide.
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCartItems(
            parsed.filter(
              (item): item is CartItem =>
                !!item && typeof item.id === "string" && typeof item.title === "string"
            )
          );
        }
      }
    } catch (e) {
      // Données illisibles : on repart simplement d'un panier vide.
    }
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {}
  }, [cartItems, cartHydrated]);

  // --- Panier ---
  const addToCart = useCallback((item: CartItem) => {
    // Aucune fenêtre ne s'ouvre : le compteur de l'en-tête s'incrémente et le
    // membre retrouve ses articles dans la page /cart.
    setCartItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });

    // Statistiques vendeur : ajout au panier (événement anonyme).
    trackProductEvent("add_to_cart", item.id, (item as { storeId?: string }).storeId);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  // --- Validation d'un paiement : commande + historique d'achat ---
  const handlePaymentSuccess = useCallback(
    (order: MarketplaceOrder) => {
      // Les articles sont lus AVANT de vider le panier : une formation payée
      // doit ouvrir son accès immédiatement (et être enregistrée côté serveur).
      const paidItems = [...cartItems];
      const paidCourseIds = paidItems.filter((item) => item.type === "course").map((item) => item.id);
      const paidProductIds = paidItems.filter((item) => item.type === "product").map((item) => item.id);

      setMarketplaceOrders((prev) => [order, ...prev]);
      setCartItems([]);

      if (isUserLoggedIn && userProfile) {
        const purchased = Array.from(
          new Set([
            ...(userProfile.purchasedProductIds || []),
            ...paidProductIds,
            ...(paidCourseIds.length === 0 && paidProductIds.length === 0 && order.productId ? [order.productId] : []),
          ])
        );
        const enrolled = Array.from(
          new Set([...(userProfile.enrolledCourseIds || []), ...paidCourseIds])
        );
        const progress: Record<string, number> = { ...((userProfile.courseProgress as Record<string, number>) || {}) };
        for (const id of paidCourseIds) {
          if (typeof progress[id] !== "number") progress[id] = 0;
        }

        const updatedProfile: UserProfile = {
          ...userProfile,
          enrolledCourseIds: enrolled,
          courseProgress: progress,
          purchasedProductIds: purchased,
          paymentHistory: [
            {
              id: `pay-${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              amount: order.amountUsd,
              method: order.paymentGateway,
              items: paidItems.length > 0 ? paidItems.map((item) => item.title) : [order.productTitle],
              status: "Validé",
            },
            ...(userProfile.paymentHistory || []),
          ],
        };
        setUserProfile(updatedProfile);
        try {
          localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
        } catch (e) {}
      }

      apiWritePlatform("submit-order", {
        orderNumber: order.orderNumber || `ORD-${Date.now()}`,
        buyerName: order.buyerName || "",
        buyerEmail: order.buyerEmail || "",
        buyerPhone: order.buyerPhone || "",
        buyerUserId: userProfile?.id || undefined,
        storeId: order.storeId,
        storeName: order.storeName || "",
        productId: order.productId,
        productTitle: order.productTitle || "",
        amountUsd: order.amountUsd || 0,
        platformCommissionUsd: order.platformCommissionUsd || 0,
        vendorEarningsUsd: order.vendorEarningsUsd || 0,
        courseIds: paidCourseIds,
        productIds: paidProductIds.length > 0 ? paidProductIds : order.productId ? [order.productId] : [],
        saleScope: order.saleScope || "digital_product",
        paymentGateway: order.paymentGateway || "Wave API",
        transactionRef: order.transactionRef || "",
      }).then((res) => {
        if (res.success && res.id && userProfile?.id) {
          apiWritePlatform("register-free-purchase", {
            userId: userProfile.id,
            orderId: res.id,
          });
        }
      });
    },
    [isUserLoggedIn, userProfile, setMarketplaceOrders, setUserProfile, cartItems, setCartItems]
  );

  // --- Commander un service freelance (passe par le panier) ---
  const orderService = useCallback(
    (service: FreelanceService, freelance: FreelanceProfile) => {
      const item: CartItem = {
        id: service.id,
        type: "service",
        title: `${service.title} (par ${freelance.name})`,
        price: service.startingPrice,
        image: freelance.avatar,
        categoryLabel: "Service Freelance",
      };
      addToCart(item);
    },
    [addToCart]
  );

  // Objet mémoïsé : son identité ne change que lorsqu'un état du domaine change
  // (les actions sont stables) — d'où des re-rendus strictement ciblés.
  return useMemo(
    () => ({

    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    handlePaymentSuccess,
    orderService,
    }),
    [
      isUserLoggedIn,
      userProfile,
      setUserProfile,
      setMarketplaceOrders,
      cartItems,
      cartHydrated,
    ]
  );
}
