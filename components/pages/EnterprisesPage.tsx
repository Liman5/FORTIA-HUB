"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMarketplace, useAuth, useUi } from "@/lib/store/domains/contexts";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";

export function EnterprisesPage() {
  const router = useRouter();
    const { setKycModalOpen } = useUi();
  const { feeConfig, isUserLoggedIn } = useAuth();
  const { enterprises } = useMarketplace();

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
    />
  );
}