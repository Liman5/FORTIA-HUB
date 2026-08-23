"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiLoginUser } from "@/services/api";
import { useAppStore } from "@/lib/store/AppStore";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAppStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      return;
    }

    setLoading(true);
    const res = await apiLoginUser({ email, password });
    setLoading(false);

    if (!res.success || !res.data?.user) {
      setError(res.error || "Connexion refusée : Adresse e-mail ou mot de passe incorrect.");
      return;
    }

    // Sauvegarder la session dans le store (Supabase persisté en base)
    loginUser(res.data.user);
    setSuccess("Connexion réussie ! Redirection...");
    setTimeout(() => router.push("/member"), 1200);
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
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Connexion en cours..." : "Se Connecter"}
            </button>
          </form>

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