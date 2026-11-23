import { AppShell } from "@/components/layout/AppShell";
import { CategoryHub } from "@/components/discovery/CategoryHub";

export const metadata = {
  title: "Catégories de produits numériques | FORTIA HUB",
  description: "Toutes les catégories de produits numériques de la boutique FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <CategoryHub kind="product" />
    </AppShell>
  );
}
