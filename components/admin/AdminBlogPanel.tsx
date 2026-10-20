"use client";

import React, { useState } from "react";
import { BlogPost } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { uploadFileToR2 } from "@/lib/services/clientUpload";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

/**
 * ADMIN → BLOG
 * ------------------------------------------------------------
 * Module éditorial indépendant : création / modification / suppression
 * d'articles, image facultative (Cloudflare R2), style de vignette
 * (image, couleur unie ou dégradé) et couleur d'accent.
 */

interface AdminBlogPanelProps {
  posts: BlogPost[];
  /** Applique la liste mise à jour au store (affichage immédiat). */
  onPostsChange: (next: BlogPost[]) => void;
  /** Recharge les données publiques (site + services + blog). */
  onRefresh?: () => void;
}

const EMPTY = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  authorName: "",
  date: "",
  readTime: "5 min",
  image: "",
  accentColor: "#D69E25",
  coverStyle: "image" as "image" | "color" | "gradient",
  tagsText: "",
  isPublished: true,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

const ACCENT_PRESETS = ["#D69E25", "#10B981", "#3B82F6", "#8B5CF6", "#F43F5E", "#0EA5E9"];

export function AdminBlogPanel({ posts = [], onPostsChange, onRefresh }: AdminBlogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setForm({ ...EMPTY, date: new Date().toISOString().split("T")[0] });
    setIsOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    const raw = post as unknown as Record<string, unknown>;
    setForm({
      id: post.id,
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category || "",
      authorName: post.author?.name || String(raw.authorName || ""),
      date: post.date || "",
      readTime: post.readTime || "5 min",
      image: post.image || "",
      accentColor: post.accentColor || "#D69E25",
      coverStyle: (post.coverStyle as "image" | "color" | "gradient") || "image",
      tagsText: (post.tags || []).join(", "),
      isPublished: raw.isPublished !== false,
    });
    setIsOpen(true);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFileToR2(file, "site-media", "blog", true);
      if (res.success && res.url) {
        setForm((prev) => ({ ...prev, image: res.url as string, coverStyle: "image" }));
      } else {
        alert(res.error || "Import de l'image impossible.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("Le titre de l'article est obligatoire.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      category: form.category,
      authorName: form.authorName || "Équipe FORTIA",
      date: form.date || new Date().toISOString().split("T")[0],
      readTime: form.readTime || "5 min",
      image: form.image,
      accentColor: form.accentColor,
      coverStyle: form.coverStyle,
      tags: form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isPublished: form.isPublished,
    };

    try {
      const res = form.id
        ? await apiWritePlatform("update-blog-post", { id: form.id, ...payload })
        : await apiWritePlatform("create-blog-post", payload);

      if (!res.success) {
        alert(res.error || "Enregistrement impossible.");
        return;
      }

      // Mise à jour immédiate de la liste affichée
      if (form.id) {
        onPostsChange(
          posts.map((p) =>
            p.id === form.id
              ? ({
                  ...p,
                  ...payload,
                  author: { name: payload.authorName, avatar: "", role: "" },
                } as unknown as BlogPost)
              : p
          )
        );
      } else if (res.id) {
        onPostsChange([
          {
            id: res.id,
            ...payload,
            author: { name: payload.authorName, avatar: "", role: "" },
          } as unknown as BlogPost,
          ...posts,
        ]);
      }

      setIsOpen(false);
      setForm({ ...EMPTY });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Supprimer l'article « ${post.title} » ?`)) return;
    const res = await apiWritePlatform("delete-blog-post", { id: post.id });
    if (res.success) {
      onPostsChange(posts.filter((p) => p.id !== post.id));
      onRefresh?.();
    } else {
      alert(res.error || "Suppression impossible.");
    }
  };

  return (
    <div className="space-y-4">
      {/* ===== En-tête du module ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#D69E25]" />
            Blog — publications
          </h2>
          <p className="text-[11px] text-slate-400">
            {posts.length} article{posts.length > 1 ? "s" : ""} — image facultative, couleur et style
            de vignette au choix.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-3.5 py-2 rounded-xl bg-[#D69E25] text-[#021231] text-xs font-black hover:bg-amber-400 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvel article
        </button>
      </div>

      {/* ===== Formulaire ===== */}
      {isOpen && (
        <div className="bg-[#011D46] border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">
              {form.id ? "Modifier l'article" : "Créer un article"}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Titre *</label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    title: e.target.value,
                    slug: p.id ? p.slug : slugify(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="Ex : Comment l'IA transforme le e-commerce africain"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Categorie</label>
              <input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="Intelligence Artificielle"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Auteur</label>
              <input
                value={form.authorName}
                onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="Equipe FORTIA"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Temps de lecture</label>
              <input
                value={form.readTime}
                onChange={(e) => setForm((p) => ({ ...p, readTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="5 min"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Chapeau / resume</label>
              <textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none resize-none"
                placeholder="Resume affiche sur la carte de l article"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Contenu (une ligne vide = nouveau paragraphe)</label>
              <textarea
                rows={8}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs leading-relaxed text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="Redigez votre article..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Etiquettes (separees par des virgules)</label>
              <input
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-[#021231] px-3 py-2.5 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                placeholder="ia, ecommerce, afrique"
              />
            </div>
          </div>
          {/* ===== Visuel + style de vignette ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-700 bg-[#021231] p-3">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-300">Image de couverture (facultative)</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2 rounded-lg bg-[#011D46] border border-slate-700 text-[10px] font-black text-slate-200 hover:border-[#D69E25] transition flex items-center gap-1.5 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {form.image ? "Remplacer" : "Importer"}
                </button>
                {form.image && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, image: "", coverStyle: "gradient" }))}
                    className="px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-[10px] font-black text-red-300 hover:bg-red-600 hover:text-white transition"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <div className="relative h-24 rounded-lg overflow-hidden border border-slate-700">
                {form.image ? (
                  <img src={form.image} alt="Couverture" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `linear-gradient(135deg, ${form.accentColor}38, ${form.accentColor}0d 70%)`, color: form.accentColor }}
                  >
                    Sans image — degrades avec la couleur
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-300">Style et couleur de la vignette</p>
              <div className="flex flex-wrap gap-1.5">
                {(["image", "gradient", "color"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, coverStyle: style }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition ${
                      form.coverStyle === style
                        ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                        : "bg-[#011D46] text-slate-300 border-slate-700 hover:border-[#D69E25]"
                    }`}
                  >
                    {style === "image" ? "Image" : style === "gradient" ? "Degrade" : "Couleur unie"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, accentColor: color }))}
                    className="h-7 w-7 rounded-full border-2 transition"
                    style={{ backgroundColor: color, borderColor: form.accentColor === color ? "#fff" : "transparent" }}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                  className="h-7 w-9 rounded border border-slate-700 bg-[#011D46]"
                  title="Couleur personnalisee"
                />
              </div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                  className="h-4 w-4 accent-[#D69E25]"
                />
                Publie (visible sur le site)
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-[#021231] border border-slate-700 text-slate-300 text-xs font-black hover:bg-[#032454] transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#D69E25] text-[#021231] text-xs font-black hover:bg-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {form.id ? "Enregistrer" : "Publier l''article"}
            </button>
          </div>
        </div>
      )}
      {/* ===== Liste des articles ===== */}
      <div className="space-y-2">
        {posts.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-6 text-center text-[11px] text-slate-400">
            Aucun article. Cliquez sur "Nouvel article" pour publier le premier.
          </div>
        )}

        {posts.map((post) => {
          const raw = post as unknown as Record<string, unknown>;
          const accent = post.accentColor || "#D69E25";
          const published = raw.isPublished !== false;
          return (
            <div
              key={post.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#011D46] p-3"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-700">
                {post.image ? (
                  <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs font-black"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {(post.title || "A").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">{post.title}</p>
                <p className="truncate text-[10px] text-slate-400">
                  {post.category || "Sans categorie"} - {post.date || "date libre"} - {post.readTime || "5 min"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${
                  published
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-600 bg-slate-700/40 text-slate-300"
                }`}
              >
                {published ? "Publie" : "Brouillon"}
              </span>

              <button
                onClick={() => openEdit(post)}
                className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:border-[#D69E25] hover:text-[#D69E25] transition"
                title="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(post)}
                className="p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-600 hover:text-white transition"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
