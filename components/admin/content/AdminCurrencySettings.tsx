"use client";

import React, { useEffect, useState } from "react";
import { Coins, Loader2, Save } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { formatFcfa, formatPricePair, resolveMoneyConfig } from "@/lib/data/currency";

/**
 * Admin — affichage des prix.
 *
 * Le FCFA (XOF) reste la monnaie principale. L'équivalent USD est
 * facultatif et n'apparaît que si l'administrateur l'active.
 *
 * Les montants enregistrés ne sont jamais convertis en base : ces deux
 * réglages ne pilotent QUE l'affichage. La configuration est persistée
 * dans `site_content` via l'action `save-currency-config`.
 */
export function AdminCurrencySettings() {
  const { siteContent, refreshPlatformData } = useAppStore();
  const config = resolveMoneyConfig(siteContent);

  const [rate, setRate] = useState<string>(String(config.rate));
  const [showUsd, setShowUsd] = useState<boolean>(config.showSecondaryUsd);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRate(String(config.rate));
    setShowUsd(config.showSecondaryUsd);
  }, [config.rate, config.showSecondaryUsd]);

  const numericRate = Number(rate);
  const rateValid = Number.isFinite(numericRate) && numericRate > 0;
  const preview = formatPricePair(25, {
    rate: rateValid ? numericRate : config.rate,
    showSecondaryUsd: showUsd,
  });

  const save = async () => {
    if (!rateValid) {
      setError("Indiquez un taux supérieur à 0.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const result = await apiWritePlatform("save-currency-config", {
      fcfaRate: Math.round(numericRate),
      showUsdSecondary: showUsd,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || "Enregistrement impossible.");
      return;
    }
    setMessage("Configuration monétaire enregistrée.");
    await refreshPlatformData(true).catch(() => null);
  };

  return (
    <div className="ibx-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
          style={{ backgroundColor: "var(--ibx-accent-soft)", color: "var(--ibx-accent-strong)" }}
          aria-hidden="true"
        >
          <Coins className="h-5 w-5" />
        </span>
        <div>
          <h4 className="ibx-h3">Affichage des prix — FCFA principal</h4>
          <p className="ibx-small mt-1 max-w-2xl">
            Les prix sont enregistrés en USD et toujours affichés en FCFA. L&apos;équivalent USD
            ci-dessous est facultatif, discret, et n&apos;altère aucune transaction.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="ibx-label" htmlFor="fcfa-rate">
            Taux d&apos;affichage (FCFA pour 1 USD)
          </label>
          <input
            id="fcfa-rate"
            type="number"
            min={1}
            step={1}
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className="ibx-input mt-1"
          />
          <p className="ibx-tiny mt-1">Utilisé uniquement pour convertir le prix affiché.</p>
        </div>
        <div>
          <span className="ibx-label">Équivalent USD</span>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={showUsd}
              onChange={(event) => setShowUsd(event.target.checked)}
              className="h-4 w-4 accent-[var(--ibx-accent)]"
            />
            <span className="ibx-small">Afficher « ≈ x USD » sous le prix FCFA</span>
          </label>
          <p className="ibx-tiny mt-1">Désactivé par défaut : un seul prix est alors affiché.</p>
        </div>
      </div>

      <div className="ibx-card-muted px-3.5 py-3">
        <p className="ibx-label">Aperçu</p>
        <p className="ibx-price mt-1">{preview.primary}</p>
        {preview.secondary && <p className="ibx-tiny mt-0.5">{preview.secondary}</p>}
        <p className="ibx-tiny mt-2">
          Exemple de ressource gratuite : <b>{formatFcfa(0)}</b>
        </p>
      </div>

      {error && <p className="ibx-error">{error}</p>}
      {message && <p className="ibx-success-text">{message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="ibx-btn ibx-btn-primary"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Enregistrer la configuration monétaire
      </button>
    </div>
  );
}
