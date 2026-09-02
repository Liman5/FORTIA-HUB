"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { InstructorDashboard } from "@/components/InstructorDashboard";
import { PaymentGatewayModal } from "@/components/PaymentGatewayModal";
import type { TrainingCenter } from "@/lib/types";

interface PendingStorage {
  center: TrainingCenter;
  gb: number;
  usd: number;
}

export function InstructorPage() {
  const {
    isUserLoggedIn,
    userProfile,
    courses,
    trainingCenters,
    instructorCommissions,
    instructorStoragePurchases,
    instructorCenter,
    createTrainingCenter,
    addInstructorCourse,
    updateInstructorCourse,
    suspendInstructorCourse,
    deleteInstructorCourse,
    buyInstructorStorage,
    marketplaceProducts,
    stores,
    isPaymentGatewayOpen,
    setPaymentGatewayOpen,
    paymentItems,
    setPaymentItems,
    addSupportSubmission,
    setOpenAuthModal,
    setAuthMode,
  } = useAppStore();

  const [pendingStorage, setPendingStorage] = React.useState<PendingStorage | null>(null);

  // Centre du formateur connecté (par ownerId)
  const myCenter =
    instructorCenter ||
    (userProfile?.id
      ? trainingCenters.find((c) => c.ownerId === userProfile.id) || null
      : null);

  // Ouvre le VRAI modal de paiement pour acheter de l'espace de stockage
  const handleBuyStorage = (center: TrainingCenter, gb: number, usd: number) => {
    setPendingStorage({ center, gb, usd });
    setPaymentItems([
      {
        id: `storage-${Date.now()}`,
        type: "service",
        title: `Stockage vidéo ${gb} Go (Espace Formateur)`,
        price: usd,
        image: "",
        categoryLabel: "Stockage Formateur",
      },
    ]);
    setPaymentGatewayOpen(true);
  };

  return (
    <>
      <InstructorDashboard
        center={myCenter}
        courses={courses}
        commissions={instructorCommissions}
        storagePurchases={instructorStoragePurchases}
        isUserLoggedIn={isUserLoggedIn}
        userEmail={userProfile?.email}
        onCreateCenter={(data) => createTrainingCenter(data)}
        onAddCourse={addInstructorCourse}
        onUpdateCourse={updateInstructorCourse}
        onSuspendCourse={suspendInstructorCourse}
        onDeleteCourse={deleteInstructorCourse}
        onBuyStorage={handleBuyStorage}
        onOpenAuthModal={() => {
          setAuthMode("login");
          setOpenAuthModal(true);
        }}
      />

      {/* Modal de paiement réel (Wave / Orange Money / Carte / Crypto…) */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => {
          setPaymentGatewayOpen(false);
          setPendingStorage(null);
        }}
        cartItems={paymentItems}
        totalAmountUsd={paymentItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)}
        onPaymentSuccess={(order) => {
          // Paiement confirmé → on active le stockage acheté
          if (pendingStorage) {
            buyInstructorStorage(pendingStorage.center, pendingStorage.gb, pendingStorage.usd);
          }
          setPaymentGatewayOpen(false);
          setPendingStorage(null);
        }}
        onAddSupportSubmission={addSupportSubmission}
        vendorEmail="stockage@fortiahub.com"
        buyerUserId={userProfile?.id}
        marketplaceProducts={marketplaceProducts as any}
        stores={stores as any}
      />
    </>
  );
}
