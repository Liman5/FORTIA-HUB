import { AppShell } from "@/components/layout/AppShell";
import { AboutPage } from "@/components/pages/AboutPage";

export const metadata = {
  title: "À Propos de FORTIA HUB | Identité & Marque",
  description: "Découvrez la vision, la mission et l'identité de la plateforme FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <AboutPage />
    </AppShell>
  );
}