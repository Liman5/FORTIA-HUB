"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Course, DigitalProduct, MarketplaceOrder } from '../types';
import { generatePDFCertificate, downloadProductDeliverable } from '../utils/pdfGenerator';
import { apiDeleteAccount } from '../services/api';
import { uploadFileToR2 } from '../lib/services/clientUpload';
import { 
  User, 
  BookOpen, 
  Award, 
  Download, 
  CreditCard, 
  CheckCircle, 
  Settings, 
  ExternalLink,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Lock,
  Loader2,
  X,
  ChevronDown,
  Star,
  BadgeCheck,
  Sparkles,
  FileCheck2,
  ShoppingBag,
  Wallet,
  Camera,
  ImageUp,
} from 'lucide-react';

interface MemberDashboardProps {
  user: UserProfile;
  courses: Course[];
  digitalProducts: DigitalProduct[];
  onOpenCourse: (course: Course) => void;
  onLogout?: () => void;
  initialTab?: 'progress' | 'certificates' | 'products' | 'payments' | 'settings';
  orders?: MarketplaceOrder[];
  marketplaceProducts?: DigitalProduct[];
  onOpenVendor?: () => void;
  onOpenInstructor?: () => void;
  providerProfileManager?: React.ReactNode;
  isProviderApproved?: boolean;
  providerTypeLabel?: string;
  hasApprovedStore?: boolean;
  badgeType?: 'green' | 'gold' | 'none';
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  courses,
  digitalProducts,
  onOpenCourse,
  onLogout,
  initialTab = 'progress',
  orders = [],
  marketplaceProducts = [],
  onOpenVendor,
  onOpenInstructor,
  providerProfileManager,
  isProviderApproved = false,
  providerTypeLabel = '',
  hasApprovedStore = false,
  badgeType,
  onUpdateProfile
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'certificates' | 'products' | 'payments' | 'settings'>(initialTab);
  const [isProviderFormOpen, setIsProviderFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccessNotice, setDeletionSuccessNotice] = useState<string | null>(null);

  // ===== Upload Photo de Profil =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarSuccess(false);
    
    // Validations
    if (!file.type.startsWith("image/")) {
      setAvatarError("Veuillez sélectionner un fichier image (JPG, PNG, WebP...)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const entityId = user?.id || `user-${Date.now()}`;
      const result = await uploadFileToR2(file, "site-media", entityId, true);
      if (!result.success) {
        setAvatarError(result.error || "Échec de l'upload de la photo");
        setIsUploadingAvatar(false);
        return;
      }
      // Mettre à jour l'avatar dans le store
      if (onUpdateProfile) {
        onUpdateProfile({ avatar: result.url });
      }
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (error) {
      setAvatarError("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleInitiateAccountDeletion = async () => {
    if (!confirmCheckbox) return;
    setIsDeleting(true);
    const res = await apiDeleteAccount(user.email);
    setIsDeleting(false);
    if (res.success) {
      setDeletionSuccessNotice(
        "Votre demande de suppression de compte a bien été prise en compte ! Votre accès est désormais bloqué pour la période de 24 heures avant la suppression définitive."
      );
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        if (onLogout) onLogout();
      }, 3500);
    }
  };

  const enrolledIds = user?.enrolledCourseIds || [];
  const purchasedIds = user?.purchasedProductIds || [];
  const earnedCertificates = user?.earnedCertificates || [];
  const localPaymentHistory = user?.paymentHistory || [];

  const myOrders = (orders || []).filter(
    (o) =>
      (user?.id && o.buyerUserId === user.id) ||
      (user?.email && (o.buyerEmail === user.email || o.buyerEmail?.toLowerCase() === (user.email || '').toLowerCase()))
  );

  const paymentHistory = [
    ...localPaymentHistory,
    ...myOrders.map((o) => ({
      id: o.id,
      date: o.createdAt,
      amount: Number(o.amountUsd || 0),
      method: o.paymentGateway,
      items: [o.productTitle],
      status: 'Validé' as const,
      orderNumber: o.orderNumber,
      transactionRef: o.transactionRef,
    })),
  ].filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);

  const mergedProductIds = Array.from(
    new Set([
      ...purchasedIds,
      ...myOrders.map((o) => o.productId).filter(Boolean) as string[],
    ])
  );

