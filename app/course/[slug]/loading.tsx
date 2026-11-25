import { AppShell } from "@/components/layout/AppShell";

/**
 * Squelette affiché IMMÉDIATEMENT pendant le rendu serveur de la fiche
 * formation : la navigation ne « fige » plus l'écran.
 */
export default function Loading() {
  return (
    <AppShell>
      <div className="ibx-page ibx-catalogue">
        <div className="ibx-container grid gap-4 py-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="ibx-card-muted aspect-video animate-pulse" />
            <div className="ibx-card space-y-2.5 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--ibx-surface-strong)]" />
              <div className="h-3 w-full animate-pulse rounded bg-[var(--ibx-surface-muted)]" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--ibx-surface-muted)]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--ibx-surface-muted)]" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="ibx-card h-40 animate-pulse" />
            <div className="ibx-card h-24 animate-pulse" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
