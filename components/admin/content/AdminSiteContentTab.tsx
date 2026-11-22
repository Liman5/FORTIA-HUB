"use client";

import React from "react";
import { Globe, Save, Volume2, TrendingUp } from "lucide-react";
import type { SiteContent } from "@/lib/types";

export function AdminSiteContentTab({
  siteForm,
  setSiteForm,
  onSubmit,
}: {
  siteForm: SiteContent;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteContent>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
            <form onSubmit={onSubmit} className="p-6 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#D69E25]" />
                    <span>Éditeur CMS du Site & Médias (Temps Réel)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Modifiez tous les textes, titres, bannières, audios, vidéos et statistiques du site. Synchronisation instantanée sur tout le site.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#D69E25] via-amber-400 to-[#AB6F10] text-[#021231] font-black rounded-xl text-xs shadow-xl hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer & Synchroniser en Direct</span>
                </button>
              </div>

              {/* Section 1: Hero & Accroches */}
              <div className="bg-[#021231] p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-[#D69E25] uppercase tracking-wider flex items-center gap-2">
                  <span>1. Accroche Principale & Bannières (Haut de Page)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Badge Pilule Supérieur</label>
                    <input
                      type="text"
                      value={siteForm.heroBadgeText}
                      onChange={(e) => setSiteForm({ ...siteForm, heroBadgeText: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Bannière d'Annonce Top Site (Bandeau d'Alerte)</label>
                    <input
                      type="text"
                      value={siteForm.topAnnouncementBanner}
                      onChange={(e) => setSiteForm({ ...siteForm, topAnnouncementBanner: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Titre Principal (Ligne 1 Blanc)</label>
                    <input
                      type="text"
                      value={siteForm.heroTitleText}
                      onChange={(e) => setSiteForm({ ...siteForm, heroTitleText: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Titre Principal (Ligne 2 Doré)</label>
                    <input
                      type="text"
                      value={siteForm.heroTitleGradient}
                      onChange={(e) => setSiteForm({ ...siteForm, heroTitleGradient: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre Descriptif Officiel</label>
                  <textarea
                    rows={3}
                    value={siteForm.heroSubtitle}
                    onChange={(e) => setSiteForm({ ...siteForm, heroSubtitle: e.target.value })}
                    className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Action 1 (Boutique)</label>
                    <input
                      type="text"
                      value={siteForm.heroPrimaryCta}
                      onChange={(e) => setSiteForm({ ...siteForm, heroPrimaryCta: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Action 2 (Formations)</label>
                    <input
                      type="text"
                      value={siteForm.heroSecondaryCta}
                      onChange={(e) => setSiteForm({ ...siteForm, heroSecondaryCta: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Audio & Images */}
              <div className="bg-[#021231] p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-[#D69E25] uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>2. Médias Interactifs (Audio MP3)</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">URL Fichier Audio MP3 de Présentation</label>
                  <input
                    type="text"
                    value={siteForm.heroAudioUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, heroAudioUrl: e.target.value })}
                    placeholder="https://.../audio-presentation.mp3"
                    className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">URL Image d'Illustration Principale (Couverture)</label>
                  <input
                    type="text"
                    value={siteForm.heroImageUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, heroImageUrl: e.target.value })}
                    className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              {/* Section 3: Statistiques & Footer */}
              <div className="bg-[#021231] p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-[#D69E25] uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>3. Statistiques & Pied de Page (Footer)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombre d'Apprenants</label>
                    <input
                      type="text"
                      value={siteForm.statStudents}
                      onChange={(e) => setSiteForm({ ...siteForm, statStudents: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Taux de Réussite</label>
                    <input
                      type="text"
                      value={siteForm.statSuccessRate}
                      onChange={(e) => setSiteForm({ ...siteForm, statSuccessRate: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Modules de Formation</label>
                    <input
                      type="text"
                      value={siteForm.statModules}
                      onChange={(e) => setSiteForm({ ...siteForm, statModules: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Officiel Support</label>
                    <input
                      type="email"
                      value={siteForm.contactEmail}
                      onChange={(e) => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone Support / WhatsApp</label>
                    <input
                      type="text"
                      value={siteForm.contactPhone}
                      onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Horaires de Service</label>
                    <input
                      type="text"
                      value={siteForm.supportHours}
                      onChange={(e) => setSiteForm({ ...siteForm, supportHours: e.target.value })}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-gradient-to-r from-[#D69E25] via-amber-400 to-[#AB6F10] text-[#021231] font-black rounded-xl text-xs shadow-xl hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer & Synchroniser Tout en Temps Réel</span>
                </button>
              </div>
            </form>
  );
}
