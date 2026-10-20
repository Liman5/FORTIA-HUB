"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Plus,
  Video,
  HardDrive,
  DollarSign,
  EyeOff,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Ban,
  Pencil,
  Save,
  X,
  ShieldCheck,
} from "lucide-react";
import { TrainingCenter, Course, InstructorCommission, InstructorStoragePurchase } from "@/lib/types";

interface AdminInstructorsPanelProps {
  trainingCenters: TrainingCenter[];
  courses: Course[];
  commissions: InstructorCommission[];
  storagePurchases: InstructorStoragePurchase[];
  onAddInstructor: (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => void;
  onSuspendCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
  /** Bannit (ou réactive) l'accès du formateur à son centre. */
  onToggleBan?: (center: TrainingCenter, nextStatus: "banned" | "active") => Promise<void> | void;
  /** Enregistre les modifications du centre (nom, présentation, quota, statut). */
  onUpdateCenter?: (
    center: TrainingCenter,
    updates: { centerName: string; description: string; storageQuotaGb: number }
  ) => Promise<void> | void;
  /** Supprime définitivement le centre (double confirmation gérée par le parent). */
  onDeleteCenter?: (center: TrainingCenter) => Promise<void> | void;
}

export const AdminInstructorsPanel: React.FC<AdminInstructorsPanelProps> = ({
  trainingCenters,
  courses,
  commissions,
  storagePurchases,
  onAddInstructor,
  onSuspendCourse,
  onDeleteCourse,
  onToggleBan,
  onUpdateCenter,
  onDeleteCenter,
}) => {
  const [email, setEmail] = useState("");
  const [centerName, setCenterName] = useState("");
  const [storageGb, setStorageGb] = useState(4);
  const [showAdd, setShowAdd] = useState(false);
  // Centre en cours de modification (formulaire inline)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ centerName: "", description: "", storageQuotaGb: 4 });
  const [workingId, setWorkingId] = useState<string | null>(null);

  const totalInstructors = (trainingCenters || []).length;
  const totalCourses = (courses || []).length;
  const totalPlatformEarnings = (commissions || []).reduce((s, c) => s + c.platformFeeUsd, 0);
  const totalInstructorEarnings = (commissions || []).reduce((s, c) => s + c.instructorEarningsUsd, 0);
  const totalStoragePurchases = (storagePurchases || []).reduce((s, p) => s + (Number(p.amountUsd) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#D69E25]" /> Formateurs & Centres de Formation
          </h3>
          <p className="text-xs text-slate-400">Gérez les formateurs, leurs formations et les revenus.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Formateur</span>
        </button>
      </div>

      {/* Stats plateforme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
          <span className="text-[11px] text-slate-400 font-semibold block">Formateurs</span>
          <span className="text-2xl font-black">{totalInstructors}</span>
        </div>
        <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
          <span className="text-[11px] text-slate-400 font-semibold block">Formations</span>
          <span className="text-2xl font-black">{totalCourses}</span>
        </div>
        <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
          <span className="text-[11px] text-slate-400 font-semibold block">Revenus Plateforme</span>
          <span className="text-2xl font-black text-[#D69E25]">${totalPlatformEarnings}</span>
        </div>
        <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
          <span className="text-[11px] text-slate-400 font-semibold block">Gains Formateurs</span>
          <span className="text-2xl font-black text-emerald-400">${totalInstructorEarnings}</span>
        </div>
      </div>

      {/* Ajout formateur */}
      {showAdd && (
        <div className="bg-[#011D46] border border-[#D69E25]/40 rounded-3xl p-6 space-y-4 max-w-2xl">
          <h4 className="font-bold text-sm text-white">Ajouter un formateur par email</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Email du membre *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="formateur@email.com" className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Nom du centre (défaut: nom + Academy)</label>
              <input type="text" value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="Académie du formateur" className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300 block mb-1">Quota stockage (GB)</label>
            <input type="number" min={1} value={storageGb} onChange={(e) => setStorageGb(Number(e.target.value))} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
          </div>
          <button
            onClick={() => {
              if (!email.trim()) { alert("Indiquez l'email du formateur."); return; }
              onAddInstructor({ email, centerName, storageQuotaGb: storageGb });
              setEmail(""); setCenterName(""); setStorageGb(4);
              setShowAdd(false);
              alert("Formateur ajouté ! Il verra son espace formateur dans son compte membre.");
            }}
            className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-500 transition shadow"
          >
            ✔ Activer ce formateur
          </button>
        </div>
      )}

      {/* Liste centres */}
      <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-6 space-y-4">
        <h4 className="font-bold text-sm text-white">Centres de formation ({trainingCenters.length})</h4>
        {trainingCenters.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucun formateur. Utilisez "Ajouter un Formateur" pour créer un centre.</p>
        ) : (
          <div className="space-y-3">
            {trainingCenters.map((c) => {
              const centerCourses = (courses || []).filter((cc) => cc.centerId === c.id || cc.instructorId === c.ownerId);
              return (
                <div key={c.id} className="bg-[#021231] border border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D69E25]/20 text-[#D69E25] flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{c.centerName}</p>
                        <p className="text-[10px] text-slate-400">Formations : {centerCourses.length} • Quota : {c.storageQuotaGb} GB</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === "banned"
                        ? "bg-red-500/20 text-red-300"
                        : c.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {c.status === "banned" ? "Accès banni" : c.status}
                    </span>
                  </div>

                  {/* ===== Actions administrateur sur le centre ===== */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700/60 pt-3">
                    <button
                      onClick={() => {
                        setEditingId(editingId === c.id ? null : c.id);
                        setEditForm({
                          centerName: c.centerName || "",
                          description: c.description || "",
                          storageQuotaGb: Number(c.storageQuotaGb) || 4,
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#011D46] border border-slate-700 text-slate-200 text-[10px] font-black hover:border-[#D69E25] transition flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </button>

                    <button
                      onClick={async () => {
                        if (!onToggleBan) return;
                        const next = c.status === "banned" ? "active" : "banned";
                        if (
                          next === "banned" &&
                          !window.confirm(
                            `Bannir l'accès du formateur « ${c.centerName} » ?\n\nIl ne pourra plus accéder à son espace formateur ni publier de formations.`
                          )
                        )
                          return;
                        setWorkingId(c.id);
                        try {
                          await onToggleBan(c, next);
                        } finally {
                          setWorkingId(null);
                        }
                      }}
                      disabled={workingId === c.id}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition flex items-center gap-1.5 disabled:opacity-60 ${
                        c.status === "banned"
                          ? "bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                          : "bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white"
                      }`}
                    >
                      {c.status === "banned" ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> Réactiver l'accès
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" /> Bannir l'accès
                        </>
                      )}
                    </button>
                  </div>

                  {/* ===== Suppression : DOUBLE DEMANDE ===== */}
                  <div className="mt-2">
                    <button
                      onClick={async () => {
                        if (!onDeleteCenter) return;
                        // 1re demande
                        const first = window.confirm(
                          `Voulez-vous vraiment supprimer le centre « ${c.centerName} » ?\n\nCette action est définitive.`
                        );
                        if (!first) return;
                        // 2e demande : saisie du nom exact du centre
                        const typed = window.prompt(
                          `Double confirmation — saisissez le nom exact du centre pour confirmer :\n« ${c.centerName} »`
                        );
                        if (typed === null) return;
                        if (typed.trim().toLowerCase() !== String(c.centerName).trim().toLowerCase()) {
                          alert("Le nom saisi ne correspond pas : suppression annulée.");
                          return;
                        }
                        setWorkingId(c.id);
                        try {
                          await onDeleteCenter(c);
                        } finally {
                          setWorkingId(null);
                        }
                      }}
                      disabled={workingId === c.id}
                      className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/40 text-red-300 text-[10px] font-black hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer le centre
                    </button>
                  </div>

                  {/* ===== Formulaire de modification du centre ===== */}
                  {editingId === c.id && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-[#011D46] p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Nom du centre</label>
                          <input
                            value={editForm.centerName}
                            onChange={(e) => setEditForm((p) => ({ ...p, centerName: e.target.value }))}
                            className="w-full rounded-lg border border-slate-700 bg-[#021231] px-2.5 py-2 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Quota de stockage (Go)</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.storageQuotaGb}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, storageQuotaGb: Number(e.target.value) || 1 }))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-[#021231] px-2.5 py-2 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Présentation</label>
                          <textarea
                            rows={2}
                            value={editForm.description}
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            className="w-full rounded-lg border border-slate-700 bg-[#021231] px-2.5 py-2 text-xs text-white focus:border-[#D69E25] focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 rounded-lg bg-[#021231] border border-slate-700 text-slate-300 text-[10px] font-black hover:bg-[#032454] transition flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Annuler
                        </button>
                        <button
                          onClick={async () => {
                            if (!onUpdateCenter) return;
                            if (!editForm.centerName.trim()) {
                              alert("Le nom du centre est obligatoire.");
                              return;
                            }
                            setWorkingId(c.id);
                            try {
                              await onUpdateCenter(c, {
                                centerName: editForm.centerName.trim(),
                                description: editForm.description,
                                storageQuotaGb: editForm.storageQuotaGb,
                              });
                              setEditingId(null);
                            } finally {
                              setWorkingId(null);
                            }
                          }}
                          disabled={workingId === c.id}
                          className="flex-1 py-2 rounded-lg bg-[#D69E25] text-[#021231] text-[10px] font-black hover:bg-amber-400 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" /> Enregistrer
                        </button>
                      </div>
                    </div>
                  )}

                  {centerCourses.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {centerCourses.map((course) => (
                        <div key={course.id} className="flex items-center justify-between bg-[#011D46] rounded-lg p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Video className="w-4 h-4 text-[#D69E25] shrink-0" />
                            <span className="text-xs text-slate-200 truncate">{course.title}</span>
                            <span className="text-[10px] text-[#D69E25] font-bold shrink-0">${course.price}</span>
                            {course.studentsCount > 0 && (
                              <span className="text-[10px] text-emerald-400 shrink-0">{course.studentsCount} étudiants</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => onSuspendCourse(course.id)} className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold">
                              <EyeOff className="w-3.5 h-3.5 inline" /> Suspendre
                            </button>
                            <button onClick={() => onDeleteCourse(course.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};