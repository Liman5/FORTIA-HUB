"use client";

import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Check, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadFileToR2, type ClientBucketName } from '../lib/services/clientUpload';
import { acceptForBucket, uploadHintForBucket } from '../lib/services/uploadLimits';

interface ProductImageUploaderProps {
  coverImage: string;
  /** Galerie : images supplémentaires (couverture exclue). */
  images: string[];
  onCoverChange: (url: string) => void;
  onImagesChange: (images: string[]) => void;
  /** ID de l'entité (boutique, produit) utilisé comme dossier dans R2 */
  entityId: string;
  /** Bucket R2 cible (défaut : store-images, public) */
  bucket?: ClientBucketName;
  /** true si le bucket est public (défaut true pour store-images) */
  isPublic?: boolean;
  /** Nombre maximum d'images de galerie (défaut 6). */
  maxImages?: number;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  coverImage,
  images,
  onCoverChange,
  onImagesChange,
  entityId,
  bucket = 'store-images',
  isPublic = true,
  maxImages = 6
}) => {
  const coverFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
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

  /** Galerie : import de plusieurs visuels (un par un, ordre conservé). */
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = Math.max(0, maxImages - images.length);
    const selection = files.slice(0, remaining);
    if (selection.length === 0) {
      setError(`Vous pouvez ajouter jusqu'à ${maxImages} images de galerie.`);
      if (galleryFileRef.current) galleryFileRef.current.value = '';
      return;
    }

    setError(null);
    setUploadingGallery(true);
    const added: string[] = [];
    try {
      for (const file of selection) {
        const result = await uploadFileToR2(file, bucket, entityId, isPublic);
        if (result.success && result.url) added.push(result.url);
        else if (result.error) setError(result.error);
      }
      if (added.length > 0) onImagesChange([...images, ...added].slice(0, maxImages));
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'importation sur FORTIA HUB.");
    } finally {
      setUploadingGallery(false);
      if (galleryFileRef.current) galleryFileRef.current.value = '';
    }
  };

  const removeGalleryImage = (url: string) => {
    onImagesChange(images.filter((item) => item !== url));
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

      {/* SECTION 2 : GALERIE D'IMAGES (OPTIONNEL) */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-xs text-white">2. Galerie d&apos;images</h4>
              <span className="bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-500/40">
                {images.length}/{maxImages}
              </span>
              <span className="bg-slate-700/60 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Optionnel
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Ajoutez d&apos;autres visuels : ils apparaîtront sous l&apos;image principale de la fiche
              produit pour rassurer l&apos;acheteur.
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={galleryFileRef}
          onChange={handleGalleryUpload}
          accept={acceptForBucket(bucket)}
          multiple
          className="hidden"
        />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative overflow-hidden rounded-lg border border-slate-700 bg-black/40"
            >
              <img src={url} alt={`Visuel ${index + 1}`} className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(url)}
                className="absolute right-1 top-1 rounded bg-red-500/80 p-1 text-white transition hover:bg-red-500"
                title="Retirer cette image"
                aria-label={`Retirer l'image ${index + 1}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => !uploadingGallery && galleryFileRef.current?.click()}
              className={`flex h-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition ${
                uploadingGallery
                  ? "border-sky-400 bg-sky-500/10"
                  : "border-slate-700 bg-[#011D46]/70 hover:border-sky-400"
              }`}
            >
              {uploadingGallery ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              ) : (
                <Upload className="h-4 w-4 text-sky-400" />
              )}
              <span className="text-[9px] font-bold text-slate-300">
                {uploadingGallery ? "Import…" : "Ajouter"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};