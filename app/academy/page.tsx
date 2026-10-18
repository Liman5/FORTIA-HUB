import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AcademyPage } from "@/components/pages/AcademyPage";

export const metadata = {
  title: "Académie Certifiante | FORTIA HUB",
  description:
    "Catalogue complet des formations certifiantes en Cryptomonnaie, IA, Canva, CapCut, Marketing Digital & Entrepreneuriat.",
};

export default function Page() {
  return (
    <AppShell>
      {/* Suspense requis : la page lit les filtres dans l'URL (?categorie=…&vue=…) */}
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Chargement des formations...</p>
            </div>
          </div>
        }
      >
        <AcademyPage />
      </Suspense>
    </AppShell>
  );
}