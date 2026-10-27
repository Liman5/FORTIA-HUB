"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Sélecteur de catégorie commun aux formulaires (formations et produits).
 * ------------------------------------------------------------
 * • Affiche TOUTES les catégories connues (celles de la base + les catégories
 *   de référence) : l'utilisateur ne se limite plus à une courte liste.
 * • Option « Autre catégorie… » : la personne saisit librement la sienne.
 *   Le code renvoyé est alors un identifiant stable dérivé du libellé
 *   (`custom-couture`), et le libellé est conservé tel quel pour l'affichage.
 */

export interface CategoryOption {
  code: string;
  label: string;
}

const CUSTOM = "__custom__";

/** Identifiant stable pour une catégorie saisie librement. */
export function slugifyCategory(label: string): string {
  return (
    String(label || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "autre"
  );
}

export function CategorySelect({
  value,
  labelValue,
  categories,
  onChange,
  className = "w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white",
  inputClassName = "w-full mt-2 bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white",
  customPlaceholder = "Saisissez le nom de votre catégorie",
}: {
  value: string;
  labelValue?: string;
  categories: CategoryOption[];
  onChange: (code: string, label: string) => void;
  className?: string;
  inputClassName?: string;
  customPlaceholder?: string;
}) {
  // Liste fusionnée et dédoublonnée (la base d'abord, puis les références).
  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: CategoryOption[] = [];
    for (const option of categories) {
      const code = String(option?.code || "").trim();
      const label = String(option?.label || "").trim();
      if (!code || !label || seen.has(code)) continue;
      seen.add(code);
      list.push({ code, label });
    }
    return list;
  }, [categories]);

  const isKnown = options.some((option) => option.code === value);
  const [customMode, setCustomMode] = useState(!isKnown && !!value);
  const [customText, setCustomText] = useState(
    !isKnown && value ? String(labelValue || value) : ""
  );

  // Une valeur choisie ailleurs (autre onglet du formulaire) resynchronise l'état.
  useEffect(() => {
    if (isKnown) setCustomMode(false);
  }, [isKnown, value]);

  const handleSelect = (raw: string) => {
    if (raw === CUSTOM) {
      setCustomMode(true);
      setCustomText("");
      return;
    }
    setCustomMode(false);
    const option = options.find((item) => item.code === raw);
    onChange(raw, option?.label || raw);
  };

  const handleCustomText = (text: string) => {
    setCustomText(text);
    const trimmed = text.trim();
    onChange(trimmed ? slugifyCategory(trimmed) : "", trimmed);
  };

  return (
    <div>
      <select
        value={customMode ? CUSTOM : value}
        onChange={(event) => handleSelect(event.target.value)}
        className={className}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
        <option value={CUSTOM}>Autre catégorie…</option>
      </select>

      {customMode && (
        <input
          type="text"
          value={customText}
          onChange={(event) => handleCustomText(event.target.value)}
          placeholder={customPlaceholder}
          className={inputClassName}
          maxLength={60}
        />
      )}
    </div>
  );
}

/** Catégories de référence (utilisées si la base n'en fournit pas). */
export const REFERENCE_COURSE_CATEGORIES: CategoryOption[] = [
  { code: "crypto", label: "Cryptomonnaie & Blockchain" },
  { code: "ai", label: "Intelligence Artificielle" },
  { code: "canva", label: "Canva & Design Graphique" },
  { code: "capcut", label: "Montage Vidéo CapCut" },
  { code: "marketing", label: "Marketing Digital" },
  { code: "entrepreneurship", label: "Entrepreneuriat & Coaching" },
  { code: "blockchain", label: "Blockchain & Web3" },
  { code: "dev_web", label: "Développement Web" },
  { code: "dev_mobile", label: "Développement Mobile" },
  { code: "infographie", label: "Infographie & Suite Adobe" },
  { code: "secretariat", label: "Secrétariat Bureautique" },
  { code: "informatique", label: "Informatique de Base" },
  { code: "photo", label: "Photographie & Retouche" },
  { code: "video", label: "Production Vidéo" },
  { code: "redaction", label: "Rédaction & Copywriting" },
  { code: "commerce", label: "Commerce & Vente" },
  { code: "finance", label: "Finance & Comptabilité" },
  { code: "langues", label: "Langues & Communication" },
  { code: "artisanat", label: "Artisanat & Métiers manuels" },
  { code: "cuisine", label: "Cuisine & Pâtisserie" },
  { code: "sante", label: "Santé & Bien-être" },
  { code: "education", label: "Éducation & Enseignement" },
];

/** Types de produits numériques de référence. */
export const REFERENCE_PRODUCT_CATEGORIES: CategoryOption[] = [
  { code: "ebook", label: "eBook PDF" },
  { code: "canva_template", label: "Modèle Canva Pro" },
  { code: "ai_prompts", label: "Pack Prompts IA" },
  { code: "whitepaper", label: "White Paper PDF" },
  { code: "business_plan", label: "Business Plan" },
  { code: "contract", label: "Contrat Type" },
  { code: "pitch_deck", label: "Pitch Deck" },
  { code: "premium_pack", label: "Pack Premium" },
  { code: "course", label: "Formation Vidéo (MP4)" },
  { code: "template_excel", label: "Tableur / Excel prêt à l'emploi" },
  { code: "notion", label: "Modèle Notion" },
  { code: "audio", label: "Audio / Podcast" },
  { code: "photo_pack", label: "Pack Photos / Visuels" },
  { code: "preset", label: "Presets & LUTs" },
  { code: "plugin", label: "Plugin / Outil" },
  { code: "mockup", label: "Mockups" },
];
