"use client";

import React from "react";
import { Clock, Lock, Trash2, XCircle } from "lucide-react";
import { getSignedUrl } from "@/lib/services/clientUpload";

export function KycDocumentViewer({
  url,
  label,
  locked = false,
  onDelete,
}: {
  url?: string;
  label: string;
  locked?: boolean;
  onDelete?: () => void;
}) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    if (locked) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    if (!url) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }
    // Ancienne valeur : URL publique déjà exploitable
    if (url.startsWith("http")) {
      setSignedUrl(url);
      setLoading(false);
      return;
    }

    // Clé R2 privée → URL signée (l'admin est autorisé par son jeton)
    setLoading(true);
    getSignedUrl(url).then((res) => {
      if (cancelled) return;
      if (res.success && res.url) {
        setSignedUrl(res.url);
      } else {
        setSignedUrl(null);
        setError(res.error || "Fichier inaccessible.");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url, locked]);

  const isPdf = /\.pdf(\?|$)/i.test(String(url || "")) || /\.pdf(\?|$)/i.test(String(signedUrl || ""));

  const deleteButton = onDelete ? (
    <button
      type="button"
      onClick={onDelete}
      title="Supprimer cette pièce (définitif)"
      className="ml-auto shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  ) : null;

  if (locked) {
    return (
      <div className="bg-[#011D46] p-3 rounded-xl border border-[#D69E25]/40">
        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">{label}</span>
        <div className="flex flex-col items-center justify-center gap-1.5 min-h-[110px] text-[10px] text-[#D69E25] text-center px-1">
          <Lock className="w-4 h-4" />
          <span className="font-bold">Contenu masqué</span>
          <span className="text-slate-400">Code à 6 chiffres requis pour l’afficher</span>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800 min-h-[120px] flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{label}</span>
          {deleteButton}
        </div>
        <p className="text-[10px] text-slate-500 italic my-auto text-center">non fourni</p>
      </div>
    );
  }

  return (
    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-slate-400 font-bold uppercase">{label}</span>
        {deleteButton}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[110px] text-[10px] text-slate-400">
          <Clock className="w-4 h-4 mr-1.5 animate-spin" /> Chargement du document…
        </div>
      ) : signedUrl ? (
        isPdf ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 min-h-[110px] rounded-lg border border-slate-700 bg-slate-900/40 text-[11px] font-bold text-[#D69E25] hover:border-[#D69E25]/60 transition"
          >
            <span className="text-lg">📄</span>
            Ouvrir le PDF
          </a>
        ) : (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block group">
            <img
              src={signedUrl}
              alt={label}
              className="w-full h-44 object-contain rounded-lg border border-slate-700 bg-slate-950/60 group-hover:opacity-80 transition"
            />
            <span className="mt-1.5 block text-[10px] font-bold text-[#D69E25] text-center">
              Cliquer pour agrandir ↗
            </span>
          </a>
        )
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 min-h-[110px] text-[10px] text-red-400 text-center px-1">
          <XCircle className="w-4 h-4" />
          <span>{error || "Fichier inaccessible"}</span>
        </div>
      )}
    </div>
  );
}

// Valeur potentiellement masquée : affiche •••••• tant que le dossier est verrouillé.
export function Masked({
  hidden,
  children,
  className = "text-sm font-bold text-white",
}: {
  hidden: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!hidden) return <span className={className}>{children}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500">
      <span className="tracking-[0.32em]">••••••</span>
      <Lock className="w-3 h-3 text-[#D69E25]" />
    </span>
  );
}
