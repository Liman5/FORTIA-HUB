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
import { AdminUsersTab } from './admin/users/AdminUsersTab';
import { AdminSupportTab } from './admin/tabs/AdminSupportTab';
import { AdminQuotesTab } from './admin/tabs/AdminQuotesTab';
import { AdminCoursesTab } from './admin/courses/AdminCoursesTab';
import { AdminProductsTab } from './admin/products/AdminProductsTab';
import { AdminFeesTab } from './admin/fees/AdminFeesTab';
import { AdminInstructorsTab } from './admin/instructors/AdminInstructorsTab';
import { AdminMarketplaceTab } from './admin/marketplace/AdminMarketplaceTab';
import { AdminSiteContentTab } from './admin/content/AdminSiteContentTab';
import { AdminKycTab } from './admin/kyc/AdminKycTab';
import { CategorySelect, REFERENCE_COURSE_CATEGORIES, REFERENCE_PRODUCT_CATEGORIES } from './CategorySelect';
import { enhanceTitle, enhanceDescription, enhanceFeatures } from '../utils/aiEnhancer';
import { getSignedUrl } from '../lib/services/clientUpload';
import { apiWritePlatform } from '../lib/services/platformWrite';
import { useAppStore } from '@/lib/store/AppStore';
import { useCatalog } from '@/lib/store/domains/contexts';
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
  EyeOff,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: 'stats' | 'site_content' | 'courses' | 'products' | 'services' | 'quotes' | 'kyc' | 'fees' | 'marketplace' | 'support' | 'instructors' | 'users';
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
  const [activeTab, setActiveTab] = useState<'stats' | 'site_content' | 'courses' | 'products' | 'services' | 'quotes' | 'kyc' | 'fees' | 'marketplace' | 'support' | 'instructors' | 'users'>(initialTab);

  // Toutes les catégories (base de données + référentiel) pour les formulaires
  const { courseCategories } = useCatalog();
  const categoryOptions = useMemo(() => {
    const fromDb = (courseCategories || []).map((item: any) => ({
      code: String(item.code || item.id || ''),
      label: String(item.label || item.name || item.code || ''),
    }));
    const seen = new Set<string>();
    return [...fromDb, ...REFERENCE_COURSE_CATEGORIES].filter((option) => {
      if (!option.code || seen.has(option.code)) return false;
      seen.add(option.code);
      return true;
    });
  }, [courseCategories]);
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
  const [editCourseCategoryLabel, setEditCourseCategoryLabel] = useState<string>('Cryptomonnaie & Blockchain');
  const [editCoursePrice, setEditCoursePrice] = useState(0);
  const [editCourseLevel, setEditCourseLevel] = useState('Tous niveaux');
  const [editCourseDuration, setEditCourseDuration] = useState(10);
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseImage, setEditCourseImage] = useState('');

  const handleStartEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditCourseTitle(course.title);
    setEditCourseCategory(course.category);
    setEditCourseCategoryLabel(String((course as { categoryLabel?: string }).categoryLabel || course.category || ''));
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
      categoryLabel: editCourseCategoryLabel || String(editCourseCategory).toUpperCase(),
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
  const [newCourseCategoryLabel, setNewCourseCategoryLabel] = useState<string>('Cryptomonnaie & Blockchain');

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
      categoryLabel: newCourseCategoryLabel || newCourseCategory,
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
  const [newProdTypeLabel, setNewProdTypeLabel] = useState<string>('eBook PDF');
  const [newProdPrice, setNewProdPrice] = useState(29);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdFormat, setNewProdFormat] = useState('PDF');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
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
      typeLabel: newProdTypeLabel || TYPE_LABELS[newProdType] || 'Ressource Numérique',
      description: newProdDesc || 'Ressource numérique d\'excellence prête au téléchargement instantané.',
      price: Number(newProdPrice),
      originalPrice: Number(newProdPrice) * 1.5,
      rating: 5.0,
      salesCount: 1,
      fileFormat: newProdFormat || 'PDF',
      fileSize: '15 MB',
      image: newProdImage || '',
      bannerImage: '',
      images: newProdImages,
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
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Utilisateurs
          </button>
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
          {activeTab === 'users' && (
            <div className="p-4 sm:p-6">
              <AdminUsersTab />
            </div>
          )}
          {activeTab === 'site_content' && (
            <AdminSiteContentTab
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              onSubmit={handleSaveSiteContent}
            />
          )}
          {activeTab === 'marketplace' && (
            <AdminMarketplaceTab
              stores={stores}
              payoutRequests={payoutRequests}
              totalMarketplaceVolumeUsd={totalMarketplaceVolumeUsd}
              totalPlatformCommissionsUsd={totalPlatformCommissionsUsd}
              pendingApplicationsCount={pendingApplicationsCount}
              pendingPayoutsCount={pendingPayoutsCount}
              isPaid={isPaid}
              isPending={isPending}
              onApprovePayout={onApprovePayout}
              onApproveStore={onApproveStore}
              onSuspendStore={onSuspendStore}
              onDeleteStore={onDeleteStore}
            />
          )}
          {activeTab === 'courses' && (
            <AdminCoursesTab
              courses={courses}
              onToggleFeatured={onToggleFeatured}
              onEditCourse={handleStartEditCourse}
              onDeleteCourse={onDeleteCourse}
            />
          )}
          {/* Products Table */}
          {activeTab === 'products' && (
            <AdminProductsTab
              digitalProducts={digitalProducts}
              onEditProduct={handleStartEditProduct}
              onDeleteProduct={handleDeleteProductConfirm}
              refreshPlatformData={refreshPlatformData}
              loadAdminData={loadAdminData}
            />
          )}
          {activeTab === 'kyc' && (
            <AdminKycTab kycSubmissions={kycSubmissions} onApproveKyc={onApproveKyc} />
          )}
          {activeTab === 'fees' && (
            <AdminFeesTab
              freelanceUsd={freelanceUsd}
              freelanceFcfa={freelanceFcfa}
              enterpriseUsd={enterpriseUsd}
              enterpriseFcfa={enterpriseFcfa}
              setFreelanceUsd={setFreelanceUsd}
              setFreelanceFcfa={setFreelanceFcfa}
              setEnterpriseUsd={setEnterpriseUsd}
              setEnterpriseFcfa={setEnterpriseFcfa}
              onSubmit={handleSaveFees}
            />
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

          {activeTab === 'quotes' && <AdminQuotesTab serviceQuotes={serviceQuotes} />}
          {activeTab === 'instructors' && (
            <AdminInstructorsTab
              trainingCenters={trainingCenters}
              courses={courses}
              instructorCommissions={instructorCommissions}
              instructorStoragePurchases={instructorStoragePurchases}
              setTrainingCenters={setTrainingCenters}
              refreshPlatformData={refreshPlatformData}
              loadAdminData={loadAdminData}
              onAddInstructor={onAddInstructor}
              onSuspendCourse={onSuspendCourse}
              onDeleteCourse={onDeleteCourse}
            />
          )}

          {activeTab === 'support' && (
            <AdminSupportTab submissions={postPurchaseSubmissions} onDelete={onDeleteSupportSubmission} />
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
                  <CategorySelect
                    value={newCourseCategory}
                    labelValue={newCourseCategoryLabel}
                    categories={categoryOptions}
                    onChange={(code, label) => {
                      setNewCourseCategory(code);
                      setNewCourseCategoryLabel(label);
                    }}
                  />
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
                        <CategorySelect
                          value={String(newProdType || '')}
                          labelValue={newProdTypeLabel}
                          categories={REFERENCE_PRODUCT_CATEGORIES}
                          onChange={(code, label) => {
                            setNewProdType(code);
                            setNewProdTypeLabel(label);
                          }}
                          customPlaceholder="Ex : Modèle de CV, Pack de polices…"
                        />
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

                    {/* Import : image de couverture + galerie */}
                    <ProductImageUploader
                      coverImage={newProdImage}
                      images={newProdImages}
                      onCoverChange={setNewProdImage}
                      onImagesChange={setNewProdImages}
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
                    <CategorySelect
                      value={String(editCourseCategory || '')}
                      labelValue={editCourseCategoryLabel}
                      categories={categoryOptions}
                      onChange={(code, label) => {
                        setEditCourseCategory(code);
                        setEditCourseCategoryLabel(label);
                      }}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                      inputClassName="w-full mt-2 bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white"
                    />
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
