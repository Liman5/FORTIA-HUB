import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { VendorStorePage } from "@/components/pages/VendorStorePage";

export const metadata = {
  title: "Boutique Vendeur | FORTIA HUB",
  description: "Découvrez la boutique officielle du vendeur sur FORTIA HUB.",
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-screen bg-[#021231] text-white py-24 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center animate-pulse">
            <span className="block w-7 h-7 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" style={{ animationDuration: "1s" }} />
          </div>
          <p className="text-xs font-bold text-slate-400">Chargement de la boutique...</p>
        </div>
      </div>}>
        <VendorStorePage slug={slug} />
      </Suspense>
    </AppShell>
  );
}