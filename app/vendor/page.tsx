import { AppShell } from "@/components/layout/AppShell";
import { VendorPage } from "@/components/pages/VendorPage";

export const metadata = {
  title: "Espace Vendeur & Gestion Boutique | FORTIA HUB",
  description: "Gérez votre boutique, vos produits numériques, commandes et retraits.",
};

export default function Page() {
  return (
    <AppShell>
      <VendorPage />
    </AppShell>
  );
}