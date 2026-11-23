"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  getDemoCounts,
  purgeDemoData,
  type DemoDataCounts,
} from "@/lib/services/admin/demoData";

/**
 * Admin — données de démonstration.
 *
 * Compteurs RÉELS lus en base et suppression complète du jeu de démonstration.
 * La suppression exige une double confirmation et n'agit que sur les lignes
 * `is_demo = true`.
 */
export function AdminDemoDataPanel() {
  const [counts, setCounts] = useState<DemoDataCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState("");
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getDemoCounts();
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Compteurs indisponibles.");
      return;
    }
    setCounts(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = counts
    ? counts.categories +
      counts.courses +
      counts.products +
      counts.centers +
      counts.freelances +
      counts.banners
    : 0;

  const handlePurge = async () => {
    if (confirmText.trim().toUpperCase() !== "SUPPRIMER") {
      setError("Saisissez SUPPRIMER pour confirmer.");
      return;
    }
    setPurging(true);
    setError("");
    const res = await purgeDemoData();
    setPurging(false);
    if (!res.success || !res.data) {
      setError(res.error || "Suppression impossible.");
      return;
    }
    const deleted = res.data.deleted;
    let message =
      `Suppression effectuée : ${deleted.courses} formation(s), ${deleted.lessons} leçon(s), ` +
      `${deleted.products} produit(s), ${deleted.stores} boutique(s), ${deleted.centers} centre(s), ` +
      `${deleted.freelances} profil(s), ${deleted.banners} bannière(s), ${deleted.categories} catégorie(s).`;
    if (res.data.usersPreserved > 0) {
      message += ` ${res.data.usersPreserved} compte(s) marqué(s) démo conservé(s) (jamais supprimés automatiquement).`;
    }
    setResult(message);
    setStep(0);
    setConfirmText("");
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="ibx-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
              style={{ backgroundColor: "var(--ibx-info-soft)", color: "var(--ibx-info)" }}
              aria-hidden="true"
            >
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h2 className="ibx-h2">Données de démonstration</h2>
              <p className="ibx-body mt-1 max-w-2xl">
                Contenus créés par le seed de démonstration (formations, produits, centres,
                bannières). Ils apparaissent comme de vraies données mais restent identifiables et
                supprimables. Aucune donnée réelle n&apos;est touchée.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="ibx-btn ibx-btn-outline"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Actualiser
          </button>
        </div>

        {error && <p className="ibx-error mt-3">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Formations", value: counts?.courses ?? 0 },
            { label: "Leçons", value: counts?.lessons ?? 0 },
            { label: "Produits", value: counts?.products ?? 0 },
            { label: "Boutiques", value: counts?.stores ?? 0 },
            { label: "Centres", value: counts?.centers ?? 0 },
            { label: "Freelances", value: counts?.freelances ?? 0 },
            { label: "Bannières", value: counts?.banners ?? 0 },
            { label: "Catégories", value: counts?.categories ?? 0 },
          ].map((item) => (
            <div key={item.label} className="ibx-card-muted px-3 py-2.5">
              <p className="ibx-label">{item.label}</p>
              <p className="ibx-h2 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {!loading && total === 0 && (
          <p className="ibx-empty mt-4">
            Aucune donnée de démonstration en base. Lancez <code>npm run seed:demo</code> pour en
            créer.
          </p>
        )}
      </div>


      <div className="ibx-card p-5">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
            style={{ backgroundColor: "var(--ibx-danger-soft)", color: "var(--ibx-danger)" }}
            aria-hidden="true"
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="ibx-h3">Supprimer les données de démonstration</h3>
            <p className="ibx-small mt-1">
              Supprime définitivement {total} élément(s) marqués comme démonstration. Les comptes
              utilisateurs, commandes, paiements et historiques ne sont pas concernés.
            </p>

            {result && <p className="ibx-success-text mt-2">{result}</p>}

            {step === 0 && (
              <button
                type="button"
                disabled={total === 0 || loading}
                onClick={() => {
                  setStep(1);
                  setResult("");
                }}
                className="ibx-btn ibx-btn-danger mt-3"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Supprimer les données de démonstration
              </button>
            )}

            {step === 1 && (
              <div className="ibx-card-muted mt-3 p-3">
                <p className="ibx-small">
                  Confirmez-vous la suppression de <b>{total}</b> élément(s) de démonstration ?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="ibx-btn ibx-btn-danger"
                  >
                    Oui, continuer
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="ibx-btn ibx-btn-ghost"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="ibx-card-muted mt-3 p-3">
                <label className="ibx-label" htmlFor="demo-confirm">
                  Saisissez SUPPRIMER pour confirmer
                </label>
                <input
                  id="demo-confirm"
                  className="ibx-input mt-1 max-w-xs"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  autoComplete="off"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePurge()}
                    disabled={purging}
                    className="ibx-btn ibx-btn-danger"
                  >
                    {purging ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Supprimer définitivement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      setConfirmText("");
                    }}
                    className="ibx-btn ibx-btn-ghost"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

