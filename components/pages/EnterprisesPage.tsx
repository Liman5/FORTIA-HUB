"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMarketplace, useAuth, useUi } from "@/lib/store/domains/contexts";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";

export function EnterprisesPage() {
  const router = useRouter();
    const { setKycModalOpen } = useUi();
  const { feeConfig, isUserLoggedIn, userProfile } = useAuth();
  const { enterprises } = useMarketplace();

  // Compte déjà vérifié (badge / KYC validé) : plus d'appel à soumettre un KYC.
  const kycVerified =
    userProfile?.kycStatus === "approuve" ||
    userProfile?.badge === "green" ||
    userProfile?.badge === "gold";

  const handleOpenKyc = () => {
    if (!isUserLoggedIn) {
      // La connexion est une PAGE dédiée : on y navigue, plus de pop-up.
      router.push("/login");
    } else {
      setKycModalOpen(true);
    }
  };

  return (
    <EnterpriseDirectory
      enterprises={enterprises}
      feeConfig={feeConfig}
      onOpenKycModal={handleOpenKyc}
      hideKycCta={kycVerified}
    />
  );
}