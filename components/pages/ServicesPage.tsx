"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { ServicesAgency } from "@/components/ServicesAgency";

export function ServicesPage() {
  const { services, submitQuote } = useAppStore();

  return <ServicesAgency services={services} onSubmitQuote={submitQuote} />;
}