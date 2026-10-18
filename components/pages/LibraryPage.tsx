"use client";

// ============================================================
// FORTIA HUB — MA BIBLIOTHÈQUE (route /library)
// ------------------------------------------------------------
// Tout ce que le membre POSSÈDE, en un seul endroit :
//   • les formations suivies (avec progression et reprise),
//   • les produits achetés (téléchargement sécurisé),
//   • les attestations obtenues (PDF officiel).
//
// Ces trois rubriques étaient auparavant des onglets de la page « Mon Compte » :
// elles y sont retirées pour éviter les doublons (la page Compte ne garde que
// le profil, les paramètres et les paiements).
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Download,
  Award,
  Library,
  PlayCircle,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Lock,
  FileCheck2,
  Receipt,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth, useCatalog, useMarketplace, useUi } from "@/lib/store/domains/contexts";
import { generatePDFCertificate, downloadProductDeliverable } from "@/utils/pdfGenerator";
import type { Certificate } from "@/lib/types";

type LibraryTab = "courses" | "products" | "certificates";

export function LibraryPage() {
  const router = useRouter();
  const { platformLoaded } = useAppStore();
  const { isUserLoggedIn, userProfile, sessionChecking } = useAuth();
  const { courses, ensureCoursesByIds } = useCatalog();
  const { marketplaceProducts, marketplaceOrders } = useMarketplace();
  const { setSelectedCourseForPlayer } = useUi();

  const [tab, setTab] = useState<LibraryTab>("courses");

  // Les formations suivies peuvent se trouver au-delà de la première page du
  // catalogue : on complète la liste par identifiant (même logique que Mon Compte).
  const enrolledIds = useMemo(
    () => (userProfile?.enrolledCourseIds || []).filter(Boolean),
    [userProfile?.enrolledCourseIds]
  );

  useEffect(() => {
    if (!isUserLoggedIn || enrolledIds.length === 0) return;
    ensureCoursesByIds(enrolledIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoggedIn, enrolledIds.length]);

  /* ---------- Données du membre ---------- */
  const purchasedIds = userProfile?.purchasedProductIds || [];
  const earnedCertificates: Certificate[] = userProfile?.earnedCertificates || [];
  const courseProgress = userProfile?.courseProgress || {};

  const myOrders = (marketplaceOrders || []).filter(
    (o) =>
      (userProfile?.id && o.buyerUserId === userProfile.id) ||
      (userProfile?.email &&
        (o.buyerEmail === userProfile.email ||
          o.buyerEmail?.toLowerCase() === (userProfile.email || "").toLowerCase()))
  );

  const mergedProductIds = Array.from(
    new Set([...purchasedIds, ...myOrders.map((o) => o.productId).filter(Boolean) as string[]])
  );

  const enrolledCourses = (courses || [])
    .filter((c) => c && enrolledIds.includes(c.id))
    .map((c) => ({
      ...c,
      title: c.title || "Formation",
      categoryLabel: c.categoryLabel || "Formation",
      image: c.image || "",
      instructor: c.instructor || { name: "FORTIA HUB", role: "Formateur", avatar: "" },
    }));

  const purchasedProducts = (marketplaceProducts || []).filter((p) =>
    mergedProductIds.includes(p.id)
  );

  const stats = [
    { id: "courses" as const, label: "Formations", icon: BookOpen, count: enrolledCourses.length },
    { id: "products" as const, label: "Produits", icon: ShoppingBag, count: purchasedProducts.length },
    { id: "certificates" as const, label: "Attestations", icon: Award, count: earnedCertificates.length },
  ];

  /* ---------- Chargement ---------- */
  if (!platformLoaded || sessionChecking) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement de votre bibliothèque...</p>
        </div>
      </div>
    );
  }

  /* ---------- Non connecté ---------- */
  if (!isUserLoggedIn) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#011D46] border border-[#D69E25]/40 space-y-5">
          <span className="w-16 h-16 mx-auto rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#D69E25]" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">Ma Bibliothèque</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-lg mx-auto">
              Connectez-vous pour retrouver vos formations suivies, vos produits achetés et vos
              attestations officielles.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 transition"
          >
            Se connecter
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30">
      {/* ================= EN-TÊTE ================= */}
      <section className="relative overflow-hidden border-b border-[#D69E25]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(214,158,37,0.14)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.07)_0%,transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center shrink-0">
                <Library className="w-6 h-6 text-[#D69E25]" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Ma Bibliothèque</h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                  Vos formations, vos produits achetés et vos attestations — au même endroit.
                </p>
              </div>
            </div>

            <Link
              href="/marketplace"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#D69E25]/40 text-[#D69E25] font-black text-xs hover:bg-[#D69E25]/10 transition"
            >
              Explorer la boutique
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Statistiques = sélecteur de rubrique */}
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl">
            {stats.map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`text-left rounded-2xl border p-3.5 transition ${
                    isActive
                      ? "bg-[#D69E25]/15 border-[#D69E25] ring-2 ring-[#D69E25]/40"
                      : "bg-[#011D46] border-slate-700/60 hover:border-[#D69E25]/50"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-[#D69E25]" : "text-slate-400"}`} />
                  <span className="block text-xl font-black text-white leading-none mt-2.5">
                    {item.count}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-400 mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CONTENU ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ---------- FORMATIONS SUIVIES ---------- */}
        {tab === "courses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                Formations suivies ({enrolledCourses.length})
              </h2>
              <Link
                href="/academy"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D69E25] hover:underline"
              >
                Catalogue
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="text-center rounded-3xl bg-[#011D46] border border-[#D69E25]/25 p-10 sm:p-14 space-y-4">
                <span className="w-14 h-14 mx-auto rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-[#D69E25]" />
                </span>
                <h3 className="text-lg font-black text-white">Aucune formation en cours</h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
                  Choisissez une formation certifiante dans l'Académie : elle apparaîtra ici avec votre
                  progression.
                </p>
                <Link
                  href="/academy"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 transition"
                >
                  Voir les formations
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {enrolledCourses.map((course) => {
                  const progress = courseProgress[course.id] || 0;
                  return (
                    <article
                      key={course.id}
                      className="rounded-2xl bg-[#011D46] border border-slate-700/60 hover:border-[#D69E25]/50 transition overflow-hidden flex flex-col"
                    >
                      <div className="relative h-36 bg-[#021231]">
                        {course.image ? (
                          <img
                            src={course.image}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-7 h-7 text-slate-600" />
                          </span>
                        )}
                        <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider text-[#021231] bg-[#D69E25] rounded-full px-2 py-0.5">
                          {course.categoryLabel}
                        </span>
                        {progress > 0 && (
                          <span className="absolute top-2 right-2 text-[9px] font-black text-white bg-[#021231]/80 border border-[#D69E25]/40 rounded-full px-2 py-0.5">
                            {progress}%
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col">
                        <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Formateur : {course.instructor?.name || "FORTIA HUB"}
                        </p>

                        <div className="space-y-1.5 mt-auto">
                          <div className="w-full h-2 rounded-full bg-[#021231] overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-[#D69E25] to-[#AB6F10]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>Progression</span>
                            <span className="text-[#D69E25]">{progress}%</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCourseForPlayer(course)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-[11px] hover:brightness-110 transition inline-flex items-center justify-center gap-1.5"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {progress > 0 ? "Reprendre" : "Commencer"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------- PRODUITS ACHETÉS ---------- */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                Produits achetés ({purchasedProducts.length})
              </h2>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D69E25] hover:underline"
              >
                Boutique
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {purchasedProducts.length === 0 ? (
              <div className="text-center rounded-3xl bg-[#011D46] border border-[#D69E25]/25 p-10 sm:p-14 space-y-4">
                <span className="w-14 h-14 mx-auto rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-[#D69E25]" />
                </span>
                <h3 className="text-lg font-black text-white">Aucun produit acheté</h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
                  Vos ebooks, templates et packs achetés apparaîtront ici, prêts à télécharger.
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 transition"
                >
                  Explorer la boutique
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {purchasedProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-2xl bg-[#011D46] border border-slate-700/60 hover:border-[#D69E25]/50 transition overflow-hidden flex flex-col"
                  >
                    <div className="relative h-36 bg-[#021231]">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-7 h-7 text-slate-600" />
                        </span>
                      )}
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider text-[#021231] bg-[#D69E25] rounded-full px-2 py-0.5 max-w-[75%] truncate">
                        {product.typeLabel}
                      </span>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                      <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {product.fileFormat || "Fichier numérique"}
                        {product.fileSize ? ` · ${product.fileSize}` : ""}
                      </p>

                      <div className="space-y-2 mt-auto">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/product/${encodeURIComponent(product.slug || product.id)}`)
                          }
                          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-[11px] hover:bg-emerald-500 transition inline-flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger mes fichiers
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadProductDeliverable(product.title, product.typeLabel)}
                          className="w-full py-2 rounded-xl border border-[#D69E25]/40 text-[#D69E25] font-bold text-[10px] hover:bg-[#D69E25]/10 transition inline-flex items-center justify-center gap-1.5"
                        >
                          <Receipt className="w-3 h-3" />
                          Reçu d'achat (PDF)
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- ATTESTATIONS ---------- */}
        {tab === "certificates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                Attestations obtenues ({earnedCertificates.length})
              </h2>
              <Link
                href="/verifier"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D69E25] hover:underline"
              >
                Vérifier une attestation
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {earnedCertificates.length === 0 ? (
              <div className="text-center rounded-3xl bg-[#011D46] border border-[#D69E25]/25 p-10 sm:p-14 space-y-4">
                <span className="w-14 h-14 mx-auto rounded-2xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
                  <Award className="w-7 h-7 text-[#D69E25]" />
                </span>
                <h3 className="text-lg font-black text-white">Aucune attestation pour le moment</h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
                  Terminez une formation certifiante : votre attestation officielle apparaîtra ici,
                  téléchargeable en PDF et vérifiable par QR code.
                </p>
                <Link
                  href="/academy"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 transition"
                >
                  Voir les formations certifiantes
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {earnedCertificates.map((cert) => (
                  <article
                    key={cert.id}
                    className="rounded-2xl bg-[#011D46] border border-[#D69E25]/40 p-5 space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      <span className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5 text-emerald-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2">
                          {cert.courseTitle}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-1">
                          {cert.studentName} · {cert.category}
                        </p>
                        <p className="text-[10px] font-mono text-[#D69E25] mt-1">{cert.id}</p>
                      </div>
                      {cert.qrCodeUrl && (
                        <span className="shrink-0 bg-white rounded-lg p-1">
                          <img
                            src={cert.qrCodeUrl}
                            alt={`QR de vérification ${cert.id}`}
                            className="w-14 h-14 object-contain"
                            loading="lazy"
                          />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-700/60 pt-3">
                      <span>Délivrée le {cert.issueDate}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <Award className="w-3 h-3" />
                        {cert.grade || "Validée"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => generatePDFCertificate(cert)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-[11px] hover:brightness-110 transition inline-flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger en PDF
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
