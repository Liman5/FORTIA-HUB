import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/components/pages/LandingPage";

export const metadata = {
  title: "FORTIA HUB | Formation, Boutique Digitale & Services Experts",
  description:
    "FORTIA HUB est la plateforme de référence pour l'apprentissage et les services professionnels d'élite.",
};

export default function Page() {
  return (
    <AppShell>
      <LandingPage />
    </AppShell>
  );
}