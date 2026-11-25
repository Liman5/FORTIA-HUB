"use client";

import { QrCodeImage } from "@/components/ui/QrCodeImage";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Course, DigitalProduct, MarketplaceOrder } from '../types';
import { downloadProductDeliverable } from '../utils/pdfGenerator';
import { apiDeleteAccount, apiToggleTwoFactor, apiGetTwoFactorStatus, apiTwoFactorSetup } from '../services/api';
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
  Check,
  Library,
  Heart,
} from 'lucide-react';
import { ProfileHeader } from '@/components/member/ProfileHeader';
import { useFavorites } from '@/lib/store/favoritesStore';
import { ProfilePersonalCard } from '@/components/member/ProfilePersonalCard';
import { useTheme } from '../lib/store/ThemeProvider';

interface MemberDashboardProps {
  user: UserProfile;
  courses: Course[];
  digitalProducts: DigitalProduct[];
  onOpenCourse: (course: Course) => void;
  onLogout?: () => void;
  initialTab?: 'payments' | 'settings';
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
  initialTab = 'settings',
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
  const router = useRouter();
  /* Favoris : compteur partagé avec la page /favorites (même store). */
  const { count: favoritesCount } = useFavorites();
  const [activeTab, setActiveTab] = useState<'payments' | 'settings'>(initialTab || 'settings');
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
  const [twofaSetup, setTwofaSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);

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

  // ===== 2FA TOTP (Google Authenticator) =====
  const beginTwoFactorSetup = async () => {
    setTwofaMessage(null);
    setTwofaError(null);
    setTwofaLoading(true);
    const res = await apiTwoFactorSetup();
    setTwofaLoading(false);
    if (!res.success || !res.secret) {
      setTwofaError(res.error || "Impossible de générer la clé 2FA.");
      return;
    }
    setTwofaSetup({ secret: res.secret, otpauthUrl: res.otpauthUrl || "" });
  };

  const copyTwoFactorSecret = async () => {
    if (!twofaSetup?.secret) return;
    try {
      await navigator.clipboard.writeText(twofaSetup.secret);
      setTwofaMessage("Clé secrète copiée ! Collez-la dans Google Authenticator.");
    } catch {
      setTwofaMessage("Impossible de copier automatiquement : sélectionnez la clé manuellement.");
    }
  };

  const confirmTwoFactorToggle = async () => {
    if (!twofaModal) return;
    if (!/^\d{6}$/.test(twofaOtp.trim())) {
      setTwofaError("Le code Google Authenticator doit comporter exactement 6 chiffres.");
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
    setTwofaSetup(null);
    setTwofaMessage(enable
      ? "Authentification à deux facteurs activée : Google Authenticator vous demandera un code à chaque connexion."
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
        "Votre demande de suppression est enregistrée. La suppression définitive interviendra après un délai de rétention de 7 jours minimum. Vous pouvez annuler la demande pendant ce délai."
      );
    }
  };

