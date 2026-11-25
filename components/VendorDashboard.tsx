"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight,
  Award, 
  Settings, 
  CreditCard, 
  Smartphone, 
  Download, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Wand2,
  ChevronDown,
  BadgeCheck,
  Copyright,
  FileCheck,
  AlertTriangle,
  X,
  Share2,
  QrCode,
  Info
} from 'lucide-react';
import { 
  VendorStore, 
  MarketplaceProduct, 
  MarketplaceOrder, 
  PayoutRequest, 
  DigitalProductType 
} from '../types';
import { CategorySelect, buildCourseCategoryOptions, slugifyCategory } from './CategorySelect';
import { useCatalog } from '@/lib/store/domains/contexts';
import { SellerOverview } from "./dashboard/SellerOverview";
import { ProductAnalyticsModal } from "./dashboard/ProductAnalyticsModal";
import { StoreQrCode } from "./dashboard/StoreQrCode";
import { storeHref } from "@/lib/data/storeSlug";
import { ProductImageUploader } from './ProductImageUploader';
import { ProductDeliverableUploader, DeliverableFile } from './ProductDeliverableUploader';
import { StoreImageUploader } from './StoreImageUploader';
import { enhanceTitle, enhanceDescription, enhanceFeatures } from '../utils/aiEnhancer';
import { SuccessConfirmationModal } from './SuccessConfirmationModal';

/**
 * Codes acceptés par l'enum SQL `product_type`. Le type technique enregistré
 * doit rester valide même si la catégorie affichée provient de la taxonomie
 * des formations (crypto, IA, marketing…).
 */
const PRODUCT_TYPE_CODES = new Set([
  'ebook',
  'canva_template',
  'ai_prompts',
  'whitepaper',
  'business_plan',
  'contract',
  'pitch_deck',
  'premium_pack',
  'course',
]);

/** Type technique correspondant à la catégorie choisie par le vendeur. */
function productTypeForCategory(code: string, label: string): DigitalProductType {
  if (PRODUCT_TYPE_CODES.has(code)) return code as DigitalProductType;
  const lower = `${code} ${label}`.toLowerCase();
  if (lower.includes('formation') || lower.includes('video') || lower.includes('vidéo')) {
    return 'course' as DigitalProductType;
  }
  return 'ebook';
}

