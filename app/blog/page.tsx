import { AppShell } from "@/components/layout/AppShell";
import { BlogPage } from "@/components/pages/BlogPage";

export const metadata = {
  title: "Blog & Actualités | FORTIA HUB",
  description: "Articles, guides et actualités sur la crypto, l'IA, le marketing digital et l'entrepreneuriat.",
};

export default function Page() {
  return (
    <AppShell>
      <BlogPage />
    </AppShell>
  );
}