import { AppShell } from "@/components/layout/AppShell";
import { NotificationsPage } from "@/components/pages/NotificationsPage";

export const metadata = {
  title: "Centre de Notifications | FORTIA HUB",
  description: "Consultez vos alertes personnelles et messages de commande.",
};

export default function Page() {
  return (
    <AppShell>
      <NotificationsPage />
    </AppShell>
  );
}