interface VendorDashboardProps {
  store: VendorStore;
  products: MarketplaceProduct[];
  orders: MarketplaceOrder[];
  payoutRequests: PayoutRequest[];
  onUpdateStore: (updatedStore: VendorStore) => void;
  onAddProduct: (newProduct: MarketplaceProduct) => void;
  onUpdateProduct: (updatedProduct: MarketplaceProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onRequestPayout: (payout: PayoutRequest) => void;
  onViewPublicStore: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  store,
  products = [],
  orders = [],
  payoutRequests = [],
  onUpdateStore,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRequestPayout,
  onViewPublicStore
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'settings'>('analytics');
  const [showSuccess, setShowSuccess] = useState(false);
  /* Partage de la boutique publique : lien copié ou feuille de partage native. */
  const [shareNotice, setShareNotice] = useState('');
  /* QR code de la boutique (généré localement). */
  const [showQr, setShowQr] = useState(false);

  const handleShareStore = async () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${storeHref(store)}`;
    try {
      const navigatorWithShare = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }) : null;
      if (navigatorWithShare?.share) {
        await navigatorWithShare.share({
          title: store.name,
          text: `Découvrez ${store.name} sur FORTIA HUB`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNotice('Lien de la boutique copié !');
    } catch {
      setShareNotice('Partage indisponible sur cet appareil.');
    }
    window.setTimeout(() => setShareNotice(''), 2600);
  };
  // Règles de publication (point d'information anti-abus)
  const [showRules, setShowRules] = useState(false);

  // Filter items belonging to this store (robuste : storeId OU storeName)
  const storeProducts = (products || []).filter(
    (p) => p.storeId === store?.id || p.storeName === store?.name
  );
  const storeOrders = (orders || []).filter(
    (o) => o.storeId === store?.id || o.storeName === store?.name
  );

  /* ---- Catalogue : recherche, filtre de statut, sélection multiple, analyse ---- */
  const [productQuery, setProductQuery] = useState('');
  const [productStatus, setProductStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [analyticsProductId, setAnalyticsProductId] = useState<string | null>(null);
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('all');

  const filteredStoreProducts = storeProducts.filter((product) => {
    const query = productQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${product.title} ${product.description} ${product.typeLabel}`.toLowerCase().includes(query);
    const matchesStatus =
      productStatus === 'all' ||
      (productStatus === 'published' ? product.isPublished : !product.isPublished);
    return matchesQuery && matchesStatus;
  });

  const filteredStoreOrders = storeOrders.filter((order) => {
    const query = orderQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${order.orderNumber} ${order.buyerName} ${order.buyerEmail} ${order.productTitle}`
        .toLowerCase()
        .includes(query);
    const matchesStatus = orderStatus === 'all' || order.status === orderStatus;
    return matchesQuery && matchesStatus;
  });

  const orderStatuses = Array.from(new Set(storeOrders.map((order) => order.status)));

  const toggleProductSelection = (id: string) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

  /** Publication / dépublication groupée (persistée produit par produit). */
  /** État d'ouverture de la boutique (les ventes sont bloquées en pause). */
  const isStoreOpen = store?.isOpen !== false;
  const publishedCount = storeProducts.filter((product) => product.isPublished).length;

  const handleToggleStoreOpen = () => {
    onUpdateStore({ ...store, isOpen: !isStoreOpen });
  };
  const bulkSetPublished = (isPublished: boolean) => {
    selectedProducts.forEach((id) => {
      const product = storeProducts.find((item) => item.id === id);
      if (product && product.isPublished !== isPublished) {
        onUpdateProduct({ ...product, isPublished });
      }
    });
    setSelectedProducts([]);
  };

  // Financial Calculations
  const grossRevenueUsd = storeOrders.reduce((sum, o) => sum + (Number(o.amountUsd) || 0), Number(store?.totalRevenueUsd) || 0);
  const platformFeeUsd = Math.round(grossRevenueUsd * 0.10);
  const netEarningsUsd = grossRevenueUsd - platformFeeUsd;
  const netEarningsFcfa = Math.round(netEarningsUsd * 600);

  // Payout Drawer state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmountUsd, setPayoutAmountUsd] = useState(100);
  const [payoutMethod, setPayoutMethod] = useState<'wave' | 'om' | 'paypal' | 'crypto'>('wave');
  const [payoutAccountDetails, setPayoutAccountDetails] = useState(store?.payoutInfo?.accountNumber || '+221 77 000 00 00');

  // Product Create/Edit Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);

  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [prodTitle, setProdTitle] = useState('');
  const [prodType, setProdType] = useState<DigitalProductType>('ebook');
  /**
   * Catégorie du produit : EXACTEMENT la même taxonomie que le formulaire
   * Formateur (catégories enregistrées en base + référentiel de secours).
   */
  const { courseCategories } = useCatalog();
  const categoryOptions = React.useMemo(
    () => buildCourseCategoryOptions(courseCategories as any),
    [courseCategories]
  );
  const [prodCategory, setProdCategory] = useState('');
  const [prodCategoryLabel, setProdCategoryLabel] = useState('');

  const selectCategory = (code: string, label: string) => {
    setProdCategory(code);
    setProdCategoryLabel(label);
    setProdType(productTypeForCategory(code, label));
  };
  const [prodPrice, setProdPrice] = useState<number>(25);
  const [prodFormat, setProdFormat] = useState('PDF');
  const [prodImage, setProdImage] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodDesc, setProdDesc] = useState('');
  const [prodFeaturesStr, setProdFeaturesStr] = useState('Accès instantané 24/7\nMises à jour gratuites');
  const [prodIsPublished, setProdIsPublished] = useState(true);

  // Deliverable files state
  const [deliverableFiles, setDeliverableFiles] = useState<DeliverableFile[]>([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [aiCounts, setAiCounts] = useState({ title: 0, desc: 0, feat: 0 });

  const handleEnhanceTitle = () => {
    const nextVal = enhanceTitle(prodTitle, prodType, aiCounts.title);
    setProdTitle(nextVal);
    setAiCounts(prev => ({ ...prev, title: prev.title + 1 }));
  };

  const handleEnhanceDesc = () => {
    const nextVal = enhanceDescription(prodDesc, prodTitle, aiCounts.desc);
    setProdDesc(nextVal);
    setAiCounts(prev => ({ ...prev, desc: prev.desc + 1 }));
  };

  const handleEnhanceFeatures = () => {
    const nextVal = enhanceFeatures(prodFeaturesStr, aiCounts.feat);
    setProdFeaturesStr(nextVal);
    setAiCounts(prev => ({ ...prev, feat: prev.feat + 1 }));
  };

  // Store Settings Form State
  const [editStoreName, setEditStoreName] = useState(store.name);
  const [editStoreLogo, setEditStoreLogo] = useState(store.logo);
  const [editStoreBanner, setEditStoreBanner] = useState(store.banner);
  const [editStoreDesc, setEditStoreDesc] = useState(store.description);
  const [editStorePayoutMethod, setEditStorePayoutMethod] = useState(store.payoutInfo?.method || 'mobile_money');
  const [editStorePayoutNumber, setEditStorePayoutNumber] = useState(store.payoutInfo?.accountNumber || '');

  const TYPE_LABELS: Record<string, string> = {
    ebook: 'eBook PDF',
    canva_template: 'Modèle Canva Pro',
    ai_prompts: 'Pack Prompts IA',
    whitepaper: 'White Paper PDF',
    business_plan: 'Business Plan',
    contract: 'Contrat Type',
    pitch_deck: 'Pitch Deck',
    pro_templates: 'Templates Pro',
    premium_pack: 'Pack Premium',
    course: 'Formation Vidéo',
    service: 'Service Freelance'
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setModalStep(1);
    setProdTitle('');
    const firstCategory = categoryOptions[0];
    selectCategory(firstCategory?.code || '', firstCategory?.label || '');
    setProdPrice(25);
    setProdFormat('PDF');
    setProdImage('');
    setProdImages([]);
    setProdDesc('');
    setProdFeaturesStr('Accès instantané 24/7\nMises à jour gratuites');
    setProdIsPublished(true);
    setDeliverableFiles([]);
    setDownloadUrl('');
    setAiCounts({ title: 0, desc: 0, feat: 0 });
    setShowAddProductModal(true);
  };

  const handleOpenEditProduct = (p: MarketplaceProduct) => {
    setEditingProduct(p);
    setModalStep(1);
    setProdTitle(p.title);
    // Catégorie : on retrouve celle enregistrée (code ou libellé) ; sinon on la
    // conserve telle quelle en mode « Autre catégorie ».
    const knownCategory = categoryOptions.find(
      (option) => option.code === String(p.type) || option.label === p.typeLabel
    );
    if (knownCategory) {
      selectCategory(knownCategory.code, knownCategory.label);
    } else if (p.typeLabel) {
      selectCategory(slugifyCategory(p.typeLabel), p.typeLabel);
    } else {
      setProdType(p.type as any);
    }
    setProdPrice(p.price);
    setProdFormat(p.fileFormat);
    setProdImage(p.image || '');
    setProdImages(Array.isArray(p.images) ? p.images : []);
    setProdDesc(p.description);
    setProdFeaturesStr(p.features ? p.features.join('\n') : '');
    setProdIsPublished(p.isPublished);
    setDeliverableFiles([
      {
        id: 'f-existing-1',
        name: `${p.title.replace(/\s+/g, '_')}_Livrables.${p.fileFormat.toLowerCase().includes('pdf') ? 'pdf' : 'zip'}`,
        size: p.fileSize || '15 Mo',
        type: p.fileFormat.toLowerCase().includes('pdf') ? 'application/pdf' : 'application/zip'
      }
    ]);
    setDownloadUrl(p.downloadUrl && p.downloadUrl !== '#' ? p.downloadUrl : '');
    setAiCounts({ title: 0, desc: 0, feat: 0 });
    setShowAddProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle) return;

    const featuresList = prodFeaturesStr.split('\n').filter(f => f.trim() !== '');

    if (editingProduct) {
      const updated: MarketplaceProduct = {
        ...editingProduct,
        title: prodTitle,
        type: prodType,
        typeLabel: prodCategoryLabel || TYPE_LABELS[prodType] || 'Fichier Numérique',
        price: Number(prodPrice),
        fileFormat: prodFormat,
        image: prodImage,
        bannerImage: '',
        images: prodImages,
        description: prodDesc,
        features: featuresList,
        isPublished: prodIsPublished
      };
      onUpdateProduct(updated);
      alert('Produit mis à jour dans la boutique !');
    } else {
      const newProd: MarketplaceProduct = {
        id: `mp-${Date.now()}`,
        storeId: store.id,
        storeName: store.name,
        storeLogo: store.logo,
        vendorId: store.vendorId,
        title: prodTitle,
        slug: prodTitle.toLowerCase().replace(/\s+/g, '-'),
        type: prodType,
        typeLabel: prodCategoryLabel || TYPE_LABELS[prodType] || 'Fichier Numérique',
        description: prodDesc || 'Ressource numérique d\'excellence prête au téléchargement.',
        price: Number(prodPrice),
        originalPrice: Number(prodPrice) * 1.5,
        fileFormat: prodFormat || 'PDF',
        fileSize: '15 MB',
        image: prodImage || '',
        bannerImage: '',
        images: prodImages,
        features: featuresList.length > 0 ? featuresList : ['Accès instantané 24/7', 'Mises à jour gratuites'],
        downloadUrl: '#',
        isPublished: prodIsPublished,
        isApproved: true,
        rating: 5.0,
        reviewsCount: 1,
        salesCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddProduct(newProd);
      alert('Nouveau produit publié dans votre boutique et sur la marketplace FORTIA HUB !');
    }

    setShowAddProductModal(false);
  };

  const handleTogglePublish = (p: MarketplaceProduct) => {
    const updated = { ...p, isPublished: !p.isPublished };
    onUpdateProduct(updated);
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: VendorStore = {
      ...store,
      name: editStoreName,
      logo: editStoreLogo,
      banner: editStoreBanner,
      description: editStoreDesc,
      payoutInfo: {
        ...store.payoutInfo,
        method: editStorePayoutMethod as any,
        accountNumber: editStorePayoutNumber
      }
    };
    onUpdateStore(updated);
    setShowSuccess(true);
  };

  const handleSubmitPayoutRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutAmountUsd < 20) {
      alert('Le montant minimum de retrait est de $20 USD.');
      return;
    }

    const payout: PayoutRequest = {
      id: `pay-${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      vendorName: store.ownerName,
      amountUsd: Number(payoutAmountUsd),
      amountFcfa: Math.round(payoutAmountUsd * 600),
      payoutMethod: `${payoutMethod.toUpperCase()} (${payoutAccountDetails})`,
      accountDetails: payoutAccountDetails,
      requestedAt: new Date().toISOString().split('T')[0],
      status: 'En attente'
    };

    onRequestPayout(payout);
    setShowPayoutModal(false);
    alert('Demande de retrait transmise à l\'administration avec succès !');
  };

  return (
    <div className="bg-[#021231] text-white min-h-screen pb-16 space-y-8 fortia-flat">
      {/* Analyse produit (fenêtre) */}
      {analyticsProductId && (
        <ProductAnalyticsModal
          productId={analyticsProductId}
          onClose={() => setAnalyticsProductId(null)}
        />
      )}

      {showQr && (
        <StoreQrCode
          storeName={store.name}
          path={storeHref(store)}
          onClose={() => setShowQr(false)}
        />
      )}
      {/* Bandeau boutique : couverture, identité, indicateurs, actions */}
      <div className="relative border-b border-slate-800 bg-[#011D46]">
        <div className="relative h-28 w-full overflow-hidden bg-[#021231] sm:h-36">
          {store.banner ? (
            <img src={store.banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#021231]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#011D46] via-[#011D46]/75 to-transparent" />
          <div className="absolute right-3 top-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${
                store.status === 'active'
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : store.status === 'pending'
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                    : 'border-red-400/60 bg-red-500/20 text-red-200'
              }`}
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {store.status === 'active'
                ? 'Boutique active'
                : store.status === 'pending'
                  ? 'En validation'
                  : 'Suspendue'}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${
                isStoreOpen
                  ? 'border-white/25 bg-[#021231]/70 text-white'
                  : 'border-amber-400/60 bg-[#021231]/80 text-amber-200'
              }`}
            >
              {isStoreOpen ? 'Ventes ouvertes' : 'En pause'}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 mt-3 flex flex-col gap-3 rounded-2xl border border-[#D69E25]/25 bg-[#011D46] p-3 shadow-lg sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="h-16 w-16 rounded-2xl border-2 border-[#D69E25] bg-[#021231] object-cover sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#D69E25] bg-[#021231] sm:h-20 sm:w-20">
                    <Store className="h-7 w-7 text-[#D69E25] sm:h-8 sm:w-8" />
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1.5 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-black leading-tight text-white sm:text-2xl">
                    {store.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#D69E25]/40 bg-[#D69E25]/15 px-2 py-0.5 text-[9.5px] font-extrabold text-[#D69E25]">
                    <Award className="h-2.5 w-2.5" /> Vendeur Pro
                  </span>
                  <button
                    onClick={() => setShowRules(true)}
                    title="Règles de publication (important)"
                    aria-label="Règles de publication"
                    className="inline-flex items-center gap-1 rounded-full border border-[#D69E25]/50 px-2 py-0.5 text-[9.5px] font-bold text-[#D69E25] transition hover:bg-[#D69E25] hover:text-[#021231]"
                  >
                    <Info className="h-3 w-3" /> Règles
                  </button>
                </div>
                <p className="truncate text-[11px] text-slate-400">
                  {store.ownerName} · {store.ownerEmail}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {shareNotice && (
                <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                  {shareNotice}
                </span>
              )}
              <button
                onClick={() => setShowQr(true)}
                title="QR code de la boutique (flyers, vitrine, réseaux sociaux)"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D69E25]/40 bg-[#D69E25]/10 px-3 py-2 text-[11px] font-bold text-[#D69E25] transition hover:bg-[#D69E25] hover:text-[#021231]"
              >
                <QrCode className="h-3.5 w-3.5" />
                QR boutique
              </button>
              <button
                onClick={handleShareStore}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:border-[#D69E25]/50 hover:bg-white/10"
              >
                <Share2 className="h-3.5 w-3.5 text-[#D69E25]" />
                Partager
              </button>
              <button
                onClick={onViewPublicStore}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:border-[#D69E25]/50 hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#D69E25]" />
                Voir la vitrine
              </button>
              <button
                onClick={handleOpenAddProduct}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D69E25] px-3.5 py-2 text-[11px] font-black text-[#021231] transition hover:bg-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau produit
              </button>
            </div>
          </div>

          {/* Indicateurs clés de la boutique (données réelles) */}
          <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
            {[
              { label: 'Produits publiés', value: `${publishedCount}/${storeProducts.length}` },
              { label: 'Commandes', value: String(storeOrders.length) },
              {
                label: 'Revenus nets',
                value: `$${storeOrders
                  .reduce((sum, order) => sum + (Number(order.vendorEarningsUsd) || 0), 0)
                  .toFixed(0)}`,
              },
              { label: 'Note boutique', value: `${Number(store.rating || 0).toFixed(1)}/5` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-[#021231]/60 px-3 py-2">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="text-sm font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Ouverture / pause des ventes */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#021231]/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white">
                {isStoreOpen ? 'Votre boutique accepte les commandes' : 'Votre boutique est en pause'}
              </p>
              <p className="text-[10px] text-slate-400">
                {isStoreOpen
                  ? 'Les clients peuvent acheter vos produits. Mettez en pause à tout moment.'
                  : 'La vitrine reste visible mais les achats sont bloqués.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleStoreOpen}
              aria-pressed={!isStoreOpen}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                isStoreOpen
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              }`}
            >
              {isStoreOpen ? 'Mettre en pause' : 'Réouvrir les ventes'}
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800 pt-3 [scrollbar-width:none] snap-x">
            {[
              { id: 'analytics' as const, label: 'Tableau de bord', icon: TrendingUp },
              { id: 'products' as const, label: `Produits (${storeProducts.length})`, icon: ShoppingBag },
              { id: 'orders' as const, label: `Ventes (${storeOrders.length})`, icon: PackageCheck },
              { id: 'settings' as const, label: 'Paramètres', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold transition-colors sm:text-xs ${
                    isActive
                      ? 'bg-[#D69E25] text-[#021231]'
                      : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#021231]' : 'text-[#D69E25]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">

        {/* TAB 1: ANALYTICS & REVENUE */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Vue d'ensemble : chiffres et courbes issus de la base */}
            <SellerOverview role="vendor" />

            {/* Withdraw Funds Box */}
            <div className="bg-[#011D46] border border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  <Smartphone className="w-5 h-5 text-[#D69E25]" />
                  <span>Demander un Retrait de vos Gains (Wave, OM, PayPal, Crypto)</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Retirez vos fonds directement sur votre compte Mobile Money local ou portefeuille USDT dès $20 USD.
                </p>
              </div>

              <button
                onClick={() => setShowPayoutModal(true)}
                className="px-6 py-3.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg shrink-0 flex items-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Effectuer une Demande de Retrait</span>
              </button>
            </div>

            {/* Payout History */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D69E25]" />
                <span>Historique des Demandes de Retrait</span>
              </h3>

              {payoutRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune demande de retrait effectuée pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Montant USD</th>
                        <th className="p-3">Montant FCFA</th>
                        <th className="p-3">Mode & Compte</th>
                        <th className="p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {payoutRequests.map((pay) => (
                        <tr key={pay.id} className="hover:bg-white/5 transition">
                          <td className="p-3">{pay.requestedAt}</td>
                          <td className="p-3 font-bold text-white">${pay.amountUsd}</td>
                          <td className="p-3 text-amber-400 font-semibold">{pay.amountFcfa.toLocaleString()} FCFA</td>
                          <td className="p-3 text-slate-300">{pay.payoutMethod}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pay.status === 'Payé' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {pay.status}
                            </span>
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

        {/* TAB 2: PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">Catalogue de votre boutique</h2>
                <p className="text-xs text-slate-300">Gérez, modifiez, publiez ou analysez vos produits.</p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#D69E25] px-4 py-2.5 text-xs font-black text-[#021231] transition hover:bg-amber-400"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un produit</span>
              </button>
            </div>

            {/* Outils : recherche, filtre de statut, actions groupées */}
            <div className="rounded-2xl border border-slate-800 bg-[#011D46] p-3 space-y-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="search"
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Rechercher un produit (titre, description, catégorie)…"
                  aria-label="Rechercher un produit"
                  className="w-full flex-1 rounded-xl border border-slate-700 bg-[#021231] px-3 py-2 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                />
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'all' as const, label: 'Tous' },
                    { id: 'published' as const, label: 'En ligne' },
                    { id: 'draft' as const, label: 'Brouillons' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProductStatus(option.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        productStatus === option.id
                          ? 'bg-[#D69E25] text-[#021231]'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
                <p className="text-[11px] text-slate-400">
                  {filteredStoreProducts.length} produit{filteredStoreProducts.length > 1 ? 's' : ''} affiché
                  {filteredStoreProducts.length > 1 ? 's' : ''}
                  {selectedProducts.length > 0
                    ? ` · ${selectedProducts.length} sélectionné${selectedProducts.length > 1 ? 's' : ''}`
                    : ''}
                </p>
                {selectedProducts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProducts(filteredStoreProducts.map((product) => product.id))}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/10"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetPublished(true)}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Publier
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetPublished(false)}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30"
                    >
                      Masquer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProducts([])}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {filteredStoreProducts.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#011D46] p-10 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-500" />
                <h3 className="mt-3 text-base font-bold text-white">
                  {storeProducts.length === 0
                    ? "Votre boutique n'a pas encore de produit"
                    : 'Aucun produit ne correspond à votre recherche'}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                  {storeProducts.length === 0
                    ? "Publiez votre premier e-book, modèle Canva, formation vidéo ou pack de prompts pour commencer à générer des ventes."
                    : 'Modifiez le mot-clé ou le filtre de statut pour retrouver vos produits.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {storeProducts.length === 0 ? (
                    <button
                      onClick={handleOpenAddProduct}
                      className="rounded-xl bg-[#D69E25] px-5 py-2.5 text-xs font-extrabold text-[#021231] transition hover:bg-amber-400"
                    >
                      Ajouter mon premier produit
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setProductQuery('');
                        setProductStatus('all');
                      }}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {filteredStoreProducts.map((prod) => (
                  <div key={prod.id} className="bg-[#011D46] border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="h-28 sm:h-40 w-full relative overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <ShoppingBag className="w-10 h-10 text-slate-600" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-[#021231]/90 text-[#D69E25] text-[10px] font-bold px-2.5 py-1 rounded-md">
                          {prod.typeLabel}
                        </span>
                        <span className={`absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-1 rounded-md border shadow ${
                          prod.isPublished 
                            ? 'bg-emerald-500/90 text-white border-emerald-400' 
                            : 'bg-slate-700/90 text-slate-300 border-slate-600'
                        }`}>
                          {prod.isPublished ? 'En Ligne' : 'Brouillon'}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(prod.id)}
                          onChange={() => toggleProductSelection(prod.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[#D69E25]"
                          aria-label={`Sélectionner ${prod.title}`}
                        />
                        <h3 className="line-clamp-2 text-sm font-bold text-white sm:text-base">{prod.title}</h3>
                      </div>
                      <p className="hidden sm:block text-xs text-slate-300 line-clamp-2">{prod.description}</p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-lg sm:text-2xl font-black text-[#D69E25]">${prod.price}</span>
                        <span className="text-slate-400 font-semibold">{prod.salesCount} Ventes</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => setAnalyticsProductId(prod.id)}
                        className="rounded-xl border border-[#D69E25]/40 bg-[#D69E25]/15 p-2.5 text-[#D69E25] transition hover:bg-[#D69E25] hover:text-[#021231]"
                        title="Statistiques du produit (vues, clics, paniers, ventes)"
                        aria-label={`Statistiques de ${prod.title}`}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(prod)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          prod.isPublished ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                        title={prod.isPublished ? "Dépublier (masquer de la boutique)" : "Publier sur la boutique"}
                      >
                        {prod.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{prod.isPublished ? 'Masquer' : 'Publier'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-2.5 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white rounded-xl transition"
                        title="Éditer le produit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-2.5 bg-red-600/30 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white rounded-xl transition"
                        title="Supprimer le produit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">Ventes &amp; commandes</h2>
                <p className="text-xs text-slate-300">Suivi réel des achats effectués dans votre boutique.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">
                  {storeOrders.filter((order) => order.status === 'Payé').length} payée(s)
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-bold text-slate-300">
                  Total ${storeOrders.reduce((sum, order) => sum + (Number(order.amountUsd) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#011D46] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="search"
                  value={orderQuery}
                  onChange={(event) => setOrderQuery(event.target.value)}
                  placeholder="Rechercher (n° commande, client, produit)…"
                  aria-label="Rechercher une commande"
                  className="w-full flex-1 rounded-xl border border-slate-700 bg-[#021231] px-3 py-2 text-xs text-white focus:border-[#D69E25] focus:outline-none"
                />
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setOrderStatus('all')}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                      orderStatus === 'all'
                        ? 'bg-[#D69E25] text-[#021231]'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Tous
                  </button>
                  {orderStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOrderStatus(status)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        orderStatus === status
                          ? 'bg-[#D69E25] text-[#021231]'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredStoreOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
                <p className="text-sm font-bold text-white">Aucune commande à afficher</p>
                <p className="mt-1 text-xs text-slate-400">
                  Les ventes apparaîtront ici dès le premier achat de votre boutique.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#011D46]">
                <table className="w-full min-w-[760px] text-left text-xs text-slate-300">
                  <thead className="bg-white/[0.03] text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="p-3">N°</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Produit</th>
                      <th className="p-3 text-right">Montant</th>
                      <th className="p-3 text-right">Votre gain</th>
                      <th className="p-3">Paiement</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStoreOrders.map((ord) => {
                      const created = (ord as { createdAt?: string }).createdAt;
                      return (
                        <tr key={ord.id} className="border-t border-slate-800 hover:bg-white/5">
                          <td className="p-3 font-mono font-bold text-[#D69E25]">{ord.orderNumber}</td>
                          <td className="p-3">
                            <p className="font-bold text-white">{ord.buyerName}</p>
                            <p className="text-[10px] text-slate-400">{ord.buyerEmail}</p>
                          </td>
                          <td className="max-w-[220px] truncate p-3 text-slate-200">{ord.productTitle}</td>
                          <td className="p-3 text-right font-bold text-white">${ord.amountUsd}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">${ord.vendorEarningsUsd}</td>
                          <td className="p-3 text-slate-300">{ord.paymentGateway}</td>
                          <td className="p-3 text-[10px] text-slate-400">
                            {created ? new Date(created).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                                ord.status === 'Payé'
                                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                                  : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-black text-white">Personnalisation de la Boutique</h2>
              <p className="text-xs text-slate-300">Modifiez les informations publiques de votre boutique FORTIA HUB.</p>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Nom de la Boutique *</label>
                <input
                  type="text"
                  required
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              {/* 📸 Upload Logo & Bannière depuis l'appareil → stocké sur FORTIA HUB */}
              <StoreImageUploader
                logo={editStoreLogo}
                banner={editStoreBanner}
                onLogoChange={setEditStoreLogo}
                onBannerChange={setEditStoreBanner}
                storeId={store.id}
              />

              <div>
                <label className="text-xs text-slate-300 block mb-1">Description & Bio de la Boutique</label>
                <textarea
                  rows={3}
                  value={editStoreDesc}
                  onChange={(e) => setEditStoreDesc(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white">Informations de Paiement & Retraits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Méthode de Retrait Préférée</label>
                    <select
                      value={editStorePayoutMethod}
                      onChange={(e) => setEditStorePayoutMethod(e.target.value as any)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    >
                      <option value="mobile_money">Mobile Money (Wave / OM)</option>
                      <option value="paypal">PayPal</option>
                      <option value="crypto">Crypto USDT (TRC20)</option>
                      <option value="bank_transfer">Virement Bancaire RIB</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Numéro / Adresse de Retrait</label>
                    <input
                      type="text"
                      value={editStorePayoutNumber}
                      onChange={(e) => setEditStorePayoutNumber(e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg"
              >
                Enregistrer les Modifications de la Boutique
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Modal Add / Edit Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-xl w-full p-6 text-white space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowAddProductModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D69E25]" />
                <span>{editingProduct ? 'Modifier le Produit' : 'Créer & Publier un Produit Numérique'}</span>
              </h3>
            </div>

            {/* Stepper Header Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#021231] p-1.5 rounded-xl border border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setModalStep(1)}
                className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                  modalStep === 1 
                    ? 'bg-[#D69E25] text-[#021231] shadow' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">1</span>
                <span>Infos, Prix & Visuels</span>
              </button>

              <button
                type="button"
                onClick={() => setModalStep(2)}
                className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                  modalStep === 2 
                    ? 'bg-[#D69E25] text-[#021231] shadow' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">2</span>
                <span>Importation Fichiers (PDF, Vidéo...)</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* STEP 1: INFOS, PRIX, VISUELS & RESTRUCTURATION */}
              {modalStep === 1 && (
                <div className="space-y-4">
                  
                  {/* Titre Produit + Améliorer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-300 font-bold">Nom / Titre du Produit *</label>
                      <button
                        type="button"
                        onClick={handleEnhanceTitle}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                        title="Cliquez pour générer ou optimiser le titre avec l'IA (cliquable plusieurs fois)"
                      >
                        <span>Améliorer avec l'IA</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={prodTitle}
                      onChange={(e) => setProdTitle(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                      placeholder="Ex: Masterclass E-Commerce Africa & Stratégie Ventes"
                    />
                  </div>

                  {/* Catégorie & Prix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-bold">Catégorie</label>
                      <CategorySelect
                        value={prodCategory}
                        labelValue={prodCategoryLabel}
                        categories={categoryOptions}
                        onChange={selectCategory}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                        inputClassName="w-full mt-2 bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                        customPlaceholder="Nom de votre catégorie"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-bold">Prix ($ USD) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(Number(e.target.value))}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                      />
                      <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                        ≈ {Math.round(prodPrice * 600).toLocaleString()} FCFA (Conversion automatique)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">Format du Produit *</label>
                    <input
                      type="text"
                      value={prodFormat}
                      onChange={(e) => setProdFormat(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                      placeholder="Ex: PDF + Lien Canva + Fichier MP4 HD"
                    />
                  </div>

                  {/* Import : image de couverture + galerie */}
                  <ProductImageUploader
                    coverImage={prodImage}
                    images={prodImages}
                    onCoverChange={setProdImage}
                    onImagesChange={setProdImages}
                    entityId={editingProduct?.id || `new-${Date.now()}`}
                  />

                  {/* Description + Améliorer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-300 font-bold">Description du Produit</label>
                      <button
                        type="button"
                        onClick={handleEnhanceDesc}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                        title="Optimiser la description avec l'IA"
                      >
                        <span>Améliorer</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white leading-relaxed"
                      placeholder="Décrivez précisément ce que le client obtiendra lors du téléchargement..."
                    />
                  </div>

                  {/* Avantages + Améliorer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-300 font-bold">Avantages & Éléments inclus (1 par ligne)</label>
                      <button
                        type="button"
                        onClick={handleEnhanceFeatures}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D69E25] hover:from-amber-500 hover:to-yellow-500 hover:text-[#021231] rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 border border-[#D69E25]/40 shadow-sm"
                        title="Formater et enrichir les avantages avec l'IA"
                      >
                        <span>Améliorer</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={prodFeaturesStr}
                      onChange={(e) => setProdFeaturesStr(e.target.value)}
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="prodIsPublished"
                      checked={prodIsPublished}
                      onChange={(e) => setProdIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-[#D69E25]"
                    />
                    <label htmlFor="prodIsPublished" className="text-xs text-slate-300 font-semibold cursor-pointer">
                      Publier immédiatement sur ma boutique & sur FORTIA HUB Marketplace
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!prodTitle) {
                        alert('Veuillez spécifier le titre du produit avant de continuer.');
                        return;
                      }
                      setModalStep(2);
                    }}
                    className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow flex items-center justify-center gap-2"
                  >
                    <span>Continuer vers Étape 2 : Importation des Fichiers</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                </div>
              )}

              {/* STEP 2: IMPORTATION DES FICHIERS PRODUITS LIVRABLES */}
              {modalStep === 2 && (
                <div className="space-y-4">
                  <ProductDeliverableUploader
                    files={deliverableFiles}
                    downloadUrl={downloadUrl}
                    fileFormat={prodFormat}
                    onFilesChange={setDeliverableFiles}
                    onDownloadUrlChange={setDownloadUrl}
                    entityId={editingProduct?.id || `new-${Date.now()}`}
                  />

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
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
                      <span>{editingProduct ? 'Enregistrer les Modifications' : 'Publier le Produit avec Fichiers'}</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Modal Withdraw Funds Request */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button onClick={() => setShowPayoutModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#D69E25]" />
              <span>Demande de Retrait de Revenus Vendeur</span>
            </h3>

            <form onSubmit={handleSubmitPayoutRequest} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Montant à retirer ($ USD) *</label>
                <input
                  type="number"
                  required
                  min="20"
                  max={netEarningsUsd || 1000}
                  value={payoutAmountUsd}
                  onChange={(e) => setPayoutAmountUsd(Number(e.target.value))}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white font-bold"
                />
                <span className="text-[10px] text-amber-400 block mt-1 font-semibold">
                  ≈ {Math.round(payoutAmountUsd * 600).toLocaleString()} FCFA (Solde max dispo: ${netEarningsUsd})
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Mode de Réception *</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                >
                  <option value="wave">Wave Senegal (Instant)</option>
                  <option value="om">Orange Money (Instant)</option>
                  <option value="paypal">PayPal Email</option>
                  <option value="crypto">Crypto USDT TRC20</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Numéro de Téléphone ou Wallet *</label>
                <input
                  type="text"
                  required
                  value={payoutAccountDetails}
                  onChange={(e) => setPayoutAccountDetails(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow"
              >
                Confirmer la Demande de Retrait (${payoutAmountUsd})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Popup de confirmation d'enregistrement de la boutique */}
      <SuccessConfirmationModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Boutique enregistrée !"
        message="Les paramètres de votre boutique (nom, logo, bannière, description et coordonnées de paiement) ont été enregistrés avec succès."
      />

      {/* ===== Règles de publication (vendeurs) — icônes vectorielles ===== */}
      {showRules && (
        <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-[#021231] border border-[#D69E25]/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-[#D69E25]/25">
              <h3 className="flex items-center gap-2 text-sm font-black" style={{ color: "#F8FAFC" }}>
                <Info className="h-4 w-4 text-[#D69E25]" />
                Règles de publication — vendeurs
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-[11px] leading-relaxed text-slate-300">
              {[
                {
                  icon: BadgeCheck,
                  title: "Produit authentique",
                  text: "Vous détenez les droits sur le produit vendu (aucune copie d'un autre vendeur).",
                },
                {
                  icon: Copyright,
                  title: "Droits d'auteur",
                  text: "Images, textes, modèles et fichiers doivent être libres de droits ou créés par vous.",
                },
                {
                  icon: FileCheck,
                  title: "Fichiers livrables réels",
                  text: "Tout ce que vous annoncez doit exister et être téléchargeable par l'acheteur.",
                },
                {
                  icon: ShieldCheck,
                  title: "Aucune fausse promesse",
                  text: "Pas de gains garantis, de fausses certifications ou d'usurpation d'identité.",
                },
              ].map((rule) => (
                <div key={rule.title} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#D69E25]/15 text-[#D69E25]">
                    <rule.icon className="h-3.5 w-3.5" />
                  </span>
                  <p>
                    <strong className="text-white">{rule.title}</strong> — {rule.text}
                  </p>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  En cas de non-respect : <strong>suspension immédiate du produit</strong>,{" "}
                  <strong>fonds gelés</strong>, motif affiché sur votre espace et possibilité de{" "}
                  <strong>demander un examen</strong>.
                </p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 rounded-xl bg-[#D69E25] text-[#021231] text-xs font-black hover:bg-amber-400 transition"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
