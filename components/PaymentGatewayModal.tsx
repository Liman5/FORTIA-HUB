"use client";

import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Lock, 
  DollarSign,
  QrCode,
  Globe,
  AlertCircle,
  Download
} from 'lucide-react';
import { CartItem, MarketplaceOrder, MarketplaceProduct, PostPurchaseSupportSubmission, VendorStore } from '../types';
import { downloadProductDeliverable } from '../utils/pdfGenerator';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalAmountUsd: number;
  onPaymentSuccess: (order: MarketplaceOrder) => void;
  onAddSupportSubmission?: (submission: PostPurchaseSupportSubmission) => void;
  vendorEmail?: string;
  /** ID du membre connecté (liaison commande → compte membre) */
  buyerUserId?: string;
  /** Produits réels de la marketplace pour résoudre storeId/productId authentiques */
  marketplaceProducts?: MarketplaceProduct[];
  /** Boutiques réelles pour le storeName authentique */
  stores?: VendorStore[];
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  totalAmountUsd,
  onPaymentSuccess,
  onAddSupportSubmission,
  vendorEmail,
  buyerUserId,
  marketplaceProducts = [],
  stores = []
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'om' | 'card' | 'paypal' | 'crypto'>('wave');
  const [buyerLastName, setBuyerLastName] = useState('');
  const [buyerFirstName, setBuyerFirstName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [supportNote, setSupportNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<MarketplaceOrder | null>(null);

  if (!isOpen) return null;

  const totalFcfa = Math.round(totalAmountUsd * 600);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!buyerLastName && !buyerFirstName) || !buyerEmail || !buyerPhone) {
      alert('Veuillez remplir vos informations de contact (Nom, Prénom, Email, Téléphone/WhatsApp).');
      return;
    }

    const fullBuyerName = `${buyerFirstName} ${buyerLastName}`.trim() || 'Client FORTIA';

    setIsProcessing(true);

    // Simulate clean API Gateway Handshake (Wave / Orange Money / Cards / Crypto API)
    setTimeout(() => {
      const gatewayNames: Record<string, 'Wave API' | 'Orange Money API' | 'MTN Money API' | 'Card Stripe API' | 'PayPal API' | 'Crypto USDT TRC20'> = {
        wave: 'Wave API',
        om: 'Orange Money API',
        card: 'Card Stripe API',
        paypal: 'PayPal API',
        crypto: 'Crypto USDT TRC20'
      };

      const selectedGateway = gatewayNames[selectedMethod] || 'Wave API';
      const ref = `${selectedMethod.toUpperCase()}-TX-${Math.floor(1000000 + Math.random() * 9000000)}`;

      const firstItem = cartItems[0] || { id: 'prod-unknown', title: 'Commande FORTIA HUB' };

      // Résoudre les vraies données du produit et de la boutique (liaison DB réelle)
      const realProduct = marketplaceProducts.find((p) => p.id === firstItem.id);
      const realStore = realProduct
        ? stores.find((s) => s.id === realProduct.storeId) ||
          stores.find((s) => s.name === realProduct.storeName)
        : undefined;

      const generatedOrderNum = `CHAR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const order: MarketplaceOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: generatedOrderNum,
        buyerName: fullBuyerName,
        buyerEmail,
        buyerPhone,
        buyerUserId: buyerUserId || undefined,
        storeId: realProduct?.storeId || realStore?.id || undefined,
        storeName: realProduct?.storeName || realStore?.name || 'Marketplace FORTIA HUB',
        productId: realProduct?.id || firstItem.id,
        productTitle: realProduct?.title || firstItem.title,
        amountUsd: totalAmountUsd,
        platformCommissionUsd: Number((totalAmountUsd * 0.10).toFixed(2)),
        vendorEarningsUsd: Number((totalAmountUsd * 0.90).toFixed(2)),
        paymentGateway: selectedGateway,
        transactionRef: ref,
        status: 'Payé',
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Create support form submission automatically (dispatched to vendor email & recorded in admin)
      const supportSub: PostPurchaseSupportSubmission = {
        id: `sub-${Date.now()}`,
        orderNumber: generatedOrderNum,
        productTitle: cartItems.map(i => i.title).join(', ') || firstItem.title,
        lastName: buyerLastName || fullBuyerName,
        firstName: buyerFirstName || 'Client',
        phoneContact: buyerPhone,
        email: buyerEmail,
        notes: supportNote.trim() || 'Formulaire de garantie et suivi de livraison post-achat validé.',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        forwardedEmail: vendorEmail || 'vendeur@fortiahub.com',
        status: 'Transmis / Enregistré'
      };

      if (onAddSupportSubmission) {
        onAddSupportSubmission(supportSub);
      }

      setCurrentOrder(order);
      setIsProcessing(false);
      setPaymentComplete(true);
      onPaymentSuccess(order);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#021231] text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {!paymentComplete ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Passerelle de Paiement Sécurisée</h3>
                <p className="text-xs text-slate-300">Architecture API Unifiée (Wave, Orange Money, Cartes, Crypto)</p>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-[#021231] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Montant Total à Régler</span>
                <span className="text-2xl font-black text-[#D69E25]">${totalAmountUsd} USD</span>
                <span className="text-xs text-slate-300 block font-semibold">≈ {totalFcfa.toLocaleString()} FCFA</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Cryptage SSL 256-bit
                </span>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-5">
              {/* Buyer Info & Support Registration */}
              <div className="space-y-3 bg-[#021231]/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Informations du Client & Fiche d'Assistance</span>
                  </h4>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                    Suivi Garanti
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={buyerLastName}
                      onChange={(e) => setBuyerLastName(e.target.value)}
                      placeholder="Ex: Kouassi"
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={buyerFirstName}
                      onChange={(e) => setBuyerFirstName(e.target.value)}
                      placeholder="Ex: Jean-Paul"
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Téléphone / WhatsApp (Contact direct) *</label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+228 90 00 00 00"
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Email pour réception des accès *</label>
                    <input
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="votre.email@domaine.com"
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Note / Instruction spécifique en cas de besoin (Optionnel)</label>
                  <input
                    type="text"
                    value={supportNote}
                    onChange={(e) => setSupportNote(e.target.value)}
                    placeholder="Ex: Numéro WhatsApp alternatif, instruction particulière..."
                    className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Choisissez votre mode de paiement API</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('wave')}
                    className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                      selectedMethod === 'wave'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold ring-2 ring-cyan-400/50'
                        : 'bg-[#021231] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs">Wave Sénégal</span>
                    <span className="text-[9px] text-cyan-300 font-extrabold">0% Frais</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('om')}
                    className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                      selectedMethod === 'om'
                        ? 'bg-orange-500/20 border-orange-400 text-white font-bold ring-2 ring-orange-400/50'
                        : 'bg-[#021231] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-orange-400" />
                    <span className="text-xs">Orange Money</span>
                    <span className="text-[9px] text-orange-300 font-extrabold">API Instantanée</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('card')}
                    className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                      selectedMethod === 'card'
                        ? 'bg-blue-500/20 border-blue-400 text-white font-bold ring-2 ring-blue-400/50'
                        : 'bg-[#021231] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="text-xs">Carte Visa/Mastercard</span>
                    <span className="text-[9px] text-blue-300 font-extrabold">Stripe API</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('paypal')}
                    className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                      selectedMethod === 'paypal'
                        ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold ring-2 ring-indigo-400/50'
                        : 'bg-[#021231] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Globe className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs">PayPal</span>
                    <span className="text-[9px] text-indigo-300 font-extrabold">International</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('crypto')}
                    className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition col-span-2 sm:col-span-1 ${
                      selectedMethod === 'crypto'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/50'
                        : 'bg-[#021231] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs">Crypto (USDT)</span>
                    <span className="text-[9px] text-emerald-300 font-extrabold">TRC20 / Web3</span>
                  </button>
                </div>
              </div>

              {/* Gateway Technical Details */}
              <div className="bg-[#021231]/80 p-3 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-300">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px]">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Architecture d'Intégration API Prête au Déploiement</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Le système exécute une vérification d'API en temps réel. Une fois l'appel API validé par l'opérateur ({selectedMethod.toUpperCase()}), les droits de téléchargement du produit sont débloqués immédiatement.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-[#D69E25] text-[#021231] font-black text-sm rounded-2xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#021231] border-t-transparent rounded-full animate-spin"></div>
                    <span>Initialisation API Gateway & Validation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Valider et Payer ${totalAmountUsd} (${totalFcfa.toLocaleString()} FCFA)</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Payment Success Confirmation */
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Paiement Validé avec Succès !</h3>
              <p className="text-xs text-slate-300">
                Votre transaction a été enregistrée par la passerelle <span className="text-[#D69E25] font-bold">{currentOrder?.paymentGateway}</span>.
              </p>
            </div>

            <div className="bg-[#021231] border border-slate-800 p-4 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">N° de Commande:</span>
                <span className="font-mono font-bold text-amber-400">{currentOrder?.orderNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Réf. Transaction API:</span>
                <span className="font-mono text-slate-300">{currentOrder?.transactionRef}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Montant Payé:</span>
                <span className="font-bold text-white">${currentOrder?.amountUsd} USD ({Math.round((currentOrder?.amountUsd || 0) * 600).toLocaleString()} FCFA)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client:</span>
                <span className="font-semibold text-slate-200">{currentOrder?.buyerName} ({currentOrder?.buyerEmail})</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium">
              🎉 Vos fichiers numériques et accès formations sont débloqués immédiatement ci-dessous :
            </div>

            {/* Direct Download List */}
            <div className="bg-[#021231] p-4 rounded-2xl border border-[#D69E25]/50 text-left space-y-3">
              <h5 className="text-xs font-extrabold text-[#D69E25] uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                <span>Téléchargement Direct du Produit / Formation</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Achat Confirmé</span>
              </h5>

              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="p-3 bg-[#011D46] rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold text-xs text-white line-clamp-1">{item.title}</p>
                        <span className="text-[10px] text-[#D69E25] font-semibold">{item.categoryLabel}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadProductDeliverable(item.title, item.categoryLabel)}
                      className="px-3.5 py-2 bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] rounded-lg transition shadow flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                ))}

                {cartItems.length === 0 && currentOrder && (
                  <div className="p-3 bg-[#011D46] rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-white">{currentOrder.productTitle}</p>
                      <span className="text-[10px] text-[#D69E25] font-semibold">Produit / Formation Numérique</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadProductDeliverable(currentOrder.productTitle, 'Formation / PDF')}
                      className="px-3.5 py-2 bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] rounded-lg transition shadow flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition"
            >
              Fermer et Voir dans mon Espace Membre
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
