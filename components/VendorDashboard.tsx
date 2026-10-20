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
  ChevronDown
} from 'lucide-react';
import { 
  VendorStore, 
  MarketplaceProduct, 
  MarketplaceOrder, 
  PayoutRequest, 
  DigitalProductType 
} from '../types';
import { VendorStatsPanel } from "./vendor/VendorStatsPanel";
import { ProductImageUploader } from './ProductImageUploader';
import { ProductDeliverableUploader, DeliverableFile } from './ProductDeliverableUploader';
import { StoreImageUploader } from './StoreImageUploader';
import { enhanceTitle, enhanceDescription, enhanceFeatures } from '../utils/aiEnhancer';
import { SuccessConfirmationModal } from './SuccessConfirmationModal';

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

  // Filter items belonging to this store (robuste : storeId OU storeName)
  const storeProducts = (products || []).filter(
    (p) => p.storeId === store?.id || p.storeName === store?.name
  );
  const storeOrders = (orders || []).filter(
    (o) => o.storeId === store?.id || o.storeName === store?.name
  );

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
  const [prodPrice, setProdPrice] = useState<number>(25);
  const [prodFormat, setProdFormat] = useState('PDF');
  const [prodImage, setProdImage] = useState('');
  const [prodBannerImage, setProdBannerImage] = useState('');
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
    setProdType('ebook');
    setProdPrice(25);
    setProdFormat('PDF');
    setProdImage('');
    setProdBannerImage('');
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
    setProdType(p.type as any);
    setProdPrice(p.price);
    setProdFormat(p.fileFormat);
    setProdImage(p.image || '');
    setProdBannerImage(p.bannerImage || '');
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
        typeLabel: TYPE_LABELS[prodType] || 'Fichier Numérique',
        price: Number(prodPrice),
        fileFormat: prodFormat,
        image: prodImage,
        bannerImage: prodBannerImage,
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
        typeLabel: TYPE_LABELS[prodType] || 'Fichier Numérique',
        description: prodDesc || 'Ressource numérique d\'excellence prête au téléchargement.',
        price: Number(prodPrice),
        originalPrice: Number(prodPrice) * 1.5,
        fileFormat: prodFormat || 'PDF',
        fileSize: '15 MB',
        image: prodImage || '',
        bannerImage: prodBannerImage || '',
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
      {/* Top Banner & Header */}
      <div className="vendor-header-banner relative bg-[#011D46] border-b border-[#D69E25]/30 overflow-hidden" style={{ backgroundColor: "#011D46" }}>
        {/* Glow effects */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />
        <div className="absolute -top-20 right-20 w-64 h-64 rounded-full bg-[#D69E25]/5 blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10 space-y-6">
          {/* Identité de la boutique + statut */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {store.logo ? (
              <motion.img
                src={store.logo}
                alt={store.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#D69E25] shrink-0 self-center sm:self-auto"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-[#D69E25] shrink-0 self-center sm:self-auto bg-[#021231] flex items-center justify-center">
                <Store className="w-7 h-7 sm:w-8 sm:h-8 text-[#D69E25]" />
              </div>
            )}

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{store.name}</h1>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#D69E25]/15 text-[#D69E25] border border-[#D69E25]/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                    <Award className="w-3 h-3" /> FORTIA Vendeur Pro
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-[#021231] border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Statut : Boutique Active
                  </span>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-300 truncate max-w-full">
                Propriétaire : <strong className="text-white">{store.ownerName}</strong> · {store.ownerEmail}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[11px] text-slate-300">
                <span>
                  Commissions plateforme : <strong className="text-[#D69E25]">10%</strong>
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-[#D69E25]" />
                  {storeProducts.length + (store.salesCount || 0)} produit{(storeProducts.length + (store.salesCount || 0)) > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
            <button
              onClick={onViewPublicStore}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 hover:border-[#D69E25]/50 font-bold text-xs rounded-xl transition-all duration-300 shadow overflow-hidden"
            >
              <ExternalLink className="w-4 h-4 text-[#D69E25]" />
              <span>Voir ma Boutique Publique</span>
            </button>

            <button
              onClick={handleOpenAddProduct}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#D69E25] hover:bg-amber-400 text-[#021231] font-black text-xs rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit</span>
            </button>
          </div>

        {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-6 sm:mt-8 pt-4 border-t border-slate-800 overflow-x-auto scrollbar-none snap-x">
            {[
              { id: 'analytics' as const, label: 'Tableau de Bord', icon: TrendingUp },
              { id: 'products' as const, label: `Mes Produits (${storeProducts.length})`, icon: ShoppingBag },
              { id: 'orders' as const, label: `Ventes & Commandes (${storeOrders.length})`, icon: PackageCheck },
              { id: 'settings' as const, label: 'Paramètres Boutique', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D69E25] text-[#021231]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#021231]' : 'text-[#D69E25]'}`} />
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
            {/* Stats Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              {[
                { label: "Chiffre d'Affaires", icon: DollarSign, value: `$${grossRevenueUsd}`, sub: `≈ ${Math.round(grossRevenueUsd * 600).toLocaleString()} FCFA`, badge: "100% des ventes accumulées", badgeColor: "text-emerald-400", color: "#D69E25" },
                { label: "Commissions (10%)", icon: CreditCard, value: `$${platformFeeUsd}`, sub: `≈ ${Math.round(platformFeeUsd * 600).toLocaleString()} FCFA`, badge: "Frais de gestion & infrastructure", badgeColor: "text-slate-400", color: "#F59E0B" },
                { label: "Revenu Net", icon: TrendingUp, value: `$${netEarningsUsd}`, sub: `≈ ${netEarningsFcfa.toLocaleString()} FCFA`, badge: "Disponible pour retrait instantané", badgeColor: "text-emerald-300", color: "#D69E25", highlighted: true },
                { label: "Ventes", icon: PackageCheck, value: `${storeOrders.length + (store.salesCount || 0)}`, sub: "", badge: "Produits numériques délivrés", badgeColor: "text-emerald-400", color: "#D69E25" },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -4 }}
                                    className={`group relative rounded-2xl border p-3.5 sm:p-4 space-y-2 bg-[#011D46]/80 transition-colors ${
                    stat.highlighted ? 'border-[#D69E25]/60' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 leading-tight">
                      {stat.label}
                    </span>
                    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                      stat.highlighted ? 'bg-[#D69E25] text-[#021231]' : 'bg-[#D69E25]/10 text-[#D69E25]'
                    }`}>
                      <stat.icon className="w-4 h-4" />
                    </span>
                  </div>
                  <p className={`text-xl sm:text-2xl font-black truncate ${stat.highlighted ? 'text-[#D69E25]' : 'text-white'}`}>
                    {stat.value}
                  </p>
                  <div className="min-w-0">
                    {stat.sub && (
                      <span className="text-[10px] text-slate-500 font-semibold block truncate">{stat.sub}</span>
                    )}
                    <span className={`text-[10px] font-bold block truncate ${stat.badgeColor}`}>{stat.badge}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Catalogue des Produits de votre Boutique</h2>
                <p className="text-xs text-slate-300">Gérez, modifiez ou publiez vos produits en temps réel.</p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-5 py-2.5 bg-[#D69E25] hover:bg-amber-400 text-[#021231] font-black text-xs rounded-xl transition shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Produit</span>
              </button>
            </div>

            {storeProducts.length === 0 ? (
              <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <ShoppingBag className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">Votre boutique n'a pas encore de produit</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Publiez votre premier e-book, modèle Canva, formation vidéo ou pack de prompts pour commencer à générer des ventes.
                </p>
                <button
                  onClick={handleOpenAddProduct}
                  className="px-6 py-3 bg-[#D69E25] text-[#021231] font-extrabold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Ajouter mon Premier Produit
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
              {/* Statistiques réelles : vues, clics, ajouts au panier, ventes */}
              <VendorStatsPanel storeId={(store as { id?: string } | null)?.id} />

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {storeProducts.map((prod) => (
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

                      <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2">{prod.title}</h3>
                      <p className="hidden sm:block text-xs text-slate-300 line-clamp-2">{prod.description}</p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-lg sm:text-2xl font-black text-[#D69E25]">${prod.price}</span>
                        <span className="text-slate-400 font-semibold">{prod.salesCount} Ventes</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
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
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white">Historique des Commandes de la Boutique</h2>
            <p className="text-xs text-slate-300">Liste des clients ayant acheté des produits dans votre boutique.</p>

            {storeOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Aucune commande enregistrée pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">N° Commande</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Produit Achete</th>
                      <th className="p-3">Montant Total</th>
                      <th className="p-3">Votre Gain (90%)</th>
                      <th className="p-3">Passerelle</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {storeOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{ord.orderNumber}</td>
                        <td className="p-3">
                          <p className="font-bold text-white">{ord.buyerName}</p>
                          <p className="text-[10px] text-slate-400">{ord.buyerEmail}</p>
                        </td>
                        <td className="p-3 text-slate-200 line-clamp-1">{ord.productTitle}</td>
                        <td className="p-3 font-bold text-white">${ord.amountUsd}</td>
                        <td className="p-3 font-bold text-emerald-400">${ord.vendorEarningsUsd}</td>
                        <td className="p-3 text-cyan-300 font-semibold">{ord.paymentGateway}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
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

                  {/* Type & Prix */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-bold">Type de Ressource</label>
                      <select
                        value={prodType}
                        onChange={(e) => setProdType(e.target.value as any)}
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-2.5 text-white"
                      >
                        <option value="ebook">eBook PDF</option>
                        <option value="canva_template">Modèle Canva Pro</option>
                        <option value="ai_prompts">Pack Prompts IA</option>
                        <option value="whitepaper">White Paper PDF</option>
                        <option value="business_plan">Business Plan</option>
                        <option value="contract">Contrat Type</option>
                        <option value="pitch_deck">Pitch Deck</option>
                        <option value="pro_templates">Templates Pro</option>
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

                  {/* Import Visuels Couverture & Bannière */}
                  <ProductImageUploader
                    coverImage={prodImage}
                    bannerImage={prodBannerImage}
                    onCoverChange={setProdImage}
                    onBannerChange={setProdBannerImage}
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

    </div>
  );
};
