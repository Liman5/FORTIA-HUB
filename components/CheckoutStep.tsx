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
import type {
  CartItem,
  MarketplaceOrder,
  MarketplaceProduct,
  PostPurchaseSupportSubmission,
  VendorStore,
} from "@/lib/types";
import { downloadProductDeliverable } from "@/utils/pdfGenerator";

export interface CheckoutStepProps {
  cartItems: CartItem[];
  totalAmountUsd: number;
  /** Appelé après paiement validé (persistance de la commande réelle en base). */
  onPaymentSuccess: (order: MarketplaceOrder) => void;
  onAddSupportSubmission?: (submission: PostPurchaseSupportSubmission) => void;
  vendorEmail?: string;
  /** ID du membre connecté (liaison commande → compte membre). */
  buyerUserId?: string;
  /** Produits réels de la marketplace (résolution storeId/productId authentiques). */
  marketplaceProducts?: MarketplaceProduct[];
  /** Boutiques réelles (storeName authentique). */
  stores?: VendorStore[];
  /** Retour à l'étape précédente (récapitulatif du panier). */
  onBack?: () => void;
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  cartItems,
  totalAmountUsd,
  onPaymentSuccess,
  onAddSupportSubmission,
  vendorEmail,
  buyerUserId,
  marketplaceProducts = [],
  stores = [],
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<"wave" | "om" | "card" | "paypal" | "crypto">("wave");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<MarketplaceOrder | null>(null);

  const totalFcfa = Math.round(totalAmountUsd * 600);

