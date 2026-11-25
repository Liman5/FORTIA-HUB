import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FavoritesPage } from "@/components/discovery/FavoritesPage";

export const metadata = {
  title: "Mes favoris | FORTIA HUB",
  description:
    "Retrouvez les formations et produits numériques que vous avez enregistrés dans vos favoris FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense
        fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement de vos favoris…</div>}
      >
        <FavoritesPage />
      </Suspense>
    </AppShell>
  );
}
