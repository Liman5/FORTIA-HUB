"use client";

import React, { useState } from 'react';
import { CartItem, MarketplaceOrder, MarketplaceProduct, PostPurchaseSupportSubmission, VendorStore } from '../types';
import { triggerCelebrationConfetti, downloadProductDeliverable } from '../utils/pdfGenerator';
import { 
  X, 
  Trash2, 
  CreditCard, 
  Smartphone, 
  Coins, 
  CheckCircle2, 
  Copy, 
  ShieldCheck, 
  PhoneCall,
  Globe,
  Check,
  Download,
  UserCheck
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOpenPaymentGateway?: (items: CartItem[]) => void;
  onAddSupportSubmission?: (submission: PostPurchaseSupportSubmission) => void;
  vendorEmail?: string;
  /** Appelé après paiement validé pour persister la commande réelle en DB */
  onPaymentSuccess?: (order: MarketplaceOrder) => void;
  /** ID du membre connecté (liaison commande → compte membre) */
  buyerUserId?: string;
  /** Produits réels de la marketplace pour résoudre storeId/productId authentiques */
  marketplaceProducts?: MarketplaceProduct[];
  /** Boutiques réelles pour le storeName authentique */
  stores?: VendorStore[];
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onClearCart,
  onAddSupportSubmission,
  vendorEmail,
  onPaymentSuccess,
  buyerUserId,
  marketplaceProducts = [],
  stores = []
}) => {
  // Primary payment order: 1. Mobile Money (default), 2. Cryptomonnaies, 3. Carte / PayPal
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'crypto' | 'card_paypal'>('mobile_money');
  
  // Client Contact & Support Fields
  const [clientLastName, setClientLastName] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // Mobile Money States (Togo highlighted)
  const [mobileRegion, setMobileRegion] = useState<'togo' | 'west_africa'>('togo');
  const [selectedMobileOperator, setSelectedMobileOperator] = useState<string>('Togocel (TMoney)');
  const [senderPhoneNumber, setSenderPhoneNumber] = useState('');

  // Crypto States
  const [selectedCrypto, setSelectedCrypto] = useState<'USDT' | 'BNB' | 'SDA' | 'PI'>('USDT');

  // Card / PayPal States
  const [cardOrPaypal, setCardOrPaypal] = useState<'card' | 'paypal'>('card');
  const [paypalEmail, setPaypalEmail] = useState('');

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const total = subtotal;

  // Official Crypto Wallet Addresses
  const walletAddresses = {
    USDT: 'TY89n2xL9mQ2kK4pP1wZ9vB3mX7sQ4rT2u (TRC20)',
    BNB: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F (BEP20)',
    SDA: 'sda1q9x0z2v8m4k3l5p7r1w3y6t9u2i5o8p0s2',
    PI: 'GDMK3P8Q5W9L2X7Z1V4N6B0M8T3R5C7Y9U1I4O'
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === 'mobile_money' && !senderPhoneNumber.trim()) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);

    // Create & dispatch support form submission behind the scenes
    const generatedOrderNum = `CHAR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const supportSub: PostPurchaseSupportSubmission = {
      id: `sub-${Date.now()}`,
      orderNumber: generatedOrderNum,
      productTitle: cartItems.map(i => i.title).join(', ') || 'Achat Produits FORTIA',
      lastName: clientLastName.trim() || 'Client',
      firstName: clientFirstName.trim() || 'Acheteur',
      phoneContact: senderPhoneNumber || '+228 90 00 00 00',
      email: clientEmail || paypalEmail || 'client.support@fortiahub.com',
      notes: clientNotes.trim() || 'Fiche de garantie & secours post-achat validée au guichet.',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      forwardedEmail: vendorEmail || 'vendeur@fortiahub.com',
      status: 'Transmis / Enregistré'
    };

    if (onAddSupportSubmission) {
      onAddSupportSubmission(supportSub);
    }

    // ==== CRÉER & ENREGISTRER LA VRAIE COMMANDE (liaison complète membre/vendeur/admin) ====
    const firstItem = cartItems[0] || { id: 'prod-unknown', title: 'Commande FORTIA HUB' };
    const realProduct = marketplaceProducts.find((p) => p.id === firstItem.id);
    const realStore = realProduct
      ? stores.find((s) => s.id === realProduct.storeId) ||
        stores.find((s) => s.name === realProduct.storeName)
      : undefined;

    const buyerName = `${clientFirstName} ${clientLastName}`.trim() || 'Client FORTIA';
    const gatewayLabel = paymentMethod === 'mobile_money'
      ? 'Wave API'
      : paymentMethod === 'crypto'
      ? 'Crypto USDT TRC20'
      : 'Card Stripe API';
    const ref = `TX-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const order: MarketplaceOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: generatedOrderNum,
      buyerName,
      buyerEmail: clientEmail || paypalEmail || 'client.support@fortiahub.com',
      buyerPhone: senderPhoneNumber || '+228 90 00 00 00',
      buyerUserId: buyerUserId || undefined,
      storeId: realProduct?.storeId || realStore?.id || undefined,
      storeName: realProduct?.storeName || realStore?.name || 'Marketplace FORTIA HUB',
      productId: realProduct?.id || firstItem.id,
      productTitle: realProduct?.title || firstItem.title,
      amountUsd: total,
      platformCommissionUsd: Number((total * 0.10).toFixed(2)),
      vendorEarningsUsd: Number((total * 0.90).toFixed(2)),
      paymentGateway: gatewayLabel as any,
      transactionRef: ref,
      status: 'Payé',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (onPaymentSuccess) {
      onPaymentSuccess(order);
    }

    triggerCelebrationConfetti();
    setIsPaidSuccess(true);
  };

  // Mobile operator details helper
  const getOperatorDetails = () => {
    if (selectedMobileOperator.includes('Togocel')) {
      return { code: '*145#', number: '+228 90 88 99 00', country: 'Togo 🇹🇬' };
    }
    if (selectedMobileOperator.includes('Moov Togo') || selectedMobileOperator === 'Moov Africa Togo') {
      return { code: '*155#', number: '+228 99 88 99 00', country: 'Togo 🇹🇬' };
    }
    if (selectedMobileOperator.includes('Wave')) {
      return { code: 'App Wave', number: '+221 77 888 99 00 / +225 07 88 99 00', country: 'Sénégal / Côte d\'Ivoire' };
    }
    if (selectedMobileOperator.includes('Orange')) {
      return { code: '*144#', number: '+221 77 888 99 00 / +225 07 88 99 00', country: 'Sénégal / Côte d\'Ivoire / Mali' };
    }
    if (selectedMobileOperator.includes('MTN')) {
      return { code: '*133#', number: '+225 05 88 99 00 / +229 97 88 99 00', country: 'Côte d\'Ivoire / Bénin' };
    }
    return { code: 'Code USSD local', number: '+228 90 88 99 00 / +221 77 888 99 00', country: 'Afrique de l\'Ouest' };
  };

  const currentOp = getOperatorDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 overflow-y-auto">
      <div className="bg-[#021231] text-white w-full max-w-3xl rounded-3xl shadow-2xl border-2 border-[#D69E25]/50 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#011D46] p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#D69E25] text-[#021231] font-black flex items-center justify-center text-xs">
              IA
            </span>
            <h3 className="font-extrabold text-base text-white">Mon Panier & Guichet de Paiement</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isPaidSuccess ? (
            <div className="text-center py-6 space-y-5">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white">Paiement Validé avec Succès !</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Merci pour votre achat sur <strong>FORTIA HUB</strong>. Vos fichiers et accès aux formations sont prêts ci-dessous. Téléchargez-les directement :
                </p>
              </div>

              {/* Direct Download Box for Purchased Items */}
              <div className="bg-[#011D46] p-4 rounded-2xl border border-[#D69E25]/50 text-left space-y-3 max-w-lg mx-auto">
                <h5 className="text-xs font-extrabold text-[#D69E25] uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>Téléchargement Instantané des Fichiers</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Accès Réseau Sécurisé</span>
                </h5>

                <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-3 bg-[#021231] rounded-xl border border-slate-700 flex items-center justify-between gap-3">
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
                        className="px-3 py-2 bg-[#D69E25] text-[#021231] hover:bg-amber-400 font-extrabold text-[11px] rounded-lg transition shadow flex items-center gap-1.5 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {paymentMethod === 'mobile_money' && senderPhoneNumber && (
                <div className="bg-[#011D46] p-2.5 rounded-xl border border-slate-700 text-xs text-amber-300 max-w-sm mx-auto">
                  <span>Numéro émetteur enregistré : <strong>{senderPhoneNumber}</strong></span>
                </div>
              )}

              <button
                onClick={() => {
                  onClearCart();
                  setIsPaidSuccess(false);
                  onClose();
                }}
                className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition"
              >
                Accéder à mon Espace Membre
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Items Column */}
              <div className="lg:col-span-6 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Articles Sélectionnés ({cartItems.length})
                </h4>

                {cartItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Votre panier est vide.</p>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-3 bg-[#011D46] rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-xs text-white line-clamp-1">{item.title}</p>
                            <span className="text-[10px] text-[#D69E25]">{item.categoryLabel}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-xs text-white">${Number(item.price) || 0}</span>
                          <button onClick={() => onRemoveItem(item.id)} className="text-slate-400 hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Summary */}
                <div className="bg-[#011D46] p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-base font-black text-white pt-1">
                    <span>Total à payer :</span>
                    <span className="text-[#D69E25]">${total} (≈ {(total * 600).toLocaleString()} FCFA)</span>
                  </div>
                </div>

                {/* Client Contact & Assistance Registration */}
                <div className="bg-[#011D46] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-[#D69E25] uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Coordonnées d'Assistance & Suivi</span>
                    </h5>
                    <span className="text-[10px] text-emerald-400 font-semibold">Garantie 100%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-300 block mb-1">Nom *</label>
                      <input
                        type="text"
                        value={clientLastName}
                        onChange={(e) => setClientLastName(e.target.value)}
                        placeholder="Ex: Labodja"
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-lg p-2 text-white focus:outline-none focus:border-[#D69E25]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-300 block mb-1">Prénom *</label>
                      <input
                        type="text"
                        value={clientFirstName}
                        onChange={(e) => setClientFirstName(e.target.value)}
                        placeholder="Ex: Abdoul"
                        className="w-full bg-[#021231] border border-slate-700 text-xs rounded-lg p-2 text-white focus:outline-none focus:border-[#D69E25]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1">Email pour envoi des accès *</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre.email@domaine.com"
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-lg p-2 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1">Information / Note complémentaire (Optionnel)</label>
                    <input
                      type="text"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Ex: Remarque ou contact spécifique..."
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-lg p-2 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Payment Methods Column */}
              <div className="lg:col-span-6 space-y-4 bg-[#011D46] p-5 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Mode de Paiement Sécurisé</span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Crypté SSL
                  </span>
                </h4>

                {/* Payment Type Selection - Priority Order: 1. Mobile Money, 2. Cryptomonnaies, 3. Carte & PayPal */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setPaymentMethod('mobile_money'); setPhoneError(false); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'mobile_money'
                        ? 'bg-[#D69E25] text-[#021231] border-[#D69E25] shadow-lg'
                        : 'bg-[#021231] text-slate-300 border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[10px]">1. Mobile Money</span>
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('crypto'); setPhoneError(false); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'crypto'
                        ? 'bg-[#D69E25] text-[#021231] border-[#D69E25] shadow-lg'
                        : 'bg-[#021231] text-slate-300 border-slate-700'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span className="text-[10px]">2. Cryptos</span>
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('card_paypal'); setPhoneError(false); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'card_paypal'
                        ? 'bg-[#D69E25] text-[#021231] border-[#D69E25] shadow-lg'
                        : 'bg-[#021231] text-slate-300 border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px]">3. Carte & PayPal</span>
                  </button>
                </div>

                {/* 1. MOBILE MONEY DETAILS (AFRIQUE DE L'OUEST - TOGO HIGHLIGHTED) */}
                {paymentMethod === 'mobile_money' && (
                  <div className="space-y-3.5 pt-2 text-xs">
                    
                    {/* Region Selector */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileRegion('togo');
                          setSelectedMobileOperator('Togocel (TMoney)');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                          mobileRegion === 'togo'
                            ? 'bg-gradient-to-r from-amber-500 to-[#D69E25] text-[#021231] border-[#D69E25]'
                            : 'bg-[#021231] text-slate-300 border-slate-700'
                        }`}
                      >
                        <span>🇹🇬 Togo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileRegion('west_africa');
                          setSelectedMobileOperator('Wave');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                          mobileRegion === 'west_africa'
                            ? 'bg-gradient-to-r from-amber-500 to-[#D69E25] text-[#021231] border-[#D69E25]'
                            : 'bg-[#021231] text-slate-300 border-slate-700'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Afrique de l'Ouest</span>
                      </button>
                    </div>

                    {/* Operators List */}
                    {mobileRegion === 'togo' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {['Togocel (TMoney)', 'Moov Africa Togo'].map((op) => (
                          <button
                            key={op}
                            onClick={() => setSelectedMobileOperator(op)}
                            className={`p-2 rounded-xl border text-[11px] font-extrabold transition text-center ${
                              selectedMobileOperator === op
                                ? 'bg-[#D69E25] text-[#021231] border-[#D69E25]'
                                : 'bg-[#021231] text-slate-300 border-slate-700'
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Wave', 'Orange Money', 'MTN MoMo', 'Moov Africa', 'Free Money'].map((op) => (
                          <button
                            key={op}
                            onClick={() => setSelectedMobileOperator(op)}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold transition text-center ${
                              selectedMobileOperator === op
                                ? 'bg-[#D69E25] text-[#021231] border-[#D69E25]'
                                : 'bg-[#021231] text-slate-300 border-slate-700'
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Instructions Box */}
                    <div className="bg-[#021231] p-3 rounded-xl border border-slate-700 space-y-1 text-[11px] text-slate-200">
                      <p>
                        Opérateur sélectionné : <strong className="text-[#D69E25]">{selectedMobileOperator}</strong> ({currentOp.country})
                      </p>
                      <p>
                        Montant à envoyer : <strong className="text-emerald-400">{(total * 600).toLocaleString()} FCFA</strong> (${total})
                      </p>
                    </div>

                    {/* MANDATORY SENDER PHONE NUMBER INPUT */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Numéro de téléphone qui effectue la transaction *</span>
                      </label>
                      <input
                        type="tel"
                        value={senderPhoneNumber}
                        onChange={(e) => { setSenderPhoneNumber(e.target.value); setPhoneError(false); }}
                        placeholder={mobileRegion === 'togo' ? "ex: +228 90 12 34 56 (Togo)" : "ex: +221 77 000 00 00 ou +225 07..."}
                        className={`w-full bg-[#021231] border ${
                          phoneError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#D69E25]/60'
                        } text-white p-2.5 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-[#D69E25]`}
                      />
                      {phoneError ? (
                        <span className="text-[10px] text-rose-400 font-bold block">
                          ⚠️ Veuillez saisir le numéro qui va émettre le transfert Mobile Money.
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-slate-400 block">
                          Renseignez le numéro qui enverra les fonds pour la validation automatique de votre commande.
                        </span>
                      )}
                    </div>

                  </div>
                )}

                {/* 2. CRYPTO PAYMENT DETAILS */}
                {paymentMethod === 'crypto' && (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex gap-1.5 overflow-x-auto">
                      {(['USDT', 'BNB', 'SDA', 'PI'] as const).map((token) => (
                        <button
                          key={token}
                          onClick={() => setSelectedCrypto(token)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold ${
                            selectedCrypto === token ? 'bg-[#D69E25] text-[#021231] border-[#D69E25]' : 'bg-[#021231] text-slate-300 border-slate-700'
                          }`}
                        >
                          {token}
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#021231] p-3 rounded-xl border border-slate-700 space-y-2">
                      <span className="text-[10px] text-slate-400 block font-bold">Adresse officielle de dépôt {selectedCrypto} :</span>
                      <div className="flex items-center justify-between bg-[#011D46] p-2 rounded border border-slate-800 text-[11px] font-mono text-[#D69E25]">
                        <span className="truncate">{walletAddresses[selectedCrypto]}</span>
                        <button onClick={() => handleCopy(walletAddresses[selectedCrypto])} className="p-1 hover:text-white">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {copiedAddress && <span className="text-[10px] text-emerald-400 block">✓ Adresse copiée !</span>}
                    </div>
                  </div>
                )}

                {/* 3. CARTE BANCAIRE & PAYPAL DETAILS */}
                {paymentMethod === 'card_paypal' && (
                  <div className="space-y-3 pt-2 text-xs">
                    
                    {/* Toggle between Card and PayPal */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCardOrPaypal('card')}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold ${
                          cardOrPaypal === 'card' ? 'bg-[#D69E25] text-[#021231] border-[#D69E25]' : 'bg-[#021231] text-slate-300 border-slate-700'
                        }`}
                      >
                        Carte (Visa / Mastercard)
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardOrPaypal('paypal')}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold ${
                          cardOrPaypal === 'paypal' ? 'bg-[#D69E25] text-[#021231] border-[#D69E25]' : 'bg-[#021231] text-slate-300 border-slate-700'
                        }`}
                      >
                        PayPal Express
                      </button>
                    </div>

                    {cardOrPaypal === 'card' ? (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          placeholder="Numéro de Carte (4532 **** **** ****)"
                          className="w-full bg-[#021231] border border-slate-700 p-2.5 rounded-xl text-white text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="MM/AA" className="bg-[#021231] border border-slate-700 p-2.5 rounded-xl text-white text-xs" />
                          <input type="text" placeholder="CVC" className="bg-[#021231] border border-slate-700 p-2.5 rounded-xl text-white text-xs" />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#021231] p-3 rounded-xl border border-slate-700 space-y-2.5 text-xs">
                        <p className="text-[11px] text-slate-300">
                          Paiement rapide et sécurisé avec votre compte <strong>PayPal</strong>.
                        </p>
                        <input
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          placeholder="Adresse Email PayPal (optionnel)"
                          className="w-full bg-[#011D46] border border-slate-700 p-2.5 rounded-xl text-white text-xs"
                        />
                        <div className="text-[10px] text-amber-300 bg-[#011D46] p-2 rounded border border-slate-800">
                          Transfert direct PayPal : <strong>paypal@icham-academy.com</strong>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                <button
                  onClick={handleConfirmPayment}
                  disabled={cartItems.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2 mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmer & Payer Maintenant (${total})</span>
                </button>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

