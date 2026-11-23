"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useMarketplace } from "@/lib/store/domains/contexts";
import { ArrowLeft, BadgeCheck, Star, MapPin, Briefcase } from "lucide-react";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { freelances } = useMarketplace();
  const profile = (freelances || []).find((item: any) => item.id === params?.id);

  return (
    <AppShell>
      <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <button type="button" onClick={() => router.push("/freelances")} className="ibx-btn ibx-btn-ghost"><ArrowLeft className="h-3.5 w-3.5" /> Tous les freelances</button>
          {!profile ? (
            <p className="ibx-fg-muted ibx-surface rounded-xl p-8 text-center text-sm">Profil introuvable ou non publié.</p>
          ) : (
            <>
              <section className="ibx-surface rounded-[var(--ibx-radius-lg)] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="h-20 w-20 rounded-full object-cover" /> : <div className="ibx-surface-muted flex h-20 w-20 items-center justify-center rounded-full text-2xl font-black">{(profile.name || "F").slice(0, 1)}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="ibx-fg text-2xl font-black">{profile.name}</h1>
                      {profile.kycVerified && <span className="ibx-badge ibx-badge-success"><BadgeCheck className="h-3.5 w-3.5" /> Vérifié</span>}
                    </div>
                    <p className="ibx-fg-muted mt-1 text-sm">{profile.title || profile.category}</p>
                    <div className="ibx-fg-subtle mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                      {profile.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {profile.rating}</span>}
                      {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.location}</span>}
                      {profile.hourlyRate > 0 && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {profile.hourlyRate} $ / h</span>}
                    </div>
                    {profile.bio && <p className="ibx-fg-muted mt-4 text-xs leading-relaxed">{profile.bio}</p>}
                    {profile.skills?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{profile.skills.map((skill: string) => <span key={skill} className="ibx-badge">{skill}</span>)}</div>}
                  </div>
                </div>
              </section>
              <section className="ibx-surface rounded-[var(--ibx-radius-lg)] p-5">
                <h2 className="ibx-section-title mb-3">Services proposés</h2>
                <div className="divide-y divide-[var(--ibx-border)]">
                  {(profile.services || []).map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between gap-4 py-3">
                      <div><p className="ibx-fg text-xs font-semibold">{service.title}</p><p className="ibx-fg-muted mt-0.5 text-[11px]">{service.description}</p></div>
                      <span className="ibx-fg text-xs font-black">{service.startingPrice ? `${service.startingPrice} $` : "Sur devis"}</span>
                    </div>
                  ))}
                  {(profile.services || []).length === 0 && <p className="ibx-fg-muted py-3 text-xs">Aucun service publié pour ce profil.</p>}
                </div>
                <button type="button" onClick={() => router.push("/marketplace?section=freelance")} className="ibx-btn ibx-btn-primary mt-4">Découvrir les services</button>
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
