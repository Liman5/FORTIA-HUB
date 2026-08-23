"use client";

import React from "react";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { BrandIdentityView } from "@/components/BrandIdentityView";

export function AboutPage() {
  const { setActiveTab } = useActiveSection();

  return <BrandIdentityView setActiveTab={setActiveTab} />;
}