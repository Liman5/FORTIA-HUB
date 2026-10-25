"use client";

import React, { useState } from 'react';
import { RegistrationFeeConfig, KycSubmission } from '../types';
import { uploadFileToR2 } from '../lib/services/clientUpload';
import { CountrySelect } from './CountrySelect';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Upload, 
  X, 
  FileText, 
  AlertTriangle,
  XCircle,
  Building2,
  UserCheck,
  Calendar,
  Lock,
  Camera,
  Check,
  Info
} from 'lucide-react';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeConfig: RegistrationFeeConfig;
  onSubmitKyc: (kyc: KycSubmission) => void;
  userId?: string;
}

/**
 * Zone d'ajout d'une photo ou d'un document : deux choix clairs —
 * « Fichier » (galerie, PDF accepté) ou « Photo » (appareil photo du
 * téléphone, capture directe). Le second est indispensable sur mobile.
 */
const KycUploadField: React.FC<{
  label: string;
  help?: string;
  value: string | null;
  fileName: string;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cameraFacing?: "user" | "environment";
  accept?: string;
}> = ({
  label,
  help,
  value,
  fileName,
  onPick,
  cameraFacing = "environment",
  accept = "image/*,.pdf",
}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-700 mb-1">{label}</label>
    {help && <p className="text-[10px] text-slate-500 mb-1.5 leading-snug">{help}</p>}

    <div
      className={`p-3 border-2 border-dashed rounded-xl transition ${
        value ? "border-emerald-500 bg-emerald-50/50" : "border-slate-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span className={`text-xs font-semibold truncate flex-1 ${value ? "text-emerald-800" : "text-slate-600"}`}>
          {fileName || "Aucune photo ajoutée pour le moment"}
        </span>
        {value && (
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shrink-0">
            Ajouté ✓
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#021231] text-[#D69E25] px-2 py-2 rounded-lg cursor-pointer hover:bg-[#011D46] transition">
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span>Choisir un fichier</span>
          <input type="file" accept={accept} onChange={onPick} className="hidden" />
        </label>

        <label className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition">
          <Camera className="w-3.5 h-3.5 shrink-0" />
          <span>Prendre une photo</span>
          <input type="file" accept="image/*" capture={cameraFacing} onChange={onPick} className="hidden" />
        </label>
      </div>
    </div>
  </div>
);

export const KycModal: React.FC<KycModalProps> = ({
  isOpen,
  onClose,
  feeConfig,
  onSubmitKyc,
  userId
}) => {
  const [accountType, setAccountType] = useState<'freelance' | 'enterprise'>('freelance');

  // Common Personal Fields (Mandatory for ALL)
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Sénégal');
  const [address, setAddress] = useState('');

  // ID Document Fields (Mandatory for ALL)
  const [documentType, setDocumentType] = useState('Carte Nationale d\'Identité (CNI)');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // ID Files (Mandatory for ALL)
  const [idRectoFile, setIdRectoFile] = useState<string | null>(null);
  const [idRectName, setIdRectName] = useState<string>('');
  const [idVersoFile, setIdVersoFile] = useState<string | null>(null);
  const [idVersoName, setIdVersoName] = useState<string>('');
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [selfieName, setSelfieName] = useState<string>('');

  // Enterprise / Company Specific Fields
  const [repRole, setRepRole] = useState('Gérant / Fondateur');
  const [companyName, setCompanyName] = useState('');
  const [legalForm, setLegalForm] = useState('SARL');
  const [rccmNumber, setRccmNumber] = useState('');
  const [companyDocFile, setCompanyDocFile] = useState<string | null>(null);
  const [companyDocName, setCompanyDocName] = useState<string>('');

  // Verification & Submission State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isRejected, setIsRejected] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Envoi des documents : ces états DOIVENT rester avant le `return null`
  // ci-dessous, sinon les hooks changent d'ordre à l'ouverture/fermeture
  // de la modale (React error #310).
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  if (!isOpen) return null;

  const feeUsd = accountType === 'freelance' ? feeConfig.freelanceFeeUsd : feeConfig.enterpriseFeeUsd;
  const feeFcfa = accountType === 'freelance' ? feeConfig.freelanceFeeFcfa : feeConfig.enterpriseFeeFcfa;

  // Envoi d'un document : message d'erreur VISIBLE (cause réelle), jamais muet.
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    setFileState: (val: string | null) => void,
    setNameState: (val: string) => void
  ) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadingField(field);
    setNameState("Envoi en cours…");

    try {
      const entityId = "kyc-" + Date.now();
      const result = await uploadFileToR2(file, "kyc-documents", entityId, false);

      if (result.success) {
        setFileState(result.url);
        setNameState(file.name + " ✓ ajouté");
      } else {
        setFileState(null);
        setNameState("");
        setUploadError(
          result.error ||
            "L'envoi du document a échoué. Vérifiez votre connexion puis réessayez."
        );
      }
    } catch (error: any) {
      setFileState(null);
      setNameState("");
      setUploadError(error?.message || "L'envoi du document a échoué.");
    } finally {
      setUploadingField(null);
      if (input) input.value = "";
    }
  };

  // Strict Automated Validation Engine
  const handleValidateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    // 1. Strict Name & First Name Check
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']{2,50}$/;
    if (!lastName.trim() || !nameRegex.test(lastName.trim())) {
      errors.push("Le NOM de famille est obligatoire, doit comporter au moins 2 lettres et aucun chiffre ni symbole.");
    }
    if (!firstName.trim() || !nameRegex.test(firstName.trim())) {
      errors.push("Le PRÉNOM est obligatoire, doit comporter au moins 2 lettres et aucun chiffre ni symbole.");
    }

    // 2. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.push("L'adresse E-MAIL est invalide ou mal formatée.");
    }

    // 3. Phone Validation (International format or >= 8 digits)
    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errors.push("Le numéro de TÉLÉPHONE est invalide. Il doit comporter au moins 8 chiffres avec l'indicatif international.");
    }

    // 4. Address Check
    if (!address.trim() || address.trim().length < 5) {
      errors.push("L'ADRESSE physique complète (Rue, Ville, Quartier) est obligatoire.");
    }

    // 5. ID Document Number
    if (!documentNumber.trim() || documentNumber.trim().length < 5) {
      errors.push("Le NUMÉRO de la pièce d'identité est invalide (minimum 5 caractères).");
    }

    // 6. ID Expiration Date Check (Strictly in the Future)
    if (!expirationDate) {
      errors.push("La DATE D'EXPIRATION de la pièce d'identité est obligatoire.");
    } else {
      const expDate = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate <= today) {
        errors.push(`PIÈCE EXPIRÉE : La date d'expiration (${expirationDate}) est passée. Seules les pièces d'identité en cours de validité sont acceptées.`);
      }
    }

    // 7. Mandatory File Upload Checks
    if (!idRectoFile) {
      errors.push("La photo RECTO de la pièce d'identité est manquante.");
    }
    if (!idVersoFile) {
      errors.push("La photo VERSO de la pièce d'identité est manquante.");
    }
    if (!selfieFile) {
      errors.push("La photo SELFIE tenant la pièce d'identité est manquante.");
    }

    // 8. Enterprise Specific Checks
    if (accountType === 'enterprise') {
      if (!companyName.trim() || companyName.trim().length < 2) {
        errors.push("La RAISON SOCIALE (Nom de la société) est obligatoire.");
      }
      if (!rccmNumber.trim() || rccmNumber.trim().length < 4) {
        errors.push("Le numéro du REGISTRE DU COMMERCE (RCCM/NINEA/IFU) est obligatoire.");
      }
      if (!companyDocFile) {
        errors.push("Le scan du DOCUMENT OFFICIEL d'immatriculation (RCCM / NINEA / Statuts) est obligatoire pour les entreprises.");
      }
    }

    // Execute Result
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsRejected(true);
      setIsSuccess(false);
      return;
    }

    // All Checks 100% Passed!
    setIsRejected(false);
    setValidationErrors([]);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const newKyc: KycSubmission = {
      id: `kyc-${Date.now()}`,
      applicantType: accountType,
      applicantId: userId || `user-${Date.now()}`,
      applicantName: accountType === 'enterprise' ? `${companyName.trim()} (${fullName})` : fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      repRole: accountType === 'enterprise' ? repRole : 'Particulier',
      email: email.trim(),
      phone: phone.trim(),
      country: country.trim(),
      address: address.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      idExpirationDate: expirationDate,
      idRectoUrl: idRectoFile || undefined,
      idVersoUrl: idVersoFile || undefined,
      selfieUrl: selfieFile || undefined,
      companyName: accountType === 'enterprise' ? companyName.trim() : undefined,
      legalForm: accountType === 'enterprise' ? legalForm : undefined,
      rccmNumber: accountType === 'enterprise' ? rccmNumber.trim() : undefined,
      companyDocUrl: accountType === 'enterprise' ? (companyDocFile || undefined) : undefined,
      submittedAt: new Date().toLocaleDateString('fr-FR'),
      status: 'En attente',
      adminNotes: 'Dossier 100% conforme aux règles automatiques. En attente de contrôle final.'
    };

    onSubmitKyc(newKyc);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 relative border border-slate-200 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <form onSubmit={handleValidateAndSubmit} className="space-y-6">
            
            {/* Modal Title Banner */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Vérification d'identité (KYC)</span>
              </div>
              <h2 className="text-2xl font-black text-[#021231]">
                Faisons connaissance
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Remplissez ce formulaire en quelques minutes pour obtenir votre badge vérifié.
                Vos informations restent confidentielles et servent uniquement à confirmer votre identité.
              </p>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#021231] uppercase tracking-wider">
                1. Vous êtes… *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('freelance');
                    setIsRejected(false);
                  }}
                  className={`p-4 rounded-2xl border text-left space-y-1.5 transition ${
                    accountType === 'freelance'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#021231]">Particulier / Freelance</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  </div>
                  <div className="text-xs font-black text-emerald-700">Badge Vert Certifié</div>
                  <div className="text-[10px] text-slate-500">
                    Frais de contrôle : {feeConfig.freelanceFeeUsd}$ / {feeConfig.freelanceFeeFcfa.toLocaleString()} FCFA
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType('enterprise');
                    setIsRejected(false);
                  }}
                  className={`p-4 rounded-2xl border text-left space-y-1.5 transition ${
                    accountType === 'enterprise'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#021231]">Entreprise / Agence / Société</span>
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                  </div>
                  <div className="text-xs font-black text-amber-700">Badge Doré Pro Certifié</div>
                  <div className="text-[10px] text-slate-500">
                    Frais de contrôle : {feeConfig.enterpriseFeeUsd}$ / {feeConfig.enterpriseFeeFcfa.toLocaleString()} FCFA
                  </div>
                </button>
              </div>
            </div>

            {/* AUTOMATED REJECTION ALERT PANEL */}
            {isRejected && validationErrors.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-4 sm:p-5 rounded-2xl space-y-3 shadow-lg animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-rose-700 uppercase tracking-wider">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>DOSSIER KYC REJETÉ AUTOMATIQUEMENT (Avant transmission)</span>
                </div>
                <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                  Votre dossier contient des erreurs ou des informations manquantes incompatibles avec les normes de contrôle strictes de FORTIA HUB :
                </p>
                <ul className="list-disc list-inside text-xs text-rose-700 space-y-1.5 font-medium pl-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-rose-200 text-[11px] font-bold text-rose-900">
                  Veuillez corriger tous les champs en rouge ci-dessous pour pouvoir valider votre dossier.
                </div>
              </div>
            )}

            {/* SECTION A: MANDATORY PERSONAL INFORMATION */}
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <UserCheck className="w-4 h-4 text-[#D69E25]" />
                <h3 className="font-black text-xs text-[#021231] uppercase tracking-wider">
                  2. Vos informations personnelles *
                </h3>
              </div>

              {/* Name & First Name (CRITICAL REQUIREMENT) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Ndiaye"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Amadou"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>
              </div>

              {/* Role if Enterprise */}
              {accountType === 'enterprise' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Votre fonction dans l'entreprise *
                  </label>
                  <select
                    value={repRole}
                    onChange={(e) => setRepRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  >
                    <option value="Gérant / Fondateur">Gérant / Fondateur</option>
                    <option value="Directeur Général (DG)">Directeur Général (DG)</option>

                    <option value="Président Directeur Général (PDG)">Président Directeur Général (PDG)</option>
                    <option value="Mandataire Légale">Mandataire Légal / Représentant</option>
                  </select>
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Adresse e-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@domaine.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Téléphone (avec l'indicatif du pays) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>
              </div>

              {/* Country & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pays *
                  </label>
                  <CountrySelect
                    value={country}
                    onChange={setCountry}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Votre adresse complète *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Quartier, Rue, Numéro de porte / Immeuble"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>
              </div>

            </div>

            {/* SECTION B: ENTERPRISE INFORMATION (IF ENTERPRISE) */}
            {accountType === 'enterprise' && (
              <div className="space-y-4 bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <h3 className="font-black text-xs text-[#021231] uppercase tracking-wider">
                    3. Votre entreprise *
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nom officiel de l'entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: FORTIA DIGITAL SARL"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Forme Juridique *
                    </label>
                    <select
                      value={legalForm}
                      onChange={(e) => setLegalForm(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
                      <option value="SUARL">SUARL (Société Unipersonnelle à Responsabilité Limitée)</option>
                      <option value="SAS">SAS (Société par Actions Simplifiée)</option>

                      <option value="SA">SA (Société Anonyme)</option>
                      <option value="EI">Entreprise Individuelle (EI)</option>
                      <option value="GIE">GIE / Association</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numéro d'immatriculation (RCCM, NINEA, IFU ou SIRET) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rccmNumber}
                    onChange={(e) => setRccmNumber(e.target.value)}
                    placeholder="Ex: SN.DKR.2024.B.18920 ou 002938102"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Company Document Upload */}
                <KycUploadField
                  label="Registre du commerce ou statuts (photo ou PDF) *"
                  help="Une photo lisible du document suffit : pas besoin de scanner."
                  value={companyDocFile}
                  fileName={companyDocName}
                  onPick={(e) => handleFileUpload(e, "entreprise", setCompanyDocFile, setCompanyDocName)}
                  accept=".pdf,image/*"
                />
              </div>
            )}

            {/* SECTION C: IDENTITY DOCUMENT & MANDATORY UPLOADS */}
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D69E25]" />
                  <h3 className="font-black text-xs text-[#021231] uppercase tracking-wider">
                    {accountType === 'enterprise' ? '4.' : '3.'} Vos papiers d'identité et vos photos *
                  </h3>
                </div>
                <span className="text-[10px] text-rose-600 font-bold">Recto + verso + photo de vous</span>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold">
                Formats acceptés : PDF, JPG, PNG, WEBP (HEIC accepté) · 10 Mo max par fichier
              </p>

              {/* Erreur d'envoi : cause réelle, visible (jamais un simple « erreur ») */}
              {uploadError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl text-[11px] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 break-long">{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-red-500 hover:text-red-800 font-bold shrink-0"
                    aria-label="Fermer le message"
                  >
                    ✕
                  </button>
                </div>
              )}

              {uploadingField && (
                <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" />
                  Envoi du document en cours…
                </p>
              )}

              {/* Doc Type & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Quel document avez-vous ? *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  >
                    <option value="Carte Nationale d'Identité (CNI)">Carte Nationale d'Identité (CNI)</option>
                    <option value="Passeport Biométrique">Passeport Biométrique</option>
                    <option value="Permis de Conduire">Permis de Conduire Officiel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numéro du document *
                  </label>
                  <input
                    type="text"
                    required
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ex: 1 771 1994 00293"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                  />
                </div>
              </div>

              {/* Expiration Date (STRICT CHECK) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Date d'expiration du document *</span>
                </label>
                <input
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-[#021231] focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
                />
              </div>

              {/* Photo du recto */}
              <KycUploadField
                label="1. Photo du recto (face avant) *"
                help="Le côté de la pièce avec votre photo et vos nom/prénom."
                value={idRectoFile}
                fileName={idRectName}
                onPick={(e) => handleFileUpload(e, "recto", setIdRectoFile, setIdRectName)}
              />

              {/* Photo du verso */}
              <KycUploadField
                label="2. Photo du verso (face arrière) *"
                help="Le côté avec la bande de lecture ou le numéro du document."
                value={idVersoFile}
                fileName={idVersoName}
                onPick={(e) => handleFileUpload(e, "verso", setIdVersoFile, setIdVersoName)}
              />

              {/* Selfie */}
              <KycUploadField
                label="3. Une photo de vous tenant la pièce *"
                help="Tenez votre pièce près de votre visage, bien éclairé, sans chapeau ni masque."
                value={selfieFile}
                fileName={selfieName}
                onPick={(e) => handleFileUpload(e, "selfie", setSelfieFile, setSelfieName)}
                cameraFacing="user"
                accept="image/*"
              />

            </div>

            {/* Fee summary */}
            <div className="bg-[#021231] text-white rounded-2xl p-4 space-y-2 border border-[#D69E25]/40 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">Frais de vérification du dossier</span>
                <span className="font-black text-[#D69E25] text-sm">{feeUsd}$ ({feeFcfa.toLocaleString()} FCFA)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Le paiement (Wave, Orange Money ou USDT) se fait après validation de votre dossier.
              </p>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs sm:text-sm hover:brightness-110 transition flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Envoyer mon dossier</span>
            </button>

          </form>
        ) : (
          /* SUCCESS STATE */
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span>Dossier Conforme à 100%</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#021231]">
                Dossier KYC Transmis avec Succès !
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Toutes les vérifications automatiques (Nom/Prénom, validité de la pièce d'identité, photos Recto/Verso et documents d'immatriculation) ont été <strong>validées avec succès</strong>. Votre dossier a été transmis à l'équipe technique pour l'activation finale de votre badge.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                setIsRejected(false);
                onClose();
              }}
              className="px-8 py-3 rounded-xl bg-[#021231] text-[#D69E25] font-black text-xs sm:text-sm hover:bg-[#011D46] transition shadow-lg"
            >
              Retour à la plateforme
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
