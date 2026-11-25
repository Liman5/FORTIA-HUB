import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ContentExplorer } from "@/components/discovery/ContentExplorer";

export const metadata = {
  title: "Produits numériques gratuits | FORTIA HUB",
  description:
    "Ebooks, modèles et ressources numériques à télécharger gratuitement sur FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense
        fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement des produits gratuits…</div>}
      >
        <ContentExplorer
          mode="free-products"
          title="Produits numériques gratuits"
          subtitle="Ressources prêtes à télécharger, sans paiement : ebooks, modèles, packs et documents professionnels."
        />
      </Suspense>
    </AppShell>
  );
}