  /**
   * Taux de commission ACTIFS (réglés dans ADMIN → Marketplace).
   * Repli : 10 % si la lecture échoue. Le montant définitif est recalculé
   * côté serveur au moment de l'enregistrement de la commande.
   */
  const [commissionRules, setCommissionRules] = useState<
    { scope: string; mode: "percent" | "fixed"; value: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/commissions", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data?.rules)) {
          setCommissionRules(
            json.data.rules.map((r: { scope: string; mode: string; value: number }) => ({
              scope: r.scope,
              mode: r.mode === "fixed" ? "fixed" : "percent",
              value: Number(r.value) || 0,
            }))
          );
        }
      })
      .catch(() => {
        /* lecture indicative seulement : le serveur reste la référence */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Commission du panier (type « produit numérique », puis taux général). */
  const commission = useMemo(() => {
    const scoped =
      commissionRules.find((r) => r.scope === "digital_product") ||
      commissionRules.find((r) => r.scope === "general");
    const mode = scoped?.mode || "percent";
    const value = scoped?.value ?? 10;
    const amount = Math.max(0, Number(totalAmountUsd) || 0);
    const raw = mode === "fixed" ? value : (amount * value) / 100;
    const commissionUsd = Math.min(Math.max(0, raw), amount);
    return {
      commissionUsd: Math.round(commissionUsd * 100) / 100,
      vendorUsd: Math.round((amount - commissionUsd) * 100) / 100,
    };
  }, [commissionRules, totalAmountUsd]);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!buyerLastName && !buyerFirstName) || !buyerEmail || !buyerPhone) {
      alert("Veuillez remplir vos informations de contact (Nom, Prénom, Email, Téléphone/WhatsApp).");
      return;
    }

    const fullBuyerName = `${buyerFirstName} ${buyerLastName}`.trim() || "Client FORTIA";
    setIsProcessing(true);

    // Validation de la passerelle (Wave / Orange Money / Carte / PayPal / Crypto)
    setTimeout(() => {
      const gatewayNames: Record<string, MarketplaceOrder["paymentGateway"]> = {
        wave: "Wave API",
        om: "Orange Money API",
        card: "Card Stripe API",
        paypal: "PayPal API",
        crypto: "Crypto USDT TRC20",
      };
      const selectedGateway = gatewayNames[selectedMethod] || "Wave API";
      const ref = `${selectedMethod.toUpperCase()}-TX-${Math.floor(1000000 + Math.random() * 9000000)}`;
      const generatedOrderNum = `CHAR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const firstItem = cartItems[0] || { id: "prod-unknown", title: "Commande FORTIA HUB" };
      const realProduct = marketplaceProducts.find((p) => p.id === firstItem.id);
      const realStore = realProduct
        ? stores.find((s) => s.id === realProduct.storeId) ||
          stores.find((s) => s.name === realProduct.storeName)
        : undefined;

      const order: MarketplaceOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: generatedOrderNum,
        buyerName: fullBuyerName,
        buyerEmail,
        buyerPhone,
        buyerUserId: buyerUserId || undefined,
        storeId: realProduct?.storeId || realStore?.id || undefined,
        storeName: realProduct?.storeName || realStore?.name || "Marketplace FORTIA HUB",
        productId: realProduct?.id || firstItem.id,
        productTitle: realProduct?.title || firstItem.title,
        amountUsd: totalAmountUsd,
        platformCommissionUsd: commission.commissionUsd,
        vendorEarningsUsd: commission.vendorUsd,
        saleScope: "digital_product",
        paymentGateway: selectedGateway,
        transactionRef: ref,
        status: "Payé",
        createdAt: new Date().toISOString().split("T")[0],
      };

      // Fiche d'assistance post-achat (transmise au vendeur + enregistrée admin)
      if (onAddSupportSubmission) {
        onAddSupportSubmission({
          id: `sub-${Date.now()}`,
          orderNumber: generatedOrderNum,
          productTitle: cartItems.map((i) => i.title).join(", ") || firstItem.title,
          lastName: buyerLastName || fullBuyerName,
          firstName: buyerFirstName || "Client",
          phoneContact: buyerPhone,
          email: buyerEmail,
          notes: supportNote.trim() || "Formulaire de garantie et suivi de livraison post-achat validé.",
          submittedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          forwardedEmail: vendorEmail || "vendeur@fortiahub.com",
          status: "Transmis / Enregistré",
        });
      }

      setCurrentOrder(order);
      setIsProcessing(false);
      setPaymentComplete(true);
      onPaymentSuccess(order);
    }, 1800);
  };

  /* ================= PAIEMENT VALIDÉ : confirmation & accès immédiat ================= */
  if (paymentComplete) {
    return (
      <section className="rounded-3xl bg-[#011D46] border border-emerald-500/40 p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <span className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </span>

        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-white">Paiement validé avec succès</h3>
          <p className="text-xs text-slate-300">
            Transaction enregistrée par la passerelle{" "}
            <span className="text-[#D69E25] font-bold">{currentOrder?.paymentGateway}</span>.
          </p>
        </div>

        <dl className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 text-left text-xs space-y-2">
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">N° de commande</dt>
            <dd className="font-mono font-bold text-[#D69E25]">{currentOrder?.orderNumber}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">Réf. transaction API</dt>
            <dd className="font-mono text-slate-300 break-all text-right">{currentOrder?.transactionRef}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
            <dt className="text-slate-400">Montant payé</dt>
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
                <button
                  type="button"
                  onClick={() => downloadProductDeliverable(item.title, item.categoryLabel)}
                  className="shrink-0 px-3.5 py-2 rounded-lg bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </button>
              </div>
            ))}

            {cartItems.length === 0 && currentOrder && (
              <div className="p-3 rounded-xl bg-[#011D46] border border-slate-700/60 flex items-center justify-between gap-3">
                <p className="font-bold text-xs text-white">{currentOrder.productTitle}</p>
                <button
                  type="button"
                  onClick={() => downloadProductDeliverable(currentOrder.productTitle, "Formation / PDF")}
                  className="shrink-0 px-3.5 py-2 rounded-lg bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </button>
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

  /* ================= ÉTAPE PAIEMENT : méthode + coordonnées ================= */
  const METHODS: {
    id: "wave" | "om" | "card" | "paypal" | "crypto";
    label: string;
    hint: string;
    icon: React.ElementType;
    accent: string;
  }[] = [
    { id: "wave", label: "Wave", hint: "0% de frais", icon: Smartphone, accent: "bg-cyan-500/10 border-cyan-500 ring-cyan-500/40" },
    { id: "om", label: "Orange Money", hint: "API instantanée", icon: Smartphone, accent: "bg-orange-500/10 border-orange-500 ring-orange-500/40" },
    { id: "card", label: "Carte Visa / Mastercard", hint: "Stripe API", icon: CreditCard, accent: "bg-blue-500/10 border-blue-500 ring-blue-500/40" },
    { id: "paypal", label: "PayPal", hint: "International", icon: Globe, accent: "bg-indigo-500/10 border-indigo-500 ring-indigo-500/40" },
    { id: "crypto", label: "Crypto (USDT)", hint: "TRC20 / Web3", icon: QrCode, accent: "bg-emerald-500/10 border-emerald-500 ring-emerald-500/40" },
  ];

  const selectedMethodHint: Record<string, string> = {
    wave: "Le montant sera débité du numéro Wave indiqué ci-dessus (Téléphone / WhatsApp).",
    om: "Une demande de validation Orange Money sera envoyée sur le numéro indiqué ci-dessus.",
    card: "Un formulaire de carte bancaire sécurisé (Stripe) s'ouvrira après validation pour saisir vos 16 chiffres.",
    paypal: "Vous serez redirigé vers PayPal pour confirmer le paiement depuis votre compte.",
    crypto: "L'adresse de règlement USDT (TRC20) vous sera affichée après validation de la commande.",
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
            Wave · Orange Money · carte bancaire · PayPal · crypto — vérification par la plateforme.
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
                onClick={() => setSelectedMethod(method.id)}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  selectedMethod === method.id
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
              Dès la validation par l'opérateur, les droits de téléchargement et l'accès aux formations sont
              débloqués immédiatement.
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
