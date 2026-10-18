"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2, KeyRound, ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { apiLoginUser, apiVerifyTwoFactor } from "@/services/api";
import { useAuth } from "@/lib/store/domains/contexts";

export default function LoginPage() {
    const { loginUser, isUserLoggedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Étape 2FA
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [otpInput, setOtpInput] = useState("");

  /**
   * Redirection après connexion réussie.
   * ⚠️ On utilise une navigation « dure » (`window.location.assign`) et non
   * `router.push` : le cookie de session vient d'être posé par la réponse
   * `POST /api/auth`, et une navigation serveur garantit qu'il est bien
   * transmis au proxy de protection des pages privées — sans dépendre du
   * cache du routeur client (cause d'un retour silencieux vers /login).
   */
  const redirectTarget = () => {
    const raw =
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("next")) ||
      "/member";
    // Sécurité : on n'accepte qu'un chemin interne (protection open-redirect).
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/member";
  };

  // Dès que la session est active (connexion ou restaurée depuis le stockage
  // local), on quitte la page de connexion. Ce mécanisme couvre les deux cas :
  // connecté à l'instant, ou déjà connecté et revenu sur /login.
  useEffect(() => {
    if (!isUserLoggedIn) return;
    setSuccess("Connexion réussie ! Redirection...");
    const timer = window.setTimeout(() => {
      window.location.assign(redirectTarget());
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Sur mobile, le clavier ajoute parfois un espace ou une majuscule :
    // l'e-mail est normalisé ici (le mot de passe, lui, n'est jamais modifié).
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError("Cette adresse e-mail n'est pas valide. Vérifiez-la et réessayez.");
      return;
    }

    setLoading(true);
    setSuccess("Connexion en cours…");
    const res = await apiLoginUser({ email: cleanEmail, password });
    setLoading(false);
    setSuccess(null);

    if (!res.success || !res.data) {
      setError(res.error || "Connexion refusée : Adresse e-mail ou mot de passe incorrect.");
      return;
    }

    // Authentification à deux facteurs requise
    if (res.data.needsTwoFactor) {
      setNeedsTwoFactor(true);
      setTwoFactorToken(res.data.twoFactorToken || "");
      setSuccess(res.data.message || "Un code de sécurité a été envoyé par e-mail.");
      return;
    }

    if (!res.data.user) {
      setError("Réponse de connexion invalide.");
      return;
    }

    // Sauvegarder la session dans le store (Supabase persisté en base)
    loginUser(res.data.user);
    setSuccess("Connexion réussie ! Redirection...");
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(otpInput.trim())) {
      setError("Le code de sécurité doit comporter exactement 6 chiffres.");
      return;
    }

    setLoading(true);
    const res = await apiVerifyTwoFactor(twoFactorToken, otpInput.trim());
    setLoading(false);

    if (!res.success || !res.data?.user) {
      setError(res.error || "Code de sécurité invalide.");
      return;
    }

    loginUser(res.data.user);
    setSuccess("Authentification à deux facteurs validée ! Redirection...");
  };

  const handleResendTwoFactorCode = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const res = await apiLoginUser({ email, password });
    setLoading(false);
    if (res.success && res.data?.needsTwoFactor) {
      setTwoFactorToken(res.data.twoFactorToken || "");
      setSuccess("Un nouveau code de sécurité a été envoyé par e-mail.");
    } else {
      setError(res.error || "Impossible de renvoyer le code. Réessayez.");
    }
  };

  const backToLogin = () => {
    setNeedsTwoFactor(false);
    setTwoFactorToken("");
    setOtpInput("");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 mb-2">
              <LogIn className="w-7 h-7 text-[#D69E25]" />
            </div>
            <h1 className="text-2xl font-black">
              Connexion <span className="text-[#D69E25]">FORTIA HUB</span>
            </h1>
            <p className="text-xs text-slate-400">
              Accédez à votre espace membre, boutique vendeur et formations.
            </p>
          </div>

          {/* Messages */}
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

          {needsTwoFactor ? (
          <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
            {/* Informations 2FA */}
            <div className="p-4 bg-[#D69E25]/10 border border-[#D69E25]/40 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-[#D69E25] shrink-0" />
                <p className="text-xs font-black text-[#D69E25]">Double authentification requise</p>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Pour sécuriser votre compte, un code de sécurité à 6 chiffres a été envoyé à votre adresse e-mail.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">Code de sécurité (6 chiffres)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full bg-[#021231] border border-[#D69E25]/60 text-center font-mono text-sm tracking-widest text-amber-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Vérification..." : "Valider le code de sécurité"}
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

            <button
              type="button"
              onClick={backToLogin}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-400 font-semibold hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </button>
          </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">Adresse e-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  spellCheck={false}
                  enterKeyHint="next"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">Mot de passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 pl-10 pr-10 text-white focus:outline-none focus:border-[#D69E25]"
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

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-[10px] text-[#D69E25] font-bold hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Connexion en cours..." : "Se Connecter"}
            </button>
          </form>
          )}

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-[#D69E25] font-bold hover:underline">
                Créer un compte
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