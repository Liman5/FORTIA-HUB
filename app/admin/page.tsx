import { AdminModernPage } from "@/components/admin/AdminModernPage";

export const metadata = {
  title: "Administration | FORTIA HUB",
  description: "Tableau de bord d'administration FORTIA HUB - gestion des cours, produits et utilisateurs.",
};

export default function Page() {
  return (
    <div className="admin-page-shell">
      <AdminModernPage />
    </div>
  );
}