"use client";

// ============================================================
// FORTIA HUB — RECHERCHE GLOBALE (palette modale)
// ------------------------------------------------------------
// Ouverte par la barre de recherche de l'en-tête (ou Ctrl/⌘ + K).
// Elle filtre EN DIRECT, dans un seul endroit :
//   formations · produits de la boutique · boutiques · services
//   prestations de freelances · entreprises · articles · pages
// Navigation clavier : ↑ ↓ pour parcourir, Entrée pour ouvrir, Échap pour fermer.
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Search,
  X,
  ShoppingBag,
  Store,
  GraduationCap,
  Briefcase,
  Users,
  Building2,
  Newspaper,
  Compass,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { useUi, useAuth, useCatalog, useMarketplace } from "@/lib/store/domains/contexts";

/** Slug d'une boutique (même règle que la marketplace). */
function getStoreSlug(store: { slug?: string; name?: string }): string {
  const base = store.slug && store.slug.trim() ? store.slug : store.name || "boutique";
  return (
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "boutique"
  );
}

/** Une entrée affichable dans la palette. */
interface PaletteEntry {
  key: string;
  group: string;
  groupIcon: React.ElementType;
  groupColor: string;
  title: string;
  subtitle: string;
  image?: string;
  /** Action au clic / Entrée. */
  run: () => void;
}

interface SearchResultsModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

