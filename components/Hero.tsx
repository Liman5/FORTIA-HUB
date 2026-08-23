"use client";

import React, { useState } from 'react';
import { GraduationCap, Bot, ArrowRight, ShieldCheck, Download, Award, ShoppingBag, Volume2, Play, Pause, X } from 'lucide-react';
import { SiteContent } from '../types';

interface HeroProps {
  setActiveTab: (tab: string) => void;
  onExploreShopAndCreateStore?: () => void;
  onExploreCourses?: () => void;
  siteContent?: SiteContent;
}

export const Hero: React.FC<HeroProps> = ({ 
  setActiveTab,
  onExploreShopAndCreateStore,
  onExploreCourses,
  siteContent
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const badgeText = siteContent?.heroBadgeText || 'Plateforme Web Premium de Formation & Services Numériques';
  const titleText = siteContent?.heroTitleText || 'Excellence, Réussite & Prestige :';
  const titleGradient = siteContent?.heroTitleGradient || 'Maîtrisez les Métiers du Futur';
  const subtitle = siteContent?.heroSubtitle || 'Bienvenue sur FORTIA HUB. Obtenez des compétences certifiées à fort impact : Cryptomonnaie, Intelligence Artificielle, Canva, CapCut, Marketing Digital & Entrepreneuriat. Accédez également à notre boutique de ressources numériques et commandez vos prestations de services sur-mesure.';
  const statStudents = siteContent?.statStudents || '15k+';
  const statSuccessRate = siteContent?.statSuccessRate || '98%';
  const statModules = siteContent?.statModules || '45+';
  const audioUrl = siteContent?.heroAudioUrl || '';

  return (
    <div className="relative bg-gradient-to-b from-[#021231] via-[#011D46] to-[#021231] text-white pt-12 pb-20 overflow-hidden border-b border-[#D69E25]/20">
      {/* Background Ambient Radial Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-radial from-[#D69E25]/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-radial from-[#011D46]/80 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 bg-[#011D46] border border-[#D69E25]/50 px-4 py-1.5 rounded-full text-xs font-semibold text-[#D69E25] shadow-lg">
              <span>{badgeText}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {titleText} <br />
              <span className="bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-clip-text text-transparent">
                {titleGradient}
              </span>
            </h1>

            {/* Description */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {subtitle}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={() => {
                  if (onExploreCourses) {
                    onExploreCourses();
                  } else {
                    setActiveTab('courses');
                  }
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-extrabold px-5 py-3 rounded-xl shadow-lg hover:brightness-110 transition transform hover:-translate-y-0.5 text-xs sm:text-sm cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{siteContent?.heroPrimaryCta || 'Explorer les Formations'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (onExploreShopAndCreateStore) {
                    onExploreShopAndCreateStore();
                  } else {
                    setActiveTab('shop');
                  }
                }}
                className="flex items-center gap-2 bg-[#011D46] border border-[#D69E25]/60 text-white hover:text-[#D69E25] font-bold px-5 py-3 rounded-xl transition hover:border-[#D69E25] text-xs sm:text-sm shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#D69E25]" />
                <span>{siteContent?.heroSecondaryCta || 'Explorer la Boutique & Produits'}</span>
              </button>

              {audioUrl && (
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:text-white font-bold px-4 py-3 rounded-xl transition text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>{isPlayingAudio ? 'Pause Audio' : 'Présentation Audio'}</span>
                </button>
              )}
            </div>

            {/* Optional Audio Element */}
            {audioUrl && isPlayingAudio && (
              <div className="pt-2">
                <audio src={audioUrl} autoPlay controls className="w-full max-w-md h-8 rounded-lg" />
              </div>
            )}

            {/* Feature Pills - Clickable Navigation */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-300">
              <button 
                onClick={() => setActiveTab('verifier')}
                className="flex items-center gap-2 hover:text-[#D69E25] transition cursor-pointer text-left"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Certificats Officiels Téléchargeables</span>
              </button>

              <button 
                onClick={() => setActiveTab('shop')}
                className="flex items-center gap-2 hover:text-[#D69E25] transition cursor-pointer text-left"
              >
                <Download className="w-4 h-4 text-[#D69E25] shrink-0" />
                <span>Boutique Téléchargement Instantané</span>
              </button>

              <button 
                onClick={() => setActiveTab('shop')}
                className="flex items-center gap-2 hover:text-[#D69E25] transition cursor-pointer text-left"
              >
                <Award className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Paiements Cartes, Mobile & Crypto</span>
              </button>
            </div>
          </div>

          {/* Right Visual Card Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md bg-[#011D46] border border-[#D69E25]/40 rounded-2xl p-6 shadow-2xl space-y-6">
              
              {/* Badge Header */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D69E25]/20 border border-[#D69E25] flex items-center justify-center text-[#D69E25] font-bold">
                    FH
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">FORTIA HUB</h3>
                    <p className="text-[11px] text-amber-400">Learn. Build. Succeed.</p>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  Accrédité
                </span>
              </div>

              {/* Course Features Highlight Box */}
              <div className="space-y-3">
                <div className="p-3 bg-[#021231] rounded-xl border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                      ₿
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">Cryptomonnaie & Blockchain</p>
                      <p className="text-[10px] text-slate-400">Wallets, USDT, SDA, PI, BNB, Risk</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#D69E25]">Certifiant</span>
                </div>

                <div className="p-3 bg-[#021231] rounded-xl border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                      🤖
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">Intelligence Artificielle</p>
                      <p className="text-[10px] text-slate-400">ChatGPT, Prompts, Visuals, White Papers</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#D69E25]">Certifiant</span>
                </div>

                <div className="p-3 bg-[#021231] rounded-xl border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                      🎬
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">CapCut, Canva & Marketing</p>
                      <p className="text-[10px] text-slate-400">Reels, Logos, Meta Ads, Leadership</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#D69E25]">Certifiant</span>
                </div>
              </div>

              {/* Student Trust Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
                <div>
                  <p className="text-lg font-black text-[#D69E25]">{statStudents}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Apprenants</p>
                </div>
                <div>
                  <p className="text-lg font-black text-[#D69E25]">{statSuccessRate}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Réussite</p>
                </div>
                <div>
                  <p className="text-lg font-black text-[#D69E25]">{statModules}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Modules Pro</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

