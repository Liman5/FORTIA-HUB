"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface IbxLightboxImage {
  src: string;
  alt?: string;
}

/**
 * Galerie plein écran réutilisable (lightbox).
 *
 * Accessibilité :
 *  - Escape ferme, flèches gauche/droite naviguent, Tab reste dans la boîte ;
 *  - le défilement de la page est bloqué pendant l'ouverture ;
 *  - les libellés sont explicites et le compteur (1/4) est annoncé.
 *
 * Aucune dépendance externe, aucun style codé en dur : les classes
 * proviennent du design system IBX (`ibx-lightbox*`).
 */
export function IbxLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
  label,
}: {
  images: IbxLightboxImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (next: number) => void;
  label?: string;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const total = images.length;
  const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
  const current = total > 0 ? images[safeIndex] : null;

  const go = useCallback(
    (delta: number) => {
      if (total < 2) return;
      const next = (safeIndex + delta + total) % total;
      onIndexChange?.(next);
    },
    [onIndexChange, safeIndex, total]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, go, onClose]);

  if (!open || !current) return null;

  return (
    <div
      className="ibx-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label || "Aperçu de l'image"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ibx-lightbox-frame">
        <img src={current.src} alt={current.alt || label || ""} />

        <button
          ref={closeRef}
          type="button"
          className="ibx-lightbox-close"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          title="Fermer (Échap)"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              className="ibx-lightbox-nav"
              data-dir="prev"
              onClick={() => go(-1)}
              aria-label="Image précédente"
              title="Image précédente (flèche gauche)"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ibx-lightbox-nav"
              data-dir="next"
              onClick={() => go(1)}
              aria-label="Image suivante"
              title="Image suivante (flèche droite)"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="ibx-lightbox-counter" aria-live="polite">
              {safeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
