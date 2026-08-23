"use client";

import React, { useState } from 'react';
import { 
  Logo 
} from './Logo';
import { 
  GraduationCap, 
  ShoppingBag, 
  Store, 
  Users, 
  Building2, 
  Briefcase, 
  BookOpen, 
  Info, 
  Award, 
  Headphones, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Home,
  FileText, 
  Lock, 
  HelpCircle, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Zap, 
  DollarSign, 
  Sparkles 
} from 'lucide-react';
import { SiteContent } from '../types';

interface PlatformShowcaseViewProps {
  setActiveTab: (tab: string) => void;
  onOpenAdminAuth?: () => void;
  siteContent?: SiteContent;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
}

export const PlatformShowcaseView: React.FC<PlatformShowcaseViewProps> = ({
  setActiveTab,
  onOpenAdminAuth,
  siteContent,
  onOpenAuthModal
}) => {
  const [activeLegalModal, setActiveLegalModal] = useState<'cgu' | 'privacy' | 'refund' | 'kyc' | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('product');

  const aboutText = siteContent?.footerAboutText || "FORTIA HUB est la plateforme web haut de gamme dédiée à la formation professionnelle certifiante, la vente de produits numériques d'élite, la marketplace freelance et l'accélération des entreprises africaines & internationales.";
  const email = siteContent?.contactEmail || "contact@icham-academy.com";
  const phone = siteContent?.contactPhone || "+221 77 888 99 00";
  const hours = siteContent?.supportHours || "24/7 Support Réactif";

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="bg-[#021231] min-h-screen text-white pb-20">
      
      {/* TOP NAVIGATION BAR */}
      <div className="bg-[#011638] border-b border-[#D69E25]/30 py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <button
          onClick={() => setActiveTab('courses')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#D69E25] transition bg-[#011D46] hover:bg-[#021231] px-3.5 py-2 rounded-xl border border-slate-700 hover:border-[#D69E25]/50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#D69E25]" />
          <Home className="w-4 h-4" />
          <span>Retour à l'Accueil</span>
        </button>
      </div>

      {/* HERO / VITRINE BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#011638] via-[#011D46] to-[#021231] border-b border-[#D69E25]/40 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-[#D69E25]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-gradient-to-tr from-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-10 relative z-10">
          {/* Header Tagline */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                L'Écosystème Numérique <span className="text-[#D69E25]">FORTIA HUB</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                {aboutText}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('courses')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs uppercase tracking-wider hover:brightness-110 transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Explorer les Formations</span>
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                className="px-5 py-3 rounded-xl bg-[#011D46] border border-[#D69E25]/50 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#D69E25]" />
                <span>Boutique Numérique</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics / Key Strengths Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#011D46]/80 border border-[#D69E25]/30 p-4 rounded-2xl space-y-1 shadow">
              <div className="flex items-center justify-between text-[#D69E25]">
                <GraduationCap className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Académie</span>
              </div>
              <div className="text-xl font-black text-white">45+ Formations</div>
              <p className="text-[11px] text-slate-300">Crypto, IA, Design, Vidéo & Marketing</p>
            </div>

            <div className="bg-[#011D46]/80 border border-[#D69E25]/30 p-4 rounded-2xl space-y-1 shadow">
              <div className="flex items-center justify-between text-[#D69E25]">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Produits</span>
              </div>
              <div className="text-xl font-black text-white">E-books & Kits</div>
              <p className="text-[11px] text-slate-300">PDF, Modèles Canva, Prompts AI</p>
            </div>

            <div className="bg-[#011D46]/80 border border-[#D69E25]/30 p-4 rounded-2xl space-y-1 shadow">
              <div className="flex items-center justify-between text-[#D69E25]">
                <Store className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vendeurs</span>
              </div>
              <div className="text-xl font-black text-white">Boutiques Pro</div>
              <p className="text-[11px] text-slate-300">Monétisez vos connaissances en 24h</p>
            </div>

            <div className="bg-[#011D46]/80 border border-[#D69E25]/30 p-4 rounded-2xl space-y-1 shadow">
              <div className="flex items-center justify-between text-[#D69E25]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sécurité</span>
              </div>
              <div className="text-xl font-black text-white">Certifiée 100%</div>
              <p className="text-[11px] text-slate-300">Mobile Money, Crypto, Visa, PayPal</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE SERVICES SHOWCASE (LA VITRINE DES SERVICES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#011D46] border border-[#D69E25]/40 text-[#D69E25] text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Prestations & Solutions Intégrées</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Découvrez nos 6 Pôles d'Activité Majeurs
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            FORTIA HUB rassemble tout ce dont vous avez besoin pour apprendre, entreprendre et développer vos revenus numériques sur une seule et unique plateforme web.
          </p>
        </div>

        {/* 6 Feature Showcase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Formations */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Académie & Formations Certifiantes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apprenez les compétences les plus recherchées du marché : Trading de Cryptomonnaies, IA Générative, Design Canva Pro, Montage Vidéo CapCut, Marketing Digital et Leadership.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Accès illimité aux cours vidéo HD</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Attestation officielle vérifiable par QR Code</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('courses')}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accéder aux Formations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Boutique Digital Shop */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Boutique de Produits Numériques</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Téléchargez des ressources prêtes à l'emploi : E-books PDF exclusifs, packs de templates Canva personnalisables, prompts ChatGPT optimisés, guides stratégiques et logiciels.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Téléchargement instantané après paiement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Licence d'utilisation ou de revente</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('shop')}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Voir la Boutique</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Espace Vendeur Pro */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Espace Vendeur & Marketplace</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Créez votre propre boutique en ligne sur FORTIA HUB. Publiez vos e-books et formations, gérez vos commandes et encaissez vos revenus directement par Mobile Money ou Crypto.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Vitrine vendeur personnalisée avec bannière</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Optimisation de vos textes par l'IA</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('vendor')}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ouvrir mon Espace Vendeur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Marketplace Freelance */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Marketplace Freelances & Talents</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trouvez des prestataires indépendants qualifiés ou proposez vos propres services en tant que Freelance vérifié (Graphisme, Rédaction, Développement Web, Montage Video).
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Profils certifiés avec vérification KYC</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Commandes directes & livrables sécurisés</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('freelance')}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explorer la Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 5: Agence Services Sur-Mesure */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Agence Web & Prestations Sur-Mesure</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Confiez vos projets stratégiques à l'équipe FORTIA HUB : Création d'identité visuelle complète (Logo, Charte), Rédaction de White Papers, Déploiement de sites web et tunnels de vente.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Devis sur-mesure sous 24 heures</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Chef de projet dédié & suivi rigoureux</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('services')}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Demander un Devis Agence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 6: Annuaire Entreprises & Attestations */}
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25] transition shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Annuaire Entreprises & Vérification</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Inscrivez votre entreprise dans le répertoire officiel certifié FORTIA HUB pour augmenter votre visibilité B2B, et vérifiez l'authenticité de vos attestations de formation.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Répertoire des entreprises partenaires</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Système d'authentification par matricule</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setActiveTab('enterprises')}
                className="py-2.5 px-3 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 text-center cursor-pointer"
              >
                Annuaire
              </button>
              <button
                onClick={() => setActiveTab('verifier')}
                className="py-2.5 px-3 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-bold text-xs transition border border-[#D69E25]/30 text-center cursor-pointer"
              >
                Attestations
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* FOUR MAIN GROUPS: PRODUCT, COMPANY, RESSOURCES, LEGAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800 space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#011D46] border border-[#D69E25]/40 text-[#D69E25] text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Navigation Globale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Architecture & Répertoire Complet FORTIA HUB
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Accédez directement à l'ensemble des modules, informations de l'entreprise, guides de ressources et politiques légales.
          </p>
        </div>

        {/* 4 Groups Grid (Desktop & Mobile Responsive) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* GROUP 1: PRODUCT */}
          <div className="bg-[#011D46]/60 border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25]/60 transition shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-[#D69E25]/20 text-[#D69E25] flex items-center justify-center font-black">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white uppercase tracking-wider">Product</h3>
                <span className="text-[10px] font-bold text-[#D69E25]">Produits & Services</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button 
                  onClick={() => setActiveTab('courses')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Académie & Formations</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('shop')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Boutique E-books & Kits</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('vendor')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Espace Vendeur Pro</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('freelance')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Marketplace Freelance</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('services')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Agence & Services Sur-Mesure</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('enterprises')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Annuaire des Entreprises</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
            </ul>
          </div>

          {/* GROUP 2: COMPANY */}
          <div className="bg-[#011D46]/60 border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25]/60 transition shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-[#D69E25]/20 text-[#D69E25] flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white uppercase tracking-wider">Company</h3>
                <span className="text-[10px] font-bold text-[#D69E25]">Entreprise & Marque</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button 
                  onClick={() => setActiveTab('about')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>À Propos & Présentation</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('about')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Mission, Vision & Valeurs</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('vendor')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Programme Partenaire Vendeur</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('ai-assistant')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Assistance & Support IA 24/7</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <a 
                  href={`mailto:${email}`}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Contact Direct ({email})</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* GROUP 3: RESSOURCES */}
          <div className="bg-[#011D46]/60 border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25]/60 transition shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-[#D69E25]/20 text-[#D69E25] flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white uppercase tracking-wider">Ressources</h3>
                <span className="text-[10px] font-bold text-[#D69E25]">Outils & Savoirs</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button 
                  onClick={() => setActiveTab('blog')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Blog & Actualités Numériques</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('verifier')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Vérification d'Attestations</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('member')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Tableau de Bord Membre</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Centre de Notifications & Alertes</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
            </ul>
          </div>

          {/* GROUP 4: LEGAL */}
          <div className="bg-[#011D46]/60 border border-[#D69E25]/30 rounded-2xl p-6 space-y-4 hover:border-[#D69E25]/60 transition shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-[#D69E25]/20 text-[#D69E25] flex items-center justify-center font-black">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white uppercase tracking-wider">Legal</h3>
                <span className="text-[10px] font-bold text-[#D69E25]">Juridique & Sécurité</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button 
                  onClick={() => setActiveLegalModal('cgu')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Conditions Générales (CGU)</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveLegalModal('privacy')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Politique de Confidentialité</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveLegalModal('refund')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Politique de Remboursement</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveLegalModal('kyc')}
                  className="hover:text-[#D69E25] transition flex items-center justify-between w-full text-left py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Charte Sécurité KYC & Vendeurs</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              {onOpenAdminAuth && (
                <li className="pt-2 border-t border-slate-800">
                  <button 
                    onClick={onOpenAdminAuth}
                    className="text-[#D69E25] font-bold hover:underline flex items-center gap-2 w-full text-left py-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Accès Espace Administrateur</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

        </div>
      </section>

      {/* FOOTER REPLACEMENT CONTACT & PAYMENT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-[#011D46] border-2 border-[#D69E25]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Logo variant="light" size="md" />
              <div>
                <p className="text-xs text-slate-300 font-medium">
                  © 2026 <strong>FORTIA HUB</strong>. Tous droits réservés. Learn. Build. Succeed.
                </p>
                <p className="text-[11px] text-[#D69E25] font-bold">
                  Accréditée Officielle • Lomé, Togo & International
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-[#D69E25] transition">
                <Mail className="w-4 h-4 text-[#D69E25]" />
                <span>{email}</span>
              </a>
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-[#D69E25] transition">
                <Phone className="w-4 h-4 text-[#D69E25]" />
                <span>{phone}</span>
              </a>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-4 h-4 text-[#D69E25]" />
                <span>{hours}</span>
              </span>
            </div>
          </div>

          {/* Supported Payment Methods Showcase */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Moyens de Paiement Intégrés & Sécurisés :
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#021231] px-3 py-1.5 rounded-xl border border-[#D69E25]/40 text-xs font-bold text-[#D69E25]">
                Mobile Money (TMoney, Moov, Wave, Orange, MTN)
              </span>
              <span className="bg-[#021231] px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-bold text-emerald-400">
                Cryptomonnaies (USDT, BNB, SDA, PI)
              </span>
              <span className="bg-[#021231] px-3 py-1.5 rounded-xl border border-sky-500/40 text-xs font-bold text-sky-400">
                Cartes Visa / Mastercard / PayPal
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LEGAL MODAL POPUPS */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-2xl w-full p-6 space-y-4 relative shadow-2xl max-h-[85vh] overflow-y-auto text-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D69E25]" />
                <span>
                  {activeLegalModal === 'cgu' && "Conditions Générales d'Utilisation (CGU)"}
                  {activeLegalModal === 'privacy' && "Politique de Confidentialité & RGPD"}
                  {activeLegalModal === 'refund' && "Politique de Remboursement & Licences"}
                  {activeLegalModal === 'kyc' && "Charte de Sécurité & Conformité KYC"}
                </span>
              </h3>
              <button 
                onClick={() => setActiveLegalModal(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              {activeLegalModal === 'cgu' && (
                <>
                  <p><strong>1. Objet :</strong> Les présentes CGU régissent l'accès et l'utilisation de la plateforme web FORTIA HUB, y compris l'accès aux formations, l'achat de produits numériques et l'utilisation de la marketplace vendeur.</p>
                  <p><strong>2. Inscription :</strong> Tout utilisateur s'engage à fournir des informations véridiques lors de sa création de compte. Les identifiants sont personnels et confidentiels.</p>
                  <p><strong>3. Propriété Intellectuelle :</strong> L'ensemble des cours, vidéos, e-books et ressources numériques est protégé par le droit d'auteur. Toute reproduction ou distribution non autorisée est strictement interdite.</p>
                </>
              )}

              {activeLegalModal === 'privacy' && (
                <>
                  <p><strong>1. Collecte des Données :</strong> FORTIA HUB collecte uniquement les données strictement nécessaires au bon traitement de vos commandes et attestations (Nom, Prénom, Email, Numéro de Téléphone).</p>
                  <p><strong>2. Sécurité :</strong> Vos données sont chiffrées et ne sont jamais vendues ou cédées à des tiers commercialement.</p>
                  <p><strong>3. Droits :</strong> Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles sur simple demande au support client.</p>
                </>
              )}

              {activeLegalModal === 'refund' && (
                <>
                  <p><strong>1. Produits Numériques :</strong> En raison de leur nature téléchargeable immédiatement après achat, les e-books, templates et cours numériques ne sont pas remboursables une fois le fichier téléchargé ou la formation visionnée à plus de 20%.</p>
                  <p><strong>2. Support Client :</strong> En cas de problème technique avec un fichier ou une commande, notre support s'engage à vous fournir une copie de remplacement sous 24h.</p>
                </>
              )}

              {activeLegalModal === 'kyc' && (
                <>
                  <p><strong>1. Vérification d'Identité (KYC) :</strong> Afin de garantir la sécurité des transactions sur la marketplace et l'annuaire des entreprises, les vendeurs et prestataires sont soumis à une vérification d'identité officielle.</p>
                  <p><strong>2. Lutte contre la Fraude :</strong> Tout contenu suspect, contrefait ou trompeur sera immédiatement supprimé et le compte associé sera suspendu.</p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-700 text-right">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
