"use client";

// ============================================================
// FORTIA HUB — RETOUR DU FOURNISSEUR DE PAIEMENT
// ------------------------------------------------------------
// ⚠️ Cette page N'ACCORDE AUCUN DROIT. Elle affiche uniquement le
// statut réel renvoyé par le serveur, lui-même mis à jour par le
// webhook signé. Un retour navigateur ne vaut jamais confirmation.
// ============================================================

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";

interface OrderStatus {
  orderNumber: string;
  status: string;
  paymentStatus: "paid" | "pending" | "failed" | "refunded" | "cancelled";
  currency: string;
  totalMinor: number;
  items: { title: string; quantity: number; totalMinor: number }[];
  payments: { provider: string; status: string; failureReason?: string }[];
}

function ReturnContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setMessage("Numéro de commande manquant.");
      return;
    }
    let cancelled = false;
    const load = () =>
      fetch(`/api/payments/status/${encodeURIComponent(orderId)}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          if (!json?.success) {
            setState("error");
            setMessage(json?.error || "Commande introuvable.");
            return;
          }
          setOrder(json.data);
          setState("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setState("error");
            setMessage("Impossible de vérifier le paiement pour le moment.");
          }
        });
    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId]);

  const paid = order?.paymentStatus === "paid";
  const pending = order?.paymentStatus === "pending";
  const failed = order?.paymentStatus === "failed" || order?.paymentStatus === "cancelled";
  const refunded = order?.paymentStatus === "refunded";

  return (
    <main className="min-h-screen bg-[#021231] text-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-[#011D46] border border-slate-700/60 p-6 sm:p-8 space-y-5 text-center">
        <span
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
            paid
              ? "bg-emerald-500/15 border-emerald-500/40"
              : failed
                ? "bg-red-500/15 border-red-500/40"
                : "bg-amber-500/15 border-amber-500/40"
          }`}
        >
          {paid ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          ) : failed ? (
            <XCircle className="w-8 h-8 text-red-400" />
          ) : refunded ? (
            <RotateCcw className="w-8 h-8 text-blue-400" />
          ) : (
            <Clock className="w-8 h-8 text-amber-400" />
          )}
        </span>

        <div className="space-y-1.5">
          <h1 className="text-xl font-black">
            {paid
              ? "Paiement confirmé"
              : failed
                ? "Paiement non abouti"
                : refunded
                  ? "Commande remboursée"
                  : "Paiement en cours de vérification"}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            {paid
              ? "Le fournisseur a confirmé la transaction. Vos accès sont disponibles dans votre espace membre."
              : failed
                ? "Aucun accès n'a été accordé. Vous pouvez réessayer depuis votre panier."
                : refunded
                  ? "Les droits liés à ce paiement ont été révoqués."
                  : "Nous attendons la confirmation signée du fournisseur. Cette page se met à jour automatiquement."}
          </p>
        </div>

        {state === "error" && (
          <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            {message}
          </p>
        )}

        {order && (
          <dl className="rounded-2xl bg-[#021231] border border-slate-700/60 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
              <dt className="text-slate-400">N° de commande</dt>
              <dd className="font-mono font-bold text-[#D69E25]">{order.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-700/60 pb-2">
              <dt className="text-slate-400">Montant</dt>
              <dd className="font-bold">
                {(order.totalMinor / 100).toFixed(2)} {order.currency}
              </dd>
            </div>
            {order.items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex justify-between gap-3">
                <dt className="text-slate-300 line-clamp-1">{item.title}</dt>
                <dd className="text-slate-400">
                  {(item.totalMinor / 100).toFixed(2)} {order.currency}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {pending && orderId && (
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/payments/cancel", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId }),
                }).catch(() => null);
                window.location.reload();
              }}
              className="px-4 py-3 rounded-xl border border-red-500/40 text-red-300 font-bold text-xs hover:bg-red-500/10 transition"
            >
              Annuler la commande
            </button>
          )}
          <Link
            href={paid ? "/library" : "/cart"}
            className="px-4 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
          >
            {paid ? "Accéder à mes achats" : "Retour au panier"}
          </Link>
          <Link
            href="/"
            className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:border-slate-500 transition"
          >
            Accueil
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}

