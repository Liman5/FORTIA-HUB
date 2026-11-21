"use client";

// ============================================================
// FORTIA HUB — ÉTAPE « PAIEMENT » (composant de PAGE, réutilisable)
// ------------------------------------------------------------
// Issu de l'ancienne fenêtre `PaymentGatewayModal` : le code de paiement n'est
// plus superposé, il vit DANS la page panier (étape 2). Le composant est
// autonome : il suffit de le rendre avec les articles et un `onPaymentSuccess`
// pour l'utiliser ailleurs (ex. une future route /checkout).
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  Globe,
  QrCode,
  Zap,
  CheckCircle2,
  Download,
  ArrowLeft,
  Lock,
} from "lucide-react";
import type { CartItem, MarketplaceOrder } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import {
  createCheckout,
  fetchPaymentProviders,
} from "@/lib/services/paymentsClient";

type PaymentMethodId =
  | "wave"
  | "om"
  | "card"
  | "paystack"
  | "flutterwave"
  | "paypal"
  | "crypto"
  | "sandbox";

export interface CheckoutStepProps {
  cartItems: CartItem[];
  totalAmountUsd: number;
  /** Appelé après paiement confirmé OU demande de devis enregistrée. */
  onPaymentSuccess: (order: MarketplaceOrder) => void;
  /** ID du membre connecté (liaison commande → compte membre). */
  buyerUserId?: string;
  /** Retour à l'étape précédente (récapitulatif du panier). */
  onBack?: () => void;
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  cartItems,
  totalAmountUsd,
  onPaymentSuccess,
  buyerUserId,
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>("card");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<MarketplaceOrder | null>(null);
  /** Paiement créé mais NON confirmé : aucun accès n'est accordé. */
  const [pendingOrder, setPendingOrder] = useState<{
    orderId: string;
    orderNumber: string;
    totalMinor: number;
    currency: string;
  } | null>(null);
  /** Moyens de paiement réellement configurés côté serveur. */
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  const totalFcfa = Math.round(totalAmountUsd * 600);

