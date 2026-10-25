"use client";

import React, { useRef, useState } from 'react';
import { Upload, FileText, Video, FileArchive, File, Trash2, Plus, Check, Link as LinkIcon, AlertCircle, FileSpreadsheet, HardDriveDownload, Loader2 } from 'lucide-react';
import { uploadFileToR2, deleteFileFromR2, storageUrlToKey, type ClientBucketName } from '../lib/services/clientUpload';
import { acceptForBucket, checkUploadFile, uploadHintForBucket } from '../lib/services/uploadLimits';

export interface DeliverableFile {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

interface ProductDeliverableUploaderProps {
  files: DeliverableFile[];
  downloadUrl?: string;
  fileFormat: string;
  onFilesChange: (files: DeliverableFile[]) => void;
  onDownloadUrlChange: (url: string) => void;
  /** ID de l'entité (produit) utilisé comme dossier dans R2 */
  entityId: string;
  /** Bucket R2 cible (défaut : product-files, privé) */
  bucket?: ClientBucketName;
}

export const ProductDeliverableUploader: React.FC<ProductDeliverableUploaderProps> = ({
  files = [],
  downloadUrl = '',
  fileFormat = 'PDF',
  onFilesChange,
  onDownloadUrlChange,
  entityId,
  bucket = 'product-files'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const formatFileBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string, type: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || type.includes('video')) {
      return <Video className="w-5 h-5 text-purple-400" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type.includes('compressed') || type.includes('zip')) {
      return <FileArchive className="w-5 h-5 text-[#D69E25]" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || type.includes('sheet') || type.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    return <File className="w-5 h-5 text-sky-400" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setErrors([]);
    setUploading(true);
    const uploadedFiles: DeliverableFile[] = [];
    const problems: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Contrôle local immédiat : format + limite de taille du dossier
      const check = checkUploadFile(file, bucket);
      if (!check.ok) {
        problems.push(check.error || `« ${file.name} » refusé.`);
        continue;
      }

      const result = await uploadFileToR2(file, bucket, entityId);
      if (result.success) {
        uploadedFiles.push({
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          size: formatFileBytes(file.size),
          type: file.type || file.name.split('.').pop() || 'document',
          dataUrl: result.url // URL R2 (publique) ou clé R2 (fichier privé)
        });
      } else {
        problems.push(result.error || `Erreur lors de l'importation de ${file.name}.`);
      }
    }

    if (uploadedFiles.length > 0) {
      onFilesChange([...files, ...uploadedFiles]);
    }
    if (problems.length > 0) {
      setErrors(problems);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find(f => f.id === id);
    // Le fichier a été déposé sur R2 (URL publique ou clé privée) : on le supprime.
    const key = fileToRemove?.dataUrl ? storageUrlToKey(fileToRemove.dataUrl) : '';
    if (key) {
      deleteFileFromR2(key).catch(() => {});
    }
    onFilesChange(files.filter(f => f.id !== id));
  };

  // Accepted file types hint based on fileFormat string
  const getAcceptedFormatsHint = () => {
    const fmt = fileFormat.toLowerCase();
    if (fmt.includes('pdf')) return 'PDF, documents (.pdf)';
    if (fmt.includes('vidéo') || fmt.includes('video') || fmt.includes('mp4')) return 'Vidéos (.mp4, .mov, .webm)';
    if (fmt.includes('canva') || fmt.includes('link') || fmt.includes('lien')) return 'Fichiers annexes ou Lien Canva/Notion';
    if (fmt.includes('zip')) return 'Archives (.zip, .rar, .7z)';
    return 'Tous types de fichiers numérisés (.pdf, .mp4, .zip, .docx, .xlsx)';
  };

  return (
    <div className="space-y-5 bg-[#021231]/90 p-5 rounded-2xl border border-slate-700/80 shadow-xl">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <HardDriveDownload className="w-4 h-4 text-[#D69E25]" />
            <h4 className="font-extrabold text-sm text-white">Fichiers Livrables Téléchargeables</h4>
            <span className="bg-[#D69E25]/20 text-[#D69E25] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/30">
              Étape 2 sur 2
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Les acheteurs recevront automatiquement ces fichiers immédiatement après leur paiement sécurisé.
          </p>
        </div>

        <span className="text-[10px] bg-slate-900 text-slate-300 font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-700">
          Format : {fileFormat || 'PDF / Multi-fichiers'}
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={acceptForBucket(bucket)}
        multiple
        className="hidden"
      />

      {/* Refus explicites (format ou taille) : jamais d'erreur 413 muette */}
      {errors.length > 0 && (
        <div className="space-y-1.5 bg-red-500/10 border border-red-500/40 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {errors.length} fichier{errors.length > 1 ? 's' : ''} refusé{errors.length > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => setErrors([])}
              className="text-red-300/70 hover:text-white text-xs font-bold"
              aria-label="Fermer les messages"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1">
            {errors.map((message, index) => (
              <li key={index} className="text-[11px] text-red-200/90 leading-snug">
                • {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInputRef.current!.files = e.dataTransfer.files;
            const event = { target: fileInputRef.current } as any;
            handleFileSelect(event);
          }
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
          uploading
            ? 'border-[#D69E25] bg-[#D69E25]/10'
            : isDragOver
            ? 'border-[#D69E25] bg-[#D69E25]/10 scale-[1.01]'
            : files.length > 0
            ? 'border-emerald-500/50 bg-[#011D46]/60 hover:border-emerald-400'
            : 'border-slate-700 hover:border-[#D69E25] bg-[#011D46]/80'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-[#D69E25]/15 flex items-center justify-center text-[#D69E25] shadow-inner">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-white group-hover:text-[#D69E25] transition">
            {uploading ? 'Importation en cours...' : files.length > 0 ? 'Ajouter d\'autres fichiers au produit' : 'Glissez-déposez vos fichiers livrables ici'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Format attendu : <span className="text-amber-300 font-semibold">{getAcceptedFormatsHint()}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Limites : <span className="text-amber-300 font-semibold">{uploadHintForBucket(bucket)}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Sélection multiple possible. Les fichiers sont déposés directement sur le stockage sécurisé (aucune limite de formulaire).
          </p>
        </div>

        <button
          type="button"
          className="mt-1 px-3 py-1.5 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-lg hover:bg-amber-400 transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{uploading ? 'Importation en cours...' : 'Parcourir mes fichiers'}</span>
        </button>
      </div>

      {/* Uploaded File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
            <span>Fichiers attachés ({files.length}) :</span>
            <span className="text-[10px] text-emerald-400 font-mono">Stockés sur FORTIA HUB</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-[#011D46] p-3 rounded-xl border border-slate-700/80 hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-slate-900 rounded-lg shrink-0">
                    {getFileIcon(file.name, file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{file.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono text-amber-300 font-semibold">{file.size}</span>
                      <span>•</span>
                      <span className="uppercase text-slate-400">{file.type.split('/')[1] || file.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    Attaché
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Supprimer ce fichier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Direct Link Option (e.g. Canva link, Google Drive, Notion) */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Lien Direct Externe (Google Drive, Canva, Notion, Dropbox)</span>
          </label>
          <span className="text-[10px] text-slate-400">(Optionnel si les fichiers sont volumineux)</span>
        </div>
        <input
          type="url"
          value={downloadUrl}
          onChange={(e) => onDownloadUrlChange(e.target.value)}
          placeholder="https://drive.google.com/file/d/... ou https://canva.com/design/..."
          className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-400"
        />
        <p className="text-[10px] text-slate-400">
          Ce lien sera fourni aux acheteurs en plus des fichiers téléchargeables.
        </p>
      </div>

    </div>
  );
};