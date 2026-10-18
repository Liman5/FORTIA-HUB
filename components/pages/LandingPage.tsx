"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  GraduationCap,
  ShoppingBag,
  Briefcase,
  ShieldCheck,
  Users,
  Award,
  Star,
  Rocket,
  ArrowRight,
  Sparkles,
  Headphones,
  Zap,
  CheckCircle2,
  Globe,
  Lock,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  Play,
  Layers,
  TrendingUp,
  Wallet,
  BadgeCheck,
  MousePointerClick,
  Sun,
  Moon,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useRouter } from "next/navigation";
import { useAuth, useUi, useMarketplace, useCatalog } from "@/lib/store/domains/contexts";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { useTheme } from "@/lib/store/ThemeProvider";
import { Logo } from "@/components/Logo";

function ParticleField() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    size: 2 + (i % 4),
    duration: 8 + (i % 12),
    delay: (i * 0.7) % 10,
    opacity: 0.15 + (i % 5) * 0.08,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-[#D69E25]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [-20, "-100vh"],
            x: [0, Math.sin(p.id) * 40],
            opacity: [p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function FloatingShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute top-24 left-10 w-24 h-24 rounded-3xl border border-[#D69E25]/20 bg-[#D69E25]/5 rotate-12"
        animate={{ y: [0, -30, 0], rotate: [12, 24, 12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-64 right-16 w-16 h-16 rounded-full border border-emerald-400/20 bg-emerald-400/5"
        animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-40 left-1/3 w-12 h-12 rounded-xl border border-sky-400/20 bg-sky-400/5 -rotate-12"
        animate={{ y: [0, -20, 0], rotate: [-12, 12, -12] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border border-[#D69E25]/10"
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border border-[#D69E25]/10"
        animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}

function AnimatedGradientText({ text }: { text: string }) {
  return (
    <span className="animated-gradient-text inline-block">
      {text}
    </span>
  );
}

function TechMarquee() {
  const items = [
    "Cryptomonnaie",
    "Intelligence Artificielle",
    "Marketing Digital",
    "Canva Pro",
    "CapCut",
    "Entrepreneuriat",
    "Design Graphique",
    "Copywriting",
    "E-commerce",
    "Web3",
    "Trading",
    "Création de Contenu",
  ];

  return (
    <div className="relative py-6 border-y border-[#D69E25]/10 bg-[#011D46]/30 overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee gap-8">
        {[...items, ...items, ...items].map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-400 hover:text-[#D69E25] transition-colors px-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D69E25]/60" />
            <span className="uppercase tracking-widest">{item}</span>
          </div>
        ))}
      </div>
      {/* Fonds dégradés latéraux retirés - effet noir supprimé en mode clair */}
    </div>
  );
}

export function LandingPage() {
  const { setActiveTab } = useActiveSection();
  const { isDarkMode, toggleTheme } = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      setMousePos({
        x: (e.clientX / rect.width - 0.5) * 20,
        y: (e.clientY / rect.height - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const router = useRouter();
  const { setVendorApplicationModalOpen } = useUi();
  const { isUserLoggedIn } = useAuth();
  const { siteContent } = useMarketplace();
  const { courses } = useCatalog();

  const handleExploreAcademy = () => setActiveTab("academy");
  const handleExploreMarketplace = () => setActiveTab("marketplace");
  const handleExploreServices = () => setActiveTab("services");

  const handleOpenVendorCreation = () => {
    if (isUserLoggedIn) {
      setActiveTab("marketplace");
      setVendorApplicationModalOpen(true);
    } else {
      // Connexion = PAGE dédiée (/login) : plus aucune fenêtre superposée.
      router.push("/login");
    }
  };

  const stats = [
    { value: siteContent?.statStudents || "15k+", label: "Étudiants Actifs", icon: Users },
    { value: siteContent?.statSuccessRate || "98%", label: "Taux de Réussite", icon: TrendingUp },
    { value: siteContent?.statModules || "45+", label: "Modules & Packs", icon: Layers },
    { value: "24/7", label: "Support & Accès", icon: Headphones },
  ];

  const pillars = [
    {
      icon: GraduationCap,
      title: "Académie Certifiante",
      description:
        "Crypto, IA, Canva, CapCut, Marketing Digital & Entrepreneuriat. Certificats officiels avec QR Code.",
      color: "from-[#D69E25] to-[#AB6F10]",
      colorSolid: "#D69E25",
      action: () => handleExploreAcademy(),
      cta: "Explorer les Formations",
      glow: "group-hover:shadow-[0_0_40px_rgba(214,158,37,0.3)]",
      borderHover: "hover:border-[#D69E25]/50",
      features: ["Certificats QR Code", "Progression suivie", "Projets pratiques"],
    },
    {
      icon: ShoppingBag,
      title: "Boutique & Marketplace",
      description:
        "eBooks, packs de +1000 prompts IA, templates Canva Pro, produits digitaux et freelances vérifiés.",
      color: "from-emerald-500 to-teal-600",
      colorSolid: "#10B981",
      action: () => handleExploreMarketplace(),
      cta: "Découvrir la Marketplace",
      glow: "group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]",
      borderHover: "hover:border-emerald-500/50",
      features: ["Vendeurs KYC vérifiés", "Paiements sécurisés", "Livraison instantanée"],
    },
    {
      icon: Briefcase,
      title: "Services Experts",
      description:
        "Logos, chartes graphiques, White Papers, montages vidéo et conseil stratégique par notre agence.",
      color: "from-sky-500 to-blue-600",
      colorSolid: "#0EA5E9",
      action: () => handleExploreServices(),
      cta: "Voir les Prestations",
      glow: "group-hover:shadow-[0_0_40px_rgba(14,165,233,0.3)]",
      borderHover: "hover:border-sky-500/50",
      features: ["Experts certifiés", "Devis rapide 24h", "Livraison garantie"],
    },
  ];

  const features = [
    { icon: ShieldCheck, title: "Certifications Authentifiées", description: "QR Code de vérification unique pour chaque certificat." },
    { icon: Zap, title: "Accès Instantané 24/7", description: "Téléchargement immédiat après paiement sécurisé." },
    { icon: CreditCard, title: "Paiements Multi-Méthodes", description: "Mobile Money, Crypto USDT, Cartes & PayPal." },
    { icon: Users, title: "Communauté d'Experts", description: "Freelances et entreprises vérifiés par KYC strict." },
    { icon: Globe, title: "100% En Ligne", description: "Apprenez et travaillez depuis n'importe où en Afrique et dans le monde." },
    { icon: Headphones, title: "Support 7J/7", description: "Assistance humaine dédiée pour vous accompagner à chaque étape." },
  ];

  const steps = [
    {
      icon: MousePointerClick,
      title: "Choisissez",
      description: "Parcourez nos formations, produits digitaux et services experts.",
      color: "#D69E25",
    },
    {
      icon: Wallet,
      title: "Payez en Toute Simplicité",
      description: "Mobile Money, Crypto USDT, Cartes bancaires ou PayPal.",
      color: "#10B981",
    },
    {
      icon: BadgeCheck,
      title: "Recevez & Progressez",
      description: "Accès instantané, certificats QR Code et support 7J/7.",
      color: "#0EA5E9",
    },
  ];

  const testimonials = [
    {
      name: "Abdoul Alim Labodja",
      role: "Étudiant Crypto",
      content:
        "La Masterclass Cryptomonnaie a transformé ma façon de comprendre le Web3. Le certificat authentifié avec QR code est un vrai plus !",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      highlight: "Certification",
    },
    {
      name: "Sarah Diallo",
      role: "Fondatrice - Dakar Design",
      content:
        "Grâce à FORTIA HUB, j'ai créé mon agence de design et j'ai obtenu mes premiers clients freelance en 3 semaines.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80",
      highlight: "Entrepreneuriat",
    },
    {
      name: "Marc Kouassi",
      role: "Entrepreneur - Abidjan",
      content:
        "La boutique digitale est incroyable. Les packs de prompts IA m'ont fait gagner des heures de travail chaque semaine.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80",
      highlight: "Productivité IA",
    },
  ];

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30 selection:text-white">
      {/* Bouton Mode Nuit / Jour - visible en haut à droite (le navbar est masqué sur la landing) */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow-lg hover:scale-105 active:scale-95"
        title={isDarkMode ? "Mode Jour" : "Mode Nuit"}
        aria-label={isDarkMode ? "Activer le mode jour" : "Activer le mode nuit"}
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* ==================== HERO SECTION ==================== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-screen flex items-center justify-center pt-24 pb-20"
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.12)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />

        <ParticleField />
        <FloatingShapes />

        {/* Animated gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

        {/* Mouse parallax layers */}
        <motion.div
          className="absolute top-32 left-1/4 w-72 h-72 rounded-full bg-[#D69E25]/5 blur-3xl pointer-events-none"
          animate={{ x: mousePos.x * 2, y: mousePos.y * 2 }}
          transition={{ type: "spring", stiffness: 50 }}
        />
        <motion.div
          className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl pointer-events-none"
          animate={{ x: -mousePos.x * 2, y: -mousePos.y * 2 }}
          transition={{ type: "spring", stiffness: 50 }}
        />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-8">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/30 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] shadow-[0_0_20px_rgba(214,158,37,0.15)]"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-[#D69E25]"
                />
                <Sparkles className="w-3.5 h-3.5" />
                <span>{siteContent?.heroBadgeText || "Plateforme Web Premium de Formation & Services Numériques"}</span>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05]"
              >
                {siteContent?.heroTitleText || "Excellence, Réussite & Prestige :"}{" "}
                <AnimatedGradientText text={siteContent?.heroTitleGradient || "Maîtrisez les Métiers du Futur"} />
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-medium"
              >
                {siteContent?.heroSubtitle ||
                  "Bienvenue sur FORTIA HUB. Obtenez des compétences certifiées à fort impact : Cryptomonnaie, Intelligence Artificielle, Canva, CapCut, Marketing Digital & Entrepreneuriat."}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                className="flex flex-wrap items-center gap-4"
              >
                <button
                  onClick={handleExploreAcademy}
                  className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-sm uppercase tracking-wider hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-[#D69E25]/40 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
                  <GraduationCap className="w-5 h-5" />
                  {siteContent?.heroPrimaryCta || "Explorer les Formations"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setActiveTab("blog")}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/20 text-slate-200 hover:bg-white/10 hover:text-[#D69E25] hover:border-[#D69E25]/40 font-bold text-sm uppercase tracking-wider transition-all duration-300 active:scale-95"
                >
                  <Play className="w-4 h-4" />
                  Notre Blog
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4"
              >
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center hover:border-[#D69E25]/50 hover:bg-white/[0.08] hover:shadow-[0_0_30px_rgba(214,158,37,0.15)] transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Icon className={`w-4 h-4 mx-auto mb-2 ${i % 2 === 0 ? "text-[#D69E25]" : "text-emerald-400"}`} />
                      <div className="text-2xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:from-[#D69E25] group-hover:to-[#F6E05E] transition-all">
                        {stat.value}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold mt-1">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Right Column - Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
              className="lg:col-span-5 relative"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-3xl overflow-hidden border-2 border-[#D69E25]/30 shadow-[0_0_60px_rgba(214,158,37,0.15)] group"
              >
                <img
                  src={siteContent?.heroImageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"}
                  alt="FORTIA HUB Plateforme"
                  className="w-full h-[400px] sm:h-[480px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/20 to-transparent" />

                {/* Glow frame on hover */}
                <div className="absolute inset-0 ring-2 ring-inset ring-[#D69E25]/0 group-hover:ring-[#D69E25]/30 transition-all duration-500 rounded-3xl" />

                {/* Floating Card - Live Course */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-[#D69E25]" />
                      <motion.span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black text-[#D69E25]">Formation en Vedette</div>
                      <div className="text-[11px] text-slate-200 font-medium">
                        {courses[0]?.title || "Masterclass IA & Business 2026"}
                      </div>
                    </div>
                    <button
                      onClick={handleExploreAcademy}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[10px] font-black hover:brightness-110 active:scale-95 transition"
                    >
                      Voir
                    </button>
                  </div>
                </motion.div>

                {/* Floating badge - Top right */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="absolute top-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-300"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Vérifié KYC
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Découvrir</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-[#D69E25]/40 flex justify-center pt-1.5"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 rounded-full bg-[#D69E25]"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ==================== TECH MARQUEE ==================== */}
      <TechMarquee />

      {/* ==================== PILIERS SECTION ==================== */}
      <section className="py-24 relative bg-[#021231] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,158,37,0.05)_0%,transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] mb-6 shadow-[0_0_20px_rgba(214,158,37,0.1)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Les 3 Piliers de FORTIA HUB</span>
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Une Plateforme <AnimatedGradientText text="Complète" /> pour Réussir
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-4">
              Tout ce dont vous avez besoin pour apprendre, créer, vendre et réussir dans l'économie numérique.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
                  whileHover={{ y: -12, scale: 1.02 }}
                  className={`group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 ${pillar.borderHover} ${pillar.glow} transition-all duration-500 cursor-pointer overflow-hidden`}
                  onClick={pillar.action}
                >
                  {/* Glow effect */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5 blur-3xl group-hover:bg-[#D69E25]/10 transition-colors duration-500" />

                  {/* Top border gradient */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-[#D69E25]/60 transition-all duration-500" />

                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.color} text-white flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-black mb-3">{pillar.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {pillar.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {pillar.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 text-sm font-black group-hover:gap-3 transition-all" style={{ color: pillar.colorSolid }}>
                    <span>{pillar.cta}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== COMMENT ÇA MARCHE ==================== */}
      <section className="py-24 bg-[#011D46]/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(214,158,37,0.05)_0%,transparent_50%)]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-emerald-500/40 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 mb-6"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Comment Ça Marche ?</span>
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              3 Étapes vers <AnimatedGradientText text="le Succès" />
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-1/2 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-[#D69E25]/40 via-emerald-400/40 to-sky-400/40" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, delay: index * 0.2, ease: "easeOut" }}
                    whileHover={{ y: -8 }}
                    className="relative text-center group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="relative w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-300"
                      style={{ boxShadow: `0 0 30px ${step.color}20` }}
                    >
                      <Icon className="w-9 h-9" style={{ color: step.color }} />
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#021231] border-2 flex items-center justify-center text-xs font-black" style={{ borderColor: step.color, color: step.color }}>
                        {index + 1}
                      </div>
                    </motion.div>
                    <h3 className="text-lg font-black mb-3">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section className="py-24 bg-[#021231] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-emerald-500/40 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 mb-6"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pourquoi Choisir FORTIA HUB ?</span>
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Des Avantages <AnimatedGradientText text="Concrets" />
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-emerald-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mb-4 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-1.5">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== TEMOIGNAGES SECTION ==================== */}
      <section className="py-24 bg-gradient-to-b from-[#021231] via-[#011D46]/50 to-[#021231] relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#D69E25]/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] mb-6"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Témoignages</span>
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Ils Nous Font <AnimatedGradientText text="Confiance" />
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-[#D69E25]/40 hover:shadow-[0_0_40px_rgba(214,158,37,0.1)] transition-all duration-300"
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <Star className="w-4 h-4 fill-[#D69E25] text-[#D69E25] drop-shadow-[0_0_5px_rgba(214,158,37,0.5)]" />
                      </motion.span>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D69E25]/10 border border-[#D69E25]/30 text-[#D69E25]">
                    {testimonial.highlight}
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-6">“{testimonial.content}”</p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#D69E25]/40 group-hover:scale-110 transition-transform duration-300"
                  />
                  <div>
                    <div className="text-sm font-black text-white">{testimonial.name}</div>
                    <div className="text-[11px] text-[#D69E25] font-semibold">{testimonial.role}</div>
                  </div>
                  <BadgeCheck className="w-5 h-5 ml-auto text-emerald-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D69E25]/10 via-transparent to-emerald-500/10" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D69E25]/5 blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#D69E25]/10 border border-[#D69E25]/40 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] backdrop-blur-xl"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Commencez Votre Aventure Aujourd'hui</span>
            </motion.div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Prêt à <AnimatedGradientText text="Apprendre" />, <span className="text-emerald-400">Créer</span> & <span className="text-sky-400">Réussir</span> ?
            </h2>

            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              Rejoignez des milliers d'étudiants, freelances et entrepreneurs qui transforment leur avenir avec FORTIA HUB.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <button
                onClick={handleOpenVendorCreation}
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-sm uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-[#D69E25]/40 overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
                Créer un Compte Gratuit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleExploreMarketplace}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/20 text-slate-200 hover:bg-white/10 hover:text-[#D69E25] hover:border-[#D69E25]/40 font-bold text-sm uppercase tracking-wider transition-all duration-300 active:scale-95"
              >
                Explorer la Marketplace
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 text-xs text-slate-400"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Accès instantané
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-[#D69E25]" />
                Certificats officiels
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-sky-400" />
                Support 7J/7
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-[#010d24] border-t-2 border-[#D69E25]/30 pt-16 pb-28 md:pb-16 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#D69E25]/5 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="space-y-4">
              <Logo variant="light" size="lg" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {siteContent?.footerAboutText ||
                  "FORTIA HUB est l'écosystème web de référence dédié à la formation certifiante, la vente de produits digitaux et la mise en relation avec des experts qualifiés."}
              </p>
              <div className="flex gap-2 text-[11px] font-bold text-slate-500">
                <span className="text-[#D69E25]">LEARN.</span>
                <span className="text-emerald-400">BUILD.</span>
                <span className="text-sky-400">SUCCEED.</span>
              </div>
            </div>

            {/* Navigations */}
            <div>
              <h3 className="text-sm font-black text-white mb-4">Liens Rapides</h3>
              <ul className="space-y-2.5">
                {[
                  { label: "Académie", action: () => handleExploreAcademy() },
                  { label: "Marketplace", action: () => handleExploreMarketplace() },
                  { label: "Services Experts", action: () => handleExploreServices() },
                  { label: "Blog & Actualités", action: () => setActiveTab("blog") },
                  { label: "Vérifier une Attestation", action: () => setActiveTab("verifier") },
                ].map((link, i) => (
                  <li key={link.label}>
                    <motion.button
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      onClick={link.action}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#D69E25] transition-colors font-medium"
                    >
                      <ChevronRight className="w-3 h-3 text-[#D69E25]" />
                      {link.label}
                    </motion.button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-black text-white mb-4">Contact</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <Mail className="w-4 h-4 text-[#D69E25] group-hover:scale-110 transition-transform" />
                  {siteContent?.contactEmail || "contact@fortia-hub.com"}
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <Phone className="w-4 h-4 text-[#D69E25] group-hover:scale-110 transition-transform" />
                  {siteContent?.contactPhone || "+228 90 88 99 00"}
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <Clock className="w-4 h-4 text-[#D69E25] group-hover:scale-110 transition-transform" />
                  {siteContent?.supportHours || "7J/7 • 08h00 - 22h00 GMT"}
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <MapPin className="w-4 h-4 text-[#D69E25] group-hover:scale-110 transition-transform" />
                  Lomé, Togo • Afrique de l'Ouest
                </li>
              </ul>
            </div>

            {/* Sécurité */}
            <div>
              <h3 className="text-sm font-black text-white mb-4">Sécurité & Paiements</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <Lock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  Authentification sécurisée
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  KYC & vérification d'identité
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <CreditCard className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  Mobile Money, Crypto, Cartes
                </li>
                <li className="flex items-center gap-3 text-xs text-slate-400 group">
                  <Award className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  Certificats avec QR Code
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[11px] text-slate-500 font-semibold">
              © {new Date().getFullYear()} FORTIA HUB — Tous droits réservés.
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold">
              <button onClick={() => setActiveTab("about")} className="hover:text-[#D69E25] transition-colors">
                À Propos
              </button>
              <span className="text-slate-700">•</span>
              <button onClick={() => setActiveTab("enterprises")} className="hover:text-[#D69E25] transition-colors">
                Entreprises
              </button>
              <span className="text-slate-700">•</span>
              <button onClick={() => setActiveTab("ai-assistant")} className="hover:text-[#D69E25] transition-colors">
                Assistance
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}