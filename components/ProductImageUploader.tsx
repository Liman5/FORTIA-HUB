"use client";

import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Check, Ratio, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadFileToR2, type ClientBucketName } from '../lib/services/clientUpload';
import { acceptForBucket, uploadHintForBucket } from '../lib/services/uploadLimits';

interface ProductImageUploaderProps {
  coverImage: string;
  bannerImage: string;
  onCoverChange: (url: string) => void;
  onBannerChange: (url: string) => void;
  /** ID de l'entité (boutique, produit) utilisé comme dossier dans R2 */
  entityId: string;
  /** Bucket R2 cible (défaut : store-images, public) */
  bucket?: ClientBucketName;
  /** true si le bucket est public (défaut true pour store-images) */
  isPublic?: boolean;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  coverImage,
  bannerImage,
  onCoverChange,
  onBannerChange,
  entityId,
  bucket = 'store-images',
  isPublic = true
}) => {
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCover(true);
    try {
      const result = await uploadFileToR2(file, bucket, entityId, isPublic);
      if (result.success) {
        onCoverChange(result.url);
      } else {
        setError(result.error || "Erreur lors de l'importation sur FORTIA HUB.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'importation sur FORTIA HUB.");
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingBanner(true);
    try {
      const result = await uploadFileToR2(file, bucket, entityId, isPublic);
      if (result.success) {
        onBannerChange(result.url);
      } else {
        setError(result.error || "Erreur lors de l'importation sur FORTIA HUB.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'importation sur FORTIA HUB.");
    } finally {
      setUploadingBanner(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 bg-[#021231]/90 p-5 rounded-2xl border border-slate-700/80 shadow-xl">

      {/* Message d'erreur (format ou taille) : explicite, sans 413 opaque */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-xl text-[11px] font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-300/70 hover:text-white font-bold shrink-0"
            aria-label="Fermer le message"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: COVER IMAGE UPLOAD (COUVERTURE OBLIGATOIRE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#D69E25]" />
              <h4 className="font-bold text-xs text-white">1. Image de Couverture</h4>
              <span className="bg-[#D69E25]/20 text-[#D69E25] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/40">
                Format 4:3 (800×600 px)
              </span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Obligatoire
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Importez directement depuis votre appareil le visuel principal (PNG, JPG, WEBP).
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={coverFileRef}
          onChange={handleCoverFileUpload}
          accept={acceptForBucket(bucket)}
          className="hidden"
        />

        {/* Upload Box */}
        <div
          onClick={() => !uploadingCover && coverFileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 group ${
            uploadingCover
              ? 'border-[#D69E25] bg-[#D69E25]/10'
              : coverImage 
                ? 'border-emerald-500/50 bg-[#011D46]/40 hover:border-emerald-400' 
                : 'border-slate-700 hover:border-[#D69E25] bg-[#011D46]/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#D69E25]/10 flex items-center justify-center group-hover:bg-[#D69E25]/20 transition shadow-inner">
            {uploadingCover ? (
              <Loader2 className="w-6 h-6 text-[#D69E25] animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-[#D69E25]" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-white group-hover:text-[#D69E25] transition">
              {uploadingCover ? 'Importation en cours...' : coverImage ? 'Changer le fichier de couverture' : 'Importer le fichier de couverture'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Glissez-déposez ou cliquez pour choisir • {uploadHintForBucket(bucket)} • Dimensions recommandées 800×600 px
            </p>
          </div>
        </div>

        {/* Cover Preview Card */}
        {coverImage ? (
          <div className="flex items-center gap-3 bg-[#011D46] p-3 rounded-xl border border-slate-700/80 shadow-md">
            <div className="w-20 h-15 rounded-lg overflow-hidden border border-slate-600 bg-black/50 relative shrink-0 shadow-inner">
              <img src={coverImage} alt="Aperçu Couverture" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 right-0 bg-[#021231]/90 text-[9px] font-mono text-amber-400 px-1 font-bold">4:3</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-xs font-bold text-white truncate">Couverture Importée</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Stockée sur FORTIA HUB</p>
            </div>
            <button
              type="button"
              onClick={() => coverFileRef.current?.click()}
              className="text-[11px] text-[#D69E25] hover:underline font-semibold shrink-0"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Aucune image de couverture sélectionnée. Veuillez importer un fichier image.</span>
          </div>
        )}
      </div>

      {/* SECTION 2: BANNER HEADER IMAGE UPLOAD (BANNIÈRE OBLIGATOIRE) */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Ratio className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-xs text-white">2. Bannière d'En-tête Produit</h4>
              <span className="bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-500/40">
                Format 16:9 (1200×400 px)
              </span>
              <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Panoramique
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Importez la bannière d'arrière-plan pour l'en-tête de la fiche produit.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={bannerFileRef}
          onChange={handleBannerFileUpload}
          accept={acceptForBucket(bucket)}
          className="hidden"
        />

        {/* Upload Box */}
        <div
          onClick={() => !uploadingBanner && bannerFileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 group ${
            uploadingBanner
              ? 'border-sky-400 bg-sky-500/10'
              : bannerImage 
                ? 'border-sky-500/50 bg-[#011D46]/40 hover:border-sky-400' 
                : 'border-slate-700 hover:border-sky-400 bg-[#011D46]/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition shadow-inner">
            {uploadingBanner ? (
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-sky-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-white group-hover:text-sky-400 transition">
              {uploadingBanner ? 'Importation en cours...' : bannerImage ? 'Changer le fichier de bannière' : 'Importer la bannière panoramique'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Format panoramique 16:9 recommandé (ex. 1200×400 px) • {uploadHintForBucket(bucket)}
            </p>
          </div>
        </div>

        {/* Banner Preview Strip */}
        {bannerImage ? (
          <div className="rounded-xl border border-slate-700/80 overflow-hidden relative group h-24 bg-slate-900 shadow-md">
            <img src={bannerImage} alt="Aperçu Bannière" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Bannière Panoramique Importée</p>
                  <p className="text-[10px] text-sky-300 font-mono font-semibold">Stockée sur FORTIA HUB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  className="px-2.5 py-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-slate-950 rounded-lg text-xs font-semibold transition"
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={() => onBannerChange('')}
                  className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                  title="Supprimer la bannière"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-sky-400/90 bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Optionnel : Si aucune bannière n'est importée, l'image de couverture sera adaptée.</span>
          </div>
        )}
      </div>

    </div>
  );
};