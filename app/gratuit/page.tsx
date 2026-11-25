import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FreeHub } from "@/components/discovery/FreeHub";

export const metadata = {
  title: "Formations & produits gratuits | FORTIA HUB",
  description:
    "Toutes les formations et tous les produits numériques accessibles gratuitement sur FORTIA HUB : apprentissage et téléchargement sans paiement.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense
        fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement de l&apos;espace gratuit…</div>}
      >
        <FreeHub />
      </Suspense>
    </AppShell>
  );
}