  const handleCancelAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/deletion", { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setDeletionSuccessNotice("Votre demande de suppression a été annulée.");
        setConfirmCheckbox(false);
      } else {
        setDeletionSuccessNotice(data?.error || "Annulation impossible.");
      }
    } catch {
      setDeletionSuccessNotice("Annulation impossible. Vérifiez votre connexion.");
    } finally {
      setIsDeleting(false);
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

  // Normalisation défensive : une formation remontée de la base peut ne pas
  // contenir d'objet « instructor » (ni d'image), ce qui ferait planter le rendu.
  const enrolledCourses = (courses || [])
    .filter((c) => c && enrolledIds.includes(c.id))
    .map((c) => ({
      ...c,
      title: c.title || 'Formation',
      categoryLabel: c.categoryLabel || 'Formation',
      image: c.image || '',
      instructor: c.instructor || { name: 'FORTIA HUB', role: 'Formateur', avatar: '' },
    }));
  const purchasedProducts = (digitalProducts?.length ? digitalProducts : marketplaceProducts?.length ? marketplaceProducts : []).filter(p => mergedProductIds.includes(p.id));

  const tabs = [
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

  // Garde-fou global : tant que le profil membre n'est pas disponible, on
  // n'affiche pas le tableau de bord (évite tout accès à « undefined.name »).
  if (!user) {
    return (
      <section className="py-10 bg-[#021231] min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400 font-semibold">Chargement de votre espace membre...</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-10 min-h-[600px] relative overflow-hidden fortia-flat ${activeTab === 'settings' ? 'ibx-profile-page' : 'bg-[#021231]'}`}>
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.03)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <ProfileHeader
          user={user}
          badgeType={badgeType}
          kycStatus={user.kycStatus}
          isProviderApproved={isProviderApproved}
          stats={{
            courses: enrolledCourses.length,
            certificates: earnedCertificates.length,
            purchases: purchasedProducts.length,
          }}
          onOpenKyc={onOpenKyc}
        />

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

          {/* Ma Bibliothèque : les formations suivies, les achats et les attestations
              y sont regroupés (plus de doublon avec cette page « Compte »). */}
          <button
            type="button"
            onClick={() => router.push('/library')}
            className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center justify-between gap-3 rounded-2xl border border-[#D69E25]/40 bg-[#D69E25]/10 px-4 py-3 text-left hover:bg-[#D69E25]/20 transition"
          >
            <span className="flex items-center gap-2.5">
              <Library className="w-4 h-4 text-[#D69E25]" />
              <span className="text-xs font-black text-white">
                Ma Bibliothèque
                <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                  Formations suivies · produits achetés · attestations
                </span>
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#D69E25] -rotate-90" />
          </button>

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

            {/* Accès direct à la page des favoris (même rangée que les onglets) */}
            <button
              type="button"
              onClick={() => router.push('/favorites')}
              title="Voir mes favoris"
              className="relative px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 text-slate-400 hover:text-slate-200 border-b-2 border-transparent"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Favoris</span>
              {favoritesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white/10 text-slate-400">
                  {favoritesCount}
                </span>
              )}
            </button>
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
        {/* Les formations suivies, les achats et les attestations sont désormais
            regroupés dans la page Bibliothèque (/library) : plus de doublon ici. */}
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
            <ProfilePersonalCard
              user={user}
              onSaved={(updates) => onUpdateProfile?.(updates)}
              fileInputRef={fileInputRef}
              onAvatarChange={handleAvatarChange}
              isUploadingAvatar={isUploadingAvatar}
              avatarError={avatarError}
              avatarSuccess={avatarSuccess}
            />

            {/* ===== SECTION NOTIFICATIONS & APPLICATION ===== */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D69E25]" />
                <span>Notifications & Application</span>
              </h3>

              {/* Statut permission */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">Notifications système</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
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
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">Recevoir les alertes</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Activer ou désactiver les notifications de l'application.</p>
                </div>
                <button
                  onClick={handleToggleNotifEnabled}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition border ${
                    notifSettings.enabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/15 text-slate-600'
                  }`}
                >
                  {notifSettings.enabled ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Toggle sonnerie */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">Sonnerie personnalisée</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Jouer la sonnerie FORTIA lors de chaque notification.</p>
                </div>
                <button
                  onClick={() => updateNotifSetting({ sound: !notifSettings.sound })}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition border ${
                    notifSettings.sound
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/15 text-slate-600'
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
                    <p className="text-[11px] text-slate-500 mt-0.5">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D69E25]" />
                <span>Sécurité : Authentification à deux facteurs (2FA)</span>
              </h3>

              <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">Protection 2FA du compte</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
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
                    setTwofaSetup(null);
                    setTwofaOtp('');
                    setTwofaMessage(null);
                    setTwofaError(null);
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

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Zone de Danger : Suppression du Compte</h4>
                  <p className="text-xs text-red-400">Procédure de suppression définitive sous 7 jours</p>
                </div>
              </div>

              <div className="bg-white/[0.03] p-4 rounded-xl border border-red-200 text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-red-400">⚠️ Règles de suppression :</p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
                  <li>Délai de <strong className="text-slate-900">7 jours</strong> avant toute suppression.</li>
                  <li>Vous pouvez <strong className="text-slate-900">annuler la demande</strong> pendant ce délai.</li>
                  <li>Suppression <strong className="text-slate-900">définitive</strong> de toutes vos données.</li>
                </ul>
              </div>

              <button
                onClick={() => { setConfirmCheckbox(false); setIsDeleteModalOpen(true); }}
                className="px-5 py-3 bg-red-600 hover:bg-red-500 text-slate-900 font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Demander la suppression définitive (Délai 7 jours)</span>
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
                <h3 className="text-lg font-black text-white">Confirmation de Suppression (7 jours)</h3>
                <p className="text-xs text-slate-300">
                  Vous êtes sur le point d'initier la suppression irréversible du compte <strong className="text-amber-300">{user.email}</strong>.
                </p>
              </div>

              {deletionSuccessNotice ? (
                <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 text-xs space-y-2 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold">{deletionSuccessNotice}</p>
                  <button
                    type="button"
                    onClick={handleCancelAccountDeletion}
                    disabled={isDeleting}
                    className="mt-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-[11px] hover:bg-white/20 disabled:opacity-40"
                  >
                    Annuler ma demande de suppression
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-red-300">
                      <Lock className="w-4 h-4" /> Délai de rétention obligatoire
                    </p>
                    <p className="text-[11px] text-red-200/90 leading-relaxed">
                      Votre compte reste accessible pendant <strong>7 jours</strong>. Vous pouvez annuler la demande à tout moment pendant ce délai. La suppression définitive interviendra au plus tôt après ces 7 jours.
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
                      Je confirme vouloir supprimer mon compte et je comprends qu'un délai de rétention de 7 jours s'applique.
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
                          <span>Confirmer (7 jours)</span>
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
                  setTwofaSetup(null);
                  setTwofaError(null);
                  setTwofaMessage(null);
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
                  {twofaModal === 'enable' ? 'Activer la 2FA (Google Authenticator)' : 'Désactiver la 2FA'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {twofaModal === 'enable'
                    ? 'Scannez le QR Code ou copiez la clé secrète dans Google Authenticator, puis saisissez le code affiché pour confirmer.'
                    : 'Saisissez le code à 6 chiffres actuellement affiché dans Google Authenticator pour confirmer la désactivation.'}
                </p>
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

              {twofaModal === 'enable' && !twofaSetup ? (
                <button
                  type="button"
                  onClick={beginTwoFactorSetup}
                  disabled={twofaLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl hover:brightness-110 transition shadow-lg disabled:opacity-50"
                >
                  {twofaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {twofaLoading ? 'Génération…' : '1. Générer ma clé secrète'}
                </button>
              ) : twofaModal === 'enable' && twofaSetup ? (
                <div className="space-y-4">
                  {twofaSetup.otpauthUrl && (
                    <div className="flex justify-center">
                      <QrCodeImage
                        value={twofaSetup.otpauthUrl}
                        alt="QR Code Google Authenticator"
                        className="h-40 w-40 rounded-xl p-2"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 mb-1">Clé secrète à copier :</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#011D46] border border-[#D69E25]/50 rounded-lg px-3 py-2 text-[11px] font-mono text-amber-300 break-all select-all">
                        {twofaSetup.secret}
                      </code>
                      <button
                        type="button"
                        onClick={copyTwoFactorSecret}
                        className="shrink-0 px-3 py-2 bg-[#D69E25] text-[#021231] font-black text-[11px] rounded-lg"
                      >
                        Copier
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Google Authenticator → « + » → « Saisir une clé » → collez cette clé.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twofaOtp}
                      onChange={(e) => setTwofaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="2. Saisir les 6 chiffres de Google Authenticator"
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
                          Vérification…
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Activer la 2FA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twofaOtp}
                    onChange={(e) => setTwofaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Code Google Authenticator (6 chiffres)"
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
                        Vérification…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Confirmer la désactivation
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};