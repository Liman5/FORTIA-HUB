import { AppShell } from "@/components/layout/AppShell";
import { MemberPage } from "@/components/pages/MemberPage";

export const metadata = {
  title: "Mon Compte & Tableau de Bord | FORTIA HUB",
  description: "Gérez vos formations, certificats, produits achetés et paramètres de compte.",
};

export default function Page() {
  return (
    <AppShell>
      <MemberPage />
    </AppShell>
  );
}