"use client";

import React, { useState } from 'react';
import { 
  UserPlus, 
  LogIn, 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Send,
  RefreshCw,
  ArrowLeft,
  Check
} from 'lucide-react';
import { validatePassword, validateEmailFormat } from '../utils/authValidation';
import { UserProfile } from '../types';
import { 
  apiRegisterUser, 
  apiLoginUser, 
  apiCheckEmailAvailability,
  apiSendOtp,
  apiVerifyOtp,
  apiVerifyTwoFactor,
  SENDER_EMAIL_OFFICIAL 
} from '../services/api';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signup' | 'login';
  onLoginSuccess: (user: Partial<UserProfile>) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  
  // Registration form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'buyer' | 'freelance' | 'enterprise'>('freelance');
  
  // OTP Verification state (6 numeric digits)
  const [step, setStep] = useState<'form' | 'otp' | 'twofa'>('form');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSender, setOtpSender] = useState(SENDER_EMAIL_OFFICIAL);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  // Défi JWT reçu lors du login quand la 2FA est activée
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // Validation state & errors
  const [loading, setLoading] = useState(false);
  const [refusalError, setRefusalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const emailValidation = validateEmailFormat(email);
  const passwordValidation = validatePassword(password);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setStep('form');
    setOtpInput('');
    setGeneratedOtp('');
    setTwoFactorToken('');
    setConfirmationEmailSent(false);
    setRefusalError(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  const handleModeSwitch = (newMode: 'signup' | 'login') => {
    setMode(newMode);
    setStep('form');
    setRefusalError(null);
    setSuccessMsg(null);
  };

  // Step 1: Validate registration info & generate 6-digit OTP email
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefusalError(null);
    setSuccessMsg(null);

    // 1. Mandatory Email Domain Format Validation
    const emailFormat = validateEmailFormat(email);
    if (!emailFormat.isValid) {
      setRefusalError(`Inscription refusée : ${emailFormat.errorMessage}`);
      return;
    }

    // 2. Check Against Existing User Records (1 email per account constraint)
    setLoading(true);
    const checkRes = await apiCheckEmailAvailability(email);
    if (!checkRes.available) {
      setLoading(false);
      setRefusalError(checkRes.error || "Refusé : Cette adresse e-mail est déjà inscrite sur la plateforme. Une seule inscription est autorisée par adresse e-mail.");
      return;
    }

    // 3. Strict password rules validation
    if (!passwordValidation.isValid) {
      setLoading(false);
      setRefusalError(passwordValidation.errorMessage || "Refusé : Le mot de passe ne respecte pas les conditions requises.");
      return;
    }

    // 4. Confirm password check
    if (password !== confirmPassword) {
      setLoading(false);
      setRefusalError("Refusé : Les deux mots de passe ne correspondent pas.");
      return;
    }

    // Generate 6-digit numeric OTP and simulate email notification from info.fortiahub@gmail.com
    const sendRes = await apiSendOtp(email);
    setLoading(false);

    if (sendRes.otpCode) {
      setGeneratedOtp(sendRes.otpCode);
      setOtpSender(sendRes.sender || SENDER_EMAIL_OFFICIAL);
      setStep('otp');
      setSuccessMsg(`Code OTP à 6 chiffres envoyé à ${email} depuis ${sendRes.sender || SENDER_EMAIL_OFFICIAL} !`);
    } else {
      setRefusalError("Impossible d'envoyer le code OTP. Veuillez réessayer.");
    }
  };

  // Resend 6-digit OTP
  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    setRefusalError(null);
    setSuccessMsg(null);

    const sendRes = await apiSendOtp(email);
    setIsResendingOtp(false);

    if (sendRes.otpCode) {
      setGeneratedOtp(sendRes.otpCode);
      setSuccessMsg(`Un nouveau code OTP à 6 chiffres a été envoyé depuis ${SENDER_EMAIL_OFFICIAL} à ${email}`);
    }
  };

  // Step 2: Validate the 6-digit OTP code & finalize registration
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefusalError(null);
    setSuccessMsg(null);

    const verifyRes = await apiVerifyOtp(email, otpInput, generatedOtp);
    if (!verifyRes.success) {
      setRefusalError(`Vérification refusée : ${verifyRes.message}`);
      return;
    }

    setLoading(true);
    setSuccessMsg("Code OTP à 6 chiffres validé avec succès ! Finalisation du compte...");

    // Register user in backend store
    const res = await apiRegisterUser({
      email,
      password,
      name: name || email.split('@')[0],
      phone: phone || '',
      accountType
    });

    setLoading(false);

    if (!res.success) {
      setRefusalError(res.error || "Inscription refusée lors de l'enregistrement.");
      return;
    }

    // Mark confirmation email sent from info.fortiahub@gmail.com
    setConfirmationEmailSent(true);
    setSuccessMsg(`Inscription validée ! Un e-mail de confirmation a été envoyé à ${email} depuis ${SENDER_EMAIL_OFFICIAL}.`);

    setTimeout(() => {
      if (res.data?.user) {
        onLoginSuccess(res.data.user);
      }
      resetForm();
      onClose();
    }, 1800);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefusalError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setRefusalError("Connexion refusée : Veuillez saisir votre adresse e-mail et votre mot de passe.");
      return;
    }

    setLoading(true);

    // Synchronize login authentication with backend REST API
    const res = await apiLoginUser({ email, password });

    setLoading(false);

    if (!res.success || !res.data) {
      // Refuse connection on bad credentials or non-existent user
      setRefusalError(res.error || "Connexion refusée : Adresse e-mail ou mot de passe incorrect.");
      return;
    }

    // Authentification à deux facteurs requise
    if (res.data.needsTwoFactor) {
      setStep('twofa');
      setTwoFactorToken(res.data.twoFactorToken || '');
      setSuccessMsg(res.data.message || "Un code de sécurité a été envoyé par e-mail.");
      return;
    }

    setSuccessMsg("Connexion réussie ! Bienvenue sur FORTIA HUB.");
    setTimeout(() => {
      if (res.data?.user) {
        onLoginSuccess(res.data.user);
      }
      resetForm();
      onClose();
    }, 1000);
  };

  const handleVerifyTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefusalError(null);
    setSuccessMsg(null);

    if (!/^\d{6}$/.test(otpInput.trim())) {
      setRefusalError("Le code de sécurité doit comporter exactement 6 chiffres.");
      return;
    }

    setLoading(true);
    const res = await apiVerifyTwoFactor(twoFactorToken, otpInput.trim());
    setLoading(false);

    if (!res.success || !res.data?.user) {
      setRefusalError(res.error || "Code de sécurité invalide.");
      return;
    }

    const verifiedUser = res.data.user;
    setSuccessMsg("Authentification à deux facteurs validée ! Bienvenue sur FORTIA HUB.");
    setTimeout(() => {
      onLoginSuccess(verifiedUser);
      resetForm();
      onClose();
    }, 1000);
  };

  const handleResendTwoFactorCode = async () => {
    setRefusalError(null);
    setSuccessMsg(null);
    setLoading(true);
    const res = await apiLoginUser({ email, password });
    setLoading(false);
    if (res.success && res.data?.needsTwoFactor && res.data?.twoFactorToken) {
      setTwoFactorToken(res.data.twoFactorToken);
      setSuccessMsg("Un nouveau code de sécurité a été envoyé par e-mail.");
    } else {
      setRefusalError(res.error || "Impossible de renvoyer le code. Réessayez.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white space-y-5 shadow-2xl relative my-8">
        
        {/* Close button */}
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#021231] text-slate-400 hover:text-white transition"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            {step === 'otp' ? (
              <KeyRound className="w-7 h-7 text-[#D69E25]" />
            ) : (
              <LogIn className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {step === 'otp'
              ? 'Vérification du Code OTP (6 chiffres)'
              : step === 'twofa'
              ? 'Double authentification (2FA)'
              : mode === 'signup'
              ? 'Inscription Obligatoire Plateforme'
              : 'Connexion à votre Espace FORTIA'}
          </h3>
          <p className="text-xs text-slate-300">
            {step === 'otp'
              ? `Code OTP à 6 chiffres envoyé à ${email} depuis ${SENDER_EMAIL_OFFICIAL}`
              : step === 'twofa'
              ? `Un code de sécurité à 6 chiffres a été envoyé à ${email}`
              : mode === 'signup' 
              ? 'Créez votre compte pour accéder aux formations, boutiques et services'
              : 'Saisissez vos identifiants pour accéder à votre espace membre'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Only visible when filling form) */}
        {step === 'form' && (
          <div className="space-y-3">
            <div className="flex bg-[#021231] p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                  mode === 'signup'
                    ? 'bg-[#D69E25] text-[#021231] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>S'inscrire (Obligatoire)</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'bg-[#D69E25] text-[#021231] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Se Connecter</span>
              </button>
            </div>
          </div>
        )}

        {/* Refusal / Error Banner */}
        {refusalError && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 p-4 rounded-2xl text-xs space-y-1 animate-shake shadow-lg">
            <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>RÉPONSE SYSTEME / INSCRIPTION REFUSÉE</span>
            </div>
            <p className="leading-relaxed pl-7 text-[11px]">{refusalError}</p>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 p-4 rounded-2xl text-xs flex items-center gap-3 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300">{successMsg}</span>
          </div>
        )}

        {/* Form Content */}
        {mode === 'signup' ? (
          step === 'otp' ? (
            /* OTP Verification Step Form */
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              {/* Email Notification Simulation Box (from info.fortiahub@gmail.com) */}
              <div className="bg-[#021231] border border-[#D69E25]/50 p-4 rounded-2xl space-y-2.5 text-xs shadow-inner">
                <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
                  <span className="font-bold text-[#D69E25] flex items-center gap-1.5 text-[11px]">
                    <Mail className="w-4 h-4 text-[#D69E25]" /> De : <span className="text-white font-mono">{SENDER_EMAIL_OFFICIAL}</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Code OTP 6 Chiffres
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-slate-400 font-semibold">À :</span> <span className="text-white font-mono">{email}</span></p>
                  <p><span className="text-slate-400 font-semibold">Objet :</span> Votre code de vérification OTP - FORTIA HUB</p>
                </div>

                <div className="p-3 bg-[#011D46] rounded-xl border border-slate-700/80 text-slate-200 text-xs space-y-1.5">
                  <p className="text-[11px]">Bonjour <strong className="text-white">{name || email.split('@')[0]}</strong>,</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Voici votre code de sécurité à 6 chiffres pour valider votre inscription sur la plateforme FORTIA HUB :
                  </p>
                  <div className="flex items-center justify-between bg-[#021231] px-4 py-2.5 rounded-xl border border-[#D69E25]/40 mt-1">
                    <span className="text-xs text-slate-400 font-semibold">Code OTP (6 chiffres) :</span>
                    <span className="text-lg font-black font-mono text-emerald-400 tracking-widest bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/50">
                      {generatedOtp}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOtpInput(generatedOtp)}
                  className="w-full py-1.5 px-3 bg-[#011D46] hover:bg-[#032454] border border-slate-700 rounded-xl text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition"
                >
                  <span>Insérer automatiquement le code {generatedOtp}</span>
                </button>
              </div>

              {/* 6-Digit Code Input Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 text-center">
                  Saisissez les 6 chiffres du code OTP *
                </label>
                
                {/* Visual 6 Digit Display Boxes */}
                <div className="flex justify-center gap-2 my-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center font-mono text-lg font-black transition-all ${
                        otpInput[idx]
                          ? 'border-[#D69E25] bg-[#021231] text-[#D69E25] shadow-md scale-105'
                          : 'border-slate-700 bg-[#021231]/40 text-slate-600'
                      }`}
                    >
                      {otpInput[idx] || '•'}
                    </div>
                  ))}
                </div>

                <div className="relative mt-2">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-[#D69E25]" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Saisir les 6 chiffres (ex: 123456)"
                    className="w-full bg-[#021231] border border-[#D69E25]/60 text-center font-mono text-sm tracking-widest text-amber-300 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Exigence : Exactement 6 chiffres numériques requis pour la validation.
                </p>
              </div>

              {/* Confirmation Email Status */}
              {confirmationEmailSent && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/70 rounded-2xl text-emerald-200 text-xs flex items-center gap-3 animate-pulse shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-extrabold text-emerald-300">Confirmation d'inscription envoyée !</p>
                    <p className="text-[10px] text-emerald-200">
                      Un e-mail de confirmation officielle d'inscription a été transmis depuis <strong>{SENDER_EMAIL_OFFICIAL}</strong> à <strong>{email}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit / Verify Button */}
              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vérification du Code OTP en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider le Code OTP & Confirmer Mon Inscription</span>
                  </>
                )}
              </button>

              {/* Resend & Back actions */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  <span>Renvoyer le code par e-mail</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setRefusalError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-slate-400 hover:text-white font-medium flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modifier les infos</span>
                </button>
              </div>
            </form>
          ) : (
            /* Registration Initial Form (Step === 'form') */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">

            {/* Account Type selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Type de compte</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('freelance')}
                  className={`py-2.5 px-3 text-[11px] font-bold rounded-xl border text-center transition cursor-pointer ${
                    accountType === 'freelance'
                      ? 'bg-[#021231] border-[#D69E25] text-amber-300 shadow-md'
                      : 'bg-[#021231]/40 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Freelance / Vendeur
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('enterprise')}
                  className={`py-2.5 px-3 text-[11px] font-bold rounded-xl border text-center transition cursor-pointer ${
                    accountType === 'enterprise'
                      ? 'bg-[#021231] border-[#D69E25] text-amber-300 shadow-md'
                      : 'bg-[#021231]/40 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Entreprise Pro
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom complet *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Abdoul Koffi"
                  className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            {/* Email (Adresse mail) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Adresse e-mail (Validation de domaine & Unicité) *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@votre-domaine.com"
                  className={`w-full bg-[#021231] border text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none transition ${
                    email ? (emailValidation.isValid ? 'border-emerald-500' : 'border-amber-500') : 'border-slate-700 focus:border-[#D69E25]'
                  }`}
                />
              </div>

              {/* Real-time Email Domain Verification Display */}
              <div className="mt-2 p-2.5 bg-[#021231]/80 rounded-xl border border-slate-800 space-y-1 text-[10px]">
                <div className="flex items-center justify-between font-bold text-[#D69E25]">
                  <span>Vérification de l'E-mail & Domaine :</span>
                  {email && (
                    <span className={emailValidation.isValid ? 'text-emerald-400 font-black' : 'text-amber-400 font-bold'}>
                      {emailValidation.isValid ? 'Format Domaine Valide' : 'Format Incomplet'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-slate-300">
                  <span className={emailValidation.hasAtSymbol ? 'text-emerald-400 font-bold flex items-center gap-1' : ''}>
                    • Symbole @ présent
                  </span>
                  <span className={emailValidation.hasValidDomain ? 'text-emerald-400 font-bold flex items-center gap-1' : ''}>
                    • Extension domaine (.com, .sn...)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 italic pt-0.5">
                  1 seule inscription est autorisée par adresse e-mail sur la plateforme.
                </p>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Numéro de téléphone (Wave / OM / WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            {/* Password (Mot de passe) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Mot de passe (Exigences de sécurité) *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Créer un mot de passe fort"
                  className={`w-full bg-[#021231] border text-xs text-white rounded-xl pl-10 pr-10 py-2.5 focus:outline-none transition ${
                    password ? (passwordValidation.isValid ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700 focus:border-[#D69E25]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements Real-Time Checklist */}
              <div className="mt-2 p-3 bg-[#021231]/80 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                <p className="font-extrabold text-[#D69E25] uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Conditions obligatoires du mot de passe :
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`flex items-center gap-1.5 font-medium ${passwordValidation.hasMinLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {passwordValidation.hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                    <span>6 caractères minimum</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordValidation.hasUppercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {passwordValidation.hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                    <span>1 lettre Majuscule (A-Z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordValidation.hasDigit ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {passwordValidation.hasDigit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                    <span>1 chiffre (0-9)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 font-medium ${passwordValidation.hasSymbol ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {passwordValidation.hasSymbol ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                    <span>1 symbole (!@#$%...)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Confirmer le mot de passe *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement & Synchronisation API...</span>
                </>
              ) : (
                <span>Valider & Créer Mon Compte</span>
              )}
            </button>
          </form>
        )) : (
          step === 'twofa' ? (
            /* Formulaire 2FA */
            <form onSubmit={handleVerifyTwoFactorSubmit} className="space-y-4">
              <div className="bg-[#021231] border border-[#D69E25]/50 p-4 rounded-2xl space-y-2.5 text-xs shadow-inner">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#D69E25] shrink-0" />
                  <p className="font-black text-[#D69E25] text-[11px] uppercase tracking-wider">
                    Sécurité renforcée : 2FA activée
                  </p>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Un code de sécurité à 6 chiffres a été envoyé à <strong className="text-white">{email}</strong>.
                  Saisissez-le pour accéder à votre compte.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 text-center">
                  Code de sécurité (6 chiffres) *
                </label>
                <div className="flex justify-center gap-2 my-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center font-mono text-lg font-black transition-all ${
                        otpInput[idx]
                          ? 'border-[#D69E25] bg-[#021231] text-[#D69E25] shadow-md scale-105'
                          : 'border-slate-700 bg-[#021231]/40 text-slate-600'
                      }`}
                    >
                      {otpInput[idx] || '•'}
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Saisir les 6 chiffres (ex: 123456)"
                  className="w-full bg-[#021231] border border-[#D69E25]/60 text-center font-mono text-sm tracking-widest text-amber-300 rounded-xl pl-4 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vérification du code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Valider & Accéder à Mon Compte</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendTwoFactorCode}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-[#D69E25] font-bold hover:underline disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Renvoyer le code
              </button>
            </form>
          ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a
                href="/forgot-password"
                onClick={onClose}
                className="text-[10px] text-[#D69E25] font-bold hover:underline"
              >
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vérification Identifiants API...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Se Connecter à la Plateforme</span>
                </>
              )}
            </button>
          </form>
          ))}
      </div>
    </div>
  );
};
