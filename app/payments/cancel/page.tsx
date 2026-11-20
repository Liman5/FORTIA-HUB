import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata = { title: "Paiement annulé — FORTIA HUB" };

/** Page de retour « annulation » : aucun accès n'est accordé ici. */
export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-[#021231] text-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-[#011D46] border border-slate-700/60 p-6 sm:p-8 text-center space-y-4">
        <span className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-400" />
        </span>
        <h1 className="text-xl font-black">Paiement annulé</h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Vous avez quitté le paiement avant sa confirmation. Aucun montant n'a été débité et aucun accès
          n'a été accordé. Votre panier est conservé.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/cart"
            className="px-4 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
          >
            Retour au panier
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
