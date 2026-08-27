"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, User, Headphones, RefreshCw } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
}

/**
 * FloatingAiAssistant - Robot IA animé flottant sur toutes les pages
 * - Cligne des yeux, bouge la tête, petite animation
 * - Au survol : affiche "Bonjour je suis Fortia AI..."
 * - Au clic : ouvre le popup chat complet (sans redirection)
 */
export function FloatingAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isWelcoming, setIsWelcoming] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "assistant",
      text: `Bonjour et bienvenue sur **FORTIA HUB** ! 🎓\n\nJe suis votre **Conseiller Académique**.\n\nJe suis à votre disposition pour vous orienter et vous donner toutes les informations sur notre plateforme :\n• 🎓 **Formations Certifiantes** (Cryptomonnaie, IA, Canva Pro, CapCut, Marketing Digital, Entrepreneuriat)\n• 🛍️ **Boutique Numérique** (eBooks PDF, Packs de +1000 Prompts, Templates Canva Pro)\n• 💼 **Prestations de Services Agence** (Logos, Visuels, Montages Vidéo, Rédaction White Paper)\n• 🛡️ **Vérification Officielle de Certificats** avec QR Code\n\nPosez-moi votre question ci-dessous !`,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // ===== Drag : position du robot flottant =====
  const [robotPos, setRobotPos] = useState<{ x: number; y: number } | null>(null);
  const [popupPos, setPopupPos] = useState<{ left: number; top: number } | null>(null);
  const [popupBelow, setPopupBelow] = useState(true);
  const [popupAlignLeft, setPopupAlignLeft] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const robotWrapRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);

  // Position initiale du robot : bas droite
  useEffect(() => {
    setRobotPos({
      x: Math.max(8, window.innerWidth - 88),
      y: Math.max(8, window.innerHeight - 168),
    });
    setPopupBelow(true);
    setPopupAlignLeft(true);
  }, []);

  // Auto-scroll des messages
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: prompt,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: data.error || data.text || "Désolé, je n'ai pas pu générer de réponse.",
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Erreur assistant IA:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: "assistant",
          text: "Désolé, une erreur de communication est survenue. Veuillez réessayer.",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // ===== DRAG : déplacer le robot à la souris / au doigt =====
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || isOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const base = robotPos ?? { x: rect.left, y: rect.top };
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: base.x,
      baseY: base.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    const wrap = robotWrapRef.current;
    const width = wrap?.offsetWidth ?? 72;
    const height = wrap?.offsetHeight ?? 72;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    setRobotPos({
      x: Math.min(Math.max(drag.baseX + dx, 0), maxX),
      y: Math.min(Math.max(drag.baseY + dy, 0), maxY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    if (!drag || drag.pointerId !== e.pointerId) return;
    // Un vrai déplacement => on ignore le clic qui suit
    if (drag.moved) suppressClickRef.current = true;
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleChat();
  };

  // Calcule où ouvrir le popup / afficher le message de bienvenue selon la position du robot
  const computePopupPlacement = () => {
    const rect = robotWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popupW = Math.min(400, vw - 16);
    const popupH = 480;

    // Vertical : au-dessus du robot si possible, sinon en dessous
    let top: number;
    let below = false;
    if (rect.top - popupH - 12 >= 12) {
      top = rect.top - popupH - 12;
    } else {
      top = Math.max(12, Math.min(rect.bottom + 12, vh - popupH - 12));
      below = true;
    }
    // Horizontal : bord droit du popup aligné avec le bord droit du robot, clampé à l'écran
    const left = Math.min(Math.max(rect.right - popupW, 12), vw - popupW - 12);

    setPopupPos({ left, top });
    setPopupBelow(below);
    setPopupAlignLeft(rect.left + 260 <= vw);
  };

  const toggleChat = () => {
    const next = !isOpen;
    setIsOpen(next);
    setIsWelcoming(false);
    if (next) computePopupPlacement();
  };

  return (
    <>
      {/* ===== BULLE ROBOT IA FLOTTANTE (déplaçable) ===== */}
      <div
        ref={robotWrapRef}
        className={`fixed z-[100] ${
          robotPos ? "" : "bottom-24 sm:bottom-28 right-4 sm:right-6"
        }`}
        style={robotPos ? { left: robotPos.x, top: robotPos.y } : undefined}
      >
        {/* Message de bienvenue au survol */}
        <AnimatePresence>
          {isHovered && !isOpen && isWelcoming && !isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`absolute ${
                popupBelow ? "top-full mt-3" : "bottom-full mb-3"
              } ${
                popupAlignLeft ? "left-0" : "right-0"
              } w-[260px] bg-[#021231] border border-[#D69E25]/50 rounded-2xl p-4 shadow-2xl shadow-black/50`}
            >
              <div className="flex items-start gap-2.5">
                {/* Mini robot dans le message */}
                <div className="w-9 h-9 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-[#D69E25]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white leading-relaxed">
                    Bonjour, je suis <span className="text-[#D69E25]">Fortia AI</span> 👋
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                    Je peux vous aider dans vos recherches. Cliquez sur moi pour discuter !
                  </p>
                </div>
              </div>
              <div
                className={`absolute ${
                  popupBelow ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-r border-b"
                } ${popupAlignLeft ? "left-6" : "right-6"} w-3 h-3 bg-[#021231] border-[#D69E25]/50 rotate-45`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton robot animé */}
        <motion.button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          onMouseEnter={() => {
            setIsHovered(true);
            computePopupPlacement();
          }}
          onMouseLeave={() => setIsHovered(false)}
          animate={isDragging ? { y: 0 } : { y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: isDragging ? 1 : 0.95 }}
          className="relative group cursor-grab active:cursor-grabbing select-none touch-none"
          title="Fortia AI Assistant (glisser pour déplacer, cliquer pour discuter)"
          aria-label="Fortia AI Assistant : glisser pour déplacer, cliquer pour discuter"
        >
          {/* Halo lumineux */}
          <span className="absolute inset-0 rounded-full bg-[#D69E25]/30 blur-xl animate-pulse" />

          {/* Corps du robot */}
          <span className="relative flex w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-gradient-to-br from-[#0A2A5E] via-[#011D46] to-[#021231] border-2 border-[#D69E25] shadow-2xl shadow-[#D69E25]/30 overflow-hidden items-center justify-center">
            {/* Tête du robot */}
            <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
              {/* Antenne */}
              <line x1="32" y1="4" x2="32" y2="12" stroke="#D69E25" strokeWidth="2" strokeLinecap="round" />
              <circle cx="32" cy="4" r="3" fill="#D69E25">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
              </circle>

              {/* Corps / tête */}
              <rect x="12" y="14" width="40" height="38" rx="14" fill="#011D46" stroke="#D69E25" strokeWidth="1.5" />

              {/* Visage */}
              <rect x="17" y="20" width="30" height="26" rx="10" fill="#021231" />

              {/* Yeux - clignent */}
              {/* Œil gauche */}
              <g>
                <ellipse cx="26" cy="30" rx="4.5" ry="6" fill="#D69E25" opacity="0.9">
                  <animate attributeName="ry" values="6;6;0.5;6;6" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.9;0.15;0.9;0.9" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="27.5" cy="28.5" r="1.5" fill="#021231">
                  <animate attributeName="cy" values="28.5;26;28.5;28.5;28.5" keyTimes="0;0.5;0.7;0.8;1" dur="6s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Œil droit */}
              <g>
                <ellipse cx="38" cy="30" rx="4.5" ry="6" fill="#D69E25" opacity="0.9">
                  <animate attributeName="ry" values="6;6;0.5;6;6" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.9;0.15;0.9;0.9" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="39.5" cy="28.5" r="1.5" fill="#021231">
                  <animate attributeName="cy" values="28.5;26;28.5;28.5;28.5" keyTimes="0;0.5;0.7;0.8;1" dur="6s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Sourire */}
              <path d="M25 40 Q32 46 39 40" fill="none" stroke="#D69E25" strokeWidth="2" strokeLinecap="round" />

              {/* Oreilles */}
              <rect x="8" y="26" width="5" height="12" rx="2.5" fill="#D69E25" />
              <rect x="51" y="26" width="5" height="12" rx="2.5" fill="#D69E25" />
            </svg>

            {/* Badge en ligne */}
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#021231]">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </span>
          </span>
        </motion.button>
      </div>

      {/* ===== POPUP CHAT IA ===== */}
      <AnimatePresence>
        {isOpen && popupPos && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ left: popupPos.left, top: popupPos.top }}
            className="fixed z-[110] w-[340px] sm:w-[400px] max-w-[calc(100vw-2rem)] flex flex-col bg-[#021231] border-2 border-[#D69E25]/50 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#011D46] via-[#0A2A5E] to-[#011D46] border-b border-[#D69E25]/40 p-4 flex items-center gap-3">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/60 to-transparent" />
              {/* Mini robot dans le header */}
              <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0">
                <line x1="32" y1="4" x2="32" y2="12" stroke="#D69E25" strokeWidth="2" strokeLinecap="round" />
                <circle cx="32" cy="4" r="3" fill="#D69E25">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <rect x="12" y="14" width="40" height="38" rx="14" fill="#011D46" stroke="#D69E25" strokeWidth="1.5" />
                <rect x="17" y="20" width="30" height="26" rx="10" fill="#021231" />
                <ellipse cx="26" cy="30" rx="4.5" ry="6" fill="#D69E25" opacity="0.9">
                  <animate attributeName="ry" values="6;6;0.5;6;6" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="38" cy="30" rx="4.5" ry="6" fill="#D69E25" opacity="0.9">
                  <animate attributeName="ry" values="6;6;0.5;6;6" keyTimes="0;0.08;0.1;0.12;1" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <path d="M25 40 Q32 46 39 40" fill="none" stroke="#D69E25" strokeWidth="2" strokeLinecap="round" />
                <rect x="8" y="26" width="5" height="12" rx="2.5" fill="#D69E25" />
                <rect x="51" y="26" width="5" height="12" rx="2.5" fill="#D69E25" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Fortia AI
                  <span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">EN LIGNE</span>
                </h3>
                <p className="text-[10px] text-slate-400 truncate">Conseiller Académique & Assistant Intelligent</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[360px] bg-[#031531]">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser ? "bg-[#D69E25] text-[#021231]" : "bg-[#011D46] border border-[#D69E25] text-[#D69E25]"
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-[11px] leading-relaxed ${
                        isUser
                          ? "bg-[#D69E25] text-[#021231] font-medium rounded-tr-none"
                          : "bg-[#011D46] text-slate-100 border border-slate-800 rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span className={`text-[8px] block text-right mt-1 ${isUser ? "text-[#021231]/70" : "text-slate-500"}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex items-center gap-2 text-[10px] text-[#D69E25] italic">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fortia AI réfléchit...</span>
                </div>
              )}
            </div>

            {/* Input */}
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
                placeholder="Posez votre question..."
                className="flex-1 bg-[#021231] border border-slate-700 text-white placeholder-slate-400 text-[11px] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#D69E25]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="p-2.5 bg-[#D69E25] text-[#021231] font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50 transition flex items-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}