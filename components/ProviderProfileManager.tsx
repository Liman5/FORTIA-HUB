"use client";

import React, { useState } from "react";
import {
  FreelanceProfile,
  EnterpriseProfile,
  UserProfile,
} from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { CountrySelect } from "@/components/CountrySelect";
import { SuccessConfirmationModal } from "./SuccessConfirmationModal";
import {
  User,
  Building2,
  Briefcase,
  Save,
  CheckCircle2,
  MapPin,
  DollarSign,
  Mail,
  Phone,
  X,
  Plus,
  Trash2,
  Copy,
  ShieldCheck,
  Star,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ProviderProfileManagerProps {
  user: UserProfile;
  freelance?: FreelanceProfile | null;
  enterprise?: EnterpriseProfile | null;
  onSaved?: () => void;
}

export const ProviderProfileManager: React.FC<ProviderProfileManagerProps> = ({
  user,
  freelance,
  enterprise,
  onSaved,
}) => {
  const isFreelance = !!freelance;
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ===== État FREELANCE =====
  const [frTitle, setFrTitle] = useState(freelance?.title || "");
  const [frBio, setFrBio] = useState(freelance?.bio || "");
  const [frCategory, setFrCategory] = useState(freelance?.category || "");
  const [frHourlyRate, setFrHourlyRate] = useState(Number(freelance?.hourlyRate) || 0);
  const [frLocation, setFrLocation] = useState(freelance?.location || "");
  const [frSkills, setFrSkills] = useState<string[]>(freelance?.skills || []);
  const [frSkillInput, setFrSkillInput] = useState("");
  // Services éditables : type souple pour permettre ajout/modification avant sauvegarde
  const [frServices, setFrServices] = useState<any[]>(
    (freelance?.services || []).map((s) => ({ ...s }))
  );
  const [frServiceForm, setFrServiceForm] = useState({
    title: "",
    category: "",
    description: "",
    startingPrice: 0,
    deliveryDays: 3,
  });

  // ===== État ENTREPRISE =====
  const [enCompanyName, setEnCompanyName] = useState(enterprise?.companyName || "");
  const [enTagline, setEnTagline] = useState(enterprise?.tagline || "");
  const [enDescription, setEnDescription] = useState(enterprise?.description || "");
  const [enLogo, setEnLogo] = useState(enterprise?.logo || "");
  const [enSector, setEnSector] = useState(enterprise?.sector || "");
  const [enCountry, setEnCountry] = useState(enterprise?.country || "");
  const [enContactEmail, setEnContactEmail] = useState(enterprise?.contactEmail || user.email || "");
  const [enContactPhone, setEnContactPhone] = useState(enterprise?.contactPhone || user.phone || "");
  const [enWebsite, setEnWebsite] = useState(enterprise?.website || "");
  const [enServices, setEnServices] = useState<any[]>(
    (enterprise?.offeredServices || []).map((s) => ({ ...s }))
  );
  const [enServiceForm, setEnServiceForm] = useState({
    title: "",
    description: "",
    startingPrice: 0,
  });

  const addFrSkill = () => {
    const s = frSkillInput.trim();
    if (s && !frSkills.includes(s)) setFrSkills([...frSkills, s]);
    setFrSkillInput("");
  };

  const copyInfo = () => {
    if (isFreelance) {
      navigator.clipboard.writeText(
        `Nom : ${freelance?.name || user.name}\nTitre : ${frTitle}\nVille : ${frLocation}\nTaux : ${frHourlyRate}$/h\nEmail : ${user.email}\nTéléphone : ${user.phone}`
      );
    } else {
      navigator.clipboard.writeText(
        `Entreprise : ${enCompanyName}\nSecteur : ${enSector}\nPays : ${enCountry}\nEmail : ${enContactEmail}\nTéléphone : ${enContactPhone}\nSite : ${enWebsite}`
      );
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const res = isFreelance
      ? await apiWritePlatform("update-freelance-profile", {
          userId: user.id,
          name: freelance?.name || user.name,
          title: frTitle,
          bio: frBio,
          // La photo de profil du compte (users.avatar, enregistrée dans Supabase)
          // est utilisée automatiquement comme photo du profil freelance.
          avatar: user.avatar || freelance?.avatar || "",
          category: frCategory,
          hourlyRate: frHourlyRate,
          skills: frSkills,
          location: frLocation,
          services: frServices,
        })
      : await apiWritePlatform("update-enterprise-profile", {
          userId: user.id,
          companyName: enCompanyName,
          tagline: enTagline,
          description: enDescription,
          logo: enLogo,
          sector: enSector,
          country: enCountry,
          contactEmail: enContactEmail,
          contactPhone: enContactPhone,
          website: enWebsite,
          services: enServices,
        });

    if (!res.success) {
      setSaveError(
        "Impossible d'enregistrer vos informations dans la base de données. " +
          (res.error ? `Détail : ${res.error}` : "Vérifiez votre connexion et réessayez.")
      );
      return;
    }

    setSaved(true);
    setShowSuccess(true);
    onSaved?.();
    setTimeout(() => setSaved(false), 3000);
  };

  const contactInfo = isFreelance
    ? [
        { icon: Mail, label: "Email", value: user.email },
        { icon: Phone, label: "Téléphone / WhatsApp", value: user.phone || "Non renseigné" },
        { icon: MapPin, label: "Localisation", value: frLocation || "Non renseignée" },
      ]
    : [
        { icon: Mail, label: "Email", value: enContactEmail },
        { icon: Phone, label: "Téléphone / WhatsApp", value: enContactPhone || "Non renseigné" },
        { icon: MapPin, label: "Pays", value: enCountry || "Non renseigné" },
      ];

  return (
    <div className="space-y-8">
      {/* Bannière visibilité */}
      <div className="bg-[#011D46] border border-[#D69E25]/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D69E25]/15 text-[#D69E25] flex items-center justify-center shrink-0">
            {isFreelance ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-black text-white">
              {isFreelance ? "Votre profil est visible dans l'annuaire Freelances" : "Votre profil est visible dans le répertoire Entreprises"}
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-1 max-w-xl">
              La plateforme FORTIA HUB vous offre une <strong>visibilité sur vos compétences</strong>. Les clients intéressés
              vous contactent directement via vos coordonnées ci-dessous. Les échanges et paiements de prestations se font
              <strong> hors plateforme</strong> — FORTIA HUB n'étant pas responsable de ces transactions.
            </p>
          </div>
        </div>
        <button
          onClick={copyInfo}
          className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center gap-2 shrink-0"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? "Copié ✓" : "Copier mes coordonnées"}</span>
        </button>
      </div>

      {/* Coordonnées publiques (contact direct) */}
      <div className="bg-[#011D46] rounded-2xl border border-slate-700 p-5 space-y-4">
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#D69E25]" />
          <span>Coordonnées affichées aux clients intéressés</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {contactInfo.map((info, i) => {
            const Icon = info.icon;
            return (
              <div key={i} className="bg-[#021231] border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Icon className="w-4 h-4 text-[#D69E25]" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400">{info.label}</p>
                  <p className="text-xs font-bold text-white truncate">{info.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-8">
        {/* ============ GESTION DU PROFIL ============ */}
        <div className="bg-[#011D46] rounded-2xl border border-slate-700 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
            {isFreelance ? (
              <User className="w-5 h-5 text-[#D69E25]" />
            ) : (
              <Building2 className="w-5 h-5 text-[#D69E25]" />
            )}
            <h3 className="text-sm font-black text-white">
              {isFreelance ? "Mon Profil Freelance" : "Mon Profil Entreprise"}
            </h3>
            {isFreelance
              ? freelance && <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-full">Badge Vert Vérifié</span>
              : enterprise && <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-1 rounded-full">Badge Doré Certifié</span>}
          </div>

          {isFreelance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom affiché *</label>
                <input
                  type="text"
                  value={freelance?.name || user.name}
                  disabled
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white/70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Titre professionnel *</label>
                <input
                  type="text"
                  value={frTitle}
                  onChange={(e) => setFrTitle(e.target.value)}
                  placeholder="Ex: Développeur React & ChatGPT"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Catégorie</label>
                <select
                  value={frCategory}
                  onChange={(e) => setFrCategory(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  <option value="">Choisir...</option>
                  <option value="IA & Automatisation">IA & Automatisation</option>
                  <option value="Développement Web">Développement Web</option>
                  <option value="Développement Mobile">Développement Mobile</option>
                  <option value="UI/UX & Infographie">UI/UX & Infographie</option>
                  <option value="Montage vidéo">Montage Vidéo</option>
                  <option value="Branding">Branding & Design</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Taux horaire (USD/h)</label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#D69E25]" />
                  <input
                    type="number"
                    min="0"
                    value={frHourlyRate}
                    onChange={(e) => setFrHourlyRate(Number(e.target.value))}
                    className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Localisation / Ville</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D69E25]" />
                  <input
                    type="text"
                    value={frLocation}
                    onChange={(e) => setFrLocation(e.target.value)}
                    placeholder="Ex: Dakar, Sénégal"
                    className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Biographie / Présentation *</label>
                <textarea
                  rows={4}
                  value={frBio}
                  onChange={(e) => setFrBio(e.target.value)}
                  placeholder="Décrivez votre expertise, vos réalisations, vos spécialités..."
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              {/* Compétences */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">Compétences (React, ChatGPT, Figma...)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frSkillInput}
                    onChange={(e) => setFrSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFrSkill(); } }}
                    placeholder="Ex: React"
                    className="flex-1 bg-[#021231] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                  <button
                    type="button"
                    onClick={addFrSkill}
                    className="px-3 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-600 transition"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {frSkills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] text-[11px] font-semibold px-3 py-1.5 rounded-lg">
                      {s}
                      <button type="button" onClick={() => setFrSkills(frSkills.filter((_, idx) => idx !== i))} className="text-[#D69E25]/60 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Raison sociale *</label>
                <input
                  type="text"
                  value={enCompanyName}
                  onChange={(e) => setEnCompanyName(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  value={enTagline}
                  onChange={(e) => setEnTagline(e.target.value)}
                  placeholder="Ex: Solutions digitales de haut niveau"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Secteur d'activité</label>
                <select
                  value={enSector}
                  onChange={(e) => setEnSector(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  <option value="">Choisir...</option>
                  <option value="Agence Digitale">Agence Digitale</option>
                  <option value="Développement & IT">Développement & IT</option>
                  <option value="Design & Branding">Design & Branding</option>
                  <option value="Marketing & Communication">Marketing & Communication</option>
                  <option value="Conseil & Stratégie">Conseil & Stratégie</option>
                  <option value="Finance & Comptabilité">Finance & Comptabilité</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Pays</label>
                <CountrySelect
                  value={enCountry}
                  onChange={setEnCountry}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Logo (URL)</label>
                <input
                  type="text"
                  value={enLogo}
                  onChange={(e) => setEnLogo(e.target.value)}
                  placeholder="https://... (logo)"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Site web</label>
                <input
                  type="text"
                  value={enWebsite}
                  onChange={(e) => setEnWebsite(e.target.value)}
                  placeholder="https://mon-site.com"
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Email de contact *</label>
                <input
                  type="email"
                  value={enContactEmail}
                  onChange={(e) => setEnContactEmail(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Téléphone / WhatsApp</label>
                <input
                  type="tel"
                  value={enContactPhone}
                  onChange={(e) => setEnContactPhone(e.target.value)}
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Présentation de l'entreprise *</label>
                <textarea
                  rows={4}
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder="Décrivez votre entreprise, vos domaines d'expertise, vos références..."
                  className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ============ GESTION DES SERVICES / PRESTATIONS ============ */}
        <div className="bg-[#011D46] rounded-2xl border border-slate-700 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
            <Briefcase className="w-5 h-5 text-[#D69E25]" />
            <h3 className="text-sm font-black text-white">
              {isFreelance ? "Mes Prestations & Services" : "Services Institutionnels"}
            </h3>
            <span className="ml-auto text-[11px] text-slate-400">{isFreelance ? frServices.length : enServices.length} service(s)</span>
          </div>

          {/* Ajout d'un service */}
          <div className="bg-[#021231] border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-slate-400">➕ Ajouter un service / prestation</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Titre du service *"
                value={isFreelance ? frServiceForm.title : enServiceForm.title}
                onChange={(e) => isFreelance
                  ? setFrServiceForm({ ...frServiceForm, title: e.target.value })
                  : setEnServiceForm({ ...enServiceForm, title: e.target.value })}
                className="bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Prix départ $ *"
                  value={isFreelance ? frServiceForm.startingPrice || "" : enServiceForm.startingPrice || ""}
                  onChange={(e) => isFreelance
                    ? setFrServiceForm({ ...frServiceForm, startingPrice: Number(e.target.value) })
                    : setEnServiceForm({ ...enServiceForm, startingPrice: Number(e.target.value) })}
                  className="flex-1 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white"
                />
                {isFreelance && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Délai jrs"
                    value={frServiceForm.deliveryDays || ""}
                    onChange={(e) => setFrServiceForm({ ...frServiceForm, deliveryDays: Number(e.target.value) })}
                    className="w-24 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white"
                  />
                )}
              </div>
              {isFreelance && (
                <select
                  value={frServiceForm.category}
                  onChange={(e) => setFrServiceForm({ ...frServiceForm, category: e.target.value })}
                  className="bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white"
                >
                  <option value="">Catégorie...</option>
                  <option value="IA & Automatisation">IA & Automatisation</option>
                  <option value="Développement Web">Développement Web</option>
                  <option value="Développement Mobile">Développement Mobile</option>
                  <option value="UI/UX & Infographie">UI/UX & Infographie</option>
                  <option value="Montage vidéo">Montage Vidéo</option>
                  <option value="Branding">Branding & Design</option>
                </select>
              )}
              <input
                type="text"
                placeholder="Description courte *"
                value={isFreelance ? frServiceForm.description : enServiceForm.description}
                onChange={(e) => isFreelance
                  ? setFrServiceForm({ ...frServiceForm, description: e.target.value })
                  : setEnServiceForm({ ...enServiceForm, description: e.target.value })}
                className="bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (isFreelance) {
                  if (!frServiceForm.title.trim()) return;
                  setFrServices([...frServices, { ...frServiceForm }]);
                  setFrServiceForm({ title: "", category: "", description: "", startingPrice: 0, deliveryDays: 3 });
                } else {
                  if (!enServiceForm.title.trim()) return;
                  setEnServices([...enServices, { ...enServiceForm }]);
                  setEnServiceForm({ title: "", description: "", startingPrice: 0 });
                }
              }}
              className="px-4 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter le service
            </button>
          </div>

          {/* Liste des services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(isFreelance ? frServices : enServices).map((svc: any, idx) => (
              <div key={idx} className="bg-[#021231] border border-slate-800 rounded-xl p-4 space-y-2 relative">
                <button
                  type="button"
                  onClick={() => isFreelance
                    ? setFrServices(frServices.filter((_, i) => i !== idx))
                    : setEnServices(enServices.filter((_, i) => i !== idx))}
                  className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="font-bold text-sm text-white pr-6">{svc.title}</p>
                {svc.description && <p className="text-[11px] text-slate-400 leading-relaxed">{svc.description}</p>}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D69E25] font-black">
                    À partir de {Number(svc.startingPrice) || 0}$
                  </span>
                  {isFreelance && svc.deliveryDays && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {svc.deliveryDays} jours
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message d'erreur de sauvegarde */}
        {saveError && (
          <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/40 text-red-300 text-xs rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Bouton de sauvegarde */}
        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-sm rounded-xl shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Profil enregistré et synchronisé avec succès !</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Enregistrer mon profil et mes services</span>
            </>
          )}
        </button>
      </form>

      {/* Popup de confirmation d'enregistrement */}
      <SuccessConfirmationModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title={isFreelance ? "Profil freelance enregistré !" : "Profil entreprise enregistré !"}
        message={
          isFreelance
            ? "Vos informations professionnelles ont été enregistrées et sont visibles dans l'annuaire Freelances. Votre photo de profil du compte est utilisée automatiquement."
            : "Les informations de votre entreprise ont été enregistrées et sont visibles dans le répertoire Entreprises."
        }
      />
    </div>
  );
};