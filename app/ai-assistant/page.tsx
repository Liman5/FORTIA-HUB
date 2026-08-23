import { AppShell } from "@/components/layout/AppShell";
import { AiAssistantPage } from "@/components/pages/AiAssistantPage";

export const metadata = {
  title: "Assistant IA FORTIA HUB | Conseiller Académique",
  description:
    "Posez vos questions sur nos formations, produits et services. Le conseiller académique FORTIA HUB vous oriente.",
};

export default function Page() {
  return (
    <AppShell>
      <AiAssistantPage />
    </AppShell>
  );
}