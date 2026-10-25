"use client";

import React from "react";
import { SORTED_COUNTRIES } from "../lib/data/countries";

interface CountrySelectProps {
  /** Nom du pays sélectionné (valeur enregistrée en base). */
  value: string;
  onChange: (countryName: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** Affiche l'indicatif téléphonique (utile à côté d'un champ téléphone). */
  showDial?: boolean;
}

const DEFAULT_CLASS =
  "w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]";

/**
 * Sélecteur de pays complet (tous les pays du monde).
 * La valeur transmise est le NOM du pays, pour rester compatible avec les
 * données déjà enregistrées (« Sénégal », « Côte d'Ivoire »…).
 */
export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  className,
  id,
  required,
  disabled,
  showDial = false,
}) => {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className={className || DEFAULT_CLASS}
    >
      <option value="">Sélectionnez votre pays…</option>
      {SORTED_COUNTRIES.map((country) => (
        <option key={country.code} value={country.name}>
          {showDial ? `${country.name} (${country.dial})` : country.name}
        </option>
      ))}
    </select>
  );
};

export default CountrySelect;