  const enrolledCourses = (courses || []).filter(c => enrolledIds.includes(c.id));
  const purchasedProducts = (digitalProducts?.length ? digitalProducts : marketplaceProducts?.length ? marketplaceProducts : []).filter(p => mergedProductIds.includes(p.id));

  const tabs = [
    { id: 'progress' as const, label: 'Mes Formations', icon: BookOpen, count: enrolledCourses.length, color: 'text-[#D69E25]' },
    { id: 'certificates' as const, label: 'Attestations', icon: Award, count: earnedCertificates.length, color: 'text-emerald-400' },
    { id: 'products' as const, label: 'Mes Achats', icon: Download, count: purchasedProducts.length, color: 'text-amber-400' },
    { id: 'payments' as const, label: 'Paiements', icon: CreditCard, count: paymentHistory.length, color: 'text-sky-400' },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings, count: 0, color: 'text-slate-400' },
  ];

  return (
    <section className="py-10 bg-[#021231] min-h-[600px] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.03)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        {/* ===== USER PROFILE CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Glow effects */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D69E25]/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D69E25] shadow-lg shadow-[#D69E25]/20"
                />
                {badgeType === 'gold' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg"
                    title="Badge Doré"
                  >
                    <BadgeCheck className="w-4 h-4 text-[#021231]" />
                  </motion.div>
                )}
                {badgeType === 'green' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg"
                    title="Badge Vert"
                  >
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{user.name}</h2>
                  <span className="bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                    Membre VIP
                  </span>
                </div>
                <p className="text-xs text-slate-400">{user.email} • {user.phone}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#D69E25]" />
                  <span>Membre FORTIA HUB depuis 2026</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              {[
                { icon: BookOpen, value: enrolledCourses.length, label: 'Formations', color: '#D69E25' },
                { icon: FileCheck2, value: earnedCertificates.length, label: 'Certificats', color: '#10B981' },
                { icon: ShoppingBag, value: purchasedProducts.length, label: 'Achats', color: '#F59E0B' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    whileHover={{ y: -3 }}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 text-center min-w-[90px]"
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: stat.color }} />
                    <p className="text-lg font-black text-white">{stat.value}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold mt-0.5">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ===== NAVIGATION BUTTONS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <button
            type="button"
            onClick={() => { setIsProviderFormOpen(!isProviderFormOpen); const el = document.getElementById('provider-profile-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-[#D69E25]/40 text-slate-200 hover:bg-[#D69E25]/10 hover:text-[#D69E25] transition font-bold text-xs"
          >
            <User className="w-4 h-4 text-[#D69E25]" />
            <span>Mon Profil {providerTypeLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProviderFormOpen ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onOpenVendor && onOpenVendor()}
            className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-500/20 transition font-bold text-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{hasApprovedStore ? 'Accéder à ma Boutique' : 'Devenir Vendeur'}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenInstructor && onOpenInstructor()}
            className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-400/40 text-sky-400 hover:bg-sky-500/20 transition font-bold text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Espace Formateur</span>
          </button>
        </motion.div>

        {/* ===== PROVIDER PROFILE ===== */}
        <div id="provider-profile-section" className="pt-2">
          {isProviderFormOpen && providerProfileManager ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="provider-form-animate"
            >
              {providerProfileManager}
            </motion.div>
          ) : (
            providerProfileManager && (
              <button
                type="button"
                onClick={() => {
                  setIsProviderFormOpen(true);
                  const el = document.getElementById('provider-profile-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full py-5 rounded-2xl border-2 border-dashed border-[#D69E25]/50 bg-[#D69E25]/5 text-[#D69E25] hover:bg-[#D69E25]/15 hover:border-[#D69E25] transition font-bold text-xs flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Consulter mon Profil {providerTypeLabel || 'Prestataire'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

        {/* ===== TABS ===== */}
        <div className="relative">
          {/* Arrière-plan dégradé pour indiquer le scroll */}
          <div className="absolute pointer-events-none inset-y-0 left-0 w-10 bg-gradient-to-r from-[#021231] to-transparent z-10 opacity-80" />
          <div className="absolute pointer-events-none inset-y-0 right-0 w-10 bg-gradient-to-l from-[#021231] to-transparent z-10 opacity-80" />
          {/* Petites flèches latérales décoratives */}
          <div className="absolute pointer-events-none left-1 top-1/2 -translate-y-1/2 z-20 text-[#D69E25] animate-pulse sm:hidden">
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </div>
          <div className="absolute pointer-events-none right-1 top-1/2 -translate-y-1/2 z-20 text-[#D69E25] animate-pulse sm:hidden">
            <ChevronDown className="w-3.5 h-3.5 rotate-90" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 scrollbar-none border-b border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-white bg-white/5 border-b-2 border-[#D69E25]'
                      : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-[#D69E25] text-[#021231]' : 'bg-white/10 text-slate-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== TAB CONTENT ===== */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
        {/* Tab 1: Formations */}
        {activeTab === 'progress' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {enrolledCourses.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <BookOpen className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucune formation en cours</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Explorez le catalogue et commencez votre première formation certifiante.
                </p>
              </div>
            ) : (
              enrolledCourses.map((c, idx) => {
                const progress = (user?.courseProgress && user.courseProgress[c.id]) || 0;
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -4 }}
                    className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-[#D69E25]/40 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <img src={c.image} alt={c.title} className="w-24 h-20 rounded-xl object-cover border border-white/10" />
                        <div className="space-y-1 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-[#D69E25] uppercase">{c.categoryLabel}</span>
                          <h3 className="font-bold text-sm text-white line-clamp-2">{c.title}</h3>
                          <p className="text-xs text-slate-400 truncate">Instructeur: {c.instructor.name}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">Progression</span>
                          <span className="text-[#D69E25]">{progress}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                            className="bg-gradient-to-r from-[#D69E25] to-[#AB6F10] h-2 rounded-full"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenCourse(c)}
                        className="w-full py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-extrabold text-xs rounded-xl hover:brightness-110 transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#D69E25]/20"
                      >
                        <span>{progress === 100 ? 'Revoir la Formation' : 'Continuer les Leçons'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Certificats */}
        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {earnedCertificates.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucun certificat obtenu</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Terminez vos formations pour recevoir vos attestations officielles avec QR Code.
                </p>
              </div>
            ) : (
              earnedCertificates.map((cert) => (
                <motion.div
                  key={cert.id}
                  whileHover={{ y: -4 }}
                  className="group relative bg-white/[0.04] backdrop-blur-xl border-2 border-[#D69E25]/40 rounded-3xl p-6 shadow-xl overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/60 to-transparent" />
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center">
                        <Award className="w-5 h-5 text-[#D69E25]" />
                      </div>
                      <span className="font-extrabold text-xs text-white">Attestation Officielle</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{cert.id}</span>
                  </div>

                  <div className="py-4 space-y-1">
                    <h4 className="font-bold text-sm text-white">{cert.courseTitle}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Délivré le {cert.issueDate}</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {cert.grade}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => generatePDFCertificate(cert)}
                    className="w-full py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg shadow-[#D69E25]/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger en PDF</span>
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Produits */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {purchasedProducts.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <Download className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucun produit acheté</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Découvrez nos ebooks, templates et packs premium dans la Marketplace.
                </p>
              </div>
            ) : (
              purchasedProducts.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -4 }}
                  className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#D69E25]/40 transition-all duration-300"
                >
                  <img src={p.image} alt={p.title} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#021231]/90 to-transparent" />
                  <div className="p-4 space-y-3 relative">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                      {p.typeLabel}
                    </span>
                    <h4 className="font-bold text-xs text-white line-clamp-2">{p.title}</h4>
                    <button
                      onClick={() => downloadProductDeliverable(p.title, p.typeLabel, p.downloadUrl)}
                      className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-500 transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger ({p.fileSize || 'PDF/ZIP'})</span>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Paiements */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {paymentHistory.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucun historique de paiement</h3>
              </div>
            ) : (
              paymentHistory.map((pay) => (
                <div key={pay.id} className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-emerald-400/40 transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-400/30">
                          <CheckCircle className="w-3 h-3" />
                          {pay.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{pay.id}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-white">${pay.amount}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Wallet className="w-3.5 h-3.5 text-[#D69E25]" />
                          {pay.method}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Le {pay.date}</p>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5 w-full sm:w-auto">
                      {(pay.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-lg p-2">
                          <span className="text-xs font-semibold text-slate-300 truncate">{item}</span>
                          <button
                            onClick={() => downloadProductDeliverable(item, 'Produit / Formation')}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-[10px] rounded-lg hover:brightness-110 transition flex items-center gap-1 shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Paramètres */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            {/* ===== SECTION CHANGER PHOTO DE PROFIL ===== */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-6 shadow-xl space-y-5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ImageUp className="w-4 h-4 text-[#D69E25]" />
                <span>Photo de Profil</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Aperçu de l'avatar */}
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-[#D69E25] shadow-lg shadow-[#D69E25]/20"
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-[#D69E25] animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  <p className="text-xs text-slate-400">
                    Cliquez sur le bouton pour choisir une nouvelle photo. Formats acceptés : JPG, PNG, WebP. Taille max : 5 Mo.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload-input"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 transition flex items-center gap-2 shadow-lg shadow-[#D69E25]/20 disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isUploadingAvatar ? 'Upload en cours...' : 'Changer ma photo'}</span>
                    </button>
                  </div>

                  {avatarError && (
                    <p className="text-[11px] text-red-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {avatarError}
                    </p>
                  )}
                  {avatarSuccess && (
                    <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Photo de profil mise à jour avec succès !
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ===== INFORMATION DU COMPTE ===== */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#D69E25]" />
                <span>Informations du Compte</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {[
                  { label: 'Nom complet', value: user.name },
                  { label: 'Adresse e-mail', value: user.email },
                  { label: 'Téléphone', value: user.phone || 'Non renseigné' },
                  { label: 'Type de compte', value: (user.accountType || 'buyer').toUpperCase() },
                ].map((field) => (
                  <div key={field.label} className="bg-white/[0.03] p-3.5 rounded-xl border border-white/10">
                    <span className="text-slate-500 text-[11px] block font-medium">{field.label}</span>
                    <span className="font-bold text-white text-sm truncate block">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-500/5 border-2 border-red-500/40 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Zone de Danger : Suppression du Compte</h4>
                  <p className="text-xs text-red-400">Procédure de suppression définitive sous 24h</p>
                </div>
              </div>

              <div className="bg-white/[0.03] p-4 rounded-xl border border-red-500/20 text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-red-400">⚠️ Règles de suppression :</p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
                  <li>Délai de <strong className="text-white">24 heures</strong> commence immédiatement.</li>
                  <li><strong className="text-white">Blocage d'accès</strong> pendant ces 24 heures.</li>
                  <li>Suppression <strong className="text-white">définitive</strong> de toutes vos données.</li>
                </ul>
              </div>

              <button
                onClick={() => { setConfirmCheckbox(false); setIsDeleteModalOpen(true); }}
                className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Demander la suppression définitive (Délai 24h)</span>
              </button>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ===== DELETE MODAL ===== */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border-2 border-red-500/60 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl shadow-red-500/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
              
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Confirmation de Suppression (24h)</h3>
                <p className="text-xs text-slate-300">
                  Vous êtes sur le point d'initier la suppression irréversible du compte <strong className="text-amber-300">{user.email}</strong>.
                </p>
              </div>

              {deletionSuccessNotice ? (
                <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 text-xs space-y-2 text-center animate-pulse">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold">{deletionSuccessNotice}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-red-300">
                      <Lock className="w-4 h-4" /> Blocage immédiat des accès
                    </p>
                    <p className="text-[11px] text-red-200/90 leading-relaxed">
                      Pendant le délai de 24h, vous serez déconnecté et <strong>aucun accès/connexion ne sera possible</strong> jusqu'à la destruction complète du compte.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer bg-white/[0.03] p-3 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      checked={confirmCheckbox}
                      onChange={(e) => setConfirmCheckbox(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-[11px] text-slate-300 leading-snug">
                      Je confirme vouloir supprimer mon compte et j'accepte le blocage d'accès immédiat de 24h.
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs rounded-xl hover:bg-white/10 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={!confirmCheckbox || isDeleting}
                      onClick={handleInitiateAccountDeletion}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Confirmer (24h)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};