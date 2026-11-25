"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  ZoomIn,
} from "lucide-react";
import { useAuth, useCommerce, useMarketplace } from "@/lib/store/domains/contexts";
import { useAppStore } from "@/lib/store/AppStore";
import { trackProductEvent } from "@/lib/services/track";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { requestSignedDownloadUrl } from "@/lib/services/paymentsClient";
import { IbxLightbox } from "@/components/ui/IbxLightbox";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ContentCard } from "@/components/discovery/ContentCard";
import { toProductItem, type ExplorerItem } from "@/lib/data/explorer";
import { slugifyCategory } from "@/lib/data/courseCategories";
import { formatFcfa, formatPricePair, resolveMoneyConfig } from "@/lib/data/currency";

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
  /** Galerie : images supplémentaires (affichées sous l'image principale). */
  images: string[];
  fileFormat: string;
  fileSize: string;
  features: string[];
  storeName: string;
  storeLogo: string;
  createdAt: string;
  files: { id: string; fileName: string; fileUrl: string; fileSize: string; mimeType: string }[];
}

/**
 * Fiche produit.
 *
 * • Galerie : image principale + miniatures + visualisation plein écran
 *   (lightbox accessible au clavier). Aucune image inventée : seules les
 *   images réellement renseignées sur le produit sont affichées.
 * • Achat : panier et paiement passent par les services existants.
 * • Téléchargement : URL SIGNÉE délivrée par le serveur après vérification
 *   réelle de l'achat (jamais de contenu payant exposé avant autorisation).
 * • Thème clair et sombre : uniquement des tokens IBX (aucune couleur dure).
 */
