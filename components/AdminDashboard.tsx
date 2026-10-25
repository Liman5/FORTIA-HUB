"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Course, 
  DigitalProduct, 
  ServiceQuoteRequest, 
  RegistrationFeeConfig, 
  KycSubmission,
  VendorStore,
  VendorApplication,
  MarketplaceOrder,
  PayoutRequest,
  MarketplaceConfig,
  PostPurchaseSupportSubmission,
  SiteContent,
  ServicePackage,
  TrainingCenter,
  InstructorCommission,
  InstructorStoragePurchase
} from '../types';
import { ProductImageUploader } from './ProductImageUploader';
import { ProductDeliverableUploader, DeliverableFile } from './ProductDeliverableUploader';
import { AdminInstructorsPanel } from './AdminInstructorsPanel';
import { AdminServicesPanel } from './AdminServicesPanel';
import { CommissionRatesPanel } from './admin/CommissionRatesPanel';
import { enhanceTitle, enhanceDescription, enhanceFeatures } from '../utils/aiEnhancer';
import { getSignedUrl } from '../lib/services/clientUpload';
import { apiWritePlatform } from '../lib/services/platformWrite';
import { useAppStore } from '@/lib/store/AppStore';
import { SuccessConfirmationModal } from './SuccessConfirmationModal';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  BookOpen, 
  ShoppingBag, 
  Award, 
  Plus, 
  Trash2, 
  Edit, 
  Check,
  DollarSign,
  Settings,
  FileCheck,
  CheckCircle2,
  XCircle,
  Store,
  Ban,
  Clock,
  ArrowUpRight,
  Percent,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Mail,
  Globe,
  Briefcase,
  Video,
  Volume2,
  Save,
  X,
  Image,
  EyeOff
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: 'stats' | 'site_content' | 'courses' | 'products' | 'services' | 'quotes' | 'kyc' | 'fees' | 'marketplace' | 'support' | 'instructors';
  hideShell?: boolean;
  courses: Course[];
  digitalProducts: DigitalProduct[];
  serviceQuotes: ServiceQuoteRequest[];
  feeConfig: RegistrationFeeConfig;
  onUpdateFeeConfig: (config: RegistrationFeeConfig) => void;
  kycSubmissions: KycSubmission[];
  onApproveKyc: (id: string) => void;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  /** Active/désactive la mise en avant éditoriale (persistée dans courses.is_featured). */
  onToggleFeatured?: (courseId: string, isFeatured: boolean) => void;
  onAddProduct: (newProduct: DigitalProduct) => void;
  onUpdateProduct: (updatedProduct: DigitalProduct) => void;
  onDeleteProduct: (productId: string) => void;
  
  // Site Content & Media CMS
  siteContent?: SiteContent;
  onUpdateSiteContent?: (newContent: SiteContent) => void;

  // Marketplace Props
  stores?: VendorStore[];
  onDeleteStore?: (storeId: string) => void;
  vendorApplications?: VendorApplication[];
  marketplaceOrders?: MarketplaceOrder[];
  payoutRequests?: PayoutRequest[];
  marketplaceConfig?: MarketplaceConfig;
  postPurchaseSubmissions?: PostPurchaseSupportSubmission[];
  onDeleteSupportSubmission?: (submissionId: string) => void;
  onApproveStore?: (storeId: string) => void;
  onSuspendStore?: (storeId: string) => void;
  onApproveVendorApplication?: (appId: string) => void;
  onRejectVendorApplication?: (appId: string) => void;
  onApprovePayout?: (payoutId: string) => void;
  onUpdateMarketplaceConfig?: (config: MarketplaceConfig) => void;

  // Services Agence
  services?: ServicePackage[];
  onAddService?: (service: ServicePackage) => void;
  onUpdateService?: (service: ServicePackage) => void;
  onDeleteService?: (id: string) => void;
  onToggleServiceActive?: (id: string) => void;

  // Instructor Academy
  trainingCenters?: TrainingCenter[];
  instructorCommissions?: InstructorCommission[];
  instructorStoragePurchases?: InstructorStoragePurchase[];
  onAddInstructor?: (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => void;
  onSuspendCourse?: (courseId: string) => void;
}

