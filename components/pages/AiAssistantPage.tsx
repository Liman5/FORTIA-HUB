"use client";

import React from "react";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { AiAssistantWidget } from "@/components/AiAssistantWidget";

export function AiAssistantPage() {
  const { setActiveTab } = useActiveSection();

  return <AiAssistantWidget setActiveTab={setActiveTab} />;
}