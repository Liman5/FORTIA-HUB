"use client";

import React, { useState } from "react";
import { FileCheck, CheckCircle2, Lock, XCircle, Clock, ShieldCheck, Eye, EyeOff, ArrowLeft, X, Unlock, KeyRound, Trash2 } from "lucide-react";
import type { KycSubmission } from "@/lib/types";
import { KycDocumentViewer, Masked } from "./KycViewer";

export function AdminKycTab({
  kycSubmissions,
  onApproveKyc,
}: {
  kycSubmissions: KycSubmission[];
  onApproveKyc: (id: string) => void;
}) {
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);

  // ---- Verrouillage des dossiers KYC (masquage + code à 6 chiffres) ----
  // Chaque dossier a SON code : il est défini ici, au premier masquage.
  const [kycUnlockTokens, setKycUnlockTokens] = useState<Record<string, string>>({});
  const [kycDialog, setKycDialog] = useState<'mask' | 'unlock' | 'delete' | null>(null);
  const [kycMaskFields, setKycMaskFields] = useState<string[]>([]);
  const [kycNewCode, setKycNewCode] = useState('');
  const [kycCurrentCode, setKycCurrentCode] = useState('');
  const [kycCodeEntry, setKycCodeEntry] = useState('');
  const [kycLockBusy, setKycLockBusy] = useState(false);
  const [kycLockError, setKycLockError] = useState<string | null>(null);
  const [kycNotice, setKycNotice] = useState<string | null>(null);
  const [kycDocSlot, setKycDocSlot] = useState<{ slot: string; label: string } | null>(null);

  const kycAdminToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('fortia_admin_token') || '' : '';

  const kycWrite = async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/platform/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kycAdminToken()}`,
      },
      body: JSON.stringify({ action, data: payload }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || 'Opération refusée par le serveur.');
    }
    return json;
  };

  // Le dossier est-il masqué pour la session en cours ?
  const kycLocked = (sub: KycSubmission | null): boolean => {
    if (!sub) return false;
    const groups = String(sub.hiddenFields || '');
    if (!groups) return false;
    return !kycUnlockTokens[sub.id];
  };
  const kycGroupHidden = (sub: KycSubmission | null, group: string): boolean =>
    kycLocked(sub) && String(sub?.hiddenFields || '').split(',').includes(group);

  // Enregistrer le masquage (définit le code à 6 chiffres la première fois)
  const submitKycMask = async () => {
    if (!selectedKyc) return;
    setKycLockBusy(true);
    setKycLockError(null);
    try {
      const alreadyLocked = !!selectedKyc.isLocked;
      if (!alreadyLocked && kycMaskFields.length > 0) {
        if (!/^\d{6}$/.test(kycNewCode)) {
          throw new Error('Choisissez un code secret de 6 chiffres.');
        }
        if (/^(\d)\1{5}$/.test(kycNewCode)) {
          throw new Error('Code trop simple : évitez 6 chiffres identiques.');
        }
      }
      const json = await kycWrite('kyc-set-lock', {
        kycId: selectedKyc.id,
        fields: kycMaskFields,
        code: alreadyLocked ? undefined : kycNewCode,
        currentCode: alreadyLocked ? kycCurrentCode : undefined,
      });
      setSelectedKyc((prev) =>
        prev
          ? {
              ...prev,
              hiddenFields: json.hiddenFields || '',
              isLocked: (json.hiddenFields || '') ? true : false,
            }
          : prev
      );
      // Le masquage reprend effet immédiatement : le jeton de session est invalidé
      setKycUnlockTokens((prev) => {
        const next = { ...prev };
        delete next[selectedKyc.id];
        return next;
      });
      setKycNotice(json.message || 'Masquage enregistré.');
      setKycDialog(null);
      setKycNewCode('');
      setKycCurrentCode('');
    } catch (error: any) {
      setKycLockError(error?.message || 'Échec du masquage.');
    } finally {
      setKycLockBusy(false);
    }
  };

  // Déverrouillage temporaire (15 min) avec le code du dossier
  const submitKycUnlock = async () => {
    if (!selectedKyc) return;
    setKycLockBusy(true);
    setKycLockError(null);
    try {
      const json = await kycWrite('kyc-unlock', { kycId: selectedKyc.id, code: kycCodeEntry });
      setKycUnlockTokens((prev) => ({ ...prev, [selectedKyc.id]: json.token }));
      setKycNotice(json.message || 'Dossier déverrouillé.');
      setKycDialog(null);
      setKycCodeEntry('');
    } catch (error: any) {
      setKycLockError(error?.message || 'Code incorrect.');
    } finally {
      setKycLockBusy(false);
    }
  };

  // Suppression définitive d'une pièce (fichier R2 + référence en base)
  const submitKycDeleteDoc = async () => {
    if (!selectedKyc || !kycDocSlot) return;
    setKycLockBusy(true);
    setKycLockError(null);
    try {
      const json = await kycWrite('kyc-remove-doc', {
        kycId: selectedKyc.id,
        slot: kycDocSlot.slot,
        code: kycCodeEntry || undefined,
      });
      setSelectedKyc((prev) =>
        prev ? ({ ...prev, [kycDocSlot.slot]: '', deletedDocs: json.deletedDocs || prev.deletedDocs } as any) : prev
      );
      setKycNotice(json.message || 'Pièce supprimée.');
      setKycDialog(null);
      setKycDocSlot(null);
      setKycCodeEntry('');
    } catch (error: any) {
      setKycLockError(error?.message || 'Suppression refusée.');
    } finally {
      setKycLockBusy(false);
    }
  };


  return (
    <>
          {!selectedKyc && (
            <div className="divide-y divide-slate-800">
              {kycSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Aucune demande KYC en attente.</div>
              ) : (
                kycSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{sub.applicantName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                          sub.applicantType === 'freelance' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {sub.applicantType === 'freelance' ? 'Freelance (Badge Vert)' : 'Entreprise (Badge Doré)'}
                        </span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                          {sub.status}
                        </span>
                        {String(sub.hiddenFields || '') !== '' && (
                          <span className="text-[10px] bg-[#D69E25]/20 text-[#D69E25] px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Verrouillé
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {String(sub.hiddenFields || '') !== ''
                          ? '•••••• • N° de pièce : ••••••'
                          : `${sub.email} • ${sub.documentType} N° : ${sub.documentNumber}`}
                      </p>
                      <p className="text-[10px] text-slate-500">Soumis le : {sub.submittedAt}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedKyc(sub)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Examiner le dossier</span>
                      </button>
                      {String(sub.status) !== 'Approuvé' && String(sub.status) !== 'Approuve' && (
                        <button
                          onClick={() => onApproveKyc(sub.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valider</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedKyc && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span>Examen du Dossier KYC</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Vérifiez scrupuleusement les informations et documents avant d'approuver le badge.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedKyc(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour à la liste</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase ${
                  selectedKyc.applicantType === 'freelance' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {selectedKyc.applicantType === 'freelance' ? '🚀 Freelance — Badge Vert' : '🏢 Entreprise — Badge Doré'}
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase ${
                  (String(selectedKyc.status) === 'Approuvé' || String(selectedKyc.status) === 'Approuve') ? 'bg-emerald-500/20 text-emerald-400' :
                  (String(selectedKyc.status) === 'Rejeté' || String(selectedKyc.status) === 'Rejete') ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {selectedKyc.status}
                </span>
              </div>

              {/* ---- Sécurité : masquage verrouillé par un code à 6 chiffres ---- */}
              {kycNotice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{kycNotice}</span>
                  <button onClick={() => setKycNotice(null)} className="text-emerald-300/70 hover:text-emerald-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {String(selectedKyc.hiddenFields || '') !== '' && (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    kycLocked(selectedKyc)
                      ? 'border-[#D69E25]/45 bg-[#D69E25]/10'
                      : 'border-emerald-500/40 bg-emerald-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold flex-1">
                    {kycLocked(selectedKyc) ? (
                      <>
                        <Lock className="w-4 h-4 text-[#D69E25] shrink-0" />
                        <span className="text-[#E8C77A]">
                          Informations masquées — un code à 6 chiffres (propre à ce dossier) est requis pour les afficher.
                        </span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span className="text-emerald-300">
                          Dossier déverrouillé pour cette session (15 minutes). Il reste masqué pour les autres administrateurs.
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {kycLocked(selectedKyc) ? (
                      <button
                        onClick={() => {
                          setKycLockError(null);
                          setKycCodeEntry('');
                          setKycDialog('unlock');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#D69E25] text-[#021231] font-black text-[11px] hover:bg-[#E8B44A] flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Déverrouiller
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setKycUnlockTokens((prev) => {
                            const next = { ...prev };
                            delete next[selectedKyc.id];
                            return next;
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-[11px] hover:bg-slate-700 flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Masquer à nouveau
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setKycLockError(null);
                        setKycMaskFields(String(selectedKyc.hiddenFields || '').split(',').filter(Boolean));
                        setKycNewCode('');
                        setKycCurrentCode('');
                        setKycDialog('mask');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 font-bold text-[11px] hover:border-[#D69E25]/60 hover:text-[#D69E25]"
                    >
                      Modifier le masquage
                    </button>
                  </div>
                </div>
              )}

              {String(selectedKyc.hiddenFields || '') === '' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-800 bg-[#021231] px-3 py-2.5">
                  <p className="flex-1 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300">Protection du dossier :</span> masquez les informations
                    sensibles (identité, contact, pièce, fichiers) derrière un code à 6 chiffres propre à ce dossier.
                  </p>
                  <button
                    onClick={() => {
                      setKycLockError(null);
                      setKycMaskFields([]);
                      setKycNewCode('');
                      setKycDialog('mask');
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-[#D69E25]/50 bg-[#D69E25]/10 text-[#D69E25] font-black text-[11px] hover:bg-[#D69E25] hover:text-[#021231] flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" /> Masquer des informations
                  </button>
                </div>
              )}

              <div className="bg-[#021231] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <h4 className="font-black text-sm text-white">👤 Informations Personnelles</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Nom complet</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'identity')}>{selectedKyc.firstName} {selectedKyc.lastName}</Masked>
                    {!kycGroupHidden(selectedKyc, 'identity') && (
                      <span className="text-[10px] text-slate-500 block">({selectedKyc.applicantName})</span>
                    )}
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'contact')} className="text-sm font-bold text-white break-all">{selectedKyc.email}</Masked>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Téléphone</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'contact')}>{selectedKyc.phone || "—"}</Masked>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pays</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'contact')}>{selectedKyc.country || "—"}</Masked>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800 col-span-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Adresse physique</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'contact')}>{selectedKyc.address || "—"}</Masked>
                  </div>
                  {selectedKyc.repRole && (
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Rôle dans la société</span>
                      <Masked hidden={kycGroupHidden(selectedKyc, 'identity')}>{selectedKyc.repRole}</Masked>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#021231] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <h4 className="font-black text-sm text-white">🪪 Pièce d'Identité</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Type de document</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'document')}>{selectedKyc.documentType}</Masked>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Numéro du document</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'document')} className="text-sm font-bold text-white font-mono">{selectedKyc.documentNumber}</Masked>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Date d'expiration</span>
                    <Masked hidden={kycGroupHidden(selectedKyc, 'document')}>{selectedKyc.idExpirationDate || "—"}</Masked>
                  </div>
                </div>

                {/* Documents joints : visibles AVANT d'approuver le dossier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-slate-800">
                  <KycDocumentViewer
                    url={selectedKyc.idRectoUrl}
                    label="Pièce — Recto"
                    locked={kycGroupHidden(selectedKyc, 'files')}
                    onDelete={() => {
                      setKycLockError(null);
                      setKycCodeEntry('');
                      setKycDocSlot({ slot: 'idRectoUrl', label: 'Pièce — Recto' });
                      setKycDialog('delete');
                    }}
                  />
                  <KycDocumentViewer
                    url={selectedKyc.idVersoUrl}
                    label="Pièce — Verso"
                    locked={kycGroupHidden(selectedKyc, 'files')}
                    onDelete={() => {
                      setKycLockError(null);
                      setKycCodeEntry('');
                      setKycDocSlot({ slot: 'idVersoUrl', label: 'Pièce — Verso' });
                      setKycDialog('delete');
                    }}
                  />
                  <KycDocumentViewer
                    url={selectedKyc.selfieUrl}
                    label="Photo de la personne"
                    locked={kycGroupHidden(selectedKyc, 'files')}
                    onDelete={() => {
                      setKycLockError(null);
                      setKycCodeEntry('');
                      setKycDocSlot({ slot: 'selfieUrl', label: 'Photo de la personne' });
                      setKycDialog('delete');
                    }}
                  />
                </div>
              </div>

              {selectedKyc.applicantType === 'enterprise' && (
                <div className="bg-[#021231] rounded-2xl border border-amber-500/30 overflow-hidden">
                  <div className="p-4 border-b border-amber-500/20 bg-amber-500/5">
                    <h4 className="font-black text-sm text-amber-400">🏢 Informations de l'Entreprise</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Raison sociale</span>
                      <Masked hidden={kycGroupHidden(selectedKyc, 'company')}>{selectedKyc.companyName || "—"}</Masked>
                    </div>
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Forme juridique</span>
                      <Masked hidden={kycGroupHidden(selectedKyc, 'company')}>{selectedKyc.legalForm || "—"}</Masked>
                    </div>
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">N° RCCM / NINEA / IFU</span>
                      <Masked hidden={kycGroupHidden(selectedKyc, 'company')} className="text-sm font-bold text-white font-mono">{selectedKyc.rccmNumber || "—"}</Masked>
                    </div>
                  
                <div className="p-4 border-t border-slate-800">
                  <KycDocumentViewer
                    url={selectedKyc.companyDocUrl}
                    label="Document Officiel RCCM / Statuts"
                    locked={kycGroupHidden(selectedKyc, 'company') || kycGroupHidden(selectedKyc, 'files')}
                    onDelete={() => {
                      setKycLockError(null);
                      setKycCodeEntry('');
                      setKycDocSlot({ slot: 'companyDocUrl', label: 'Document RCCM / Statuts' });
                      setKycDialog('delete');
                    }}
                  />
                </div></div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                {String(selectedKyc.status) === 'Approuvé' || String(selectedKyc.status) === 'Approuve' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✅ Dossier déjà approuvé — Badge attribué</span>
                  </div>
                ) : kycLocked(selectedKyc) ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <span className="text-[11px] font-bold text-[#E8C77A] flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      Déverrouillez le dossier (code à 6 chiffres) avant de l’approuver.
                    </span>
                    <button
                      onClick={() => {
                        setKycLockError(null);
                        setKycCodeEntry('');
                        setKycDialog('unlock');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#D69E25] hover:bg-[#E8B44A] text-[#021231] font-black text-[11px] uppercase tracking-wide flex items-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Déverrouiller le dossier</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onApproveKyc(selectedKyc.id)}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Vérifier & Approuver le Dossier (Attribution du Badge)</span>
                  </button>
                )}
              </div>

              {/* ---- Dialogue : masquage / déverrouillage / suppression d'une pièce ---- */}
              {kycDialog && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3">
                  <div className="w-full max-w-md rounded-2xl border border-[#D69E25]/40 bg-[#021231] p-4 space-y-3 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center gap-2">
                      {kycDialog === 'mask' ? (
                        <Lock className="w-4 h-4 text-[#D69E25]" />
                      ) : kycDialog === 'unlock' ? (
                        <KeyRound className="w-4 h-4 text-[#D69E25]" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-400" />
                      )}
                      <h4 className="flex-1 font-black text-sm text-white">
                        {kycDialog === 'mask'
                          ? 'Masquer des informations'
                          : kycDialog === 'unlock'
                            ? 'Déverrouiller le dossier'
                            : 'Supprimer une pièce'}
                      </h4>
                      <button
                        onClick={() => setKycDialog(null)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {kycDialog === 'mask' && (
                      <>
                        <p className="text-[11px] text-slate-400">
                          Cochez ce qui doit être masqué. Le code à 6 chiffres est <b>propre à ce dossier</b> : il sera
                          exigé pour le déverrouiller, le modifier ou le retirer.
                        </p>
                        <div className="space-y-1.5">
                          {[
                            { id: 'identity', label: 'Identité (nom, prénom, rôle)' },
                            { id: 'contact', label: 'Contact (e-mail, téléphone, pays, adresse)' },
                            { id: 'document', label: 'Pièce (type, numéro, expiration)' },
                            { id: 'company', label: 'Entreprise (raison sociale, forme, RCCM)' },
                            { id: 'files', label: 'Documents joints (recto, verso, selfie, RCCM)' },
                          ].map((group) => (
                            <label
                              key={group.id}
                              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#011D46] px-2.5 py-2 text-[11px] text-slate-200 cursor-pointer hover:border-[#D69E25]/40"
                            >
                              <input
                                type="checkbox"
                                checked={kycMaskFields.includes(group.id)}
                                onChange={(e) =>
                                  setKycMaskFields((prev) =>
                                    e.target.checked
                                      ? [...prev, group.id]
                                      : prev.filter((item) => item !== group.id)
                                  )
                                }
                                className="accent-[#D69E25]"
                              />
                              <span>{group.label}</span>
                            </label>
                          ))}
                        </div>

                        {kycMaskFields.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">
                              {selectedKyc.isLocked
                                ? 'Code actuel du dossier (6 chiffres)'
                                : 'Choisissez votre code à 6 chiffres (à retenir)'}
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              value={selectedKyc.isLocked ? kycCurrentCode : kycNewCode}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                                if (selectedKyc.isLocked) setKycCurrentCode(digits);
                                else setKycNewCode(digits);
                              }}
                              placeholder="••••••"
                              className="w-full rounded-lg border border-slate-700 bg-[#011D46] px-3 py-2 text-center text-lg font-black tracking-[0.4em] text-white"
                            />
                            {!selectedKyc.isLocked && (
                              <p className="text-[10px] text-slate-500">
                                Le code n’est jamais conservé en clair : seul son empreinte est stockée. Notez-le, sans lui
                                le dossier ne pourra plus être déverrouillé.
                              </p>
                            )}
                          </div>
                        )}

                        {kycMaskFields.length === 0 && selectedKyc.isLocked && (
                          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-300">
                            Aucun groupe coché : le masquage sera retiré (code actuel requis).
                          </p>
                        )}

                        <button
                          onClick={submitKycMask}
                          disabled={kycLockBusy}
                          className="w-full rounded-lg bg-[#D69E25] px-3 py-2 text-[11px] font-black uppercase text-[#021231] hover:bg-[#E8B44A] disabled:opacity-60"
                        >
                          {kycLockBusy ? 'Enregistrement…' : 'Enregistrer le masquage'}
                        </button>
                      </>
                    )}
                    {(kycDialog === 'unlock' || (kycDialog === 'delete' && selectedKyc.isLocked)) && (
                      <>
                        <p className="text-[11px] text-slate-400">
                          {kycDialog === 'unlock'
                            ? 'Saisissez le code à 6 chiffres défini pour CE dossier.'
                            : 'Ce dossier est verrouillé : saisissez son code à 6 chiffres pour supprimer la pièce.'}
                        </p>
                        <input
                          type="password"
                          inputMode="numeric"
                          autoFocus
                          maxLength={6}
                          value={kycCodeEntry}
                          onChange={(e) => setKycCodeEntry(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••••"
                          className="w-full rounded-lg border border-slate-700 bg-[#011D46] px-3 py-2 text-center text-lg font-black tracking-[0.4em] text-white"
                        />
                      </>
                    )}

                    {kycDialog === 'delete' && (
                      <>
                        <p className="text-[11px] text-slate-300">
                          Voulez-vous vraiment supprimer <b>{kycDocSlot?.label}</b> ?
                        </p>
                        <p className="text-[10px] font-bold text-red-400">
                          Action définitive : le fichier est retiré du stockage sécurisé et la référence est effacée.
                        </p>
                      </>
                    )}

                    {kycLockError && (
                      <p className="flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-[11px] font-bold text-red-300">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{kycLockError}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setKycDialog(null)}
                        className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800"
                      >
                        Annuler
                      </button>
                      {kycDialog === 'unlock' && (
                        <button
                          onClick={submitKycUnlock}
                          disabled={kycLockBusy || kycCodeEntry.length !== 6}
                          className="flex-1 rounded-lg bg-[#D69E25] px-3 py-2 text-[11px] font-black uppercase text-[#021231] hover:bg-[#E8B44A] disabled:opacity-60"
                        >
                          {kycLockBusy ? 'Vérification…' : 'Déverrouiller'}
                        </button>
                      )}
                      {kycDialog === 'delete' && (
                        <button
                          onClick={submitKycDeleteDoc}
                          disabled={kycLockBusy || (selectedKyc.isLocked && kycCodeEntry.length !== 6)}
                          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-[11px] font-black uppercase text-white hover:bg-red-500 disabled:opacity-60"
                        >
                          {kycLockBusy ? 'Suppression…' : 'Supprimer définitivement'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fee Config Settings */}

    </>
  );
}
