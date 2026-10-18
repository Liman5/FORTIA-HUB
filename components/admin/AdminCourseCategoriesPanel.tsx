"use client";

import React, { useMemo, useState } from "react";
import { CourseCategoryRecord } from "@/lib/types";
import { getCourseCategoryInfo } from "@/lib/data/courseCategories";
import { FolderTree, Plus, Save, Power, Layers, Trash2 } from "lucide-react";

interface AdminCourseCategoriesPanelProps {
  categories: CourseCategoryRecord[];
  /** Formations réelles (pour afficher le nombre de formations par catégorie). */
  courses: { id: string; category?: unknown; categoryId?: string }[];
  /** Crée une catégorie dans la table `course_categories`. */
  onAdd: (payload: { label: string; code?: string; description?: string }) => void;
  /** Met à jour une catégorie existante (libellé, ordre, activation). */
  onUpdate: (category: CourseCategoryRecord) => void;
  /** Supprime une catégorie (refusé si des formations y sont rattachées). */
  onDelete: (id: string) => Promise<boolean>;
}

/**
 * Gestion des catégories de formations (page Académie).
 * Toute création/modification est persistée dans la table `course_categories`.
 */
export function AdminCourseCategoriesPanel({
  categories = [],
  courses = [],
  onAdd,
  onUpdate,
  onDelete,
}: AdminCourseCategoriesPanelProps) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { label: string; displayOrder: number }>>({});

  const countsByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    (courses || []).forEach((course) => {
      const info = getCourseCategoryInfo(course);
      if (!info.id) return;
      map.set(info.id, (map.get(info.id) || 0) + 1);
    });
    return map;
  }, [courses]);

  const handleCreate = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), code: code.trim() || undefined, description: description.trim() });
    setLabel("");
    setCode("");
    setDescription("");
  };

  const updateDraft = (
    category: CourseCategoryRecord,
    patch: Partial<{ label: string; displayOrder: number }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [category.id]: {
        label: patch.label ?? prev[category.id]?.label ?? category.label,
        displayOrder:
          patch.displayOrder ?? prev[category.id]?.displayOrder ?? category.displayOrder ?? 0,
      },
    }));
  };

  const saveDraft = (category: CourseCategoryRecord) => {
    const draft = drafts[category.id];
    if (!draft) return;
    onUpdate({
      ...category,
      label: draft.label,
      displayOrder: Number(draft.displayOrder) || 0,
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[category.id];
      return next;
    });
  };

  return (
    <section className="mb-6 bg-[#011D46] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
            <FolderTree className="w-5 h-5 text-[#D69E25]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Catégories de formations</h3>
            <p className="text-[11px] text-slate-400">
              {categories.length} catégorie{categories.length > 1 ? "s" : ""} en base — elles
              alimentent les filtres de la page Académie.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          <Layers className="w-3 h-3" />
          Enregistré en base
        </span>
      </div>

      {/* Création (persistée en base) */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom de la catégorie (ex: Webinaires)"
            className="sm:col-span-3 w-full bg-[#021231] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]/60"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (optionnel)"
            className="sm:col-span-2 w-full bg-[#021231] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]/60"
          />
          <button
            onClick={handleCreate}
            disabled={!label.trim()}
            className="sm:col-span-1 w-full px-4 py-2.5 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer
          </button>
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
          className="w-full bg-[#021231] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D69E25]/60"
        />
      </div>

      {/* Liste des catégories */}
      <div className="divide-y divide-slate-800">
        {categories.length === 0 && (
          <p className="p-6 text-center text-xs text-slate-400 font-semibold">
            Aucune catégorie enregistrée en base pour le moment.
          </p>
        )}

        {categories.map((category) => {
          const draft = drafts[category.id];
          const labelValue = draft?.label ?? category.label;
          const orderValue = draft?.displayOrder ?? category.displayOrder ?? 0;
          const isActive = category.isActive ?? true;
          const courseCount = countsByCategoryId.get(category.id) || 0;

          return (
            <div
              key={category.id}
              className="p-4 flex flex-wrap items-center gap-3 hover:bg-[#021231]/40 transition"
            >
              <span className="px-2 py-1 rounded-lg bg-[#021231] border border-slate-700 text-[10px] font-mono text-[#D69E25] shrink-0">
                {category.code}
              </span>
              <input
                value={labelValue}
                onChange={(e) => updateDraft(category, { label: e.target.value })}
                className="flex-1 min-w-[160px] bg-[#021231] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D69E25]/60"
              />
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                Ordre
                <input
                  type="number"
                  value={orderValue}
                  onChange={(e) => updateDraft(category, { displayOrder: Number(e.target.value) })}
                  className="w-16 bg-[#021231] border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#D69E25]/60"
                />
              </label>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                {courseCount} formation{courseCount > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => onUpdate({ ...category, isActive: !isActive })}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition shrink-0 ${
                  isActive
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-slate-500/15 border-slate-500/40 text-slate-400"
                }`}
                title={isActive ? "Désactiver la catégorie" : "Activer la catégorie"}
              >
                <Power className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                {isActive ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => saveDraft(category)}
                disabled={!draft}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition text-[10px] font-black disabled:opacity-30 shrink-0"
                title="Enregistrer les modifications en base"
              >
                <Save className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                Enregistrer
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`Supprimer définitivement la catégorie « ${category.label} » ?`))
                    return;
                  await onDelete(category.id);
                }}
                disabled={courseCount > 0}
                className="px-2.5 py-1.5 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white transition text-[10px] font-black disabled:opacity-30 shrink-0"
                title={
                  courseCount > 0
                    ? "Suppression impossible : des formations utilisent cette catégorie"
                    : "Supprimer la catégorie"
                }
              >
                <Trash2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                Supprimer
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
