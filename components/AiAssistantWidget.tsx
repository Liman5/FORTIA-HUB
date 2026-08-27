"use client";

import React, { useState } from 'react';
import { Headphones, Send, User, RefreshCw, GraduationCap, ShoppingBag, Briefcase, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

interface AiAssistantWidgetProps {
  setActiveTab?: (tab: string) => void;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ setActiveTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Bonjour et bienvenue sur **FORTIA HUB** ! 🎓

Je suis votre **Conseiller Académique**.

Je suis à votre disposition pour vous orienter et vous donner toutes les informations sur notre plateforme :
• 🎓 **Formations Certifiantes** (Cryptomonnaie, IA, Canva Pro, CapCut, Marketing Digital, Entrepreneuriat)
• 🛍️ **Boutique Numérique** (eBooks PDF, Packs de +1000 Prompts, Templates Canva Pro)
• 💼 **Prestations de Services Agence** (Logos, Visuels, Montages Vidéo, Rédaction White Paper)
• 🛡️ **Vérification Officielle de Certificats** avec QR Code

Posez-moi votre question ou cliquez sur un raccourci ci-dessous pour démarrer !`,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const promptPresets = [
    "Qu'est-ce que FORTIA HUB et que propose le site ?",
    "Quelles sont les formations certifiantes disponibles ?",
    "Que trouve-t-on dans la Boutique Numérique ?",
    "Comment demander un devis de prestation agence ?",
    "Quels sont les moyens de paiement acceptés (Mobile Money, Crypto...) ?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: data.error || data.text || "Désolé, je n'ai pas pu générer de réponse.",
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Erreur assistant IA:', err);
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        sender: 'assistant',
        text: "Désolé, une erreur de communication est survenue. Veuillez vérifier votre connexion ou réessayer.",
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8 bg-slate-900 text-white min-h-[650px]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#011D46] border border-[#D69E25]/50 px-3.5 py-1 rounded-full text-xs font-bold text-[#D69E25]">
            <Headphones className="w-4 h-4 text-[#D69E25]" />
            <span>Conseiller Académique En Ligne • FORTIA HUB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Conseil, Orientation & Support Académique
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Échangez avec notre équipe de conseillers pour vous guider dans le choix de vos formations, produits digitaux et services agence.
          </p>
        </div>

        {/* Quick Navigation Shortcut Buttons */}
        {setActiveTab && (
          <div className="bg-[#011D46] border border-[#D69E25]/30 rounded-2xl p-3 flex items-center justify-center gap-2 flex-wrap text-xs shadow-lg">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1">Raccourcis du site :</span>
            <button
              onClick={() => setActiveTab('courses')}
              className="px-3 py-1.5 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#D69E25]" />
              <span>Formations</span>
            </button>

            <button
              onClick={() => setActiveTab('shop')}
              className="px-3 py-1.5 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#D69E25]" />
              <span>Boutique Numérique</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className="px-3 py-1.5 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#D69E25]" />
              <span>Prestations Agence</span>
            </button>

            <button
              onClick={() => setActiveTab('verifier')}
              className="px-3 py-1.5 rounded-xl bg-[#021231] hover:bg-[#D69E25] text-slate-200 hover:text-[#021231] font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#D69E25]" />
              <span>Vérifier Certificat</span>
            </button>
          </div>
        )}

        {/* Prompt Presets Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-center flex-wrap">
          {promptPresets.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(preset)}
              className="px-3 py-1.5 rounded-full bg-[#011D46] border border-[#D69E25]/30 hover:border-[#D69E25] text-[11px] text-slate-200 hover:text-white transition flex items-center gap-1.5 shadow"
            >
              <span>{preset}</span>
            </button>
          ))}
        </div>

        {/* Chat Window Container */}
        <div className="bg-[#021231] border-2 border-[#D69E25]/40 rounded-2xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
          
          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? 'bg-[#D69E25] text-[#021231]'
                        : 'bg-[#011D46] border border-[#D69E25] text-[#D69E25]'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#D69E25] text-[#021231] font-medium rounded-tr-none'
                        : 'bg-[#011D46] text-slate-100 border border-slate-800 rounded-tl-none space-y-3'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Interactive buttons inside assistant messages if user wants navigation */}
                    {!isUser && setActiveTab && (
                      <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-slate-400 font-medium">Aller directement à :</span>
                        <button
                          onClick={() => setActiveTab('courses')}
                          className="px-2.5 py-1 rounded-lg bg-[#D69E25]/10 text-[#D69E25] border border-[#D69E25]/40 hover:bg-[#D69E25] hover:text-[#021231] font-bold transition flex items-center gap-1"
                        >
                          <span>Formations</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setActiveTab('shop')}
                          className="px-2.5 py-1 rounded-lg bg-[#D69E25]/10 text-[#D69E25] border border-[#D69E25]/40 hover:bg-[#D69E25] hover:text-[#021231] font-bold transition flex items-center gap-1"
                        >
                          <span>Boutique</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setActiveTab('services')}
                          className="px-2.5 py-1 rounded-lg bg-[#D69E25]/10 text-[#D69E25] border border-[#D69E25]/40 hover:bg-[#D69E25] hover:text-[#021231] font-bold transition flex items-center gap-1"
                        >
                          <span>Services Agence</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className={`text-[9px] block text-right ${isUser ? 'text-[#021231]/70' : 'text-slate-400'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#D69E25] italic">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Votre conseiller prépare votre réponse...</span>
              </div>
            )}
          </div>

          {/* Form Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#011D46] border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Posez votre question à votre conseiller académique..."
              className="flex-1 bg-[#021231] border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#D69E25]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-3 bg-[#D69E25] text-[#021231] font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50 transition flex items-center gap-1 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">Envoyer</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};

