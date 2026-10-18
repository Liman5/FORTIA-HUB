import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/components/pages/HomePage";

export const metadata = {
  title: "FORTIA HUB | Formation, Boutique Digitale & Services Experts",
  description:
    "FORTIA HUB est la plateforme de référence pour l'apprentissage et les services professionnels d'élite. Formations certifiantes, centres de formation, boutique numérique et services experts.",
};

export default function Page() {
  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}
