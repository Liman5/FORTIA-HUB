"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Lock,
  ShoppingCart,
  Star,
  Store,
  FileText,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth, useCommerce } from "@/lib/store/domains/contexts";
import { trackProductEvent } from "@/lib/services/track";
export interface ProductDetailData {
  id: string;
  slug: string;
  title: string;
  typeLabel: string;
  description: string;
  fullDescription: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  image: string;
  bannerImage: string;
  fileFormat: string;
  fileSize: string;
  features: string[];
  storeName: string;
  storeLogo: string;
  createdAt: string;
  files: { id: string; fileName: string; fileUrl: string; fileSize: string; mimeType: string }[];
}

const FCFA_RATE = 600;

/**
 * Fiche produit interactive.
 * • Ajout au panier via le domaine Panier (`useCommerce`)
 * • Téléchargement des livrables via URL SIGNÉE : le serveur vérifie que
 *   l'utilisateur a réellement acheté le produit (ou que celui-ci est gratuit).
 */
export function ProductDetail({ product }: { product: ProductDetailData }) {
  const router = useRouter();
  const { addToCart } = useCommerce();
  const { isUserLoggedIn, userProfile } = useAuth();

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string>("");

  // Statistique vendeur : une vue par produit et par session.
  useEffect(() => {
    trackProductEvent("view", product.id, (product as { storeId?: string }).storeId);
  }, [product.id, (product as { storeId?: string }).storeId]);

  const isFree = product.price === 0;
  const purchased = userProfile?.purchasedProductIds || [];
  const owned = isFree || purchased.includes(product.id) || purchased.includes(product.slug);

  const cartItem = {
    id: product.id,
    type: "product" as const,
    title: product.title,
    price: product.price,
    image: product.image,
    categoryLabel: product.typeLabel,
  };

  const handleBuyNow = () => {
    if (!isUserLoggedIn) {
      router.push("/login");
      return;
    }
    // Un seul chemin d'achat : ajout au panier puis étape paiement de la page /cart.
    addToCart(cartItem);
    router.push("/cart?payer=1");
  };

  /** Téléchargement sécurisé : le serveur délivre une URL signée temporaire. */
  const handleDownload = async (file: ProductDetailData["files"][number]) => {
    setDownloadError("");
    setDownloading(file.id);
    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: file.fileUrl }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.url) {
        setDownloadError(
          res.status === 401
            ? "Connectez-vous pour télécharger ce fichier."
            : res.status === 403
              ? "Vous devez acheter ce produit avant de le télécharger."
              : json?.error || "Téléchargement indisponible pour le moment."
        );
        return;
      }
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch {
      setDownloadError("Connexion impossible. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#021231] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#D69E25] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visuel */}
          <div className="space-y-3">
            <div className="rounded-3xl overflow-hidden border border-[#D69E25]/30 bg-[#011D46] aspect-video">
              {product.bannerImage || product.image ? (
                <img
                  src={product.bannerImage || product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  Aperçu non disponible
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="px-3 py-1.5 rounded-full bg-[#D69E25]/15 border border-[#D69E25]/40 text-[#D69E25]">
                {product.typeLabel}
              </span>
              {product.fileFormat && (
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-slate-300 inline-flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  {product.fileFormat}
                </span>
              )}
              {product.fileSize && (
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-slate-300">
                  {product.fileSize}
                </span>
              )}
            </div>
          </div>

          {/* Informations & achat */}
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black leading-tight">{product.title}</h1>
              {product.storeName && (
                <p className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#D69E25]" />
                  {product.storeName}
                </p>
              )}
              {/* Note affichée uniquement si des avis réels existent */}
              {product.reviewsCount > 0 && (
                <p className="text-xs text-slate-300 inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {product.rating.toFixed(1)} ({product.reviewsCount} avis)
                </p>
              )}
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-3xl font-black text-[#D69E25]">
                {isFree ? "Gratuit" : `${product.price} $`}
              </span>
              {!isFree && (
                <span className="text-xs text-slate-400 font-semibold">
                  ≈ {(product.price * FCFA_RATE).toLocaleString("fr-FR")} FCFA
                </span>
              )}
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-slate-500 line-through">
                  {product.originalPrice} $
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{product.description}</p>
            )}

            {product.features.length > 0 && (
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => addToCart(cartItem)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-[#D69E25]/40 text-slate-100 hover:bg-[#D69E25]/10 text-xs font-black transition"
              >
                <ShoppingCart className="w-4 h-4 text-[#D69E25]" />
                Ajouter au panier
              </button>
              {!isFree && (
                <button
                  onClick={handleBuyNow}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-xs font-black hover:brightness-110 transition"
                >
                  Acheter maintenant
                </button>
              )}
            </div>

            {/* Livrables protégés */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-xs font-black text-slate-200 inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D69E25]" />
                Fichiers livrables ({product.files.length})
              </p>

              {product.files.length === 0 && (
                <p className="text-[11px] text-slate-400">
                  Aucun fichier n'est encore attaché à ce produit.
                </p>
              )}

              {product.files.length > 0 && !owned && (
                <p className="text-[11px] text-slate-400 inline-flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Les fichiers sont débloqués après l'achat.
                </p>
              )}

              {product.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 text-[11px] bg-[#021231]/60 border border-white/10 rounded-xl px-3 py-2"
                >
                  <span className="truncate text-slate-300">{file.fileName}</span>
                  {owned ? (
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D69E25] text-[#021231] font-black disabled:opacity-50"
                    >
                      {downloading === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Télécharger
                    </button>
                  ) : (
                    <span className="text-slate-500 inline-flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Verrouillé
                    </span>
                  )}
                </div>
              ))}

              {downloadError && (
                <p className="text-[11px] text-amber-300 inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {downloadError}
                </p>
              )}
            </div>
          </div>
        </div>

        {product.fullDescription && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
            <h2 className="text-sm font-black text-white">Description complète</h2>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {product.fullDescription}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
