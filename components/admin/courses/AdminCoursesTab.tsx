"use client";

import React from "react";
import { Award, Edit, Trash2 } from "lucide-react";
import type { Course } from "@/lib/types";

export function AdminCoursesTab({
  courses,
  onToggleFeatured,
  onEditCourse,
  onDeleteCourse,
}: {
  courses: Course[];
  onToggleFeatured?: (id: string, featured: boolean) => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse?: (id: string) => void;
}) {
  return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#021231] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Formation</th>
                    <th className="p-4">Catégorie</th>
                    <th className="p-4">Prix</th>
                    <th className="p-4">Étudiants</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-[#021231]/50 transition">
                      <td className="p-4 font-bold text-white">{c.title}</td>
                      <td className="p-4 text-[#D69E25] font-semibold">{c.categoryLabel}</td>
                      <td className="p-4 font-bold text-white">${c.price}</td>
                      <td className="p-4">{c.studentsCount}</td>
                      <td className="p-4 flex items-center gap-2">
                        <button
                          onClick={() => onToggleFeatured && onToggleFeatured(c.id, !(c as any).isFeatured)}
                          className={`px-2.5 py-1 rounded transition flex items-center gap-1 font-bold text-[11px] ${
                            (c as any).isFeatured
                              ? "bg-amber-500/40 text-amber-200 hover:bg-amber-500 hover:text-white"
                              : "bg-slate-600/30 text-slate-300 hover:bg-amber-500/40 hover:text-amber-200"
                          }`}
                          title={
                            (c as any).isFeatured
                              ? "Retirer de la mise en avant"
                              : "Mettre en avant (visible dans la vue « Mises en avant »)"
                          }
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{(c as any).isFeatured ? "En avant" : "Mettre en avant"}</span>
                        </button>
                        <button
                          onClick={() => onEditCourse(c)}
                          className="px-2.5 py-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition flex items-center gap-1 font-bold text-[11px]"
                          title="Modifier la formation"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => onDeleteCourse && onDeleteCourse(c.id)}
                          className="px-2.5 py-1 rounded bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white transition flex items-center gap-1 font-bold text-[11px]"
                          title="Supprimer la formation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  );
}
