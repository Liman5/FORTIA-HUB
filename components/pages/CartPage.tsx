"use client";

// ============================================================
// FORTIA HUB — PAGE PANIER (route /cart)
// ------------------------------------------------------------
// Le panier est une PAGE à part entière (URL propre, partageable,
// bouton « Retour » du navigateur) et non plus une fenêtre superposée :
//   /cart → récapitulatif → guichet de paiement → accès immédiat
// ============================================================

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Headphones,
  CheckCircle2,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth, useCommerce, useMarketplace } from "@/lib/store/domains/contexts";
import { CheckoutStep } from "@/components/CheckoutStep";
import type { CartItem } from "@/lib/types";

/** Taux de conversion USD → FCFA de la plateforme. */
const FCFA_RATE = 600;

/** Montant en FCFA, lisible (séparateur de milliers). */
function fcfa(usd: number): string {
  return Math.round((Number(usd) || 0) * FCFA_RATE).toLocaleString("fr-FR");
}

/** Moyens de paiement affichés sous le récapitulatif (le choix se fait à l'étape paiement). */
const PAYMENT_METHODS = ["Wave", "Orange Money", "Carte bancaire", "PayPal", "Crypto USDT"];

/** Garanties affichées sous le récapitulatif (aucune promesse inventée). */
const GUARANTEES = [
  { label: "Accès immédiat après paiement", icon: Zap },
  { label: "Paiement vérifié par la plateforme", icon: ShieldCheck },
  { label: "Support client 24h/24 - 7j/7", icon: Headphones },
];

