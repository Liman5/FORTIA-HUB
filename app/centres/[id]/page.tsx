"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useCatalog } from "@/lib/store/domains/contexts";
import { ArrowLeft, BookOpen, BadgeCheck } from "lucide-react";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trainingCenters, courses } = useCatalog();
  const center = (trainingCenters || []).find((item: any) => item.id === params?.id);
  const centerCourses = (courses || []).filter((course: any) => course.centerId === params?.id);

  return (
    <AppShell>
      <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <button type="button" onClick={() => router.push("/centres")} className="ibx-btn ibx-btn-ghost"><ArrowLeft className="h-3.5 w-3.5" /> Tous les centres</button>
          {!center ? (
            <p className="ibx-fg-muted ibx-surface rounded-xl p-8 text-center text-sm">Centre introuvable ou non publié.</p>
          ) : (
            <>
              <section className="ibx-surface overflow-hidden rounded-[var(--ibx-radius-lg)]">
                {center.banner || center.logo ? <img src={center.banner || center.logo} alt={center.centerName} className="h-48 w-full object-cover" /> : null}
                <div className="space-y-3 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="ibx-fg text-2xl font-black">{center.centerName}</h1>
                    {center.isVerified && <span className="ibx-badge ibx-badge-success"><BadgeCheck className="h-3.5 w-3.5" /> Vérifié</span>}
                  </div>
                  <p className="ibx-fg-muted text-sm">{center.description || "Centre de formation professionnelle."}</p>
                </div>
              </section>
              <section className="ibx-surface rounded-[var(--ibx-radius-lg)] p-5">
                <h2 className="ibx-section-title mb-3">Formations du centre ({centerCourses.length})</h2>
                <div className="divide-y divide-[var(--ibx-border)]">
                  {centerCourses.map((course: any) => (
                    <button key={course.id} type="button" onClick={() => router.push(`/course/${encodeURIComponent(course.slug || course.id)}`)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
                      <span className="ibx-fg text-xs font-semibold">{course.title}</span>
                      <span className="ibx-fg-muted flex items-center gap-1 text-[11px]"><BookOpen className="h-3.5 w-3.5" /> Voir</span>
                    </button>
                  ))}
                  {centerCourses.length === 0 && <p className="ibx-fg-muted py-4 text-xs">Aucune formation publiée pour ce centre.</p>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
