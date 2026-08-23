"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { InstructorDashboard } from "@/components/InstructorDashboard";

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
    setOpenAuthModal,
    setAuthMode,
  } = useAppStore();

  // Centre du formateur connecté (par ownerId)
  const myCenter =
    instructorCenter ||
    (userProfile?.id
      ? trainingCenters.find((c) => c.ownerId === userProfile.id) || null
      : null);

  return (
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
      onBuyStorage={buyInstructorStorage}
      onOpenAuthModal={() => {
        setAuthMode("login");
        setOpenAuthModal(true);
      }}
    />
  );
}