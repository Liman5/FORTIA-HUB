import { AppShell } from "@/components/layout/AppShell";
import { ServicesPage } from "@/components/pages/ServicesPage";

export const metadata = {
  title: "Prestations Agence & Services Experts | FORTIA HUB",
  description:
    "Création de logos, chartes graphiques, rédaction de White Papers, montage vidéo et community management.",
};

export default function Page() {
  return (
    <AppShell>
      <ServicesPage />
    </AppShell>
  );
}