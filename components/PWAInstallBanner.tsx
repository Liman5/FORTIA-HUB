"use client";

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Share2, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallBannerProps {
  onDismiss?: () => void;
  inlineOnly?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ inlineOnly = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // Check if previously dismissed
    const dismissedState = localStorage.getItem('fortia_pwa_banner_dismissed');
    if (dismissedState === 'true') {
      setIsDismissed(true);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] FORTIA HUB est maintenant installé !');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] L\'utilisateur a accepté l\'installation.');
          setIsInstalled(true);
        } else {
          console.log('[PWA] L\'utilisateur a refusé l\'installation.');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('[PWA] Erreur lors de l\'installation:', err);
      }
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('fortia_pwa_banner_dismissed', 'true');
  };

  // Do not show banner if already standalone app
  if (isStandalone || isInstalled) {
    if (inlineOnly) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] rounded-xl text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Application Installée</span>
        </div>
      );
    }
    return null;
  }

  // If inline button mode (for placement inside menus or headers)
  if (inlineOnly) {
    if (!deferredPrompt && !isIOS) return null;

    return (
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#D69E25] to-amber-500 text-[#021231] font-extrabold rounded-xl text-xs hover:brightness-110 transition shadow-lg cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Installer l'Application FORTIA HUB</span>
        </div>
        <Sparkles className="w-3.5 h-3.5 opacity-80" />
      </button>
    );
  }

  // Hide floating banner if explicitly dismissed and no active prompt
  if (isDismissed && !showIOSPrompt) return null;

  // Don't display banner if no prompt & not iOS
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className="bg-[#011D46]/95 backdrop-blur-md border-2 border-[#D69E25] rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-slate-100 relative overflow-hidden">
        
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-[#D69E25] to-amber-500" />

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* App Icon Preview */}
          <div className="w-12 h-12 bg-gradient-to-br from-[#021231] to-[#011D46] border-2 border-[#D69E25] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="font-black text-xl text-[#D69E25]">F</span>
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="font-black text-sm text-[#D69E25]">Installer FORTIA HUB</h4>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                App Web
              </span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Installez FORTIA HUB sur votre appareil pour un accès instantané, fluide et utilisable même hors-ligne.
            </p>

            {/* iOS Prompt Instructions */}
            {showIOSPrompt && isIOS ? (
              <div className="p-3 bg-[#021231] border border-[#D69E25]/40 rounded-xl text-xs space-y-2 mb-3">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-[#D69E25]" />
                  <span>Installation sur iOS (Safari) :</span>
                </p>
                <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px]">
                  <li>Appuyez sur le bouton <strong>Partager</strong> <Share2 className="inline w-3 h-3 text-[#D69E25]" /> en bas de l'écran.</li>
                  <li>Défilez vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong> ➕.</li>
                  <li>Validez pour ajouter FORTIA HUB comme application.</li>
                </ol>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D69E25] via-amber-500 to-[#D69E25] text-[#021231] font-black rounded-xl text-xs hover:brightness-110 active:scale-95 transition shadow-lg cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Installer Maintenant</span>
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
