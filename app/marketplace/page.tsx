import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MarketplacePage } from "@/components/pages/MarketplacePage";

export const metadata = {
  title: "Marketplace | FORTIA HUB",
  description:
    "Boutique numérique, ebooks, templates, packs de prompts IA et freelances vérifiés.",
};

export default function Page() {
  return (
    <AppShell>
      {/* Suspense requis : la page lit l'onglet et le filtre dans l'URL */}
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Chargement de la marketplace...</p>
            </div>
          </div>
        }
      >
        <MarketplacePage />
      </Suspense>
    </AppShell>
  );
}