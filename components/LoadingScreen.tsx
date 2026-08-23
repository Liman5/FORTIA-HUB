import React from 'react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Chargement de votre espace sécurisé FORTIA HUB...'
}) => {
  return (
    <div className="min-h-[400px] py-20 bg-[#021231] text-white flex flex-col items-center justify-center p-6 space-y-6">
      <div className="transform scale-110">
        <Logo />
      </div>

      <div className="flex items-center gap-3 bg-[#011D46] px-5 py-2.5 rounded-full border border-[#D69E25]/40 shadow-lg">
        <div className="w-4 h-4 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-xs font-bold text-slate-200">{message}</span>
      </div>

      {/* Pulsing Gold Progress Line */}
      <div className="w-48 h-1 bg-[#011D46] rounded-full overflow-hidden border border-[#D69E25]/20">
        <div className="w-full h-full bg-gradient-to-r from-[#D69E25] via-amber-300 to-[#AB6F10] animate-pulse" />
      </div>
    </div>
  );
};