// Affiche les documents KYC depuis R2 (URL signée) — visualisation avant approbation
function KycDocumentViewer({ url, label }: { url?: string; label: string }) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    if (!url) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }
    // Ancienne valeur : URL publique déjà exploitable
    if (url.startsWith("http")) {
      setSignedUrl(url);
      setLoading(false);
      return;
    }

    // Clé R2 privée → URL signée (l'admin est autorisé par son jeton)
    setLoading(true);
    getSignedUrl(url).then((res) => {
      if (cancelled) return;
      if (res.success && res.url) {
        setSignedUrl(res.url);
      } else {
        setSignedUrl(null);
        setError(res.error || "Fichier inaccessible.");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const isPdf = /\.pdf(\?|$)/i.test(String(url || "")) || /\.pdf(\?|$)/i.test(String(signedUrl || ""));

  if (!url) {
    return (
      <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800 min-h-[120px] flex items-center justify-center">
        <p className="text-[10px] text-slate-500 italic">{label} : non fourni</p>
      </div>
    );
  }

  return (
    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">{label}</span>

      {loading ? (
        <div className="flex items-center justify-center min-h-[110px] text-[10px] text-slate-400">
          <Clock className="w-4 h-4 mr-1.5 animate-spin" /> Chargement du document…
        </div>
      ) : signedUrl ? (
        isPdf ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 min-h-[110px] rounded-lg border border-slate-700 bg-slate-900/40 text-[11px] font-bold text-[#D69E25] hover:border-[#D69E25]/60 transition"
          >
            <span className="text-lg">📄</span>
            Ouvrir le PDF
          </a>
        ) : (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block group">
            <img
              src={signedUrl}
              alt={label}
              className="w-full h-44 object-contain rounded-lg border border-slate-700 bg-slate-950/60 group-hover:opacity-80 transition"
            />
            <span className="mt-1.5 block text-[10px] font-bold text-[#D69E25] text-center">
              Cliquer pour agrandir ↗
            </span>
          </a>
        )
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 min-h-[110px] text-[10px] text-red-400 text-center px-1">
          <XCircle className="w-4 h-4" />
          <span>{error || "Fichier inaccessible"}</span>
        </div>
      )}
    </div>
  );
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'marketplace',
  hideShell = false,
  courses,
  digitalProducts,
  serviceQuotes,
  feeConfig,
  onUpdateFeeConfig,
  kycSubmissions,
  onApproveKyc,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onToggleFeatured,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  siteContent,
  onUpdateSiteContent,
  stores = [],
  onDeleteStore,
  vendorApplications = [],
  marketplaceOrders = [],
  payoutRequests = [],
  marketplaceConfig = { platformCommissionPercentage: 10, autoApproveNewProducts: true, minWithdrawalUsd: 20, acceptedPaymentGateways: [] },
  postPurchaseSubmissions = [],
  onDeleteSupportSubmission,
  onApproveStore,
  onSuspendStore,
  onApproveVendorApplication,
  onRejectVendorApplication,
  onApprovePayout,
  onUpdateMarketplaceConfig,
  services = [],
  onAddService,
  onUpdateService,
  onDeleteService,
  onToggleServiceActive,
  trainingCenters = [],
  instructorCommissions = [],
  instructorStoragePurchases = [],
  onAddInstructor,
  onSuspendCourse
}) => {
  // Setter du store : permet à l'admin de modifier / bannir / supprimer un
  // centre et de voir le résultat immédiatement (sans rechargement).
  const { setTrainingCenters, refreshPlatformData, loadAdminData } = useAppStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'site_content' | 'courses' | 'products' | 'services' | 'quotes' | 'kyc' | 'fees' | 'marketplace' | 'support' | 'instructors'>(initialTab);
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);

  // Site Content Form State (les contenus viennent des données Supabase)
  const [siteForm, setSiteForm] = useState<SiteContent>(siteContent || ({} as SiteContent));
  const [showCourseSuccess, setShowCourseSuccess] = useState(false);

  useEffect(() => {
    if (siteContent) {
      setSiteForm(siteContent);
    }
  }, [siteContent]);

  const handleSaveSiteContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSiteContent) {
      onUpdateSiteContent(siteForm);
    }
    alert('Contenus du site et médias synchronisés en temps réel avec succès !');
  };

  // Course Edit Modal State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseCategory, setEditCourseCategory] = useState<any>('crypto');
  const [editCoursePrice, setEditCoursePrice] = useState(0);
  const [editCourseLevel, setEditCourseLevel] = useState('Tous niveaux');
  const [editCourseDuration, setEditCourseDuration] = useState(10);
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseImage, setEditCourseImage] = useState('');

  const handleStartEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditCourseTitle(course.title);
    setEditCourseCategory(course.category);
    setEditCoursePrice(course.price);
    setEditCourseLevel(course.level || 'Tous niveaux');
    setEditCourseDuration(course.durationHours || 10);
    setEditCourseDesc(course.description);
    setEditCourseImage(course.image);
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    const updated: Course = {
      ...editingCourse,
      title: editCourseTitle,
      category: editCourseCategory,
      categoryLabel: String(editCourseCategory).toUpperCase(),
      price: Number(editCoursePrice),
      level: editCourseLevel as any,
      durationHours: Number(editCourseDuration),
      description: editCourseDesc,
      image: editCourseImage || editingCourse.image
    };
    if (onUpdateCourse) {
      onUpdateCourse(updated);
    }
    setEditingCourse(null);
    alert('Formation mise à jour et synchronisée sur le site avec succès !');
  };

  // Calculate Marketplace metrics - Memoized for performance
  const totalMarketplaceVolumeUsd = useMemo(() => {
    // Volume réel : somme des commandes + revenu des boutiques (pas de valeur factice)
    // Les montants renvoyés par l'API sont des Decimal sérialisés en CHAÎNE :
    // sans Number(), `sum + "25"` produisait « 02525… » (chiffres irréels).
    return (marketplaceOrders || []).reduce(
      (sum, o) => sum + (Number(o?.amountUsd) || 0),
      0
    );
  }, [marketplaceOrders]);

  /** Commissions RÉELLEMENT prélevées (champ enregistré sur chaque commande). */
  const totalPlatformCommissionsUsd = useMemo(() => {
    return (marketplaceOrders || []).reduce(
      (sum, o) => sum + (Number(o?.platformCommissionUsd) || 0),
      0
    );
  }, [marketplaceOrders]);

  // Helpers de statut — accepte les deux formes (espace/accents = client, underscore = Supabase/Prisma)
  const isPending = (s?: string) => s === 'En attente' || s === 'En_attente';
  const isApproved = (s?: string) => s === 'Approuvé' || s === 'Approuve';
  const isRejected = (s?: string) => s === 'Rejeté' || s === 'Rejete';
  const isPaid = (s?: string) => s === 'Payé' || s === 'Paye';

  const pendingApplicationsCount = useMemo(() => {
    return (vendorApplications || []).filter(a => isPending(a?.status)).length;
  }, [vendorApplications]);

  const pendingPayoutsCount = useMemo(() => {
    return (payoutRequests || []).filter(p => isPending(p?.status)).length;
  }, [payoutRequests]);


  // Fee Config local form
  const [freelanceUsd, setFreelanceUsd] = useState(feeConfig.freelanceFeeUsd);
  const [freelanceFcfa, setFreelanceFcfa] = useState(feeConfig.freelanceFeeFcfa);
  const [enterpriseUsd, setEnterpriseUsd] = useState(feeConfig.enterpriseFeeUsd);
  const [enterpriseFcfa, setEnterpriseFcfa] = useState(feeConfig.enterpriseFeeFcfa);

  // Simple quick add modal state
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState(79);
  const [newCourseCategory, setNewCourseCategory] = useState<string>('crypto');

  const handleSaveFees = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFeeConfig({
      ...feeConfig,
      freelanceFeeUsd: Number(freelanceUsd),
      freelanceFeeFcfa: Number(freelanceFcfa),
      enterpriseFeeUsd: Number(enterpriseUsd),
      enterpriseFeeFcfa: Number(enterpriseFcfa)
    });
    alert('Frais d\'inscription mis à jour avec succès !');
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle) return;

    const courseObj: Course = {
      id: `c-custom-${Date.now()}`,
      title: newCourseTitle,
      slug: newCourseTitle.toLowerCase().replace(/\s+/g, '-'),
      category: newCourseCategory as any,
      categoryLabel: newCourseCategory.toUpperCase(),
      description: 'Formation personnalisée ajoutée depuis le panneau d\'administration de FORTIA HUB.',
      fullDescription: 'Programme certifiant complet rédigé par les formateurs agréés.',
      level: 'Tous niveaux',
      durationHours: 12,
      lessonsCount: 15,
      price: Number(newCoursePrice),
      rating: 5.0,
      reviewsCount: 1,
      studentsCount: 0,
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      instructor: {
        name: 'Ibrahima Cham',
        role: 'Fondateur & Expert',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      },
      learningOutcomes: ['Maîtrise complète du sujet', 'Certification officielle'],
      chapters: [
        {
          id: 'ch-1',
          title: 'Chapitre 1: Introduction & Fondations',
          lessons: [{ id: 'l-1', title: 'Vue d\'ensemble du cours', duration: '15 min', type: 'video' }]
        }
      ]
    };

    onAddCourse(courseObj);
    setShowAddCourse(false);
    setNewCourseTitle('');
    setShowCourseSuccess(true);
  };

  // Product Add / Edit Modal State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [adminProdModalStep, setAdminProdModalStep] = useState<1 | 2>(1);
  // ID temporaire pour les uploads R2 (remplacé par l'ID réel du produit à la création)
  const [adminNewProdEntityId, setAdminNewProdEntityId] = useState(`admin-new-${Date.now()}`);
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdType, setNewProdType] = useState<any>('ebook');
  const [newProdPrice, setNewProdPrice] = useState(29);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdFormat, setNewProdFormat] = useState('PDF');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdBannerImage, setNewProdBannerImage] = useState('');
  const [adminProdFeatures, setAdminProdFeatures] = useState('Accès instantané 24/7\nMises à jour gratuites à vie');

  const [adminDeliverables, setAdminDeliverables] = useState<DeliverableFile[]>([]);
  const [adminDownloadUrl, setAdminDownloadUrl] = useState('');
  const [adminAiCounts, setAdminAiCounts] = useState({ title: 0, desc: 0, feat: 0 });

  const handleAdminEnhanceTitle = () => {
    const val = enhanceTitle(newProdTitle, newProdType, adminAiCounts.title);
    setNewProdTitle(val);
    setAdminAiCounts(prev => ({ ...prev, title: prev.title + 1 }));
  };

  const handleAdminEnhanceDesc = () => {
    const val = enhanceDescription(newProdDesc, newProdTitle, adminAiCounts.desc);
    setNewProdDesc(val);
    setAdminAiCounts(prev => ({ ...prev, desc: prev.desc + 1 }));
  };

  const handleAdminEnhanceFeatures = () => {
    const val = enhanceFeatures(adminProdFeatures, adminAiCounts.feat);
    setAdminProdFeatures(val);
    setAdminAiCounts(prev => ({ ...prev, feat: prev.feat + 1 }));
  };

  const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);
  const [editProdTitle, setEditProdTitle] = useState('');
  const [editProdType, setEditProdType] = useState<any>('ebook');
  const [editProdPrice, setEditProdPrice] = useState(0);
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdFormat, setEditProdFormat] = useState('');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdIsPopular, setEditProdIsPopular] = useState(false);

  const TYPE_LABELS: Record<string, string> = {
    ebook: 'eBook PDF',
    canva_template: 'Modèle Canva Pro',
    ai_prompts: 'Pack Prompts IA',
    whitepaper: 'White Paper PDF',
    business_plan: 'Business Plan',
    contract: 'Contrat Type',
    pitch_deck: 'Pitch Deck',
    premium_pack: 'Pack Premium',
    course: 'Formation Vidéo'
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle) return;

    const feats = adminProdFeatures.split('\n').filter(Boolean);

    const prodObj: DigitalProduct = {
      id: `p-custom-${Date.now()}`,
      title: newProdTitle,
      type: newProdType,
      typeLabel: TYPE_LABELS[newProdType] || 'Ressource Numérique',
      description: newProdDesc || 'Ressource numérique d\'excellence prête au téléchargement instantané.',
      price: Number(newProdPrice),
      originalPrice: Number(newProdPrice) * 1.5,
      rating: 5.0,
      salesCount: 1,
      fileFormat: newProdFormat || 'PDF',
      fileSize: '15 MB',
      image: newProdImage || '',
      bannerImage: newProdBannerImage || '',
      features: feats.length > 0 ? feats : ['Accès instantané 24/7', 'Mises à jour gratuites à vie'],
      downloadUrl: adminDownloadUrl || '#',
      isPopular: true
    };

    onAddProduct(prodObj);
    setShowAddProduct(false);
    setAdminProdModalStep(1);
    setNewProdTitle('');
    setNewProdDesc('');
    alert('Nouveau produit avec fichiers livrables ajouté à la boutique avec succès !');
  };

  const handleStartEditProduct = (prod: DigitalProduct) => {
    setEditingProduct(prod);
    setEditProdTitle(prod.title);
    setEditProdType(prod.type);
    setEditProdPrice(prod.price);
    setEditProdDesc(prod.description);
    setEditProdFormat(prod.fileFormat);
    setEditProdImage(prod.image);
    setEditProdIsPopular(!!prod.isPopular);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updated: DigitalProduct = {
      ...editingProduct,
      title: editProdTitle,
      type: editProdType,
      typeLabel: TYPE_LABELS[editProdType] || editingProduct.typeLabel,
      price: Number(editProdPrice),
      description: editProdDesc,
      fileFormat: editProdFormat,
      image: editProdImage,
      isPopular: editProdIsPopular
    };

    onUpdateProduct(updated);
    setEditingProduct(null);
    alert('Produit modifié avec succès !');
  };

  const handleDeleteProductConfirm = (prod: DigitalProduct) => {
    onDeleteProduct(prod.id);
  };

  return (
    <section className={hideShell ? "text-white" : "py-12 bg-[#021231] text-white min-h-[600px]"}>
      <div className={hideShell ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"}>
        
        {/* Admin Banner - masqué en mode module */}
        {!hideShell && (
        <div className="admin-shell-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Panneau d'Administration Général</h2>
              <p className="text-xs text-slate-400">Gestion des utilisateurs, formations, produits, devis et certificats.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddCourse(true)}
              className="px-4 py-2.5 bg-slate-800 text-white border border-slate-700 font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Formation</span>
            </button>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Produit Numérique</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#011D46] p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold">Chiffre d'Affaires</span>
              <DollarSign className="w-4 h-4 text-[#D69E25]" />
            </div>
            <p className="text-2xl font-black text-[#D69E25]">${totalMarketplaceVolumeUsd.toLocaleString('en-US')}</p>
            <span className="text-[10px] text-emerald-400 font-bold">Revenus réels marketplace</span>
          </div>

          <div className="bg-[#011D46] p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold">Apprenants Inscrits</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{courses.length + digitalProducts.length + stores.length}</p>
            <span className="text-[10px] text-slate-400 font-bold">Contenus actifs (cours, produits, boutiques)</span>
          </div>

          <div className="bg-[#011D46] p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold">Formations Actives</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{courses.length}</p>
            <span className="text-[10px] text-emerald-400 font-bold">Modules certifiants</span>
          </div>

          <div className="bg-[#011D46] p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold">Devis Services Reçus</span>
              <ShoppingBag className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">{serviceQuotes.length}</p>
            <span className="text-[10px] text-amber-400 font-bold">En cours de traitement</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'support' ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-[#011D46]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Support post-achat
          </button>
          <button
            onClick={() => setActiveTab('instructors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'instructors' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#D69E25]" />
            Formateurs
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'marketplace' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Marketplace & Boutiques ({stores.length})</span>
            {(pendingApplicationsCount > 0 || pendingPayoutsCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            Vue d'Ensemble
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'courses' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            Formations ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'products' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            Produits Numériques ({digitalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'services' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'}`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Services Agence ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'kyc' ? 'bg-emerald-500 text-slate-900' : 'text-emerald-400 hover:bg-[#011D46]'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Demandes KYC ({kycSubmissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fees' ? 'bg-amber-500 text-slate-900' : 'text-amber-400 hover:bg-[#011D46]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramétrage Frais Inscription</span>
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'quotes' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            Devis Agence ({serviceQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'support' ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-[#011D46]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span>Support Post-Achat ({postPurchaseSubmissions.length})</span>
            {postPurchaseSubmissions.length > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {postPurchaseSubmissions.length}
              </span>
            )}
          </button>
        </div>
        </div>
        )}

        {/* Table Content */}
        <div className="bg-[#011D46] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {activeTab === 'site_content' && (
            <form onSubmit={handleSaveSiteContent} className="p-6 space-y-8">
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
          )}

          {activeTab === 'marketplace' && (
            <div className="p-6 space-y-8">
              {/* Marketplace Admin Header Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Volume Total Marketplace</span>
                  <p className="text-2xl font-black text-white">${totalMarketplaceVolumeUsd.toLocaleString('en-US')}</p>
                  <span className="text-[10px] text-emerald-400">≈ {Math.round(totalMarketplaceVolumeUsd * 600).toLocaleString('en-US')} FCFA</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-[#D69E25]/40 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Commissions encaissées</span>
                  <p className="text-2xl font-black text-[#D69E25]">${totalPlatformCommissionsUsd.toLocaleString('en-US')}</p>
                  <span className="text-[10px] text-[#D69E25] font-bold">Revenu Net FORTIA HUB</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Boutiques Actives</span>
                  <p className="text-2xl font-black text-white">{stores.filter(s => s.status === 'active').length} / {stores.length}</p>
                  <span className="text-[10px] text-emerald-400 font-bold">Vendeurs certifiés</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Demandes en Attente</span>
                  <p className="text-2xl font-black text-amber-400">{pendingApplicationsCount} Vendeurs | {pendingPayoutsCount} Retraits</p>
                  <span className="text-[10px] text-amber-400 font-bold">Nécessite votre validation</span>
                </div>
              </div>

              {/* ===== TAUX DE COMMISSION : registre complet + preuves =====
                  Module autonome : un taux général + un taux par type de vente
                  (% ou montant fixe), avec récapitulatif réel d'application. */}
              <CommissionRatesPanel />


              {/* Les candidatures vendeurs sont désormais traitées dans le
                  module dédié « Vérification Boutique » (panneau indépendant,
                  avec toutes les informations du candidat). */}

              {/* SECTION: All Stores Management */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#D69E25]" />
                  <span>Toutes les Boutiques de la Marketplace ({stores.length})</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#021231] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Boutique</th>
                        <th className="p-3">Propriétaire</th>
                        <th className="p-3">Ventes Cumulées</th>
                        <th className="p-3">Revenu Brut</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Actions Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stores.map((st) => (
                        <tr key={st.id} className="hover:bg-[#021231]/50 transition">
                          <td className="p-3 flex items-center gap-2.5">
                            <img src={st.logo} alt={st.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0" />
                            <div>
                              <p className="font-bold text-white">{st.name}</p>
                              <p className="text-[10px] text-slate-400">{st.slug}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-200">{st.ownerName}</p>
                            <p className="text-[10px] text-slate-400">{st.ownerEmail}</p>
                          </td>
                          <td className="p-3 font-bold text-white">{st.salesCount} ventes</td>
                          <td className="p-3 font-bold text-[#D69E25]">${st.totalRevenueUsd}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              st.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {st.status === 'active' ? 'Actif / Validé' : 'Suspendu'}
                            </span>
                          </td>
                          <td className="p-3 flex items-center gap-1.5">
                            {st.status === 'active' ? (
                              <button
                                onClick={() => onSuspendStore && onSuspendStore(st.id)}
                                className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white font-bold text-[10px] rounded-lg transition"
                              >
                                Suspendre
                              </button>
                            ) : (
                              <button
                                onClick={() => onApproveStore && onApproveStore(st.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition"
                              >
                                Réactiver
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteStore && onDeleteStore(st.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition"
                              title="Supprimer la boutique"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: Vendor Payout Requests */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  <span>Demandes de Retrait Vendeurs ({payoutRequests.length})</span>
                </h3>

                {payoutRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune demande de retrait en attente.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#021231] text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Vendeur / Boutique</th>
                          <th className="p-3">Montant Retrait</th>
                          <th className="p-3">Equiv. FCFA</th>
                          <th className="p-3">Compte Réception</th>
                          <th className="p-3">Statut</th>
                          <th className="p-3">Action Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {payoutRequests.map((pay) => (
                          <tr key={pay.id} className="hover:bg-[#021231]/50 transition">
                            <td className="p-3">
                              <p className="font-bold text-white">{pay.vendorName}</p>
                              <p className="text-[10px] text-amber-400">{pay.storeName}</p>
                            </td>
                            <td className="p-3 font-black text-white">${pay.amountUsd}</td>
                            <td className="p-3 font-semibold text-amber-400">{pay.amountFcfa.toLocaleString('en-US')} FCFA</td>
                            <td className="p-3 text-cyan-300 font-mono text-[11px]">{pay.payoutMethod}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPaid(pay.status) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {pay.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {isPending(pay.status) ? (
                                <button
                                  onClick={() => onApprovePayout && onApprovePayout(pay.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition shadow"
                                >
                                  Valider & Marquer Payé
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Payé
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'courses' && (
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
                          onClick={() => handleStartEditCourse(c)}
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
          )}

          {/* Products Table */}
          {activeTab === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#021231] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Produit Numérique</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Prix USD</th>
                    <th className="p-4">Ventes</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {digitalProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#021231]/50 transition">
                      <td className="p-4 flex items-center gap-3 font-bold text-white">
                        <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                        <div>
                          <p className="line-clamp-1">{p.title}</p>
                          {p.isPopular && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/30">
                              Top Vente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[#D69E25] font-semibold">{p.typeLabel}</td>
                      <td className="p-4 text-slate-400">{p.fileFormat}</td>
                      <td className="p-4 font-bold text-white">${p.price}</td>
                      <td className="p-4">{p.salesCount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditProduct(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Modifier ce produit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={async () => {
                              const reason = window.prompt(
                                `Suspendre le produit « ${p.title} » ?\n\nMotif communiqué au vendeur (produit non authentique, violation de droits d'auteur…) :`,
                                "Produit non conforme aux règles de la plateforme."
                              );
                              if (reason === null) return;
                              if (!reason.trim()) {
                                alert("Le motif est obligatoire.");
                                return;
                              }
                              const res = await apiWritePlatform("moderate-content", {
                                targetType: "product",
                                targetId: p.id,
                                reason: reason.trim(),
                              });
                              if (res.success) {
                                alert(
                                  `Produit « ${p.title} » suspendu : il est dépublié et ses fonds sont gelés.`
                                );
                                await refreshPlatformData?.();
                                await loadAdminData?.();
                              } else {
                                alert(res.error || "Suspension impossible.");
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600/25 border border-amber-500/40 text-amber-300 hover:bg-amber-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Suspendre ce produit (fonds gelés)"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Suspendre</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProductConfirm(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Supprimer ce produit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'kyc' && !selectedKyc && (
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
                      </div>
                      <p className="text-xs text-slate-400">{sub.email} • {sub.documentType} N° : {sub.documentNumber}</p>
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

          {activeTab === 'kyc' && selectedKyc && (
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

              <div className="bg-[#021231] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <h4 className="font-black text-sm text-white">👤 Informations Personnelles</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Nom complet</span>
                    <span className="text-sm font-bold text-white">{selectedKyc.firstName} {selectedKyc.lastName}</span>
                    <span className="text-[10px] text-slate-500 block">({selectedKyc.applicantName})</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email</span>
                    <span className="text-sm font-bold text-white break-all">{selectedKyc.email}</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Téléphone</span>
                    <span className="text-sm font-bold text-white">{selectedKyc.phone || "—"}</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pays</span>
                    <span className="text-sm font-bold text-white">{selectedKyc.country || "—"}</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800 col-span-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Adresse physique</span>
                    <span className="text-sm font-bold text-white">{selectedKyc.address || "—"}</span>
                  </div>
                  {selectedKyc.repRole && (
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Rôle dans la société</span>
                      <span className="text-sm font-bold text-white">{selectedKyc.repRole}</span>
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
                    <span className="text-sm font-bold text-white">{selectedKyc.documentType}</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Numéro du document</span>
                    <span className="text-sm font-bold text-white font-mono">{selectedKyc.documentNumber}</span>
                  </div>
                  <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Date d'expiration</span>
                    <span className="text-sm font-bold text-white">{selectedKyc.idExpirationDate || "—"}</span>
                  </div>
                </div>

                {/* Documents joints : visibles AVANT d'approuver le dossier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-slate-800">
                  <KycDocumentViewer url={selectedKyc.idRectoUrl} label="Pièce — Recto" />
                  <KycDocumentViewer url={selectedKyc.idVersoUrl} label="Pièce — Verso" />
                  <KycDocumentViewer url={selectedKyc.selfieUrl} label="Photo de la personne" />
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
                      <span className="text-sm font-bold text-white">{selectedKyc.companyName || "—"}</span>
                    </div>
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Forme juridique</span>
                      <span className="text-sm font-bold text-white">{selectedKyc.legalForm || "—"}</span>
                    </div>
                    <div className="bg-[#011D46] p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">N° RCCM / NINEA / IFU</span>
                      <span className="text-sm font-bold text-white font-mono">{selectedKyc.rccmNumber || "—"}</span>
                    </div>
                  
                <div className="p-4 border-t border-slate-800">
                  <KycDocumentViewer url={selectedKyc.companyDocUrl} label="Document Officiel RCCM / Statuts" />
                </div></div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                {String(selectedKyc.status) === 'Approuvé' || String(selectedKyc.status) === 'Approuve' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✅ Dossier déjà approuvé — Badge attribué</span>
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
            </div>
          )}

          {/* Fee Config Settings */}
          {activeTab === 'fees' && (
            <form onSubmit={handleSaveFees} className="p-6 space-y-6 max-w-2xl">
              <div>
                <h3 className="font-bold text-white text-base">Configuration des Frais d'Inscription</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Définissez le montant des frais requis pour la vérification KYC et l'attribution des Badges (Vert et Doré). Tapez en USD pour conversion automatique instantanée en FCFA (Taux fixe : 1 USD = 600 FCFA).
                </p>
              </div>

              {/* Freelance Fee */}
              <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-xs text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Frais Inscription Freelance (Badge Vert)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                    ⚡ Auto-conversion : 1 USD = 600 FCFA
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant ($ USD)</label>
                    <input
                      type="number"
                      value={freelanceUsd}
                      onChange={(e) => {
                        const usd = Number(e.target.value);
                        setFreelanceUsd(usd);
                        setFreelanceFcfa(Math.round(usd * 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-emerald-400">{Math.round(freelanceUsd * 600).toLocaleString('en-US')} FCFA</strong>
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={freelanceFcfa}
                      onChange={(e) => {
                        const fcfa = Number(e.target.value);
                        setFreelanceFcfa(fcfa);
                        setFreelanceUsd(Math.round(fcfa / 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-amber-400">${Math.round(freelanceFcfa / 600)} USD</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Enterprise Fee */}
              <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-xs text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Frais Inscription Entreprise / Agence (Badge Doré)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                    ⚡ Auto-conversion : 1 USD = 600 FCFA
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant ($ USD)</label>
                    <input
                      type="number"
                      value={enterpriseUsd}
                      onChange={(e) => {
                        const usd = Number(e.target.value);
                        setEnterpriseUsd(usd);
                        setEnterpriseFcfa(Math.round(usd * 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-emerald-400">{Math.round(enterpriseUsd * 600).toLocaleString('en-US')} FCFA</strong>
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={enterpriseFcfa}
                      onChange={(e) => {
                        const fcfa = Number(e.target.value);
                        setEnterpriseFcfa(fcfa);
                        setEnterpriseUsd(Math.round(fcfa / 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-amber-400">${Math.round(enterpriseFcfa / 600)} USD</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
              >
                Enregistrer la Configuration des Frais
              </button>
            </form>
          )}

          {activeTab === 'services' && (
            <div className="p-6">
              <AdminServicesPanel
                services={services}
                serviceQuotes={serviceQuotes}
                onAddService={onAddService || (() => {})}
                onUpdateService={onUpdateService || (() => {})}
                onDeleteService={onDeleteService || (() => {})}
                onToggleServiceActive={onToggleServiceActive || (() => {})}
              />
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="divide-y divide-slate-800">
              {serviceQuotes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Aucune demande de devis pour le moment.</div>
              ) : (
                serviceQuotes.map((q) => (
                  <div key={q.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{q.clientName}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{q.clientEmail} • {q.serviceTitle}</p>
                      <p className="text-[11px] text-slate-300 mt-1 italic">"{q.details || 'Pas de détails particuliers'}"</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-[#D69E25]">${q.estimatedPrice}</span>
                      <span className="text-[10px] text-slate-400 block">{q.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'instructors' && (
            <div className="p-6 space-y-6">
              <AdminInstructorsPanel
                trainingCenters={trainingCenters}
                courses={courses}
                commissions={instructorCommissions}
                storagePurchases={instructorStoragePurchases}
                onAddInstructor={onAddInstructor || (() => {})}
                onSuspendCourse={onSuspendCourse || (() => {})}
                onDeleteCourse={onDeleteCourse || (() => {})}
                onToggleBan={async (center, nextStatus) => {
                  const res = await apiWritePlatform("ban-training-center", { centerId: center.id });
                  if (res.success) {
                    setTrainingCenters((prev) =>
                      prev.map((c) => (c.id === center.id ? { ...c, status: nextStatus } : c))
                    );
                    alert(
                      nextStatus === "banned"
                        ? "Accès du formateur banni : il ne peut plus accéder à son centre."
                        : "Accès du formateur rétabli."
                    );
                  } else {
                    alert(res.error || "Action impossible.");
                  }
                }}
                onUpdateCenter={async (center, updates) => {
                  const res = await apiWritePlatform("update-training-center-config", {
                    centerId: center.id,
                    centerName: updates.centerName,
                    description: updates.description,
                    storageQuotaGb: updates.storageQuotaGb,
                  });
                  if (res.success) {
                    setTrainingCenters((prev) =>
                      prev.map((c) => (c.id === center.id ? { ...c, ...updates } : c))
                    );
                    alert("Centre mis à jour.");
                  } else {
                    alert(res.error || "Enregistrement impossible.");
                  }
                }}
                onDeleteCenter={async (center) => {
                  const res = await apiWritePlatform("delete-training-center", {
                    centerId: center.id,
                  });
                  if (res.success) {
                    setTrainingCenters((prev) => prev.filter((c) => c.id !== center.id));
                    alert(`Le centre « ${center.centerName} » a été supprimé.`);
                  } else {
                    alert(res.error || "Suppression impossible.");
                  }
                }}
                onModerateCourse={async (course, reason) => {
                  const res = await apiWritePlatform("moderate-content", {
                    targetType: "course",
                    targetId: course.id,
                    reason,
                  });
                  if (res.success) {
                    alert(
                      `Formation « ${course.title} » suspendue : elle est dépubliée et ses fonds sont gelés.`
                    );
                    await refreshPlatformData?.();
                    await loadAdminData?.();
                  } else {
                    alert(res.error || "Suspension impossible.");
                  }
                }}
                onRestoreCourse={async (course) => {
                  const res = await apiWritePlatform("restore-content", {
                    targetType: "course",
                    targetId: course.id,
                  });
                  if (res.success) {
                    alert(`Formation « ${course.title} » rétablie, fonds dégelés.`);
                    await refreshPlatformData?.();
                    await loadAdminData?.();
                  } else {
                    alert(res.error || "Rétablissement impossible.");
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'support' && (
            <div className="p-6 space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-indigo-900/60 via-[#011D46] to-[#021231] p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                      <Mail className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-black text-white">Formulaires & Fiches Support Clients Post-Achat</h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Collecte automatique des coordonnées clients (Nom, Prénom, Contact, Note) enregistrées au paiement. 
                    Chaque fiche est archivée en administration et transmise directement à <strong className="text-amber-400">l'adresse email du vendeur du produit</strong> (100% transparent et sécurisé).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-[#021231] p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Transmission Email</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Email du Vendeur
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Formulaires Enregistrés</span>
                  <div className="text-2xl font-black text-white">{postPurchaseSubmissions.length}</div>
                  <span className="text-[10px] text-indigo-400 font-semibold">100% Archivés</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Transmis aux Vendeurs</span>
                  <div className="text-2xl font-black text-emerald-400">{postPurchaseSubmissions.length}</div>
                  <span className="text-[10px] text-slate-400">Emails Vendeurs Récepteurs</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Statut Réseau</span>
                  <div className="text-2xl font-black text-[#D69E25]">Actif</div>
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Routage Instantané</span>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-[#021231] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Liste des Coordonnées de Secours Clients ({postPurchaseSubmissions.length})</span>
                  </h4>
                </div>

                {postPurchaseSubmissions.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-xs">
                    Aucun formulaire post-achat enregistré pour le moment.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#011D46] text-slate-400 text-[10px] font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">Date & Heure</th>
                          <th className="p-3.5">Nom & Prénom Client</th>
                          <th className="p-3.5">Contact Direct (Téléphone)</th>
                          <th className="p-3.5">Email Client</th>
                          <th className="p-3.5">Produit Concerné</th>
                          <th className="p-3.5">Email Vendeur (Routage)</th>
                          <th className="p-3.5">Remarques / Problème</th>
                          <th className="p-3.5 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {postPurchaseSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-[#011D46]/50 transition">
                            <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {sub.submittedAt}
                            </td>
                            <td className="p-3.5 font-bold text-white">
                              {sub.lastName} {sub.firstName}
                            </td>
                            <td className="p-3.5 font-semibold text-amber-400 whitespace-nowrap">
                              {sub.phoneContact}
                            </td>
                            <td className="p-3.5 text-slate-300 whitespace-nowrap">
                              {sub.email}
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate text-slate-200" title={sub.productTitle}>
                              <span className="font-semibold text-white block truncate">{sub.productTitle}</span>
                              {sub.orderNumber && <span className="text-[10px] text-slate-500 font-mono">#{sub.orderNumber}</span>}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 w-fit">
                                <Mail className="w-3 h-3 text-indigo-400" />
                                {sub.forwardedEmail}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-[220px]">
                              <p className="text-[11px] text-slate-300 italic line-clamp-2" title={sub.notes}>
                                "{sub.notes || 'Aucune note particulière'}"
                              </p>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap flex items-center justify-end gap-2">
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {sub.status}
                              </span>
                              <button
                                onClick={() => onDeleteSupportSubmission && onDeleteSupportSubmission(sub.id)}
                                className="p-1.5 rounded bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white transition"
                                title="Supprimer la soumission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Add Course */}
        {showAddCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
              <button onClick={() => setShowAddCourse(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
              <h3 className="font-bold text-base text-white">Ajouter un nouveau cours</h3>

              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Titre de la formation *</label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                    placeholder="Ex: Masterclass Trading Web3"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Catégorie</label>
                  <select
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value as any)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                  >
                    <option value="crypto">Cryptomonnaie</option>
                    <option value="ai">Intelligence Artificielle</option>
                    <option value="canva">Canva</option>
                    <option value="capcut">CapCut</option>
                    <option value="marketing">Marketing Digital</option>
                    <option value="entrepreneurship">Entrepreneuriat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Prix ($ USD)</label>
                  <input
                    type="number"
                    value={newCoursePrice}
                    onChange={(e) => setNewCoursePrice(Number(e.target.value))}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                  />
                  <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                    ≈ {Math.round(newCoursePrice * 600).toLocaleString('en-US')} FCFA (Conversion auto)
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Publier la Formation
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Add Product */}
        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-xl w-full p-6 text-white space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              <button onClick={() => setShowAddProduct(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D69E25]" />
                  <span>Ajouter un Produit Numérique à la Boutique</span>
                </h3>
              </div>

              {/* Stepper Header Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#021231] p-1.5 rounded-xl border border-slate-700/80 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminProdModalStep(1)}
                  className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                    adminProdModalStep === 1 
                      ? 'bg-[#D69E25] text-[#021231] shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">1</span>
                  <span>Infos, Prix & Visuels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminProdModalStep(2)}
                  className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                    adminProdModalStep === 2 
                      ? 'bg-[#D69E25] text-[#021231] shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">2</span>
                  <span>Importation Fichiers (PDF, Vidéo...)</span>
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                
                {/* STEP 1: INFOS, PRIX, VISUELS */}
                {adminProdModalStep === 1 && (
                  <div className="space-y-4">
                    
                    {/* Titre Produit + Améliorer */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300 font-bold">Nom / Titre du Produit *</label>
                        <button
                          type="button"
                          onClick={handleAdminEnhanceTitle}
                          className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                          title="Optimiser le titre avec l'IA (cliquable plusieurs fois)"
                        >
                          <span>Améliorer avec l'IA</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={newProdTitle}
                        onChange={(e) => setNewProdTitle(e.target.value)}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                        placeholder="Ex: Pack 500+ Prompts ChatGPT Pro & Midjourney"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-300 block mb-1 font-bold">Type / Catégorie</label>
                        <select
                          value={newProdType}
                          onChange={(e) => setNewProdType(e.target.value)}
                          className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                        >
                          <option value="ebook">eBook PDF</option>
                          <option value="canva_template">Modèle Canva Pro</option>
                          <option value="ai_prompts">Pack Prompts IA</option>
                          <option value="whitepaper">White Paper PDF</option>
                          <option value="business_plan">Business Plan</option>
                          <option value="contract">Contrat Type</option>
                          <option value="pitch_deck">Pitch Deck</option>
                          <option value="premium_pack">Pack Premium</option>
                          <option value="course">Formation Vidéo (MP4)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1 font-bold">Prix ($ USD) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(Number(e.target.value))}
                          className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                        />
                        <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                          ≈ {Math.round(newProdPrice * 600).toLocaleString('en-US')} FCFA
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-bold">Format de Fichier *</label>
                      <input
                        type="text"
                        value={newProdFormat}
                        onChange={(e) => setNewProdFormat(e.target.value)}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                        placeholder="Ex: PDF + Lien Canva + Fichiers Vidéo MP4"
                      />
                    </div>

                    {/* Import Visuels Couverture & Bannière */}
                    <ProductImageUploader
                      coverImage={newProdImage}
                      bannerImage={newProdBannerImage}
                      onCoverChange={setNewProdImage}
                      onBannerChange={setNewProdBannerImage}
                      entityId={adminNewProdEntityId}
                    />

                    {/* Description + Améliorer */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300 font-bold">Description du produit</label>
                        <button
                          type="button"
                          onClick={handleAdminEnhanceDesc}
                          className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                          title="Optimiser la description avec l'IA"
                        >
                          <span>Améliorer</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white leading-relaxed"
                        placeholder="Description détaillée des avantages et contenus inclus..."
                      />
                    </div>

                    {/* Avantages + Améliorer */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300 font-bold">Avantages inclus (1 par ligne)</label>
                        <button
                          type="button"
                          onClick={handleAdminEnhanceFeatures}
                          className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                          title="Formater les avantages avec l'IA"
                        >
                          <span>Améliorer</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={adminProdFeatures}
                        onChange={(e) => setAdminProdFeatures(e.target.value)}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newProdTitle) {
                          alert('Veuillez d\'abord saisir le titre du produit.');
                          return;
                        }
                        setAdminProdModalStep(2);
                      }}
                      className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow flex items-center justify-center gap-2"
                    >
                      <span>Continuer vers Étape 2 : Importation des Fichiers</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                  </div>
                )}

                {/* STEP 2: IMPORTATION DES FICHIERS PRODUITS LIVRABLES */}
                {adminProdModalStep === 2 && (
                  <div className="space-y-4">
                    <ProductDeliverableUploader
                      files={adminDeliverables}
                      downloadUrl={adminDownloadUrl}
                      fileFormat={newProdFormat}
                      onFilesChange={setAdminDeliverables}
                      onDownloadUrlChange={setAdminDownloadUrl}
                      entityId={adminNewProdEntityId}
                    />

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setAdminProdModalStep(1)}
                        className="w-1/3 py-3 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Précédent</span>
                      </button>
                      
                      <button
                        type="submit"
                        className="w-2/3 py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Publier le Produit avec Fichiers</span>
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Product */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#011D46] border border-blue-500/50 rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <span>Modifier le Produit Numérique</span>
              </h3>

              <form onSubmit={handleSaveEditProduct} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Titre du Produit *</label>
                  <input
                    type="text"
                    required
                    value={editProdTitle}
                    onChange={(e) => setEditProdTitle(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Type / Catégorie</label>
                    <select
                      value={editProdType}
                      onChange={(e) => setEditProdType(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                    >
                      <option value="ebook">eBook PDF</option>
                      <option value="canva_template">Modèle Canva Pro</option>
                      <option value="ai_prompts">Pack Prompts IA</option>
                      <option value="whitepaper">White Paper PDF</option>
                      <option value="business_plan">Business Plan</option>
                      <option value="contract">Contrat Type</option>
                      <option value="pitch_deck">Pitch Deck</option>
                      <option value="premium_pack">Pack Premium</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">Prix ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editProdPrice}
                      onChange={(e) => setEditProdPrice(Number(e.target.value))}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                    />
                    <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                      ≈ {Math.round(editProdPrice * 600).toLocaleString('en-US')} FCFA
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Format de Fichier</label>
                    <input
                      type="text"
                      value={editProdFormat}
                      onChange={(e) => setEditProdFormat(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">URL Image de Couverture</label>
                    <input
                      type="text"
                      value={editProdImage}
                      onChange={(e) => setEditProdImage(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editProdDesc}
                    onChange={(e) => setEditProdDesc(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editProdIsPopular"
                    checked={editProdIsPopular}
                    onChange={(e) => setEditProdIsPopular(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-[#D69E25]"
                  />
                  <label htmlFor="editProdIsPopular" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Marquer comme produit Populaire (Top Vente)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition shadow"
                  >
                    Enregistrer les Modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Course Editing Modal */}
        {editingCourse && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#D69E25]" />
                  <span>Modifier la Formation : {editingCourse.title}</span>
                </h3>
                <button type="button" onClick={() => setEditingCourse(null)} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCourse} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Formation</label>
                  <input
                    type="text"
                    required
                    value={editCourseTitle}
                    onChange={(e) => setEditCourseTitle(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Catégorie</label>
                    <select
                      value={editCourseCategory}
                      onChange={(e) => setEditCourseCategory(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    >
                      <option value="crypto">Cryptomonnaie & Trading</option>
                      <option value="ai">Intelligence Artificielle</option>
                      <option value="canva">Canva Design</option>
                      <option value="capcut">CapCut Video</option>
                      <option value="marketing">Marketing Digital</option>
                      <option value="entrepreneurship">Entrepreneuriat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Prix (USD)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editCoursePrice}
                      onChange={(e) => setEditCoursePrice(Number(e.target.value))}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                      ≈ {Math.round(editCoursePrice * 600).toLocaleString('en-US')} FCFA
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Niveau d'Accès</label>
                    <input
                      type="text"
                      value={editCourseLevel}
                      onChange={(e) => setEditCourseLevel(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Durée (Heures)</label>
                    <input
                      type="number"
                      value={editCourseDuration}
                      onChange={(e) => setEditCourseDuration(Number(e.target.value))}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Description courte</label>
                  <textarea
                    rows={3}
                    value={editCourseDesc}
                    onChange={(e) => setEditCourseDesc(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">URL de l'Image de Couverture</label>
                  <input
                    type="text"
                    value={editCourseImage}
                    onChange={(e) => setEditCourseImage(e.target.value)}
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(null)}
                    className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow cursor-pointer"
                  >
                    Enregistrer les Modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Popup de confirmation d'enregistrement de la formation */}
        <SuccessConfirmationModal
          isOpen={showCourseSuccess}
          onClose={() => setShowCourseSuccess(false)}
          title="Formation enregistrée !"
          message="La formation a été créée avec succès et est publiée dans le catalogue. Vous pouvez la modifier à tout moment depuis ce panneau."
        />

      </div>
    </section>
  );
};
