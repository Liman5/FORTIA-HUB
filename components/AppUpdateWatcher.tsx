"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { applyUpdate, checkForUpdate } from "@/lib/services/appVersion";

/**
 * Surveillance des mises à jour (montée une seule fois dans AppShell).
 *
 * • Vérifie au démarrage (immédiatement), à chaque retour dans l'app et
 *   toutes les 60 secondes.
 * • Dès qu'une nouvelle version est détectée : bandeau « Nouvelle version »
 *   puis application AUTOMATIQUE (purge caches + service workers + reload).
 *
 * L'utilisateur n'a donc plus jamais à désinstaller l'application.
 */
export function AppUpdateWatcher() {
  const [state, setState] = useState<"idle" | "updating" | "done">("idle");

  useEffect(() => {
    let cancelled = false;
    let started = false;

    const run = async () => {
      if (cancelled || started) return;
      const available = await checkForUpdate();
      if (cancelled || !available || started) return;

      started = true;
      setState("updating");
      // Laisse le bandeau s'afficher une seconde, puis applique la mise à jour.
      window.setTimeout(() => {
        void applyUpdate();
      }, 1200);
    };

    // 1) Au démarrage (dès que la page est interactive)
    const startTimer = window.setTimeout(run, 1500);
    // 2) Toutes les 60 secondes
    const interval = window.setInterval(run, 60_000);
    // 3) À chaque retour dans l'application (mobile : app rouverte)
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="fixed inset-x-0 bottom-24 sm:bottom-6 z-[200] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#D69E25]/50 bg-[#021231] px-4 py-3 shadow-2xl">
        {state === "done" ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-[#D69E25]" />
        )}
        <div className="text-left">
          <p className="text-xs font-black text-white">Nouvelle version disponible</p>
          <p className="text-[10px] text-slate-400">Mise à jour automatique en cours…</p>
        </div>
        <RefreshCw className="w-4 h-4 text-[#D69E25]" />
      </div>
    </div>
  );
}

export default AppUpdateWatcher;
