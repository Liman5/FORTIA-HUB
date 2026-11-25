import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ContentExplorer } from "@/components/discovery/ContentExplorer";

export const metadata = {
  title: "Formations gratuites | FORTIA HUB",
  description:
    "Apprenez sans payer : toutes les formations gratuites de FORTIA HUB, filtrables par domaine.",
};

export default function Page() {
  return (
    <AppShell>
      <Suspense
        fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement des formations gratuites…</div>}
      >
        <ContentExplorer
          mode="free-courses"
          title="Formations gratuites"
          subtitle="Des formations complètes accessibles sans paiement : vidéos, supports PDF et certificat à la fin du parcours."
        />
      </Suspense>
    </AppShell>
  );
}
