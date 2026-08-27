"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Veuillez renseigner votre adresse e-mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi de l'email de réinitialisation.");
        return;
      }

      setSuccess(data.message || "Email de réinitialisation envoyé.");
      setEmail("");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 mb-2">
              <KeyRound className="w-7 h-7 text-[#D69E25]" />
            </div>
            <h1 className="text-2xl font-black">
              Réinitialisation <span className="text-[#D69E25]">du mot de passe</span>
            </h1>
            <p className="text-xs text-slate-400">
              Saisissez votre adresse e-mail : un lien de réinitialisation vous sera envoyé par
              Supabase.
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
            <div className="flex items-start gap-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>
              <Link href="/login" className="text-[#D69E25] font-bold hover:underline">
                Retour à la connexion
              </Link>
            </p>
            <p>
              <Link href="/" className="text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Retour à l&apos;accueil
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
