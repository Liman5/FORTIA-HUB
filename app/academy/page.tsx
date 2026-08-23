import { AppShell } from "@/components/layout/AppShell";
import { AcademyPage } from "@/components/pages/AcademyPage";

export const metadata = {
  title: "Académie Certifiante | FORTIA HUB",
  description:
    "Catalogue complet des formations certifiantes en Cryptomonnaie, IA, Canva, CapCut, Marketing Digital & Entrepreneuriat.",
};

export default function Page() {
  return (
    <AppShell>
      <AcademyPage />
    </AppShell>
  );
}