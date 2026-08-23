import { AppShell } from "@/components/layout/AppShell";
import { MemberPage } from "@/components/pages/MemberPage";

export const metadata = {
  title: "Paramètres & Sécurité | FORTIA HUB",
  description: "Gérez les paramètres de votre compte, votre sécurité et vos informations personnelles.",
};

export default function Page() {
  return (
    <AppShell>
      <MemberPage initialTab="settings" />
    </AppShell>
  );
}