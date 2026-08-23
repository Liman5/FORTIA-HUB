"use client";

import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default secret passcode for admin access
    if (password === 'admin' || password === 'FORTIA2026' || password === '1234') {
      setError(false);
      setPassword('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#011D46] border border-[#D69E25]/50 rounded-3xl max-w-md w-full p-6 sm:p-8 text-white space-y-6 shadow-2xl relative">
        <button
          onClick={() => {
            setError(false);
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
            Espace réservé aux administrateurs de FORTIA HUB. Veuillez saisir le mot de passe d'accès pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Code ou Mot de Passe Administrateur
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Saisissez votre mot de passe administrateur"
                className="w-full bg-[#021231] border border-slate-700 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-[#D69E25] transition"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Mot de passe incorrect. Réessayez ou contactez la direction.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Accéder à l'Espace Administration</span>
          </button>
        </form>
      </div>
    </div>
  );
};
