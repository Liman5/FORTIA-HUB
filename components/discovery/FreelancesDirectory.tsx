"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BadgeCheck, Star, MapPin } from "lucide-react";
import { useMarketplace } from "@/lib/store/domains/contexts";

export function FreelancesDirectory() {
  const router = useRouter();
  const { freelances } = useMarketplace();
  const [query, setQuery] = useState("");

  const profiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (freelances || []).filter((profile: any) => {
      if (!profile?.kycVerified && !profile?.canSellServices) return false;
      if (!q) return true;
      return `${profile.name || ""} ${profile.title || ""} ${profile.category || ""} ${(profile.skills || []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [freelances, query]);

  return (
    <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <span className="ibx-badge ibx-badge-info">Professionnels</span>
          <h1 className="ibx-fg text-2xl font-black sm:text-3xl">Freelances et experts</h1>
          <p className="ibx-fg-muted max-w-2xl text-sm">Découvrez des professionnels vérifiés et leurs services.</p>
        </header>
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ibx-fg-subtle)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une compétence, un nom…" className="ibx-input pl-10" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile: any) => (
            <button key={profile.id} type="button" onClick={() => router.push(`/freelances/${encodeURIComponent(profile.id)}`)} className="ibx-surface rounded-[var(--ibx-radius-md)] p-4 text-left transition hover:border-[var(--ibx-accent)]">
              <div className="flex items-start gap-3">
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="ibx-surface-muted flex h-12 w-12 items-center justify-center rounded-full font-black">{(profile.name || "F").slice(0, 1)}</div>}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5"><span className="ibx-fg truncate text-sm font-bold">{profile.name}</span>{profile.kycVerified && <BadgeCheck className="h-3.5 w-3.5 text-[var(--ibx-success)]" />}</div>
                  <p className="ibx-fg-muted truncate text-[11px]">{profile.title || profile.category}</p>
                  <div className="ibx-fg-subtle mt-1 flex items-center gap-2 text-[10px]">
                    {profile.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {profile.rating}</span>}
                    {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
                  </div>
                </div>
              </div>
              {profile.skills?.length > 0 && <p className="ibx-fg-subtle mt-3 line-clamp-1 text-[10px]">{profile.skills.slice(0, 4).join(" · ")}</p>}
            </button>
          ))}
        </div>
        {profiles.length === 0 && <p className="ibx-fg-muted rounded-xl border border-dashed border-[var(--ibx-border)] p-8 text-center text-sm">Aucun freelance vérifié disponible pour le moment.</p>}
      </div>
    </div>
  );
}