  // Moyens de paiement réellement configurés côté serveur (aucune simulation).
  useEffect(() => {
    let cancelled = false;
    fetchPaymentProviders()
      .then(({ available }) => {
        if (cancelled) return;
        setAvailableProviders(available);
        if (available.includes("stripe")) setSelectedMethod("card");
        else if (available.includes("paystack")) setSelectedMethod("paystack");
        else if (available.includes("flutterwave")) setSelectedMethod("flutterwave");
        else if (available.includes("sandbox")) setSelectedMethod("sandbox");
      })
      .catch(() => {
        if (!cancelled) setAvailableProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Le panier ne contient-il QUE des services ? (commande de service) */
  const isServiceOrder = useMemo(
    () => cartItems.length > 0 && cartItems.every((item) => item.type === "service"),
    [cartItems]
  );

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!buyerLastName && !buyerFirstName) || !buyerEmail || !buyerPhone) {
      alert("Veuillez remplir vos informations de contact (Nom, Prénom, Email, Téléphone/WhatsApp).");
      return;
    }
    const fullBuyerName = `${buyerFirstName} ${buyerLastName}`.trim() || "Client FORTIA";

    if (cartItems.some((item) => item.type === "service") && !isServiceOrder) {
      alert("Les prestations de service ne peuvent pas être mélangées avec des formations ou des produits.");
      return;
    }

    setIsProcessing(true);
    try {
      // ---- Prestations de service : demande de devis (aucun paiement) ----
      if (isServiceOrder) {
        const result = await apiWritePlatform("order-service", {
          serviceId: cartItems[0]?.id,
          clientName: fullBuyerName,
          clientEmail: buyerEmail,
          clientPhone: buyerPhone,
          notes: supportNote.trim(),
        });
        if (!result.success) {
          throw new Error(result.error || "La demande de service n'a pas pu être enregistrée.");
        }
        const quoteOrder: MarketplaceOrder = {
          id: `svc-${Date.now()}`,
          orderNumber: `SRV-${Date.now().toString(36).toUpperCase()}`,
          buyerName: fullBuyerName,
          buyerEmail,
          buyerPhone,
          storeName: "Services FORTIA HUB",
          productTitle: cartItems[0]?.title || "Prestation de service",
          amountUsd: totalAmountUsd,
          platformCommissionUsd: 0,
          vendorEarningsUsd: 0,
          paymentGateway: "Wave API",
          transactionRef: "",
          status: "En attente API",
          createdAt: new Date().toISOString().split("T")[0],
        } as unknown as MarketplaceOrder;
        setCurrentOrder(quoteOrder);
        setPaymentComplete(true);
        onPaymentSuccess(quoteOrder);
        return;
      }

      // ---- Formations / produits numériques : paiement 100 % serveur ----
      const method = METHODS.find((entry) => entry.id === selectedMethod);
      if (!method?.provider || !method.available) {
        throw new Error("Aucun moyen de paiement disponible. Contactez l'administration.");
      }

      const items = cartItems
        .filter((item) => item.type === "course" || item.type === "product")
        .map((item) => ({ type: item.type, id: item.id, quantity: 1 }));

      if (items.length === 0) {
        throw new Error("Aucun article payable dans le panier.");
      }

      const result = await createCheckout({
        items,
        provider: method.provider,
        buyer: { name: fullBuyerName, email: buyerEmail, phone: buyerPhone },
      });
      if (!result.success) {
        throw new Error(result.error || "Le paiement n'a pas pu être initialisé.");
      }

      if (result.status === "paid") {
        const order: MarketplaceOrder = {
          id: String(result.orderId || ""),
          orderNumber: String(result.orderNumber || ""),
          buyerName: fullBuyerName,
          buyerEmail,
          buyerPhone,
          buyerUserId,
          storeName: "FORTIA HUB",
          productTitle: cartItems[0]?.title || "Commande",
          amountUsd: Number(result.totalMinor || 0) / 100,
          platformCommissionUsd: 0,
          vendorEarningsUsd: 0,
          paymentGateway: result.provider || "FORTIA",
          transactionRef: "",
          status: "Payé",
          createdAt: new Date().toISOString().split("T")[0],
        } as unknown as MarketplaceOrder;
        setCurrentOrder(order);
        setPaymentComplete(true);
        onPaymentSuccess(order);
        return;
      }

      if (result.requiresRedirect && result.checkoutUrl) {
        window.location.href = String(result.checkoutUrl);
        return;
      }

      // Paiement en attente : AUCUN accès tant que le webhook n'a pas confirmé.
      setPendingOrder({
        orderId: String(result.orderId || ""),
        orderNumber: String(result.orderNumber || ""),
        totalMinor: Number(result.totalMinor || 0),
        currency: String(result.currency || "USD"),
      });
    } catch (error) {
      alert((error as Error)?.message || "Le paiement a échoué. Aucun accès n'a été accordé.");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ================= PAIEMENT VALIDÉ : confirmation & accès immédiat ================= */
  if (paymentComplete) {
    return (
      <section className="rounded-3xl bg-[#011D46] border border-emerald-500/40 p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <span className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </span>

        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {currentOrder?.status === "En attente API"
              ? "Demande de service enregistrée"
              : "Commande confirmée"}
          </h3>
          <p className="text-xs text-slate-300">
            {currentOrder?.status === "En attente API"
              ? "Votre demande de devis a été transmise à l'équipe FORTIA HUB. Aucun paiement n'a été effectué."
              : "La transaction a été vérifiée côté serveur. Vos accès sont disponibles dans votre espace membre."}
          </p>
        </div>

        <dl className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 text-left text-xs space-y-2">
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">N° de commande</dt>
            <dd className="font-mono font-bold text-[#D69E25]">{currentOrder?.orderNumber}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">Montant réglé</dt>
            <dd className="font-bold text-white">
              {Math.round((currentOrder?.amountUsd || 0) * 600).toLocaleString("fr-FR")} FCFA
              <span className="text-slate-400 font-medium"> ({Number(currentOrder?.amountUsd || 0).toFixed(2)} $)</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Client</dt>
            <dd className="font-semibold text-slate-200 text-right">
              {currentOrder?.buyerName} ({currentOrder?.buyerEmail})
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl bg-[#021231] border border-[#D69E25]/40 p-4 text-left space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#D69E25]">
            Téléchargement direct de vos produits / formations
          </p>
          <div className="space-y-2">
            {(cartItems.length > 0 ? cartItems : []).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#011D46] border border-slate-700/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-xs text-white line-clamp-1">{item.title}</p>
                  <span className="text-[10px] text-[#D69E25] font-semibold">{item.categoryLabel}</span>
                </div>
                <a
                  href="/library"
                  className="shrink-0 px-3.5 py-2 rounded-lg bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Accéder
                </a>
              </div>
            ))}

            {cartItems.length === 0 && currentOrder && (
              <div className="p-3 rounded-xl bg-[#011D46] border border-slate-700/60 flex items-center justify-between gap-3">
                <p className="font-bold text-xs text-white">{currentOrder.productTitle}</p>
                <a
                  href="/library"
                  className="shrink-0 px-3.5 py-2 rounded-lg bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Accéder
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          Vos achats sont également disponibles à tout moment dans votre espace membre.
        </p>
      </section>
    );
  }

  /* ================= PAIEMENT EN ATTENTE (AUCUN ACCÈS) ================= */
  if (pendingOrder) {
    return (
      <section className="rounded-3xl bg-[#011D46] border border-amber-500/40 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <span className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
          <Zap className="w-8 h-8 text-amber-400" />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-white">Paiement en attente</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Votre commande est enregistrée, mais le paiement n'est <strong>pas encore confirmé</strong>.
            Aucun accès n'est accordé tant que le fournisseur n'a pas validé la transaction.
          </p>
        </div>
        <dl className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">N° de commande</dt>
            <dd className="font-mono font-bold text-[#D69E25]">{pendingOrder.orderNumber}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Montant à régler</dt>
            <dd className="font-bold text-white">
              {(pendingOrder.totalMinor / 100).toFixed(2)} {pendingOrder.currency}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href={`/payments/return?order_id=${pendingOrder.orderId}`}
            className="px-4 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
          >
            Suivre l'état du paiement
          </a>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:border-slate-500 transition"
            >
              Retour au panier
            </button>
          )}
        </div>
      </section>
    );
  }

  /* ================= ÉTAPE PAIEMENT : méthode + coordonnées ================= */
  const METHODS: {
    id: PaymentMethodId;
    label: string;
    hint: string;
    icon: React.ElementType;
    accent: string;
    provider: string | null;
    available: boolean;
  }[] = [
    {
      id: "card",
      label: "Carte Visa / Mastercard",
      hint: availableProviders.includes("stripe") ? "Stripe sécurisé" : "Indisponible",
      icon: CreditCard,
      accent: "bg-blue-500/10 border-blue-500 ring-blue-500/40",
      provider: "stripe",
      available: availableProviders.includes("stripe"),
    },
    {
      id: "sandbox",
      label: "Sandbox (test)",
      hint: availableProviders.includes("sandbox") ? "Aucun débit réel" : "Indisponible",
      icon: Zap,
      accent: "bg-emerald-500/10 border-emerald-500 ring-emerald-500/40",
      provider: "sandbox",
      available: availableProviders.includes("sandbox"),
    },
    {
      id: "paystack",
      label: "Paystack",
      hint: availableProviders.includes("paystack") ? "Carte / Mobile Money" : "Indisponible",
      icon: CreditCard,
      accent: "bg-sky-500/10 border-sky-500 ring-sky-500/40",
      provider: "paystack",
      available: availableProviders.includes("paystack"),
    },
    {
      id: "flutterwave",
      label: "Flutterwave",
      hint: availableProviders.includes("flutterwave") ? "Carte / Mobile Money" : "Indisponible",
      icon: Globe,
      accent: "bg-amber-500/10 border-amber-500 ring-amber-500/40",
      provider: "flutterwave",
      available: availableProviders.includes("flutterwave"),
    },
    {
      id: "wave",
      label: "Wave",
      hint: "Bientôt disponible",
      icon: Smartphone,
      accent: "bg-cyan-500/10 border-cyan-500 ring-cyan-500/40",
      provider: null,
      available: false,
    },
    {
      id: "om",
      label: "Orange Money",
      hint: "Bientôt disponible",
      icon: Smartphone,
      accent: "bg-orange-500/10 border-orange-500 ring-orange-500/40",
      provider: null,
      available: false,
    },
    {
      id: "paypal",
      label: "PayPal",
      hint: "Bientôt disponible",
      icon: Globe,
      accent: "bg-indigo-500/10 border-indigo-500 ring-indigo-500/40",
      provider: null,
      available: false,
    },
    {
      id: "crypto",
      label: "Crypto (USDT)",
      hint: "Bientôt disponible",
      icon: QrCode,
      accent: "bg-emerald-500/10 border-emerald-500 ring-emerald-500/40",
      provider: null,
      available: false,
    },
  ];

  const selectedMethodHint: Record<string, string> = {
    card: "Vous serez redirigé vers le formulaire de paiement sécurisé Stripe. La confirmation est vérifiée côté serveur.",
    paystack: "Vous serez redirigé vers Paystack. La confirmation est vérifiée côté serveur (signature + montant).",
    flutterwave: "Vous serez redirigé vers Flutterwave. La confirmation est vérifiée côté serveur (hash + API).",
    sandbox: "Paiement de test : aucun débit. L'accès n'est accordé qu'après un webhook signé (tests d'intégration).",
    wave: "Ce moyen de paiement n'est pas encore activé sur le serveur.",
    om: "Ce moyen de paiement n'est pas encore activé sur le serveur.",
    paypal: "Ce moyen de paiement n'est pas encore activé sur le serveur.",
    crypto: "Ce moyen de paiement n'est pas encore activé sur le serveur.",
  };

  return (
    <section className="rounded-3xl bg-[#011D46] border border-[#D69E25]/30 p-5 sm:p-6 shadow-2xl space-y-5">
      {/* En-tête de l'étape */}
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center shrink-0">
          <Lock className="w-6 h-6 text-[#D69E25]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-white">Paiement sécurisé</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
            Paiement vérifié côté serveur — un retour navigateur ne vaut jamais confirmation.
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#D69E25] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au panier
          </button>
        )}
      </div>

      {/* Montant à régler */}
      <div className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">Montant total à régler</span>
          <span className="text-2xl font-black text-[#D69E25] leading-none">
            {totalFcfa.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-[11px] text-slate-400 font-bold block mt-1">
            {Number(totalAmountUsd || 0).toFixed(2)} $ USD
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Montant indicatif — le serveur recalcule le total avant paiement.
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Connexion chiffrée
        </span>
      </div>

      <form onSubmit={handleProcessPayment} className="space-y-5">
        {/* Coordonnées du client (fiche d'assistance post-achat) */}
        <div className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 space-y-3">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            Vos coordonnées (suivi de commande garanti)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Nom *</span>
              <input
                type="text"
                required
                value={buyerLastName}
                onChange={(e) => setBuyerLastName(e.target.value)}
                placeholder="Ex : Kouassi"
                className="w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Prénom *</span>
              <input
                type="text"
                required
                value={buyerFirstName}
                onChange={(e) => setBuyerFirstName(e.target.value)}
                placeholder="Ex : Jean-Paul"
                className="w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Téléphone / WhatsApp *</span>
              <input
                type="tel"
                required
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+228 90 00 00 00"
                className="w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                Email (réception des accès) *
              </span>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="votre.email@domaine.com"
                className="w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              Note / instruction particulière (optionnel)
            </span>
            <input
              type="text"
              value={supportNote}
              onChange={(e) => setSupportNote(e.target.value)}
              placeholder="Ex : numéro WhatsApp alternatif, instruction particulière…"
              className="w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]"
            />
          </label>
        </div>

        {/* Choix de la méthode de paiement */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            Choisissez votre moyen de paiement
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                disabled={!method.available}
                onClick={() => method.available && setSelectedMethod(method.id)}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  !method.available
                    ? "bg-[#021231] border-slate-800 text-slate-600 opacity-60 cursor-not-allowed"
                    : selectedMethod === method.id
                      ? `${method.accent} text-white font-bold ring-2`
                      : "bg-[#021231] border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                <method.icon className="w-5 h-5" />
                <span className="text-[11px] text-center leading-tight">{method.label}</span>
                <span className="text-[9px] font-extrabold opacity-90">{method.hint}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-[#021231] border border-slate-700/60 p-3 space-y-1.5">
            <p className="flex items-start gap-2 text-[11px] font-bold text-[#D69E25]">
              <Zap className="w-4 h-4 shrink-0 mt-0.5" />
              {selectedMethodHint[selectedMethod]}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
            Dès que le fournisseur confirme le paiement (webhook vérifié), les droits de téléchargement et
            l'accès aux formations sont débloqués automatiquement.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing || cartItems.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-sm shadow-lg shadow-[#D69E25]/20 hover:brightness-110 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <span className="w-5 h-5 border-2 border-[#021231] border-t-transparent rounded-full animate-spin" />
              Validation du paiement en cours…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Payer {totalFcfa.toLocaleString("fr-FR")} FCFA ({Number(totalAmountUsd || 0).toFixed(2)} $)
            </>
          )}
        </button>
      </form>
    </section>
  );
};
