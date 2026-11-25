"use client";

import React, { useMemo } from "react";
import { encodeQrCode } from "@/lib/utils/qrCode";

interface QrCodeImageProps {
  /** Contenu encodé (URL, otpauth://…, identifiant de certificat…). */
  value: string;
  /** Taille CSS appliquée au conteneur (carré). */
  className?: string;
  alt?: string;
  /** Marge blanche autour du motif, en modules. */
  margin?: number;
}

/**
 * QR code rendu localement en SVG (aucun service externe : aucun contenu
 * n'est envoyé à un tiers). Utilisé pour la 2FA et les certificats.
 */
export function QrCodeImage({ value, className = "", alt = "QR code", margin = 3 }: QrCodeImageProps) {
  const qr = useMemo(() => {
    try {
      return encodeQrCode(value, { minVersion: 2 });
    } catch {
      return null;
    }
  }, [value]);

  const path = useMemo(() => {
    if (!qr) return "";
    let data = "";
    for (let row = 0; row < qr.size; row += 1) {
      for (let column = 0; column < qr.size; column += 1) {
        if (!qr.modules[row][column]) continue;
        data += `M${column} ${row}h1v1h-1z`;
      }
    }
    return data;
  }, [qr]);

  if (!qr) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded bg-white text-[9px] font-bold text-slate-500 ${className}`}
      >
        QR indisponible
      </span>
    );
  }

  return (
    <svg
      viewBox={`${-margin} ${-margin} ${qr.size + margin * 2} ${qr.size + margin * 2}`}
      className={`bg-white ${className}`}
      role="img"
      aria-label={alt}
      shapeRendering="crispEdges"
    >
      <rect
        x={-margin}
        y={-margin}
        width={qr.size + margin * 2}
        height={qr.size + margin * 2}
        fill="#ffffff"
      />
      <path d={path} fill="#021231" />
    </svg>
  );
}
