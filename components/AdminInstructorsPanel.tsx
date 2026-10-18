"use client";

import React, { useState } from "react";
import { GraduationCap, Plus, Video, HardDrive, DollarSign, EyeOff, Trash2, CheckCircle2, ExternalLink } from "lucide-react";
import { TrainingCenter, Course, InstructorCommission, InstructorStoragePurchase } from "@/lib/types";

interface AdminInstructorsPanelProps {
  trainingCenters: TrainingCenter[];
  courses: Course[];
  commissions: InstructorCommission[];
  storagePurchases: InstructorStoragePurchase[];
  onAddInstructor: (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => void;
  onSuspendCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const AdminInstructorsPanel: React.FC<AdminInstructorsPanelProps> = ({
  trainingCenters,
  courses,
  commissions,
  storagePurchases,
  onAddInstructor,
  onSuspendCourse,
  onDeleteCourse,
}) => {
  const [email, setEmail] = useState("");
  const [centerName, setCenterName] = useState("");
  const [storageGb, setStorageGb] = useState(4);
  const [showAdd, setShowAdd] = useState(false);

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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {c.status}
                    </span>
                  </div>

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