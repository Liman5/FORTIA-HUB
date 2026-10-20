"use client";

import React, { useMemo, useState } from "react";
import { BlogPost } from "../types";
import { ArrowRight, Calendar, Clock, Search, User, X } from "lucide-react";

interface BlogSystemProps {
  posts: BlogPost[];
}

/** Vignette : image si disponible, sinon aplat/dégradé de la couleur d'accent. */
function Cover({ post, className = "" }: { post: BlogPost; className?: string }) {
  const accent = post.accentColor || "#D69E25";
  const style = post.coverStyle || (post.image ? "image" : "gradient");

  if (post.image && style === "image") {
    return (
      <img
        src={post.image}
        alt={post.title}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background:
          style === "color"
            ? `${accent}22`
            : `linear-gradient(135deg, ${accent}38, ${accent}0d 70%)`,
      }}
    >
      <span className="text-2xl font-black" style={{ color: accent }}>
        {(post.title || "F").slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

const authorNameOf = (post: BlogPost): string =>
  post.author?.name || (post as unknown as { authorName?: string }).authorName || "Équipe FORTIA";

export const BlogSystem: React.FC<BlogSystemProps> = ({ posts = [] }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [reading, setReading] = useState<BlogPost | null>(null);

  const published = useMemo(
    () => posts.filter((p) => (p as unknown as { isPublished?: boolean }).isPublished !== false),
    [posts]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    published.forEach((p) => p.category && set.add(p.category));
    return ["all", ...Array.from(set)];
  }, [published]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published.filter((post) => {
      const inCategory = category === "all" || post.category === category;
      if (!q) return inCategory;
      const haystack = [post.title, post.excerpt, ...(post.tags || []), post.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return inCategory && haystack.includes(q);
    });
  }, [published, query, category]);

  const [featured, ...rest] = filtered;

  return (
    <section className="bg-[#021231] text-white min-h-screen pb-20 fortia-flat">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* ===== En-tête éditorial ===== */}
        <header className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D69E25]">
            Le journal
          </p>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            Analyses & conseils FORTIA
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400">
            {published.length} article{published.length > 1 ? "s" : ""} publié
            {published.length > 1 ? "s" : ""} — IA, Web3, marketing et entrepreneuriat.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un article, un mot-clé…"
              className="w-full rounded-xl border border-slate-700 bg-[#011D46] py-2.5 pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-[#D69E25] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"
                aria-label="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black transition ${
                  category === cat
                    ? "border-[#D69E25] bg-[#D69E25] text-[#021231]"
                    : "border-slate-700 bg-[#011D46] text-slate-300 hover:border-[#D69E25]/60"
                }`}
              >
                {cat === "all" ? "Tous" : cat}
              </button>
            ))}
          </div>
        </header>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-8 text-center space-y-2">
            <p className="text-sm font-black">Aucun article pour le moment</p>
            <p className="text-[11px] text-slate-400">
              Les publications apparaîtront ici dès qu'elles seront publiées depuis l'administration.
            </p>
          </div>
        )}

        {/* ===== Article à la une ===== */}
        {featured && (
          <article
            onClick={() => setReading(featured)}
            className="group grid grid-cols-1 sm:grid-cols-2 overflow-hidden rounded-2xl border border-slate-700 bg-[#011D46] cursor-pointer hover:border-[#D69E25]/60 transition"
          >
            <div className="relative h-44 sm:h-full min-h-[11rem] overflow-hidden">
              <Cover post={featured} className="transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute left-2 top-2 rounded-full bg-[#D69E25] px-2 py-0.5 text-[9px] font-black text-[#021231]">
                À la une
              </span>
            </div>
            <div className="p-4 sm:p-5 space-y-2">
              {featured.category && (
                <span className="inline-block text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {featured.category}
                </span>
              )}
              <h2 className="text-base sm:text-xl font-black leading-snug group-hover:text-[#D69E25] transition-colors">
                {featured.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-3">
                {featured.excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" /> {authorNameOf(featured)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {featured.date || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {featured.readTime || "5 min"}
                </span>
              </div>
            </div>
          </article>
        )}

        {/* ===== Grille d'articles ===== */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {rest.map((post) => (
              <article
                key={post.id}
                onClick={() => setReading(post)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#011D46] cursor-pointer hover:border-[#D69E25]/60 transition"
              >
                <div className="relative h-36 overflow-hidden">
                  <Cover post={post} className="transition-transform duration-500 group-hover:scale-105" />
                  {post.category && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-black text-white">
                      {post.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3.5 space-y-1.5">
                  <h3 className="text-[13px] font-black leading-snug group-hover:text-[#D69E25] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{post.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between pt-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime || "5 min"}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#D69E25]">
                      Lire <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ===== Lecture d'un article ===== */}
      {reading && (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
          onClick={() => setReading(null)}
        >
          <article
            className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#D69E25]/30 bg-[#021231]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-44 sm:h-56 overflow-hidden">
              <Cover post={reading} />
              <button
                onClick={() => setReading(null)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#D69E25] text-[#021231] hover:bg-amber-400 transition"
                aria-label="Fermer l'article"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                {reading.category && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-bold">
                    {reading.category}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" /> {authorNameOf(reading)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {reading.date || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {reading.readTime || "5 min"}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black leading-tight">{reading.title}</h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-300">{reading.excerpt}</p>
              <div className="space-y-3 text-[12px] sm:text-sm leading-relaxed text-slate-300">
                {(reading.content || "")
                  .split(/\n{2,}/)
                  .filter((p) => p.trim())
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                {!reading.content && (
                  <p className="text-slate-500">
                    Le contenu complet de cet article n'est pas encore disponible.
                  </p>
                )}
              </div>
              {(reading.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(reading.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#D69E25]/30 bg-[#D69E25]/10 px-2 py-0.5 text-[10px] font-bold text-[#D69E25]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
};
