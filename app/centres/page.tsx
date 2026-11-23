import { AppShell } from "@/components/layout/AppShell";
import { CentersDirectory } from "@/components/discovery/CentersDirectory";

export const metadata = {
  title: "Centres de formation | FORTIA HUB",
  description: "Découvrez les centres de formation du réseau FORTIA HUB.",
};

export default function Page() {
  return <AppShell><CentersDirectory /></AppShell>;
}
