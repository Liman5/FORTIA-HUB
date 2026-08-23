"use client";

import React, { useState, useMemo } from 'react';
import { 
  Store, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  ShoppingBag, 
  Download, 
  ShieldCheck, 
  Share2, 
  Mail, 
  Phone,
  Tag,
  ExternalLink,
  X,
  Link2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Linkedin,
  Facebook
} from 'lucide-react';
import { VendorStore, MarketplaceProduct, CartItem } from '../types';

interface VendorStoreViewProps {
  store: VendorStore;
  products: MarketplaceProduct[];
  onBackToMarketplace?: () => void;
  onBack?: () => void;
  onAddToCart: (item: CartItem) => void;
  onInstantBuy: (item: CartItem) => void;
  isAdmin?: boolean;
}

export const VendorStoreView: React.FC<VendorStoreViewProps> = ({
  store,
  products = [],
  onBackToMarketplace,
  onBack,
  onAddToCart,
  onInstantBuy,
  isAdmin
}) => {
  const handleBack = () => {
    if (onBackToMarketplace) onBackToMarketplace();
    else if (onBack) onBack();
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // === PARTAGE RÉSEAUX SOCIAUX ===
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Slug court de la boutique basé sur son nom (lien propre et court)
  const storeSlug = useMemo(() => {
    if (!store) return '';
    const base = store.slug && store.slug.trim() ? store.slug : (store.name || 'boutique');
    return base.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'boutique';
  }, [store]);

  // URL courte publique : /vendorstore/{slug} (sans storeId inutile)
  const storePublicUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/vendorstore/${encodeURIComponent(storeSlug)}`;
    }
    return `/vendorstore/${encodeURIComponent(storeSlug)}`;
  }, [storeSlug]);

  const shareText = useMemo(() => {
    return `Découvrez ma boutique "${store?.name || 'FORTIA HUB'}" sur FORTIA HUB ! 🛍️`;
  }, [store?.name]);

  const getShareLinks = (url: string, text: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    return [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        color: '#25D366',
        bg: 'bg-[#25D366]/15 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25',
        icon: <MessageCircle className="w-5 h-5" />,
        url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
      },
      {
        id: 'facebook',
        label: 'Facebook',
        color: '#1877F2',
        bg: 'bg-[#1877F2]/15 border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/25',
        icon: <Facebook className="w-5 h-5" />,
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      },
      {
        id: 'x',
        label: 'X (Twitter)',
        color: '#e2e8f0',
        bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300 hover:bg-slate-500/25',
        icon: <X className="w-5 h-5" />,
        url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
      },
      {
        id: 'linkedin',
        label: 'LinkedIn',
        color: '#0A66C2',
        bg: 'bg-[#0A66C2]/15 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/25',
        icon: <Linkedin className="w-5 h-5" />,
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      },
      {
        id: 'telegram',
        label: 'Telegram',
        color: '#0088cc',
        bg: 'bg-[#0088cc]/15 border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/25',
        icon: <Send className="w-5 h-5" />,
        url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
      },
      {
        id: 'email',
        label: 'Email',
        color: '#f59e0b',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25',
        icon: <Mail className="w-5 h-5" />,
        url: `mailto:?subject=${encodedText}&body=${encodedUrl}`
      }
    ];
  };

  const handleShareStore = () => {
    setCopied(false);
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storePublicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      alert(`Lien de la boutique : ${storePublicUrl}`);
    }
  };

  const shareLinks = getShareLinks(storePublicUrl, shareText);

  // Filter store products - Memoized for performance
  const storeProducts = useMemo(() => {
    return (products || []).filter(p => p && p.storeId === store?.id && p.isPublished);
  }, [products, store?.id]);

  const categories = useMemo(() => {
    return ['Tous', ...Array.from(new Set(storeProducts.map(p => p.typeLabel).filter(Boolean)))];
  }, [storeProducts]);

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return storeProducts.filter(p => {
      const matchesCategory = selectedCategory === 'Tous' || p.typeLabel === selectedCategory;
      const matchesSearch = !q || 
                            (p.title && p.title.toLowerCase().includes(q)) || 
                            (p.description && p.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [storeProducts, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#021231] text-white min-h-screen pb-16 space-y-8">
      {/* Top Banner & Header */}
      <div className="relative">
        {/* Cover Banner */}
        <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-[#011D46]">
          {store.banner ? (
            <img 
              src={store.banner} 
              alt={store.name} 
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#011D46] via-[#021231] to-[#011D46] flex flex-col items-center justify-center text-slate-400 p-4">
              <Store className="w-10 h-10 text-[#D69E25]/60 mb-2" />
              <span className="text-xs font-bold text-slate-300">Bannière de la Boutique</span>
              <span className="text-[10px] text-slate-500 mt-0.5">En attente d'importation par le vendeur</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/40 to-transparent"></div>
          
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 z-10 px-3.5 py-2 bg-[#021231] text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#011D46] transition shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D69E25]" />
            <span>Retour à la Marketplace</span>
          </button>

          {/* Share Button - Ouvre le modal de partage réseaux sociaux */}
          <button
            onClick={handleShareStore}
            className="absolute top-4 right-4 z-10 px-3.5 py-2 bg-[#021231] text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:text-white hover:bg-[#011D46] transition shadow-lg cursor-pointer"
            title="Partager la boutique sur les réseaux sociaux"
          >
            <Share2 className="w-4 h-4 text-[#D69E25]" />
            <span>Partager</span>
          </button>
        </div>

        {/* Store Profile Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20">
          <div className="bg-[#011D46] border border-[#D69E25]/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Store Logo */}
            <div className="relative shrink-0">
              {store.logo ? (
                <img 
                  src={store.logo} 
                  alt={store.name} 
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-[#021231] shadow-xl bg-slate-900"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[#021231] shadow-xl bg-[#021231] flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <Store className="w-8 h-8 text-[#D69E25]" />
                  <span className="text-[10px] font-bold mt-1 text-slate-300">Logo Vendeur</span>
                </div>
              )}
              {store.isVerified && (
                <span className="absolute -bottom-2 -right-2 bg-amber-500 text-[#021231] p-1.5 rounded-full border-2 border-[#021231] shadow" title="Vendeur Certifié FORTIA">
                  <CheckCircle2 className="w-5 h-5 fill-current" />
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{store.name}</h1>
                {store.isVerified && (
                  <span className="bg-amber-500/20 text-[#D69E25] border border-[#D69E25]/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Vendeur Officiel Certifié
                  </span>
                )}
                {store.status === 'suspended' && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                    Boutique Suspendue
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                {store.description}
              </p>

              {/* Owner Meta & Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#D69E25]" />
                  <span>Par: <strong className="text-white">{store.ownerName}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#D69E25]" />
                  <span><strong className="text-white">{storeProducts.length}</strong> Produits publiés</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span><strong className="text-white">{store.salesCount}</strong> Ventes réussies</span>
                </span>
              </div>

              {/* Categories Tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-2">
                {store.categories.map((cat, idx) => (
                  <span key={idx} className="text-[10px] bg-[#021231] border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-[#011D46] border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Categories Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#D69E25] text-[#021231] shadow'
                    : 'bg-[#021231] text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar inside Store */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans cette boutique..."
              className="w-full bg-[#021231] border border-slate-700 text-xs text-white placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-[#D69E25]"
            />
          </div>
        </div>

        {/* Products Grid - 2 colonnes (mobile + desktop) */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-[#011D46] border border-slate-800 rounded-3xl p-8 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Aucun produit trouvé</h3>
            <p className="text-xs text-slate-400">Aucun article ne correspond à vos critères dans la boutique {store.name}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {filteredProducts.map((prod) => {
              const priceFcfa = Math.round(prod.price * 600);
              const originalFcfa = prod.originalPrice ? Math.round(prod.originalPrice * 600) : null;

              return (
                <div
                  key={prod.id}
                  className="bg-[#011D46] border border-slate-800 hover:border-[#D69E25]/60 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-lg group hover:shadow-2xl"
                >
                  <div className="space-y-4">
                    {/* Cover Image */}
                    <div className="h-36 sm:h-48 w-full relative overflow-hidden bg-slate-800">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <ShoppingBag className="w-10 h-10 text-slate-600" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-[#021231] text-[#D69E25] text-[10px] font-black px-2.5 py-1 rounded-md border border-[#D69E25]/40 shadow">
                        {prod.typeLabel}
                      </span>
                      {prod.isPopular && (
                        <span className="absolute top-3 right-3 bg-amber-500 text-[#021231] text-[10px] font-black px-2.5 py-1 rounded-md shadow flex items-center gap-1">
                          Top Vente
                        </span>
                      )}
                    </div>

                    {/* Content Details - compact sur mobile */}
                    <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                      <h3 className="font-bold text-xs sm:text-base text-white group-hover:text-[#D69E25] transition line-clamp-2">
                        {prod.title}
                      </h3>

                      <p className="text-[10px] sm:text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>

                      {/* Format Badge */}
                      <div className="flex items-center gap-2 text-[9px] sm:text-[11px] text-slate-400 pt-0.5 sm:pt-1">
                        <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D69E25]" />
                        <span>Format: <strong className="text-slate-200">{prod.fileFormat}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Price & Buy - compact sur mobile */}
                  <div className="p-3 sm:p-5 pt-0 space-y-2 sm:space-y-3">
                    <div className="flex items-baseline justify-between pt-2 sm:pt-3 border-t border-slate-800">
                      <div>
                        <span className="text-lg sm:text-2xl font-black text-[#D69E25]">${prod.price}</span>
                        <span className="text-[9px] sm:text-[11px] text-slate-300 block font-semibold">≈ {priceFcfa.toLocaleString()} FCFA</span>
                      </div>
                      {prod.originalPrice && (
                        <div className="text-right">
                          <span className="text-[10px] sm:text-xs text-slate-400 line-through block">${prod.originalPrice}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <button
                        onClick={() => onAddToCart({
                          id: prod.id,
                          type: 'product',
                          title: prod.title,
                          price: prod.price,
                          image: prod.image,
                          categoryLabel: prod.typeLabel
                        })}
                        className="w-full py-2 sm:py-2.5 bg-[#334155] hover:bg-[#475569] text-[#e2e8f0] font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1 border border-[#475569]"
                      >
                        <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Panier</span>
                      </button>

                      <button
                        onClick={() => onInstantBuy({
                          id: prod.id,
                          type: 'product',
                          title: prod.title,
                          price: prod.price,
                          image: prod.image,
                          categoryLabel: prod.typeLabel
                        })}
                        className="w-full py-2 sm:py-2.5 bg-[#D69E25] hover:bg-[#f6e05e] text-[#021231] font-black text-[9px] sm:text-xs rounded-lg sm:rounded-xl transition shadow flex items-center justify-center gap-1"
                      >
                        <span>Acheter</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== MODAL PARTAGE RÉSEAUX SOCIAUX ===== */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-2xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl relative">
            {/* Close Button */}
            <button 
              onClick={() => setShowShareModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-11 h-11 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-[#D69E25]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Partager ma Boutique</h3>
                <p className="text-[11px] text-slate-400">"{store.name}" sur FORTIA HUB</p>
              </div>
            </div>

            {/* Lien court à copier */}
            <div className="bg-[#021231] border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-4 h-4 text-[#D69E25] shrink-0" />
                  <span className="text-xs text-slate-300 font-mono truncate">{storePublicUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black transition flex items-center gap-1 ${
                    copied 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-[#D69E25] text-[#021231] hover:bg-amber-400'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Grid Réseaux Sociaux */}
            <div className="grid grid-cols-3 gap-2.5">
              {shareLinks.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.03] ${s.bg}`}
                >
                  {s.icon}
                  <span className="text-[10px] font-bold">{s.label}</span>
                </a>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              Partager le lien court de votre boutique directement sur vos réseaux sociaux préférés.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};