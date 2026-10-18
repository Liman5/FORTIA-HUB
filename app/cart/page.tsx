import { AppShell } from "@/components/layout/AppShell";
import { CartPage } from "@/components/pages/CartPage";

export const metadata = {
  title: "Mon Panier | FORTIA HUB",
  description:
    "Vérifiez vos articles puis réglez en toute sécurité : Wave, Orange Money, carte bancaire, PayPal ou cryptomonnaie. Accès débloqué immédiatement.",
};

export default function Page() {
  return (
    <AppShell>
      <CartPage />
    </AppShell>
  );
}
