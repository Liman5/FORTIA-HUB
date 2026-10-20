"use client";

// ============================================================
// FORTIA HUB — ADMIN : BANNIÈRES DU SITE (module indépendant)
// ------------------------------------------------------------
// Chaque bannière est composée de :
//   • une IMAGE importée sur Cloudflare R2 (dossier public `site-media`) ;
//   • une ANIMATION (aucune, fondu, glissement, zoom, rotation 3D) ;
//   • un BOUTON d'action : libellé + lien INTERNE (route du site) ou
//     EXTERNE (site tiers) ;
//   • une DURÉE D'INTERVALLE : temps d'affichage avant la bannière suivante ;
//   • un ordre d'affichage et un état actif/inactif.
// ============================================================

import React, { useRef, useState } from "react";
import type { BannerAnimation, SiteBanner } from "@/lib/types";
import { uploadFileToR2 } from "@/lib/services/clientUpload";
import {
  Images,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  Loader2,
  Power,
  ExternalLink,
  Link2,
  Timer,
  Wand2,
} from "lucide-react";

interface AdminBannersPanelProps {
  banners: SiteBanner[];
  onAdd: (banner: SiteBanner) => void;
  onUpdate: (banner: SiteBanner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

/** Animations proposées (valeur technique → libellé). */
const ANIMATIONS: { value: BannerAnimation; label: string }[] = [
  { value: "none", label: "Aucune (statique)" },
  { value: "fade", label: "Fondu progressif" },
  { value: "slide", label: "Glissement latéral" },
  { value: "zoom", label: "Zoom avant" },
  { value: "flip", label: "Rotation 3D" },
];

/** Durées d'affichage prêtes à l'emploi (secondes). */
const INTERVAL_PRESETS = [3, 5, 8, 12, 20];

/** Routes internes proposées pour le bouton (lien interne). */
const INTERNAL_LINKS = [
  { value: "/academy", label: "Académie (formations)" },
  { value: "/marketplace", label: "Marketplace" },
  { value: "/services", label: "Services Agence" },
  { value: "/library", label: "Ma Bibliothèque" },
  { value: "/blog", label: "Blog" },
  { value: "/register", label: "Inscription" },
];

const EMPTY_BANNER: SiteBanner = {
  id: "",
  title: "",
  subtitle: "",
  imageUrl: "",
  imagePosition: "50% 50%",
  animation: "fade",
  intervalMs: 5000,
  buttonLabel: "",
  buttonLink: "/academy",
  linkTarget: "internal",
  isActive: true,
  displayOrder: 0,
};

/** Points focaux rapides (appliqués en object-position, web + mobile). */
const FOCUS_PRESETS = [
  { label: "Centre", value: "50% 50%" },
  { label: "Haut", value: "50% 0%" },
  { label: "Bas", value: "50% 100%" },
  { label: "Gauche", value: "0% 50%" },
  { label: "Droite", value: "100% 50%" },
];

export function AdminBannersPanel({
  banners = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}: AdminBannersPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [form, setForm] = useState<SiteBanner>(EMPTY_BANNER);

  /** Clic sur l'aperçu → définit le point focal (recadrage) de la bannière. */
  const handleFocusClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    setForm((prev) => ({ ...prev, imagePosition: `${x}% ${y}%` }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_BANNER, displayOrder: banners.length });
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm({ ...EMPTY_BANNER, displayOrder: banners.length });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (banner: SiteBanner) => {
    setForm({ ...EMPTY_BANNER, ...banner });
    setEditingId(banner.id);
    setShowForm(true);
  };

  /** Import de l'image de bannière vers Cloudflare R2 (dossier public). */
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Veuillez choisir une image (PNG, JPG, WEBP ou SVG).");
      return;
    }
    setUploading(true);
    try {
      // `site-media` : dossier éditorial public réservé à l'administration.
      const result = await uploadFileToR2(file, "site-media", "banners", true);
      if (result.success && result.url) {
        setForm((prev) => ({ ...prev, imageUrl: result.url }));
        // Dimensions réelles de l'image importée (affichées à l'admin).
        const probe = new window.Image();
        probe.onload = () => setImageSize({ w: probe.naturalWidth, h: probe.naturalHeight });
        probe.src = result.url;
      } else {
        alert(result.error || "Importation impossible sur FORTIA HUB.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      alert("Le titre de la bannière est obligatoire.");
      return;
    }
    if (!form.imageUrl) {
      alert("Importez l'image de la bannière (Cloudflare R2).");
      return;
    }
    const intervalMs = Math.min(60000, Math.max(2000, Number(form.intervalMs) || 5000));
    if (editingId) {
      onUpdate({ ...form, intervalMs, id: editingId });
    } else {
      onAdd({ ...form, intervalMs, id: "" });
    }
    resetForm();
  };

  const animationLabel = (value?: BannerAnimation) =>
    ANIMATIONS.find((a) => a.value === value)?.label || "Fondu progressif";

  const inputClass =
    "w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]";
  const labelClass = "block text-xs font-bold text-slate-300 mb-1";

  return (
    <div className="space-y-6">
      {/* ================= EN-TÊTE DU MODULE ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#021231] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D69E25]/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center">
            <Images className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm flex items-center gap-2">
              <span>Bannières du Site</span>
              <span className="bg-[#D69E25]/20 text-[#D69E25] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/40">
                {banners.filter((b) => b.isActive !== false).length} active(s) / {banners.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Bandeau animé affiché en haut du site : image Cloudflare R2, animation, bouton
              (lien interne ou externe) et durée d&apos;affichage.
            </p>
          </div>
        </div>
        {!showForm ? (
          <button
            onClick={startCreate}
            className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Bannière</span>
          </button>
        ) : (
          <button
            onClick={resetForm}
            className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Annuler</span>
          </button>
        )}
      </div>

      {/* ================= FORMULAIRE ================= */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#011D46] rounded-2xl border border-slate-700 p-6 space-y-6">
          <h4 className="text-white font-black text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#D69E25]" />
            <span>{editingId ? "Modifier la Bannière" : "Créer une Nouvelle Bannière"}</span>
          </h4>

          {/* --- Image (Cloudflare R2) --- */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={labelClass}>Image de la bannière (Cloudflare R2) *</label>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#D69E25]/15 text-[#D69E25] border border-[#D69E25]/30">
                Web 1920 × 480 · Mobile 1080 × 470
              </span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center gap-2 ${
                uploading
                  ? "border-[#D69E25] bg-[#D69E25]/10"
                  : form.imageUrl
                    ? "border-[#D69E25]/60 bg-[#021231] hover:border-[#D69E25]"
                    : "border-slate-700 bg-[#021231] hover:border-[#D69E25]"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-[#D69E25] animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-[#D69E25]" />
              )}
              <p className="text-xs font-bold text-white">
                {uploading
                  ? "Importation en cours…"
                  : form.imageUrl
                    ? "Remplacer l'image de la bannière"
                    : "Importer l'image de la bannière"}
              </p>
              <p className="text-[10px] text-slate-400">
                Recommandé : <strong className="text-slate-300">1920 × 480 px</strong> (web, 4:1) —{" "}
                <strong className="text-slate-300">1080 × 470 px</strong> (mobile, 2.3:1)
                <br />
                PNG, JPG, WEBP ou SVG · max 50 Mo · une seule image, deux cadrages
              </p>
            </div>
            {form.imageUrl && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-400">
                    Dimensions :{" "}
                    <span className="font-mono text-slate-200">
                      {imageSize ? `${imageSize.w} × ${imageSize.h} px` : "—"}
                    </span>
                    {imageSize ? (
                      <span className="text-slate-500"> · ratio {(imageSize.w / imageSize.h).toFixed(2)}:1</span>
                    ) : null}
                  </span>
                  <span className="text-slate-400">
                    Recadrage :{" "}
                    <span className="font-mono text-slate-200">{form.imagePosition || "50% 50%"}</span>
                  </span>
                </div>

                {/* Source : clic pour choisir le point focal */}
                <div
                  onClick={handleFocusClick}
                  className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#021231] h-32 cursor-crosshair"
                  title="Cliquez sur la zone à conserver au centre du cadrage"
                >
                  <img src={form.imageUrl} alt="Source" className="w-full h-full object-contain" />
                  <span
                    className="absolute w-3 h-3 rounded-full border-2 border-[#D69E25] bg-[#D69E25]/50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: (form.imagePosition || "50% 50%").split(" ")[0] || "50%",
                      top: (form.imagePosition || "50% 50%").split(" ")[1] || "50%",
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm({ ...form, imageUrl: "" });
                      setImageSize(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#021231]/80 text-red-400 hover:bg-red-500 hover:text-white transition"
                    title="Retirer l'image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setForm({ ...form, imagePosition: preset.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition ${
                        (form.imagePosition || "50% 50%") === preset.value
                          ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                          : "bg-[#021231] text-slate-300 border-slate-700 hover:border-[#D69E25]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Aperçus réels : bandeau web (4:1) et bandeau mobile (2.3:1) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                      Aperçu web · 4:1
                    </p>
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-[4/1] bg-[#021231]">
                      <img
                        src={form.imageUrl}
                        alt="Aperçu web"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: form.imagePosition || "50% 50%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                      Aperçu mobile · 2.3:1
                    </p>
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-[2.3/1] bg-[#021231]">
                      <img
                        src={form.imageUrl}
                        alt="Aperçu mobile"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: form.imagePosition || "50% 50%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- Textes --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Titre de la bannière *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex : -50 % sur toutes les formations"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sous-titre (optionnel)</label>
              <input
                type="text"
                value={form.subtitle || ""}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Ex : Offre valable jusqu'au 31 décembre"
                className={inputClass}
              />
            </div>
          </div>

          {/* --- Animation --- */}
          <div className="space-y-3">
            <label className={labelClass}>Animation de la bannière</label>
            <div className="flex flex-wrap gap-2">
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim.value}
                  type="button"
                  onClick={() => setForm({ ...form, animation: anim.value })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    (form.animation || "fade") === anim.value
                      ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                      : "bg-[#021231] text-slate-300 border-slate-700 hover:border-[#D69E25]"
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* --- Durée d'intervalle --- */}
          <div className="space-y-3">
            <label className={labelClass}>Durée d&apos;affichage avant la bannière suivante</label>
            <div className="flex flex-wrap items-center gap-2">
              {INTERVAL_PRESETS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setForm({ ...form, intervalMs: seconds * 1000 })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    Math.round((form.intervalMs || 5000) / 1000) === seconds
                      ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                      : "bg-[#021231] text-slate-300 border-slate-700 hover:border-[#D69E25]"
                  }`}
                >
                  {seconds} s
                </button>
              ))}
              <input
                type="number"
                min={2}
                max={60}
                value={Math.round((form.intervalMs || 5000) / 1000)}
                onChange={(e) => setForm({ ...form, intervalMs: (Number(e.target.value) || 5) * 1000 })}
                className="w-24 bg-[#021231] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
              <span className="text-[11px] text-slate-400">secondes (2 à 60)</span>
            </div>
          </div>

          {/* --- Bouton & lien (interne ou externe) --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Libellé du bouton (optionnel)</label>
              <input
                type="text"
                value={form.buttonLabel || ""}
                onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
                placeholder="Ex : Découvrir les formations"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Link2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                Type de lien
              </label>
              <select
                value={form.linkTarget || "internal"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    linkTarget: e.target.value as SiteBanner["linkTarget"],
                    buttonLink: e.target.value === "internal" ? "/academy" : "https://",
                  })
                }
                className={inputClass}
              >
                <option value="internal">Lien interne (page du site)</option>
                <option value="external">Lien externe (site tiers)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {form.linkTarget === "external" ? (
                  <>
                    <ExternalLink className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                    URL externe
                  </>
                ) : (
                  "Page du site"
                )}
              </label>
              {form.linkTarget === "external" ? (
                <input
                  type="url"
                  value={form.buttonLink || ""}
                  onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                  placeholder="https://exemple.com/offre"
                  className={inputClass}
                />
              ) : (
                <select
                  value={form.buttonLink || "/academy"}
                  onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                  className={inputClass}
                >
                  {INTERNAL_LINKS.map((link) => (
                    <option key={link.value} value={link.value}>
                      {link.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* --- Ordre & activation --- */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className={labelClass}>Ordre d&apos;affichage</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder ?? 0}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                className="w-24 bg-[#021231] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
            </div>
            <label className="flex items-center gap-2 mt-5 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-[#D69E25]"
              />
              Bannière active sur le site
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? "Enregistrer les modifications" : "Publier la bannière"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= LISTE DES BANNIÈRES ================= */}
      <div className="space-y-3">
        {banners.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-400 font-semibold bg-[#011D46] rounded-2xl border border-slate-800">
            Aucune bannière pour le moment. Cliquez sur « Nouvelle Bannière » pour importer votre
            premier visuel sur Cloudflare R2.
          </p>
        )}

        {banners.map((banner) => {
          const isActive = banner.isActive !== false;
          return (
            <div
              key={banner.id}
              className="bg-[#011D46] rounded-2xl border border-slate-800 overflow-hidden flex flex-col sm:flex-row"
            >
              {/* Visuel */}
              <div className="sm:w-56 shrink-0 h-32 sm:h-auto bg-[#021231] relative">
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <Images className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#021231]/85 border border-[#D69E25]/40 text-[#D69E25]">
                  Ordre {banner.displayOrder ?? 0}
                </span>
              </div>

              {/* Détails */}
              <div className="flex-1 min-w-0 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-white font-black text-sm truncate">
                    {banner.title || "Sans titre"}
                  </h4>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-slate-500/15 border-slate-500/40 text-slate-400"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {banner.subtitle && (
                  <p className="text-[11px] text-slate-400 truncate">{banner.subtitle}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-[#D69E25]" />
                    {animationLabel(banner.animation)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3 text-[#D69E25]" />
                    {Math.round((banner.intervalMs || 5000) / 1000)} s d&apos;affichage
                  </span>
                  {banner.buttonLabel && banner.buttonLink && (
                    <span className="flex items-center gap-1">
                      {banner.linkTarget === "external" ? (
                        <ExternalLink className="w-3 h-3 text-[#D69E25]" />
                      ) : (
                        <Link2 className="w-3 h-3 text-[#D69E25]" />
                      )}
                      {banner.buttonLabel} → {banner.buttonLink}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => onToggleActive(banner.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-slate-500/15 border-slate-500/40 text-slate-400"
                    }`}
                  >
                    <Power className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    {isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => startEdit(banner)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#D69E25]/15 border border-[#D69E25]/40 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] transition text-[10px] font-black"
                  >
                    <Edit className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer définitivement la bannière « ${banner.title} » ?`))
                        onDelete(banner.id);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600/25 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white transition text-[10px] font-black"
                  >
                    <Trash2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
