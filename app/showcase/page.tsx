import { AppShell } from "@/components/layout/AppShell";
import { ShowcasePage } from "@/components/pages/ShowcasePage";

export const metadata = {
  title: "Vitrine FORTIA HUB | Plateforme Premium",
  description:
    "Découvrez la vision et les services de la plateforme FORTIA HUB. Formations, boutique numérique, freelances et services experts.",
};

export default function Page() {
  return (
    <AppShell>
      <ShowcasePage />
    </AppShell>
  );
}