import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ResourcesCatalog } from "@/components/discovery/ResourcesCatalog";

export const metadata = {
  title: "Ressources numériques | FORTIA HUB",
  description: "Ebooks, templates, prompts IA et ressources numériques disponibles sur FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement des ressources…</div>}>
        <ResourcesCatalog />
      </Suspense>
    </AppShell>
  );
}