export function CartPage() {
  const { platformLoaded } = useAppStore();
  const { isUserLoggedIn, userProfile } = useAuth();
  const { marketplaceProducts, stores, addSupportSubmission } = useMarketplace();
  const { cartItems, removeFromCart, clearCart, handlePaymentSuccess } = useCommerce();

  // Étape courante du tunnel : récapitulatif (1) puis paiement (2).
  // ⚠️ `?payer=1` (achat direct depuis la boutique) est lu APRÈS le montage :
  // lire les paramètres d'URL pendant le rendu provoquerait une divergence
  // serveur/client (« Hydration failed ») — même règle que pour localStorage.
  const [step, setStep] = useState<"cart" | "payment">("cart");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("payer") === "1") {
      setStep("payment");
    }
  }, []);
  // Articles figés au moment du paiement : le panier est vidé après validation,
  // l'étape paiement doit donc continuer d'afficher ce qui est acheté.
  const [paidItems, setPaidItems] = useState<CartItem[]>([]);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  const count = cartItems.length;
  const total = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const paidTotal = paidItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  /** Passe à l'étape paiement en figeant les articles. */
  const startPayment = () => {
    if (count === 0) return;
    setPaidItems(cartItems);
    setStep("payment");
  };

  // ===== Chargement des données plateforme =====
  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement de votre panier...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Panier", done: step === "payment" || paymentSucceeded, current: step === "cart" && !paymentSucceeded },
    { label: "Paiement", done: paymentSucceeded, current: step === "payment" && !paymentSucceeded },
    { label: "Accès immédiat", done: paymentSucceeded, current: false },
  ];

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30">
      {/* ================= EN-TÊTE DE PAGE ================= */}
      <section className="relative overflow-hidden border-b border-[#D69E25]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(214,158,37,0.14)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.07)_0%,transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#D69E25] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Continuer mes achats
          </Link>

          <div className="mt-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-[#D69E25]" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Mon Panier
                  {count > 0 && <span className="text-[#D69E25]"> ({count})</span>}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                  Vérifiez vos articles, puis réglez en toute sécurité — l'accès est débloqué immédiatement.
                </p>
              </div>
            </div>

            {/* Étapes : panier → paiement → accès */}
            <div className="flex items-center gap-2 sm:gap-3">
              {steps.map((step, index) => (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${
                        step.done
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                          : step.current
                            ? "bg-[#D69E25] border-[#D69E25] text-[#021231]"
                            : "bg-[#011D46] border-slate-700 text-slate-500"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                    </span>
                    <span
                      className={`text-[11px] font-bold hidden sm:block ${
                        step.current ? "text-white" : step.done ? "text-emerald-300" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && <span className="w-5 h-px bg-[#D69E25]/30" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTENU ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* --- Paiement confirmé --- */}
        {paymentSucceeded && (
          <div className="mb-8 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white">Paiement confirmé 🎉</h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl">
                  Vos fichiers numériques et vos accès aux formations sont débloqués : vous les retrouvez à tout
                  moment dans votre espace membre.
                </p>
              </div>
            </div>
            <Link
              href="/member"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
            >
              Voir mes achats
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {step === "payment" ? (
          /* --- ÉTAPE 2 : paiement (composant de page réutilisable) --- */
          <CheckoutStep
            cartItems={paidItems.length > 0 ? paidItems : cartItems}
            totalAmountUsd={paidItems.length > 0 ? paidTotal : total}
            onPaymentSuccess={(order) => {
              handlePaymentSuccess(order);
              setPaymentSucceeded(true);
            }}
            onAddSupportSubmission={addSupportSubmission}
            vendorEmail={userProfile?.email || "commande@fortiahub.com"}
            buyerUserId={userProfile?.id}
            marketplaceProducts={marketplaceProducts}
            stores={stores}
            onBack={() => setStep("cart")}
          />
        ) : count === 0 ? (
          /* --- Panier vide --- */
          <div className="max-w-xl mx-auto text-center rounded-3xl bg-[#011D46]/70 border border-[#D69E25]/25 p-8 sm:p-12">
            <span className="w-16 h-16 mx-auto rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-[#D69E25]" />
            </span>
            <h2 className="text-xl font-black text-white mt-5">Votre panier est vide</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2 leading-relaxed">
              Ajoutez des formations, des ressources numériques ou des prestations de service :
              elles apparaîtront ici, prêtes à être réglées.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 transition"
              >
                Explorer la boutique
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/academy"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#D69E25]/40 text-[#D69E25] font-black text-xs hover:bg-[#D69E25]/10 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Voir les formations
              </Link>
            </div>
          </div>
        ) : (
          /* --- Panier rempli : articles + récapitulatif --- */
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">
            {/* Liste des articles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Articles ({count})
                </h2>
                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider le panier
                </button>
              </div>

              {cartItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl bg-[#011D46]/70 border border-slate-700/60 hover:border-[#D69E25]/50 transition p-4 flex items-center gap-4"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#021231] border border-slate-700/60 shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-slate-600" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {item.categoryLabel && (
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#D69E25] bg-[#D69E25]/10 border border-[#D69E25]/30 rounded-full px-2 py-0.5">
                        {item.categoryLabel}
                      </span>
                    )}
                    <h3 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2 mt-1.5">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {item.type === "course"
                        ? "Formation"
                        : item.type === "service"
                          ? "Prestation de service"
                          : "Produit numérique"}{" "}
                      · accès débloqué après paiement
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm sm:text-base font-black text-[#D69E25]">{fcfa(item.price)} FCFA</p>
                    <p className="text-[10px] text-slate-500 font-bold">{Number(item.price || 0).toFixed(2)} $</p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      Retirer
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Récapitulatif (colonne collante sur grand écran) */}
            <aside className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-3xl bg-[#011D46] border border-[#D69E25]/30 p-5 sm:p-6 shadow-2xl">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#D69E25]">Récapitulatif</h2>

                <dl className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400 font-semibold">Articles</dt>
                    <dd className="font-bold text-white">{count}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400 font-semibold">Sous-total</dt>
                    <dd className="font-bold text-white">{fcfa(total)} FCFA</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400 font-semibold">Frais de service</dt>
                    <dd className="font-bold text-emerald-500">Offerts</dd>
                  </div>
                </dl>

                <div className="mt-4 pt-4 border-t border-slate-700/60">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total à payer</p>
                  <div className="flex items-baseline justify-between gap-3 mt-1.5">
                    <span className="text-2xl font-black text-[#D69E25] leading-none">{fcfa(total)} FCFA</span>
                    <span className="text-[11px] font-bold text-slate-400">{total.toFixed(2)} $</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startPayment}
                  className="w-full mt-5 py-3.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs shadow-lg shadow-[#D69E25]/20 hover:brightness-110 transition inline-flex items-center justify-center gap-2"
                >
                  Passer au paiement
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!isUserLoggedIn && (
                  <p className="text-[10px] text-slate-400 font-medium mt-3 leading-relaxed text-center">
                    Astuce :{" "}
                    <Link href="/login" className="text-[#D69E25] font-bold hover:underline">
                      connectez-vous
                    </Link>{" "}
                    avant le paiement pour retrouver vos achats dans votre espace membre.
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-slate-700/60">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Moyens acceptés</p>
                  <p className="text-[11px] font-semibold text-slate-300 mt-1.5 leading-relaxed">
                    {PAYMENT_METHODS.map((label, index) => (
                      <React.Fragment key={label}>
                        {index > 0 && <span className="text-slate-500"> · </span>}
                        <span>{label}</span>
                      </React.Fragment>
                    ))}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1.5">
                    Le choix du moyen de paiement se fait à l'étape suivante.
                  </p>
                </div>
              </div>

              <ul className="rounded-3xl bg-[#011D46]/50 border border-slate-700/50 p-4 space-y-2.5">
                {GUARANTEES.map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-300">
                    <item.icon className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
