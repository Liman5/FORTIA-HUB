"use client";

import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Check, Store as StoreIcon, Trash2, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';
import { uploadFileToR2, deleteFileFromR2, isR2Url } from '../lib/services/clientUpload';

interface StoreImageUploaderProps {
  /** URL actuelle du logo (si existant) */
  logo: string;
  /** URL actuelle de la bannière (si existante) */
  banner: string;
  /** Callback à appeler avec la nouvelle URL du logo */
  onLogoChange: (url: string) => void;
  /** Callback à appeler avec la nouvelle URL de la bannière */
  onBannerChange: (url: string) => void;
  /** ID de la boutique (utilisé pour le dossier R2) */
  storeId: string;
}

/**
 * Upload du logo et de la bannière d'une boutique VENDEUR.
 * Les fichiers sont importés depuis l'appareil puis stockés sur FORTIA HUB.
 * Le remplacement supprime automatiquement l'ancienne image.
 */
export const StoreImageUploader: React.FC<StoreImageUploaderProps> = ({
  logo,
  banner,
  onLogoChange,
  onBannerChange,
  storeId,
}) => {
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  const [showBannerPreview, setShowBannerPreview] = useState(false);

  // Extrait la "key" R2 depuis une URL publique comme
  // https://pub-xxx.r2.dev/store-images/{storeId}/logo.png
  const extractKeyFromUrl = (url: string): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // La partie après le domaine est le chemin du fichier
      const path = u.pathname.replace(/^\//, '');
      if (!path) return null;
      // La key complète dans R2 est le chemin complet
      return decodeURIComponent(path);
    } catch {
      return null;
    }
  };

  const handleDeleteImage = async (currentUrl: string, onChange: (url: string) => void, type: 'logo' | 'banner') => {
    if (!currentUrl) return;
    if (!confirm(`Supprimer ${type === 'logo' ? 'le logo' : 'la bannière'} actuel(le) ?`)) return;

    // Supprime le fichier R2 correspondant
    if (isR2Url(currentUrl)) {
      const key = extractKeyFromUrl(currentUrl);
      if (key) {
        const result = await deleteFileFromR2(key);
        if (!result.success) {
          console.warn(`[StoreImageUploader] Échec suppression R2 ${type}:`, result.error);
        }
      }
    }
    // Vide l'URL localement → la sauvegarde via updateStore écrira '' en base
    onChange('');
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner',
    currentUrl: string,
    onChange: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileToR2(file, 'store-images', storeId, true);
      if (result.success) {
        // Si une ancienne image R2 existe, on la supprime (remplacement propre)
        if (isR2Url(currentUrl)) {
          const oldKey = extractKeyFromUrl(currentUrl);
          if (oldKey) {
            deleteFileFromR2(oldKey).catch(() => {});
          }
        }
        onChange(result.url);
      } else {
        alert(result.error || 'Erreur lors de l\'importation sur FORTIA HUB.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l\'importation sur FORTIA HUB.');
    } finally {
      setUploading(false);
      if (type === 'logo' && logoFileRef.current) logoFileRef.current.value = '';
      if (type === 'banner' && bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 bg-white/[0.03] p-5 rounded-2xl border border-slate-700/80 shadow-xl">
      
      {/* SECTION LOGO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-[#D69E25]" />
              <h4 className="font-bold text-xs text-white">Logo de la Boutique</h4>
              <span className="bg-[#D69E25]/20 text-[#D69E25] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/40">
                PNG / JPG / WEBP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Importez depuis votre appareil. Le logo sera stocké et sauvegardé sur FORTIA HUB.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={logoFileRef}
          onChange={(e) => handleFileUpload(e, 'logo', logo, onLogoChange, setUploadingLogo)}
          accept="image/*"
          className="hidden"
        />

        {/* Upload Box */}
        <div
          onClick={() => !uploadingLogo && logoFileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group ${
            uploadingLogo
              ? 'border-[#D69E25] bg-[#D69E25]/10'
              : logo 
                ? 'border-emerald-500/50 bg-[#011D46]/40 hover:border-emerald-400' 
                : 'border-slate-700 hover:border-[#D69E25] bg-[#011D46]/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#D69E25]/10 flex items-center justify-center group-hover:bg-[#D69E25]/20 transition shadow-inner">
            {uploadingLogo ? (
              <Loader2 className="w-6 h-6 text-[#D69E25] animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-[#D69E25]" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-white group-hover:text-[#D69E25] transition">
              {uploadingLogo ? 'Importation en cours...' : logo ? 'Changer le Logo' : 'Importer le Logo de la Boutique'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Cliquez pour choisir un fichier depuis votre appareil • PNG, JPG, WEBP
            </p>
          </div>
        </div>

        {/* Logo Preview / Actions */}
        {logo ? (
          <div className="flex items-center gap-3 bg-[#011D46] p-3 rounded-xl border border-slate-700/80">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-600 bg-slate-900 relative shrink-0">
              <img src={logo} alt="Logo actuel" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-xs font-bold text-white truncate">Logo Actuel</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Stocké sur FORTIA HUB</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#D69E25]/15 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] rounded-lg text-[10px] font-bold transition"
              >
                <RefreshCcw className="w-3 h-3" />
                Remplacer
              </button>
              <button
                type="button"
                onClick={() => handleDeleteImage(logo, onLogoChange, 'logo')}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold transition"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.03] p-2.5 rounded-xl border border-slate-700/60">
            <AlertCircle className="w-4 h-4 text-[#D69E25] shrink-0" />
            <span>Aucun logo importé. Importez le logo de votre boutique depuis votre appareil.</span>
          </div>
        )}
      </div>

      {/* SECTION BANNIÈRE */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-xs text-white">Bannière de Couverture</h4>
              <span className="bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-500/40">
                16:9 (1200×400 px)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Importez depuis votre appareil. La bannière sera stockée et sauvegardée sur FORTIA HUB.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={bannerFileRef}
          onChange={(e) => handleFileUpload(e, 'banner', banner, onBannerChange, setUploadingBanner)}
          accept="image/*"
          className="hidden"
        />

        {/* Upload Box */}
        <div
          onClick={() => !uploadingBanner && bannerFileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group ${
            uploadingBanner
              ? 'border-sky-400 bg-sky-500/10'
              : banner 
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
              {uploadingBanner ? 'Importation en cours...' : banner ? 'Changer la Bannière' : 'Importer la Bannière de Couverture'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Format panoramique recommandé 16:9 (ex. 1200×400 px) • PNG, JPG, WEBP
            </p>
          </div>
        </div>

        {/* Banner Preview / Actions */}
        {banner ? (
          <div className="rounded-xl border border-slate-700/80 overflow-hidden relative h-24 bg-slate-900">
            <img src={banner} alt="Aperçu Bannière" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Bannière Importée</p>
                  <p className="text-[10px] text-sky-300 font-mono font-semibold">Stockée sur FORTIA HUB</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-slate-950 rounded-lg text-[10px] font-bold transition"
                >
                  <RefreshCcw className="w-3 h-3" />
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(banner, onBannerChange, 'banner')}
                  className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                  title="Supprimer la bannière"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.03] p-2.5 rounded-xl border border-slate-700/60">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Aucune bannière importée. Importez la bannière de couverture de votre boutique depuis votre appareil.</span>
          </div>
        )}
      </div>

    </div>
  );
};