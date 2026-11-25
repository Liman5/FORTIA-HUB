"use client";

import React, { useMemo, useState } from "react";
import { X, Copy, Check, Download, QrCode, Sparkles } from "lucide-react";
import { encodeQrCode, qrCodeToSvg } from "@/lib/utils/qrCode";

interface StoreQrCodeProps {
  storeName: string;
  /** Chemin public de la boutique (ex. /vendorstore/ibxpress). */
  path: string;
  onClose: () => void;
}

/**
 * QR code de la boutique — généré localement (aucun service externe).
 * Sert de pont entre le monde physique (flyers, vitrine, carte de visite)
 * et la boutique en ligne.
 */
export function StoreQrCode({ storeName, path, onClose }: StoreQrCodeProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const url = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${path}`;
  }, [path]);

  const qr = useMemo(() => {
    try {
      return { result: encodeQrCode(url, { minVersion: 2 }), error: "" };
    } catch {
      return { result: null, error: "Le lien de la boutique est trop long pour un QR code." };
    }
  }, [url]);

  const pathData = useMemo(() => {
    if (!qr.result) return "";
    let data = "";
    for (let row = 0; row < qr.result.size; row += 1) {
      for (let column = 0; column < qr.result.size; column += 1) {
        if (!qr.result.modules[row][column]) continue;
        data += `M${column} ${row}h1v1h-1z`;
      }
    }
    return data;
  }, [qr.result]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("Copie impossible : sélectionnez le lien manuellement.");
    }
  };

  const handleDownload = () => {
    if (!qr.result) return;
    const svg = qrCodeToSvg(qr.result, { moduleSize: 12, margin: 4 });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    anchor.href = href;
    anchor.download = `qr-${slug || "boutique"}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#011D46] text-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`QR code de la boutique ${storeName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#D69E25]">
              <Sparkles className="h-3 w-3" /> Partage hors ligne
            </p>
            <h2 className="truncate text-base font-black">QR code · {storeName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-700 p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {qr.result ? (
            <div className="mx-auto w-full max-w-[260px] rounded-2xl bg-white p-3 shadow-inner">
              <svg
                viewBox={`-4 -4 ${qr.result.size + 8} ${qr.result.size + 8}`}
                className="h-auto w-full"
                role="img"
                aria-label={`QR code menant à la boutique ${storeName}`}
                shapeRendering="crispEdges"
              >
                <rect x={-4} y={-4} width={qr.result.size + 8} height={qr.result.size + 8} fill="#ffffff" />
                <path d={pathData} fill="#021231" />
              </svg>
            </div>
          ) : (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {qr.error}
            </p>
          )}

          <p className="text-center text-[11px] text-slate-300">
            Scannez avec l&apos;appareil photo d&apos;un téléphone pour ouvrir directement votre boutique.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#021231] px-3 py-2">
            <QrCode className="h-4 w-4 shrink-0 text-[#D69E25]" />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-200">{url}</span>
          </div>

          <ul className="space-y-1.5 rounded-xl border border-slate-800 bg-[#021231]/50 px-3 py-2.5 text-[11px] text-slate-300">
            <li className="font-bold text-white">Pourquoi utiliser ce QR code ?</li>
            <li>• Imprimez-le sur vos flyers, affiches et cartes de visite.</li>
            <li>• Partagez-le sur WhatsApp, vos statuts et vos réseaux sociaux.</li>
            <li>• Affichez-le sur votre stand ou votre vitrine : un scan = votre boutique.</li>
            <li>• Aucune donnée personnelle : le client arrive simplement sur votre vitrine.</li>
            <li className="pt-1 text-emerald-300">
              • Généré dans votre navigateur : aucun service externe, votre lien ne quitte jamais FORTIA HUB.
            </li>
          </ul>

          {copyError && <p className="text-[11px] text-amber-300">{copyError}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Lien copié" : "Copier le lien"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qr.result}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D69E25] px-3 py-2 text-xs font-black text-[#021231] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger (SVG)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
