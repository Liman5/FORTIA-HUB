"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Course, DigitalProduct, MarketplaceOrder } from '../types';
import { generatePDFCertificate, downloadProductDeliverable } from '../utils/pdfGenerator';
import { apiDeleteAccount, apiSendOtp, apiToggleTwoFactor, apiGetTwoFactorStatus } from '../services/api';
import { uploadFileToR2 } from '../lib/services/clientUpload';
import { apiWritePlatform } from '../lib/services/platformWrite';
import { usePwaInstall, promptInstall } from '../lib/pwa/pwaStore';
import {
  getNotifSettings,
  saveNotifSettings,
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationSound,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
} from '../lib/services/appNotifications';
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
  Bell,
  KeyRound,
  Smartphone,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useTheme } from '../lib/store/ThemeProvider';

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
  /** Une boutique existe mais est encore en attente d'approbation admin. */
  hasPendingStore?: boolean;
  /** Ouvre la modale de soumission / suivi du dossier KYC. */
  onOpenKyc?: () => void;
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
  providerTypeLabel = 'Freelance',
  hasApprovedStore = false,
  hasPendingStore = false,
  onOpenKyc,
  badgeType,
  onUpdateProfile
}) => {
  const { isDarkMode } = useTheme();
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

  // ===== Notifications & App (système) =====
  const { isInstalled: pwaInstalled } = usePwaInstall();
  // Valeurs initiales stables (indépendantes de window) pour éviter tout
  // mismatch d'hydratation SSR ; les vraies valeurs sont chargées après montage.
  const [notifSettings, setNotifSettings] = useState<{ enabled: boolean; sound: boolean }>({
    enabled: true,
    sound: true,
  });
  const [notifPermission, setNotifPermission] = useState<string>("unsupported");
  const [notifBusy, setNotifBusy] = useState(false);

  React.useEffect(() => {
    setNotifSettings(getNotifSettings());
    setNotifPermission(getNotificationPermission());
  }, []);

  // ===== Sécurité : 2FA =====
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [twofaLoading, setTwofaLoading] = useState(false);
  const [twofaOtp, setTwofaOtp] = useState('');
  const [twofaModal, setTwofaModal] = useState<null | 'enable' | 'disable'>(null);
  const [twofaMessage, setTwofaMessage] = useState<string | null>(null);
  const [twofaError, setTwofaError] = useState<string | null>(null);
  const [twofaOtpSent, setTwofaOtpSent] = useState(false);

  // Charger l'état 2FA depuis le serveur
  React.useEffect(() => {
    let mounted = true;
    apiGetTwoFactorStatus().then((res) => {
      if (mounted) setTwoFactorEnabled(res.enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshNotifPermission = () => {
    setNotifPermission(getNotificationPermission());
  };

  const handleEnableNotifications = async () => {
    setNotifBusy(true);
    const permission = await requestNotificationPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      // Enregistre le PushSubscription (Web Push) pour recevoir les notifications
      // même lorsque l'application est fermée.
      await subscribeToPush();
    }
    setNotifSettings(getNotifSettings());
    setNotifBusy(false);
  };

  const handleToggleNotifEnabled = async () => {
    const next = !notifSettings.enabled;
    updateNotifSetting({ enabled: next });

    if (next) {
      // Activation : autorise puis abonne au Web Push
      if (getNotificationPermission() === 'granted') {
        await subscribeToPush();
      } else {
        await handleEnableNotifications();
      }
    } else {
      // Désactivation : résilie l'abonnement Web Push
      await unsubscribeFromPush();
    }
    setNotifSettings(getNotifSettings());
  };

  const updateNotifSetting = (partial: Partial<ReturnType<typeof getNotifSettings>>) => {
    const next = { ...getNotifSettings(), ...partial };
    saveNotifSettings(next);
    setNotifSettings(next);
    if (partial.sound === true) {
      playNotificationSound();
    }
  };

  const handleInstallApp = () => {
    promptInstall();
  };

  // ===== 2FA : envoi du code puis activation / désactivation =====
  const sendTwoFactorCode = async () => {
    setTwofaMessage(null);
    setTwofaError(null);
    setTwofaOtpSent(false);
    setTwofaOtp('');
    if (!user?.email) {
      setTwofaError("Adresse e-mail introuvable sur le profil.");
      return;
    }
    setTwofaLoading(true);
    const res = await apiSendOtp(user.email);
    setTwofaLoading(false);
    if (res.success) {
      setTwofaOtpSent(true);
      setTwofaMessage("Un code de sécurité à 6 chiffres a été envoyé à votre adresse e-mail.");
    } else {
      setTwofaError(res.message || "Impossible d'envoyer le code. Réessayez.");
    }
  };

  const confirmTwoFactorToggle = async () => {
    if (!twofaModal) return;
    if (!/^\d{6}$/.test(twofaOtp.trim())) {
      setTwofaError("Le code de sécurité doit comporter exactement 6 chiffres.");
      return;
    }
    setTwofaLoading(true);
    setTwofaMessage(null);
    setTwofaError(null);
    const enable = twofaModal === 'enable';
    const res = await apiToggleTwoFactor(enable, twofaOtp.trim());
    setTwofaLoading(false);
    if (!res.success) {
      setTwofaError(res.error || "Impossible de modifier la 2FA.");
      return;
    }
    setTwoFactorEnabled(enable);
    setTwofaModal(null);
    setTwofaOtpSent(false);
    setTwofaOtp('');
    setTwofaMessage(enable
      ? "Authentification à deux facteurs activée : un code vous sera demandé à chaque connexion."
      : "Authentification à deux facteurs désactivée.");
  };

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
      // Persister l'URL R2 dans Supabase (table users.avatar)
      if (user?.id) {
        apiWritePlatform("update-profile", {
          id: user.id,
          avatar: result.url,
        }).then((res) => {
          if (!res.success) {
            console.warn("[Avatar] Non persisté en base Supabase:", res.error);
          }
        });
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

  // ===== États d'accès aux espaces (verrouillés tant que le KYC n'est pas validé) =====
  const profileUnlocked = !!providerProfileManager;
  const storeCanAccess = hasApprovedStore;
  const storePending = !hasApprovedStore && hasPendingStore;
  const storeCanApply = !hasApprovedStore && !hasPendingStore && isProviderApproved;
  const instructorUnlocked = isProviderApproved;
  const actionBaseClass =
    'relative flex flex-col items-center justify-center gap-1.5 px-1.5 sm:px-3 py-3 rounded-2xl text-center font-black text-[10px] sm:text-xs leading-tight min-w-0 w-full transition overflow-hidden';
  const actionLockedClass =
    'bg-slate-500/10 border border-slate-400/40 text-slate-400 hover:bg-slate-500/20 cursor-pointer';

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

        {/* ===== NAVIGATION BUTTONS : Profil Freelance / Boutique / Formateur ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="w-full"
        >
          {/* Une seule rangée horizontale, sans scroll, responsive (3 colonnes) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* ---- Mon Profil Freelance ---- */}
            <button
              type="button"
              title={profileUnlocked ? "Gérer mon profil professionnel" : "Soumettez et faites valider votre KYC pour débloquer cet espace."}
              onClick={() => {
                if (!profileUnlocked) {
                  if (onOpenKyc) onOpenKyc();
                  return;
                }
                setIsProviderFormOpen((v) => !v);
                const el = document.getElementById('provider-profile-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`${actionBaseClass} ${profileUnlocked
                ? 'bg-gradient-to-r from-[#D69E25] via-[#F0C24B] to-[#AB6F10] text-[#021231] shadow-lg shadow-[#D69E25]/25 hover:brightness-110 active:scale-[0.98] cursor-pointer'
                : actionLockedClass}`}
            >
              <span className="flex items-center justify-center gap-1">
                <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                {profileUnlocked && (
                  <ChevronDown className={`w-3 h-3 transition-transform ${isProviderFormOpen ? 'rotate-180' : ''}`} />
                )}
              </span>
              <span className="w-full">Mon Profil {profileUnlocked ? providerTypeLabel || 'Freelance' : 'Freelance'}</span>
              {!profileUnlocked && (
                <span className="absolute top-1 right-1 text-current"><Lock className="w-3 h-3" /></span>
              )}
            </button>

            {/* ---- Boutique / Devenir Vendeur ---- */}
            <button
              type="button"
              title={
                storeCanAccess
                  ? "Accéder à mon Espace Vendeur"
                  : storePending
                  ? "Votre boutique est en attente d'approbation par l'administration"
                  : isProviderApproved
                  ? "Créer ma boutique sur la Marketplace"
                  : "Soumettez et faites valider votre KYC pour devenir vendeur."
              }
              onClick={() => {
                if (storePending) return; // boutique pas encore approuvée : accès refusé
                if (!storeCanAccess && !storeCanApply) {
                  if (onOpenKyc) onOpenKyc();
                  return;
                }
                if (onOpenVendor) onOpenVendor();
              }}
              className={`${actionBaseClass} ${storeCanAccess || storeCanApply
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] cursor-pointer'
                : storePending
                ? 'bg-gradient-to-r from-amber-500/70 to-amber-600/70 text-[#021231] cursor-not-allowed'
                : actionLockedClass}`}
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="w-full">
                {storeCanAccess ? 'Accéder à ma Boutique' : storePending ? 'Boutique en attente' : 'Devenir Vendeur'}
              </span>
              {(storePending || (!storeCanAccess && !storeCanApply)) && (
                <span className="absolute top-1 right-1 text-current"><Lock className="w-3 h-3" /></span>
              )}
            </button>

            {/* ---- Espace Formateur ---- */}
            <button
              type="button"
              title={instructorUnlocked ? "Ouvrir mon Espace Formateur" : "Soumettez et faites valider votre KYC pour débloquer l'Espace Formateur."}
              onClick={() => {
                if (!instructorUnlocked) {
                  if (onOpenKyc) onOpenKyc();
                  return;
                }
                if (onOpenInstructor) onOpenInstructor();
              }}
              className={`${actionBaseClass} ${instructorUnlocked
                ? 'bg-gradient-to-r from-sky-500 to-blue-700 text-white shadow-lg shadow-sky-500/25 hover:brightness-110 active:scale-[0.98] cursor-pointer'
                : actionLockedClass}`}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="w-full">Espace Formateur</span>
              {!instructorUnlocked && (
                <span className="absolute top-1 right-1 text-current"><Lock className="w-3 h-3" /></span>
              )}
            </button>
          </div>

          {/* Aide contextuelle selon les espaces encore verrouillés */}
          {!isProviderApproved && (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-slate-400">
              <Lock className="w-3 h-3 shrink-0" />
              Soumettez votre dossier KYC et faites-le valider pour débloquer vos espaces Freelance, Boutique et Formateur.
            </p>
          )}
          {isProviderApproved && storePending && (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-amber-400">
              <Lock className="w-3 h-3 shrink-0" />
              Votre boutique est en attente d&apos;approbation : elle sera accessible dès validation par l&apos;administration.
            </p>
          )}
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
                <span>Consulter mon Profil {providerTypeLabel || 'Freelance'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

        {/* ===== TABS ===== */}
        <div className="relative">
          {/* Arrière-plan dégradé pour indiquer le scroll (mode sombre uniquement,
              sinon il apparaît noir en mode clair) */}
          {isDarkMode && (
            <>
              <div className="absolute pointer-events-none inset-y-0 left-0 w-10 bg-gradient-to-r from-[#021231] to-transparent z-10 opacity-80" />
              <div className="absolute pointer-events-none inset-y-0 right-0 w-10 bg-gradient-to-l from-[#021231] to-transparent z-10 opacity-80" />
            </>
          )}
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

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-sm text-white">{cert.courseTitle}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Délivré le {cert.issueDate}</span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {cert.grade}
                        </span>
                      </div>
                      {cert.qrCodeUrl && (
                        <p className="text-[10px] text-slate-500">
                          Attestation authentique vérifiable par QR Code unique.
                        </p>
                      )}
                    </div>
                    {cert.qrCodeUrl && (
                      <div className="shrink-0 bg-white rounded-lg p-1 shadow">
                        <img
                          src={cert.qrCodeUrl}
                          alt={`QR Code attestation ${cert.id}`}
                          className="w-16 h-16 object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
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
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-[#D69E25] shadow-lg shadow-[#D69E25]/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-2 border-[#D69E25] bg-[#011D46] flex items-center justify-center shadow-lg shadow-[#D69E25]/20">
                      <User className="w-10 h-10 text-[#D69E25]" />
                    </div>
                  )}
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

            {/* ===== SECTION NOTIFICATIONS & APPLICATION ===== */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D69E25]" />
                <span>Notifications & Application</span>
              </h3>

              {/* Statut permission */}
              <div className="flex items-center justify-between gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Notifications système</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {notifPermission === 'granted'
                      ? isPushSupported()
                        ? 'Autorisées + Web Push actif : alertes même lorsque l\u2019app est fermée.'
                        : 'Autorisées — vous recevez les alertes comme une vraie app.'
                      : notifPermission === 'denied'
                      ? 'Bloquées par le navigateur (paramètres du site).'
                      : notifPermission === 'unsupported'
                      ? 'Non supportées sur ce navigateur / cette app.'
                      : 'Permission non demandée. Autorisez pour recevoir les alertes.'}
                  </p>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  disabled={notifBusy || notifPermission === 'granted'}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition disabled:opacity-60 ${
                    notifPermission === 'granted'
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                      : 'bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] hover:brightness-110'
                  }`}
                >
                  {notifBusy ? 'Demande...' : notifPermission === 'granted' ? 'Autorisée ✓' : 'Autoriser'}
                </button>
              </div>

              {/* Toggle réception des alertes */}
              <div className="flex items-center justify-between gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Recevoir les alertes</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Activer ou désactiver les notifications de l'application.</p>
                </div>
                <button
                  onClick={handleToggleNotifEnabled}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition border ${
                    notifSettings.enabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/15 text-slate-300'
                  }`}
                >
                  {notifSettings.enabled ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Toggle sonnerie */}
              <div className="flex items-center justify-between gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Sonnerie personnalisée</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Jouer la sonnerie FORTIA lors de chaque notification.</p>
                </div>
                <button
                  onClick={() => updateNotifSetting({ sound: !notifSettings.sound })}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition border ${
                    notifSettings.sound
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/15 text-slate-300'
                  }`}
                >
                  {notifSettings.sound ? 'Son activé' : 'Silencieux'}
                </button>
              </div>

              {/* Télécharger l'application */}
              {!pwaInstalled ? (
                <div className="flex items-center justify-between gap-3 bg-[#D69E25]/5 p-4 rounded-xl border border-[#D69E25]/30">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#D69E25]">Application FORTIA HUB</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Téléchargez l'app pour un accès rapide et les notifications système.
                    </p>
                  </div>
                  <button
                    onClick={handleInstallApp}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-[10px] hover:brightness-110 active:scale-95 transition shadow-md"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Télécharger
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs font-bold text-emerald-400">
                  <Check className="w-4 h-4 shrink-0" />
                  Application installée : accès rapide et notifications système disponibles.
                </div>
              )}
            </div>

            {/* ===== SECTION SÉCURITÉ : 2FA ===== */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D69E25]" />
                <span>Sécurité : Authentification à deux facteurs (2FA)</span>
              </h3>

              <div className="flex items-center justify-between gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Protection 2FA du compte</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {twoFactorEnabled
                      ? 'Activée — un code par e-mail vous sera demandé à chaque connexion.'
                      : 'Désactivée — vos connexions ne demandent que le mot de passe.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTwofaMessage(null);
                    setTwofaError(null);
                    setTwofaModal(twoFactorEnabled ? 'disable' : 'enable');
                  }}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition border ${
                    twoFactorEnabled
                      ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                      : 'bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] hover:brightness-110'
                  }`}
                >
                  {twoFactorEnabled ? 'Désactiver' : 'Activer'}
                </button>
              </div>

              {twofaMessage && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {twofaMessage}
                </div>
              )}
              {twofaError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-[11px] font-semibold text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {twofaError}
                </div>
              )}
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

      {/* ===== MODAL 2FA (code de sécurité) ===== */}
      <AnimatePresence>
        {twofaModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border-2 border-[#D69E25]/60 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl shadow-[#D69E25]/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/60 to-transparent" />

              <button
                onClick={() => {
                  setTwofaModal(null);
                  setTwofaOtpSent(false);
                  setTwofaOtp('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 text-[#D69E25] border border-[#D69E25]/40 flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {twofaModal === 'enable' ? 'Activer la 2FA' : 'Désactiver la 2FA'}
                </h3>
                <p className="text-xs text-slate-300">
                  Un code de sécurité à 6 chiffres sera envoyé à{' '}
                  <strong className="text-amber-300">{user?.email}</strong> pour confirmer l'opération.
                </p>
              </div>

              {twofaError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-[11px] font-semibold text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {twofaError}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={sendTwoFactorCode}
                  disabled={twofaLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] font-black text-xs rounded-xl hover:bg-[#D69E25]/20 transition disabled:opacity-50"
                >
                  {twofaLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {twofaOtpSent ? 'Renvoyer le code' : 'Envoyer le code de sécurité'}
                </button>

                {twofaOtpSent && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twofaOtp}
                      onChange={(e) => setTwofaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Saisir les 6 chiffres (ex: 123456)"
                      className="w-full bg-[#011D46] border border-[#D69E25]/60 text-center font-mono text-sm tracking-widest text-amber-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#D69E25]"
                    />
                    <button
                      type="button"
                      onClick={confirmTwoFactorToggle}
                      disabled={twofaLoading || !twofaOtp}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl hover:brightness-110 transition shadow-lg disabled:opacity-50"
                    >
                      {twofaLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          {twofaModal === 'enable' ? 'Confirmer l' : 'Confirmer la d'}ésactivation
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};