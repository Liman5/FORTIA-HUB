import { AppShell } from "@/components/layout/AppShell";
import { EnterprisesPage } from "@/components/pages/EnterprisesPage";

export const metadata = {
  title: "Annuaire des Entreprises | FORTIA HUB",
  description:
    "Découvrez les entreprises certifiées FORTIA HUB et leurs services professionnels.",
};

export default function Page() {
  return (
    <AppShell>
      <EnterprisesPage />
    </AppShell>
  );
}