import { AppShell } from "@/components/layout/AppShell";
import { CategoryHub } from "@/components/discovery/CategoryHub";

export const metadata = {
  title: "Catégories de formation | FORTIA HUB",
  description: "Explorez toutes les catégories de formations FORTIA HUB.",
};

export default function Page() {
  return (
    <AppShell>
      <CategoryHub kind="course" />
    </AppShell>
  );
}
