"use client";

import React from "react";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { useAppStore } from "@/lib/store/AppStore";
import { useMarketplace } from "@/lib/store/domains/contexts";
import { PlatformShowcaseView } from "@/components/PlatformShowcaseView";

export function ShowcasePage() {
  const { setActiveTab } = useActiveSection();
  const { siteContent } = useMarketplace();
  const { setAdminAuthModalOpen } = useAppStore();

  return (
    <PlatformShowcaseView
      setActiveTab={setActiveTab}
      onOpenAdminAuth={() => setAdminAuthModalOpen(true)}
      siteContent={siteContent}
    />
  );
}