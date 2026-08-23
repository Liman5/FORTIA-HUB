"use client";

import React, { useState } from 'react';
import { Store, ShieldCheck, X, CheckCircle2, Phone, Mail, XCircle, Loader2, User } from 'lucide-react';
import { VendorApplication } from '../types';
import { validateEmailFormat } from '../utils/authValidation';
import { apiWritePlatform } from '../lib/services/platformWrite';

interface VendorApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (app: VendorApplication) => void;
  /** true si l'utilisateur est déjà connecté */
  isLoggedIn?: boolean;
  /** email de la session si connecté */
  userEmail?: string;
  /** nom de la session si connecté */
  userName?: string;
}

export const VendorApplicationModal: React.FC<VendorApplicationModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
  isLoggedIn = false,
  userEmail = '',
  userName = ''
}) => {
  const [applicantName, setApplicantName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('Formations & Coaching');
  const [storeDescription, setStoreDescription] = useState('');
  const [experienceBio, setExperienceBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [refusalError, setRefusalError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const emailValidation = validateEmailFormat(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefusalError(null);

    if (!applicantName || !email || !storeName) {
      setRefusalError("Veuillez remplir tous les champs requis (nom, email, boutique).");
      return;
    }

    if (!emailValidation.isValid) {
      setRefusalError(`Adresse e-mail invalide : ${emailValidation.errorMessage || "Format d'adresse e-mail invalide."}`);
      return;
    }

    setLoading(true);

    // ✨ Ne PAS ré-inscrire un utilisateur connecté : on utilise directement ses infos de session
    // et on enregistre UNIQUEMENT la candidature vendeur dans Supabase.
    const application: VendorApplication = {
      id: `app-${Date.now()}`,
      userId: `user-session-${Date.now()}`, // id de session côté client (sera relié au user réel via email)
      applicantName,
      email: email.trim().toLowerCase(),
      phone,
      storeName,
      storeCategory,
      storeDescription,
      experienceBio,
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'En attente'
    };

    // Persister la candidature via l'API d'écriture (branchée Supabase)
    const res = await apiWritePlatform("submit-vendor-app", {
      applicantName,
      email: email.trim().toLowerCase(),
      phone,
      storeName,
      storeCategory,
      storeDescription,
      experienceBio,
    });

    setLoading(false);

    // ❌ Si l'API échoue (serveur Next.js non lancé / offline), on refuse
    // clairement plutôt que de faire croire à une soumission réussie :
    // la candidature DOIT être persistée en Supabase pour que l'admin la voie.
    if (!res.success) {
      setRefusalError(
        "La candidature n'a pas pu être envoyée à Supabase. " +
        "Vérifiez que le serveur (npm run dev) est lancé, puis réessayez. " +
        (res.error ? `Détail : ${res.error}` : "")
      );
      return;
    }

    // ✅ Mettre à jour le store local (candidature réellement persistée en base)
    onSubmitApplication(application);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            setIsSubmitted(false);
            onClose();
          }}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#021231] text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center shrink-0">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Devenir Vendeur & Ouvrir sa Boutique</h3>
                <p className="text-xs text-slate-300">Créez et vendez vos formations, e-books et services sur FORTIA HUB Marketplace</p>
              </div>
            </div>

            <div className="bg-[#021231] p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <span className="font-bold text-[#D69E25] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                {isLoggedIn ? 'Connecté en tant que vendeur' : 'Système Vendeur Pro FORTIA'}
              </span>
              {isLoggedIn ? (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Vous êtes connecté ({(userName || userEmail || 'utilisateur')}). Remplissez simplement les informations de votre boutique — votre compte existe déjà, <strong>aucune ré-inscription n'est nécessaire</strong>.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Une fois votre demande approuvée par l'administration, vous aurez accès à votre <strong>Espace Vendeur dédié</strong> pour personnaliser votre boutique (Nom, Logo, Bannière), ajouter vos produits numériques, et retirer vos revenus par Wave, Orange Money ou Paypal.
                </p>
              )}
            </div>

            {refusalError && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 p-3.5 rounded-2xl text-xs space-y-1 shadow-lg">
                <div className="flex items-center gap-2 font-bold text-red-400">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>DEMANDE REFUSÉE</span>
                </div>
                <p className="text-[11px] text-slate-200">{refusalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Nom complet du responsable *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Ex: Ibrahima Ndiaye"
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-9 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Email professionnel *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@maboutique.com"
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-9 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Numéro Téléphone (Wave / OM) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-9 text-white focus:outline-none focus:border-[#D69E25]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Nom souhaité pour la boutique *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Dakar Digital Academy"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Catégorie Principale de la Boutique</label>
                <select
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  <option value="Formations & Coaching">Formations & Coaching</option>
                  <option value="Prompts IA & Templates">Prompts IA & Templates</option>
                  <option value="eBooks & Fichiers Numériques">eBooks & Fichiers Numériques</option>
                  <option value="Design Canva & Branding">Design Canva & Branding</option>
                  <option value="Services Freelance & Code">Services Freelance & Code</option>
                  <option value="Contrats & Documents Juridiques">Contrats & Documents Juridiques</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Présentation de la Boutique & Produits proposés *</label>
                <textarea
                  rows={3}
                  required
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder="Décrivez les types de produits numériques ou formations que vous souhaitez commercialiser sur la marketplace..."
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Bio & Expérience du vendeur</label>
                <textarea
                  rows={2}
                  value={experienceBio}
                  onChange={(e) => setExperienceBio(e.target.value)}
                  placeholder="Votre parcours ou vos références dans le domaine..."
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi de la candidature...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Soumettre ma Candidature Vendeur</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Demande Vendeur Envoyée !</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Votre dossier de candidature pour la boutique <strong className="text-amber-400">{storeName}</strong> a été transmis à l'équipe FORTIA HUB. L'administrateur examinera vos données et activera votre boutique.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition"
            >
              Compris, Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};