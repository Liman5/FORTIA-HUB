"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useMarketplace } from "@/lib/store/domains/contexts";
import { ServicesAgency } from "@/components/ServicesAgency";
import { fetchServices } from "@/lib/services/api/services";
import { clearCache } from "@/lib/services/api/http";

export function ServicesPage() {
  const { services, setServices, submitQuote } = useMarketplace();
  const { platformLoaded } = useAppStore();

  // Lecture FRAÎCHE des services à l'ouverture de la page : une image de carte
  // (ou un prix, une description) modifiée dans l'administration doit apparaître
  // immédiatement, sans attendre l'expiration du cache du domaine « services ».
  useEffect(() => {
    clearCache(["services"]);
    fetchServices({}, true)
      .then((data) => {
        if (data?.servicePackages?.length) {
          setServices(data.servicePackages as any);
        }
      })
      .catch(() => {});
  }, [setServices]);

  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement des services...</p>
        </div>
      </div>
    );
  }

  return <ServicesAgency services={services} onSubmitQuote={submitQuote} />;
}
