"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus, User, Mail, Lock, Phone, Eye, EyeOff, Loader2,
  AlertCircle, CheckCircle2, KeyRound, Send, RefreshCw, ArrowLeft
} from "lucide-react";
import { validatePassword, validateEmailFormat } from "@/utils/authValidation";
import {
  apiRegisterUser,
  apiCheckEmailAvailability,
  apiSendOtp,
  apiVerifyOtp,
  SENDER_EMAIL_OFFICIAL,
} from "@/services/api";
import { useAuth } from "@/lib/store/domains/contexts";

export default function RegisterPage() {
  const router = useRouter();
    const { loginUser } = useAuth();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "freelance" | "enterprise">("freelance");

  // OTP step
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSender, setOtpSender] = useState(SENDER_EMAIL_OFFICIAL);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emailValidation = validateEmailFormat(email);
  const passwordValidation = validatePassword(password);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Nom
    if (!name.trim()) {
      setError("Veuillez renseigner votre nom complet.");
      return;
    }
    // Email
    if (!emailValidation.isValid) {
      setError(emailValidation.errorMessage || "Format d'adresse e-mail invalide.");
      return;
    }
    // Mot de passe
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errorMessage || "Le mot de passe ne respecte pas les critères obligatoires.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    // Vérifier disponibilité email côté Supabase
    const check = await apiCheckEmailAvailability(email);
    if (!check.available) {
      setError(check.error || "Adresse e-mail non disponible.");
      return;
    }

    setLoading(true);
    const otpRes = await apiSendOtp(email);
    setLoading(false);

    if (otpRes.otpCode) {
      setGeneratedOtp(otpRes.otpCode);
      setOtpSender(otpRes.sender || SENDER_EMAIL_OFFICIAL);
      setStep("otp");
      setSuccess(`Code de vérification envoyé à ${email}. Utilisez le code reçu pour confirmer votre compte.`);
    } else {
      setError("Impossible d'envoyer le code de vérification. Réessayez.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const verifyRes = await apiVerifyOtp(email, otpInput, generatedOtp);
    if (!verifyRes.success) {
      setError(verifyRes.error || "Code OTP invalide.");
      return;
    }

    setLoading(true);
    const regRes = await apiRegisterUser({
      email,
      password,
      name,
      phone,
      accountType,
    });
    setLoading(false);

    if (!regRes.success || !regRes.data?.user) {
      setError(regRes.error || "Inscription refusée.");
      return;
    }

    // Créer la session dans le store (compte réellement persisté en Supabase)
    loginUser(regRes.data.user);
    setSuccess("Compte créé avec succès ! Redirection vers votre espace membre...");
    setTimeout(() => router.push("/member"), 1500);
  };

  return (
    <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 mb-2">
              <UserPlus className="w-7 h-7 text-[#D69E25]" />
            </div>
            <h1 className="text-2xl font-black">
              Créer un compte <span className="text-[#D69E25]">FORTIA HUB</span>
            </h1>
            <p className="text-xs text-slate-400">
              Inscrivez-vous pour accéder aux formations, à la boutique et au statut vendeur.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-300 text-xs rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* 🔴 ZONE DÉVELOPPEMENT / DÉMO : Affiche le code généré tant que Resend n'est pas connecté */}
          {generatedOtp && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 text-center space-y-1">
              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wide">
                🔧 Mode Développement — Votre code de vérification
              </p>
              <p className="text-2xl font-black text-amber-300 font-mono tracking-[0.3em]">{generatedOtp}</p>
              <p className="text-[10px] text-amber-400/80">
                (visible uniquement tant que l'envoi d'email Resend n'est pas configuré)
              </p>
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Nom complet *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Adresse e-mail *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Téléphone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Type de compte</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as any)}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  <option value="freelance">Membre / Freelance</option>
                  <option value="buyer">Acheteur</option>
                  <option value="enterprise">Entreprise</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Mot de passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 caractères, 1 majuscule, 1 chiffre, 1 symbole"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 pr-10 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre mot de passe"
                    className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Envoi du code..." : "Envoyer le code de vérification"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] rounded-xl p-3">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>
                  Code envoyé à <strong>{email}</strong> depuis {otpSender}. Il expire dans 10 minutes.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Code de vérification (6 chiffres)</label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-center font-mono text-lg tracking-[0.4em] text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="w-full py-3 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-500 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? "Création du compte..." : "Valider le code et créer mon compte"}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Retour au formulaire
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsResendingOtp(true);
                    const res = await apiSendOtp(email);
                    if (res.otpCode) {
                      setGeneratedOtp(res.otpCode);
                      setSuccess(`Nouveau code envoyé à ${email}.`);
                    }
                    setIsResendingOtp(false);
                  }}
                  disabled={isResendingOtp}
                  className="text-[11px] text-[#D69E25] hover:underline flex items-center gap-1"
                >
                  {isResendingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Renvoyer le code
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>
              Déjà inscrit ?{" "}
              <Link href="/login" className="text-[#D69E25] font-bold hover:underline">
                Se connecter
              </Link>
            </p>
            <p>
              <Link href="/" className="text-slate-500 hover:text-slate-300">
                ← Retour à l'accueil
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}