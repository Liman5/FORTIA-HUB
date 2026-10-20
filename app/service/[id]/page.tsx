import { AppShell } from "@/components/layout/AppShell";
import { ServiceDetailPage } from "@/components/pages/ServiceDetailPage";

export const metadata = {
  title: "Service — FORTIA HUB",
  description: "Détail d'une prestation : galerie, livrables, tarif, délai et commande.",
};

export default function Page() {
  return (
    <AppShell>
      <ServiceDetailPage />
    </AppShell>
  );
}
