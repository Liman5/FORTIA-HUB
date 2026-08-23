import { AppShell } from "@/components/layout/AppShell";
import { CertificateVerifier } from "@/components/CertificateVerifier";

export const metadata = {
  title: "Vérification de Certificats | FORTIA HUB",
  description:
    "Vérifiez l'authenticité de vos certificats FORTIA HUB par numéro d'identification unique.",
};

export default function Page() {
  return (
    <AppShell>
      <CertificateVerifier />
    </AppShell>
  );
}