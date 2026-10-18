import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/components/pages/LandingPage";

/**
 * Ancienne page d'accueil (landing marketing) — conservée telle quelle.
 * Elle est simplement déplacée sur /landing : le code de `LandingPage`
 * n'a pas été modifié, seul son itinéraire d'accès a changé.
 */
export const metadata = {
  title: "FORTIA HUB | Landing (page d'accueil historique)",
  description:
    "Page d'accueil historique de FORTIA HUB : présentation complète de la plateforme d'apprentissage et de services professionnels.",
};

export default function Page() {
  return (
    <AppShell>
      <LandingPage />
    </AppShell>
  );
}
