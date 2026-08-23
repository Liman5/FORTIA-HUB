"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";

export function EnterprisesPage() {
  const {
    enterprises,
    feeConfig,
    setKycModalOpen,
    setOpenAuthModal,
    isUserLoggedIn,
    setAuthMode,
  } = useAppStore();

  const handleOpenKyc = () => {
    if (!isUserLoggedIn) {
      setAuthMode("login");
      setOpenAuthModal(true);
    } else {
      setKycModalOpen(true);
    }
  };

  return (
    <EnterpriseDirectory
      enterprises={enterprises}
      feeConfig={feeConfig}
      onOpenKycModal={handleOpenKyc}
    />
  );
}