export function ProductDetail({ product }: { product: ProductDetailData }) {
  const router = useRouter();
  const { addToCart } = useCommerce();
  const { isUserLoggedIn, userProfile } = useAuth();
  const { siteContent, refreshPlatformData } = useAppStore();
  const { marketplaceProducts } = useMarketplace();

  /* Affichage : FCFA principal, équivalent USD facultatif (Admin). */
  const money = resolveMoneyConfig(siteContent);
  const pricePair = formatPricePair(Number(product.price) || 0, money);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string>("");

  const galleryImages = useMemo(
    () =>
      Array.from(
        new Set(
          [product.image, ...(product.images || []), product.bannerImage].filter(Boolean)
        )
      ) as string[],
    [product.image, product.images, product.bannerImage]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* ---- Notation : une note par membre, calcul serveur ---- */
  const [ratingValue, setRatingValue] = useState(Number(product.rating) || 0);
  const [reviewsCountValue, setReviewsCountValue] = useState(Number(product.reviewsCount) || 0);
  const [myRating, setMyRating] = useState(0);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMsg, setRatingMsg] = useState("");

  const submitRating = async (stars: number) => {
    if (ratingBusy) return;
    if (!isUserLoggedIn) {
      router.push("/login");
      return;
    }
    setRatingBusy(true);
    setRatingMsg("");
    setMyRating(stars);
    const res = await apiWritePlatform("rate-product", {
      productId: product.id,
      userId: userProfile?.id,
      rating: stars,
    });
    setRatingBusy(false);
    if (res.success) {
      if (typeof (res as { rating?: number }).rating === "number") {
        setRatingValue(Number((res as { rating?: number }).rating));
      }
      if (typeof (res as { reviewsCount?: number }).reviewsCount === "number") {
        setReviewsCountValue(Number((res as { reviewsCount?: number }).reviewsCount));
      }
      setRatingMsg(res.message || "Merci, votre note a été enregistrée.");
    } else {
      setMyRating(0);
      setRatingMsg(res.error || "Note non enregistrée. Réessayez.");
    }
  };

  /* Statistique vendeur : une vue par produit et par session. */
  useEffect(() => {
    trackProductEvent("view", product.id, (product as { storeId?: string }).storeId);
  }, [product.id, (product as { storeId?: string }).storeId]);

  const isFree = Number(product.price) === 0;
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
    addToCart(cartItem);
    router.push("/cart?payer=1");
  };

  /**
   * Produit gratuit : on enregistre le contenu dans la bibliothèque du membre
   * (droit serveur, idempotent) AVANT le téléchargement. Aucun panier.
   */
  const claimFreeProduct = async () => {
    if (!isFree || !isUserLoggedIn) return;
    try {
      const response = await fetch("/api/products/claim-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (response.ok) void refreshPlatformData?.();
    } catch {
      /* silencieux : le téléchargement reste possible */
    }
  };

  /** Téléchargement sécurisé : le serveur délivre une URL signée temporaire. */
  const handleDownload = async (file: ProductDetailData["files"][number]) => {
    setDownloadError("");
    setDownloading(file.id);
    try {
      await claimFreeProduct();
      const result = await requestSignedDownloadUrl(file.fileUrl);
      if (!result.ok || !result.url) {
        setDownloadError(
          result.status === 401
            ? "Connectez-vous pour télécharger ce fichier."
            : result.status === 403
              ? "Vous devez acheter ce produit avant de le télécharger."
              : result.error || "Téléchargement indisponible pour le moment."
        );
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      setDownloadError("Connexion impossible. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  const lightboxImages = galleryImages.map((src) => ({ src, alt: product.title }));

  /* Produits recommandés : même catégorie (typeLabel) d'abord, puis complément
     avec d'autres produits publiés pour ne jamais laisser la section vide. */
  const categorySlug = slugifyCategory(product.typeLabel);
  const recommendations = useMemo<ExplorerItem[]>(() => {
    const wanted = String(product.typeLabel || "").toLowerCase().trim();
    const others = (marketplaceProducts || []).filter(
      (item: any) => item && String(item.id) !== String(product.id) && item.isPublished !== false
    );
    const same = wanted
      ? others.filter((item: any) => String(item.typeLabel || "").toLowerCase().trim() === wanted)
      : [];
    const seen = new Set(same.map((item: any) => String(item.id)));
    const complement = others.filter((item: any) => !seen.has(String(item.id)));
    return [...same, ...complement].slice(0, 8).map(toProductItem);
  }, [marketplaceProducts, product.id, product.typeLabel]);

  return (
    <div className="ibx-page">
      <div className="ibx-container py-6 sm:py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="ibx-btn ibx-btn-ghost mb-5 !px-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
          {/* ---------------------------- GALERIE ---------------------------- */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => galleryImages.length > 0 && setLightboxIndex(activeIndex)}
              className="ibx-media ibx-media-contain block aspect-[4/3] w-full cursor-zoom-in rounded-[var(--ibx-radius-lg)] border border-[var(--ibx-border)]"
              aria-label={`Agrandir l'image de ${product.title}`}
              disabled={galleryImages.length === 0}
            >
              {galleryImages.length > 0 ? (
                <>
                  <img
                    src={galleryImages[activeIndex] || galleryImages[0]}
                    alt={product.title}
                    className="h-full w-full object-contain"
                  />
                  <span className="ibx-media-zoom" aria-hidden="true">
                    <ZoomIn className="h-4 w-4" />
                  </span>
                </>
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <span className="ibx-small">Aucun aperçu disponible</span>
                </span>
              )}
            </button>

            {galleryImages.length > 1 && (
              <div className="ibx-scroll-x" role="list" aria-label="Miniatures du produit">
                {galleryImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    role="listitem"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Afficher l'image ${index + 1} sur ${galleryImages.length}`}
                    aria-pressed={activeIndex === index}
                    className="ibx-media h-16 w-20 shrink-0 overflow-hidden rounded-[var(--ibx-radius-sm)] border"
                    style={{
                      borderColor:
                        activeIndex === index ? "var(--ibx-accent)" : "var(--ibx-border)",
                    }}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="ibx-badge ibx-badge-warning">{product.typeLabel}</span>
              {product.fileFormat && (
                <span className="ibx-badge">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {product.fileFormat}
                </span>
              )}
              {product.fileSize && <span className="ibx-badge">{product.fileSize}</span>}
              {Number(product.salesCount) > 0 && (
                <span className="ibx-badge">
                  {Number(product.salesCount).toLocaleString("fr-FR")} téléchargements
                </span>
              )}
            </div>
          </div>

          {/* ------------------------ INFORMATIONS ------------------------ */}
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="ibx-h1">{product.title}</h1>
              {product.storeName && (
                <p className="ibx-small inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" aria-hidden="true" />
                  {product.storeName}
                </p>
              )}
            </div>

            {/* Notation réelle : moyenne affichée seulement si des avis existent */}
            <div className="ibx-card-muted px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="ibx-small inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" style={{ color: "var(--ibx-accent)" }} />
                  {reviewsCountValue > 0 ? (
                    <span>
                      <b style={{ color: "var(--ibx-fg)" }}>{ratingValue.toFixed(1)}</b> / 5
                      <span> ({reviewsCountValue} avis)</span>
                    </span>
                  ) : (
                    <span>Aucun avis pour le moment</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5" aria-label="Noter ce produit">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (myRating || Math.round(ratingValue));
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => submitRating(star)}
                        disabled={ratingBusy}
                        title={`Donner ${star} étoile${star > 1 ? "s" : ""}`}
                        aria-label={`Donner ${star} étoile${star > 1 ? "s" : ""}`}
                        className="p-0.5 transition hover:scale-110 disabled:opacity-50"
                      >
                        <Star
                          className="h-4 w-4"
                          style={{
                            color: filled ? "var(--ibx-accent)" : "var(--ibx-fg-subtle)",
                            fill: filled ? "var(--ibx-accent)" : "transparent",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="ibx-tiny mt-1.5">
                {ratingMsg
                  ? ratingMsg
                  : isUserLoggedIn
                    ? "Touchez les étoiles pour noter ce produit."
                    : "Connectez-vous pour noter ce produit."}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {isFree ? (
                <span className="text-2xl font-extrabold" style={{ color: "var(--ibx-success)" }}>
                  Gratuit
                </span>
              ) : (
                <span className="ibx-price !text-2xl">{pricePair.primary}</span>
              )}
              {!isFree && pricePair.secondary && <span className="ibx-small">{pricePair.secondary}</span>}
              {!isFree && product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <span className="ibx-price-old">
                  {formatFcfa(Number(product.originalPrice), money.rate)}
                </span>
              )}
            </div>

            {product.description && <p className="ibx-body">{product.description}</p>}


            {(product.features || []).length > 0 && (
              <ul className="space-y-2">
                {(product.features || []).map((feature, index) => (
                  <li key={index} className="ibx-small flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                      style={{ color: "var(--ibx-success)" }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              {isFree ? (
                <>
                  {/* Produit gratuit : AUCUN panier, aucun achat.
                      Le fichier est téléchargeable immédiatement. */}
                  {product.files.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(product.files[0])}
                      disabled={downloading === product.files[0]?.id}
                      className="ibx-btn ibx-btn-primary"
                    >
                      {downloading === product.files[0]?.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      Télécharger gratuitement
                    </button>
                  ) : (
                    <span className="ibx-badge ibx-badge-success">
                      Produit gratuit — accès immédiat
                    </span>
                  )}
                  <FavoriteButton resourceType="product" resourceId={product.id} variant="inline" />
                </>
              ) : (
                <>
                  <button type="button" onClick={() => addToCart(cartItem)} className="ibx-btn ibx-btn-outline">
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Ajouter au panier
                  </button>
                  <button type="button" onClick={handleBuyNow} className="ibx-btn ibx-btn-primary">
                    Acheter maintenant
                  </button>
                  <FavoriteButton resourceType="product" resourceId={product.id} variant="inline" />
                </>
              )}
            </div>

            {/* Livrables : contenu payant jamais exposé avant autorisation */}
            <div className="ibx-card p-4">
              <p className="ibx-h3 inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" style={{ color: "var(--ibx-accent)" }} />
                Fichiers livrables ({product.files.length})
              </p>

              {product.files.length === 0 && (
                <p className="ibx-tiny mt-2">Aucun fichier n&apos;est encore attaché à ce produit.</p>
              )}

              {product.files.length > 0 && !owned && (
                <p className="ibx-tiny mt-2 inline-flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" style={{ color: "var(--ibx-warning)" }} />
                  Les fichiers sont débloqués après l&apos;achat.
                </p>
              )}

              <div className="mt-3 space-y-2">
                {product.files.map((file) => (
                  <div
                    key={file.id}
                    className="ibx-card-muted flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="ibx-small truncate">{file.fileName}</span>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        disabled={downloading === file.id}
                        className="ibx-btn ibx-btn-primary shrink-0 !px-3 !py-1.5"
                      >
                        {downloading === file.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Télécharger
                      </button>
                    ) : (
                      <span className="ibx-tiny inline-flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Verrouillé
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {downloadError && (
                <p className="ibx-error mt-3 inline-flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {downloadError}
                </p>
              )}
            </div>
          </div>
        </div>

        {product.fullDescription && (
          <section className="ibx-card mt-6 p-5 sm:p-6">
            <h2 className="ibx-h2">Description complète</h2>
            <p className="ibx-body mt-3 whitespace-pre-line">{product.fullDescription}</p>
          </section>
        )}

        {/* Recommandé pour vous : produits de la même catégorie */}
        {recommendations.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <h2 className="ibx-h2">Recommandé pour vous</h2>
                <p className="ibx-small mt-0.5">
                  D&apos;autres produits numériques de la catégorie {product.typeLabel}.
                </p>
              </div>
              <Link
                href={`/marketplace?categorie=${encodeURIComponent(categorySlug || product.typeLabel)}`}
                prefetch
                className="ibx-btn ibx-btn-ghost !px-2 !py-1 !text-[10px]"
              >
                Voir la catégorie
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {recommendations.map((item) => (
                <ContentCard key={item.key} item={item} money={money} />
              ))}
            </div>
          </section>
        )}
      </div>

      <IbxLightbox
        images={lightboxImages}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(next) => {
          setLightboxIndex(next);
          setActiveIndex(next);
        }}
        label={`Aperçu de ${product.title}`}
      />
    </div>
  );
}

