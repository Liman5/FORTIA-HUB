import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/components/pages/HomePage";

export const metadata = {
  title: "Accueil | FORTIA HUB",
  description:
    "Découvrez les formations certifiantes, les centres de formation et les ressources numériques de FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}
