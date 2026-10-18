"use client";

import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, Mail, Loader2 } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Authentification de l'espace administration.
 * ⚠️ La vérification est faite CÔTÉ SERVEUR (/api/admin/auth → table
 * `admin_users`, mot de passe haché). Le token de session renvoyé est
 * conservé puis transmis aux endpoints protégés (Authorization: Bearer).
 * Aucun mot de passe n'est présent dans le code du navigateur.
 */
export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.token) {
        setError(json?.error || 'Identifiants administrateur invalides.');
        return;
      }

      try {
        localStorage.setItem('fortia_admin_token', json.token);
      } catch {}
      setPassword('');
      onSuccess();
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-3xl max-w-md w-full p-6 sm:p-8 text-white space-y-6 shadow-2xl relative">
        <button
          onClick={() => {
            setError('');
            setPassword('');
            onClose();
          }}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#021231] text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">Accès Restreint Administration</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Espace réservé aux administrateurs de FORTIA HUB. Connectez-vous avec votre
            compte administrateur enregistré.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Email Administrateur
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@fortia-hub.com"
                autoComplete="username"
                className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl p-3 pl-9 focus:outline-none focus:border-[#D69E25] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mot de Passe Administrateur
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Saisissez votre mot de passe administrateur"
                autoComplete="current-password"
                className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl p-3 pl-9 focus:outline-none focus:border-[#D69E25] transition"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? 'Vérification…' : "Accéder à l'Espace Administration"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

