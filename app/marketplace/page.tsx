import { AppShell } from "@/components/layout/AppShell";
import { MarketplacePage } from "@/components/pages/MarketplacePage";

export const metadata = {
  title: "Marketplace | FORTIA HUB",
  description:
    "Boutique numérique, ebooks, templates, packs de prompts IA et freelances vérifiés.",
};

export default function Page() {
  return (
    <AppShell>
      <MarketplacePage />
    </AppShell>
  );
}