export function SearchResultsModal({ onClose, onNavigate }: SearchResultsModalProps) {
  const router = useRouter();
  const { searchQuery, setSearchQuery, setSelectedCourseForPlayer } = useUi();
  const { isAdmin } = useAuth();
  const { courses } = useCatalog();
  const {
    marketplaceProducts,
    stores,
    services,
    freelances,
    enterprises,
    blogPosts,
  } = useMarketplace();

  // La SAISIE se fait dans la barre de l'EN-TÊTE (état `searchQuery` du store) :
  // ce modal ne fait qu'afficher les résultats correspondants.
  const query = searchQuery || "";
  const [activeIndex, setActiveIndex] = useState(0);

  // Position du modal : il commence SOUS l'en-tête (#app-header) pour que la barre
  // de recherche de l'en-tête reste visible et garde le focus pendant la saisie.
  const [headerOffset, setHeaderOffset] = useState(64);

  useEffect(() => {
    const measure = () => {
      const header = document.getElementById("app-header");
      if (header) setHeaderOffset(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
    };
    measure();
    // Re-mesure après le rendu (barre mobile dépliée) et au redimensionnement.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [query]);

  // À l'ouverture, le curseur reste dans la barre de recherche de l'en-tête
  // (utile pour le raccourci Ctrl/⌘ + K) : on ne crée aucun champ dans le modal.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const desktop = document.getElementById("app-search-input") as HTMLInputElement | null;
      const mobile = document.getElementById("app-search-input-mobile") as HTMLInputElement | null;
      if (desktop && desktop.offsetParent !== null) desktop.focus();
      else if (mobile && mobile.offsetParent !== null) mobile.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (haystack: string) => haystack.toLowerCase().includes(q);

  const close = () => {
    onClose();
  };

  const go = (path: string) => {
    router.push(path);
    onNavigate();
  };

  /* ---------- Résultats par groupe ---------- */
  const courseResults = useMemo(
    () =>
      q
        ? (courses || [])
            .filter((c) =>
              matches(`${c.title} ${c.categoryLabel} ${c.description} ${c.instructor?.name || ""}`)
            )
            .slice(0, 5)
        : [],
    [courses, q]
  );

  const productResults = useMemo(
    () =>
      q
        ? (marketplaceProducts || [])
            .filter((p) => {
              if ((!p.isPublished || p.isApproved === false) && !isAdmin) return false;
              return matches(`${p.title} ${p.description} ${p.typeLabel} ${p.storeName}`);
            })
            .slice(0, 5)
        : [],
    [marketplaceProducts, q, isAdmin]
  );

  const storeResults = useMemo(
    () =>
      q
        ? (stores || [])
            .filter((s) => matches(`${s.name} ${s.ownerName || ""} ${s.description || ""}`))
            .slice(0, 3)
        : [],
    [stores, q]
  );

  const serviceResults = useMemo(
    () =>
      q
        ? (services || [])
            .filter((s) => matches(`${s.title} ${s.description} ${s.category || ""}`))
            .slice(0, 3)
        : [],
    [services, q]
  );

  const freelanceResults = useMemo(
    () =>
      q
        ? (freelances || [])
            .filter((f) => matches(`${f.name} ${f.title || ""} ${f.bio || ""} ${(f.skills || []).join(" ")}`))
            .slice(0, 3)
        : [],
    [freelances, q]
  );

  const enterpriseResults = useMemo(
    () =>
      q
        ? (enterprises || [])
            .filter((e) => matches(`${e.companyName} ${e.description || ""} ${e.sector || ""}`))
            .slice(0, 3)
        : [],
    [enterprises, q]
  );

  const blogResults = useMemo(
    () =>
      q
        ? (blogPosts || [])
            .filter((b) => matches(`${b.title} ${b.excerpt || ""} ${b.category || ""}`))
            .slice(0, 3)
        : [],
    [blogPosts, q]
  );

  const PAGE_SHORTCUTS = [
    { label: "Accueil", subtitle: "Formations, boutique et centres", path: "/" },
    { label: "Académie", subtitle: "Toutes les formations certifiantes", path: "/academy" },
    { label: "Marketplace", subtitle: "Boutique digitale et services", path: "/marketplace" },
    { label: "Services experts", subtitle: "Prestations de notre agence", path: "/services" },
    { label: "Ma Bibliothèque", subtitle: "Mes formations, achats et attestations", path: "/library" },
    { label: "Mon panier", subtitle: "Finaliser une commande", path: "/cart" },
    { label: "Blog", subtitle: "Conseils et actualités", path: "/blog" },
    { label: "Espace formateur", subtitle: "Publier et suivre mes formations", path: "/instructor" },
    { label: "Vérifier une attestation", subtitle: "Authenticité d'un certificat", path: "/verifier" },
  ];

  const pageResults = useMemo(
    () =>
      q
        ? PAGE_SHORTCUTS.filter((p) => matches(`${p.label} ${p.subtitle}`)).slice(0, 4)
        : PAGE_SHORTCUTS.slice(0, 6),
    [q]
  );

  /* ---------- Groupes affichés + liste à plat (navigation clavier) ---------- */
  const groups: { name: string; icon: React.ElementType; color: string; items: PaletteEntry[] }[] = [];

  if (courseResults.length > 0) {
    groups.push({
      name: `Formations (${courseResults.length})`,
      icon: GraduationCap,
      color: "text-sky-400",
      items: courseResults.map((course) => ({
        key: `course-${course.id}`,
        group: "Formations",
        groupIcon: GraduationCap,
        groupColor: "text-sky-400",
        title: course.title,
        subtitle: `${course.categoryLabel || "Formation"} · ${course.instructor?.name || "FORTIA HUB"}`,
        image: course.image,
        run: () => {
          setSelectedCourseForPlayer(course);
          onNavigate();
        },
      })),
    });
  }

  if (productResults.length > 0) {
    groups.push({
      name: `Produits de la boutique (${productResults.length})`,
      icon: ShoppingBag,
      color: "text-amber-400",
      items: productResults.map((product) => ({
        key: `product-${product.id}`,
        group: "Produits",
        groupIcon: ShoppingBag,
        groupColor: "text-amber-400",
        title: product.title,
        subtitle: `${product.typeLabel} · ${product.storeName}`,
        image: product.image,
        run: () => go(`/product/${encodeURIComponent(product.slug || product.id)}`),
      })),
    });
  }

  if (storeResults.length > 0) {
    groups.push({
      name: `Boutiques (${storeResults.length})`,
      icon: Store,
      color: "text-emerald-400",
      items: storeResults.map((store) => ({
        key: `store-${store.id}`,
        group: "Boutiques",
        groupIcon: Store,
        groupColor: "text-emerald-400",
        title: store.name,
        subtitle: `${store.ownerName || "Vendeur"} · ${store.salesCount || 0} ventes`,
        image: store.logo,
        run: () => go(`/vendorstore/${encodeURIComponent(getStoreSlug(store))}`),
      })),
    });
  }

  if (serviceResults.length > 0) {
    groups.push({
      name: `Services & prestations (${serviceResults.length})`,
      icon: Briefcase,
      color: "text-violet-400",
      items: serviceResults.map((service) => ({
        key: `service-${service.id}`,
        group: "Services",
        groupIcon: Briefcase,
        groupColor: "text-violet-400",
        title: service.title,
        subtitle: `${service.category || "Prestation"} · à partir de ${service.startingPrice || 0} $`,
        run: () => go("/services"),
      })),
    });
  }

  if (freelanceResults.length > 0) {
    groups.push({
      name: `Freelances (${freelanceResults.length})`,
      icon: Users,
      color: "text-cyan-400",
      items: freelanceResults.map((freelance) => ({
        key: `freelance-${freelance.id}`,
        group: "Freelances",
        groupIcon: Users,
        groupColor: "text-cyan-400",
        title: freelance.name,
        subtitle: freelance.title || (freelance.skills || []).slice(0, 3).join(" · ") || "Freelance",
        image: freelance.avatar,
        run: () => go("/marketplace?section=freelance"),
      })),
    });
  }

  if (enterpriseResults.length > 0) {
    groups.push({
      name: `Entreprises (${enterpriseResults.length})`,
      icon: Building2,
      color: "text-rose-400",
      items: enterpriseResults.map((enterprise) => ({
        key: `enterprise-${enterprise.id}`,
        group: "Entreprises",
        groupIcon: Building2,
        groupColor: "text-rose-400",
        title: enterprise.companyName,
        subtitle: enterprise.sector || "Entreprise",
        image: enterprise.logo,
        run: () => go("/marketplace?section=enterprise"),
      })),
    });
  }

  if (blogResults.length > 0) {
    groups.push({
      name: `Articles (${blogResults.length})`,
      icon: Newspaper,
      color: "text-slate-300",
      items: blogResults.map((post) => ({
        key: `blog-${post.id}`,
        group: "Articles",
        groupIcon: Newspaper,
        groupColor: "text-slate-300",
        title: post.title,
        subtitle: post.category || "Article",
        image: post.image,
        run: () => go("/blog"),
      })),
    });
  }

  if (pageResults.length > 0) {
    groups.push({
      name: q ? `Pages (${pageResults.length})` : "Raccourcis",
      icon: Compass,
      color: "text-slate-300",
      items: pageResults.map((page) => ({
        key: `page-${page.path}`,
        group: "Pages",
        groupIcon: Compass,
        groupColor: "text-slate-300",
        title: page.label,
        subtitle: page.subtitle,
        run: () => go(page.path),
      })),
    });
  }

  const entries = groups.flatMap((group) => group.items);
  const total = entries.length;
  const safeIndex = entries.length === 0 ? 0 : Math.min(activeIndex, entries.length - 1);
  const indexOfEntry = new Map(entries.map((entry, index) => [entry.key, index]));

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Navigation clavier : ↑ ↓ pour parcourir, Entrée pour ouvrir, Échap pour fermer
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (entries.length ? (current + 1) % entries.length : 0));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          entries.length ? (current - 1 + entries.length) % entries.length : 0
        );
        return;
      }
      if (event.key === "Enter") {
        const entry = entries[safeIndex];
        if (entry) {
          event.preventDefault();
          entry.run();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [entries, safeIndex]);

  // Rendu dans un PORTAL attaché à <body> : le modal est ainsi au-dessus de TOUT
  // (en-tête collant, barre du bas, assistant IA, bannières) et ne peut plus être
  // mélangé ou rogné par un conteneur de page.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center items-start overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4 bg-black/70 backdrop-blur-sm"
      style={{ top: headerOffset }}
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        onClick={(event) => event.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl mt-2 sm:mt-3 rounded-3xl bg-[#011D46] border border-[#D69E25]/40 shadow-2xl overflow-hidden"
        style={{ maxHeight: `calc(100dvh - ${headerOffset}px - 1.5rem)` }}
      >
        {/* ---------- En-tête : rappel de la recherche en cours (la saisie est dans l'en-tête) ---------- */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-5 h-5 text-[#D69E25] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {q ? `${total} résultat${total > 1 ? "s" : ""} pour` : "Recherche globale"}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {q ? `« ${query} »` : "Saisissez votre recherche dans la barre de l'en-tête"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-slate-500 hover:text-white transition shrink-0"
            title="Effacer la recherche"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={close}
            className="hidden sm:inline-flex text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 rounded-md px-2 py-1 hover:text-white transition shrink-0"
          >
            ÉCHAP
          </button>
        </div>

        {/* ---------- Résultats (seule zone défilable) ---------- */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {total === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <p className="text-sm font-black text-white">
                {q ? `Aucun résultat pour « ${query} »` : "Tapez pour rechercher"}
              </p>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                {q
                  ? "Essayez un autre mot-clé (ex. « crypto », « canva », « ebook ») ou utilisez les raccourcis."
                  : "Formations, produits, boutiques, services, freelances, entreprises, articles."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="p-2.5 sm:p-3">
                <div
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${group.color} px-2 mb-2`}
                >
                  <group.icon className="w-3.5 h-3.5" />
                  {group.name}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const index = indexOfEntry.get(item.key) ?? -1;
                    const isActive = index === safeIndex;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={item.run}
                        className={`w-full flex items-center gap-3 rounded-2xl p-2.5 text-left transition border ${
                          isActive
                            ? "bg-[#D69E25]/15 border-[#D69E25]/50"
                            : "bg-white/[0.02] border-transparent hover:bg-white/[0.05]"
                        }`}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <span className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <item.groupIcon className={`w-5 h-5 ${item.groupColor}`} />
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-white truncate">
                            {item.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </span>
                        </span>
                        <ArrowRight
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-[#D69E25]" : "text-slate-500"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ---------- Pied : aide clavier + tout voir (fixe en bas) ---------- */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#021231]/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              ouvrir
            </span>
            <span>↑ ↓ naviguer</span>
            <span>
              {total} résultat{total > 1 ? "s" : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery(query);
              go("/marketplace");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[10px] font-black hover:brightness-110 transition"
          >
            Voir tout dans la boutique
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
