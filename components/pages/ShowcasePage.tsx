"use client";

import React from "react";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { useAppStore } from "@/lib/store/AppStore";
import { PlatformShowcaseView } from "@/components/PlatformShowcaseView";

export function ShowcasePage() {
  const { setActiveTab } = useActiveSection();
  const {
    siteContent,
    setAdminAuthModalOpen,
    setOpenAuthModal,
    setAuthMode,
  } = useAppStore();

  return (
    <PlatformShowcaseView
      setActiveTab={setActiveTab}
      onOpenAdminAuth={() => setAdminAuthModalOpen(true)}
      siteContent={siteContent}
      onOpenAuthModal={(mode) => {
        setAuthMode(mode);
        setOpenAuthModal(true);
      }}
    />
  );
}