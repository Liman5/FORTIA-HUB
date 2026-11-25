import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ContentExplorer } from "@/components/discovery/ContentExplorer";

export const metadata = {
  title: "À découvrir : autres formations & produits | FORTIA HUB",
  description:
    "Explorez les autres formations et produits numériques de FORTIA HUB, toutes catégories confondues.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense
        fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement de la sélection…</div>}
      >
        <ContentExplorer
          mode="mixed"
          pageSize={25}
          title="À découvrir : autres formations & produits"
          subtitle="Un flux varié de formations et de produits numériques. Chaque catégorie reste accessible depuis sa pastille."
        />
      </Suspense>
    </AppShell>
  );
}
