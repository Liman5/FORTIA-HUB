import { AppShell } from "@/components/layout/AppShell";

/**
 * Squelette affiché IMMÉDIATEMENT pendant le rendu serveur de la fiche
 * produit : la navigation ne « fige » plus l'écran.
 */
export default function Loading() {
  return (
    <AppShell>
      <div className="ibx-page ibx-catalogue">
        <div className="ibx-container grid gap-4 py-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="ibx-card-muted aspect-[4/3] animate-pulse" />
            <div className="ibx-card space-y-2.5 p-4">
              <div className="h-4 w-3/5 animate-pulse rounded bg-[var(--ibx-surface-strong)]" />
              <div className="h-3 w-full animate-pulse rounded bg-[var(--ibx-surface-muted)]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--ibx-surface-muted)]" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="ibx-card h-44 animate-pulse" />
            <div className="ibx-card h-28 animate-pulse" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
