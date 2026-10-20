"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth, useCatalog, useMarketplace } from "@/lib/store/domains/contexts";
import { InstructorDashboard } from "@/components/InstructorDashboard";
import { CheckoutStep } from "@/components/CheckoutStep";
import type { TrainingCenter } from "@/lib/types";

interface PendingStorage {
  center: TrainingCenter;
  gb: number;
  usd: number;
}

export function InstructorPage() {
  const router = useRouter();
  const { isUserLoggedIn, userProfile, sessionChecking } = useAuth();
  const { marketplaceProducts, stores, addSupportSubmission } = useMarketplace();
  const { courses, trainingCenters, instructorCommissions, instructorStoragePurchases, instructorCenter, createTrainingCenter, addInstructorCourse, updateInstructorCourse, suspendInstructorCourse, deleteInstructorCourse, buyInstructorStorage, loadAllCourses } = useCatalog();
  const { platformLoaded } = useAppStore();

  // Espace formateur : le catalogue public ne contient que la première page et
  // exclut les brouillons. On charge donc l'intégralité des formations
  // (brouillons inclus) dès que la session est connue.
  React.useEffect(() => {
    if (isUserLoggedIn) loadAllCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoggedIn]);

  const [pendingStorage, setPendingStorage] = React.useState<PendingStorage | null>(null);

  // Anti-flash au rechargement : on n'affiche JAMAIS « créer votre centre » ou
  // « connectez-vous » tant que la session et les données ne sont pas chargées.
  if (!platformLoaded || sessionChecking) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center">
          <span className="block w-6 h-6 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" style={{ animationDuration: "1s" }} />
        </div>
        <p className="text-xs font-bold text-slate-400 animate-pulse">Chargement de votre Espace Formateur…</p>
      </div>
    );
  }

  // Centre du formateur connecté — UN SEUL par compte, choisi de façon
  // déterministe (actif/payé d'abord, puis le plus récent). On ignore un
  // `instructorCenter` qui appartiendrait à un autre compte (données résiduelles
  // d'une session précédente : c'est ce qui affichait tour à tour IBX, IBXPRESS…).
  const ownedCenters = userProfile?.id
    ? trainingCenters.filter((c) => c.ownerId === userProfile.id)
    : [];
  const rank = (c: TrainingCenter) => (c.feePaid || c.status === "active" ? 1 : 0);
  const myCenter =
    ownedCenters.sort((a, b) => {
      const diff = rank(b) - rank(a);
      if (diff !== 0) return diff;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    })[0] ||
    (instructorCenter && instructorCenter.ownerId === userProfile?.id ? instructorCenter : null);

  // Achat d'espace de stockage : mémorisé ici, l'étape PAIEMENT (page, sans
  // fenêtre superposée) prend alors la place du tableau de bord.
  const handleBuyStorage = (center: TrainingCenter, gb: number, usd: number) => {
    setPendingStorage({ center, gb, usd });
  };

  if (pendingStorage) {
    const { center, gb, usd } = pendingStorage;
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <CheckoutStep
          cartItems={[
            {
              id: `storage-${gb}`,
              type: "service",
              title: `Stockage vidéo ${gb} Go (Espace Formateur)`,
              price: usd,
              image: "",
              categoryLabel: "Stockage Formateur",
            },
          ]}
          totalAmountUsd={usd}
          onPaymentSuccess={() => {
            // Paiement confirmé → on active le stockage acheté puis on revient au tableau de bord.
            buyInstructorStorage(center, gb, usd);
            setPendingStorage(null);
          }}
          onAddSupportSubmission={addSupportSubmission}
          vendorEmail="stockage@fortiahub.com"
          buyerUserId={userProfile?.id}
          marketplaceProducts={marketplaceProducts as any}
          stores={stores as any}
          onBack={() => setPendingStorage(null)}
        />
      </div>
    );
  }

  return (
    <InstructorDashboard
      center={myCenter}
      userId={userProfile?.id}
      courses={courses}
      commissions={instructorCommissions}
      storagePurchases={instructorStoragePurchases}
      isUserLoggedIn={isUserLoggedIn}
      userEmail={userProfile?.email}
      userAvatar={(userProfile as { avatar?: string } | null)?.avatar}
      onCreateCenter={(data) => createTrainingCenter(data)}
      onAddCourse={addInstructorCourse}
      onUpdateCourse={updateInstructorCourse}
      onSuspendCourse={suspendInstructorCourse}
      onDeleteCourse={deleteInstructorCourse}
      onBuyStorage={handleBuyStorage}
      onOpenAuthModal={() => router.push("/login")}
    />
  );
}
