import { AppShell } from "@/components/layout/AppShell";
import { FreelancesDirectory } from "@/components/discovery/FreelancesDirectory";

export const metadata = {
  title: "Freelances et experts | FORTIA HUB",
  description: "Répertoire des freelances et professionnels vérifiés de FORTIA HUB.",
};

export default function Page() {
  return <AppShell><FreelancesDirectory /></AppShell>;
}
