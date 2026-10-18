import { AppShell } from "@/components/layout/AppShell";
import { LibraryPage } from "@/components/pages/LibraryPage";

export const metadata = {
  title: "Ma Bibliothèque | FORTIA HUB",
  description:
    "Retrouvez vos formations suivies, vos produits achetés et vos attestations officielles — téléchargement sécurisé.",
};

export default function Page() {
  return (
    <AppShell>
      <LibraryPage />
    </AppShell>
  );
}
