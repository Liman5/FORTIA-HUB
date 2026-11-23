"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, BadgeCheck, BookOpen } from "lucide-react";
import { useCatalog } from "@/lib/store/domains/contexts";

export function CentersDirectory() {
  const router = useRouter();
  const { trainingCenters, courses } = useCatalog();
  const [query, setQuery] = useState("");

  const centers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (trainingCenters || [])
      .filter((center: any) => center?.status !== "banned" && center?.status !== "suspended")
      .filter((center: any) => !q || `${center.centerName || ""} ${center.description || ""}`.toLowerCase().includes(q))
      .map((center: any) => ({
        ...center,
        courseCount: (courses || []).filter((course: any) => course.centerId === center.id).length,
      }));
  }, [trainingCenters, courses, query]);

  return (
    <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <span className="ibx-badge ibx-badge-info">Réseau de formation</span>
          <h1 className="ibx-fg text-2xl font-black sm:text-3xl">Centres de formation</h1>
          <p className="ibx-fg-muted max-w-2xl text-sm">Découvrez les centres, leurs formations et leurs formateurs.</p>
        </header>
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ibx-fg-subtle)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un centre…" className="ibx-input pl-10" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((center: any) => (
            <button key={center.id} type="button" onClick={() => router.push(`/centres/${encodeURIComponent(center.id)}`)} className="ibx-surface overflow-hidden rounded-[var(--ibx-radius-md)] text-left transition hover:border-[var(--ibx-accent)]">
              <div className="h-28 bg-[var(--ibx-surface-muted)]">
                {center.banner || center.logo ? <img src={center.banner || center.logo} alt={center.centerName} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="ibx-fg truncate text-sm font-bold">{center.centerName}</h2>
                  {center.isVerified && <span className="ibx-badge ibx-badge-success"><BadgeCheck className="h-3 w-3" /> Vérifié</span>}
                </div>
                <p className="ibx-fg-muted line-clamp-2 text-[11px]">{center.description || "Centre de formation professionnelle"}</p>
                <div className="ibx-fg-subtle flex items-center gap-3 text-[10px] font-semibold">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {center.courseCount} formation(s)</span>
                  {center.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {center.location}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        {centers.length === 0 && <p className="ibx-fg-muted rounded-xl border border-dashed border-[var(--ibx-border)] p-8 text-center text-sm">Aucun centre publié pour le moment.</p>}
      </div>
    </div>
  );
}
