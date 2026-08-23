import React, { useState } from "react";
import {
  ServicePackage,
  ServiceCardBorderStyle,
  ServiceCardAnimation,
} from "../lib/types";
import {
  Plus,
  Trash2,
  Edit,
  Check,
  Eye,
  Palette,
  Sparkles,
  X,
  Save,
  Briefcase,
  Clock,
  DollarSign,
} from "lucide-react";

interface AdminServicesPanelProps {
  services: ServicePackage[];
  serviceQuotes?: any[];
  onAddService: (service: ServicePackage) => void;
  onUpdateService: (service: ServicePackage) => void;
  onDeleteService: (id: string) => void;
  onToggleServiceActive: (id: string) => void;
}

const ICON_OPTIONS = [
  { value: "Briefcase", label: "Briefcase" },
  { value: "Palette", label: "Palette" },
  { value: "Image", label: "Image" },
  { value: "FileText", label: "FileText" },
  { value: "Video", label: "Video" },
  { value: "Share2", label: "Share2" },
  { value: "UserCheck", label: "UserCheck" },
];

const BORDER_STYLES: { value: ServiceCardBorderStyle; label: string; classes: string }[] = [
  { value: "gold", label: "Doré", classes: "border-[#D69E25] ring-2 ring-[#D69E25]/40" },
  { value: "emerald", label: "Émeraude", classes: "border-emerald-500 ring-2 ring-emerald-500/40" },
  { value: "blue", label: "Bleu", classes: "border-blue-500 ring-2 ring-blue-500/40" },
  { value: "purple", label: "Violet", classes: "border-purple-500 ring-2 ring-purple-500/40" },
  { value: "rose", label: "Rose", classes: "border-rose-500 ring-2 ring-rose-500/40" },
  { value: "gradient", label: "Dégradé", classes: "border-transparent bg-gradient-to-br from-[#D69E25]/20 via-amber-100 to-emerald-100" },
  { value: "double", label: "Double", classes: "border-2 border-double border-slate-300" },
  { value: "none", label: "Aucune", classes: "border-slate-200" },
];

const ANIMATIONS: { value: ServiceCardAnimation; label: string }[] = [
  { value: "none", label: "Aucune" },
  { value: "fade-up", label: "Apparition douce" },
  { value: "zoom-in", label: "Zoom avant" },
  { value: "flip", label: "Rotation 3D" },
  { value: "slide-in", label: "Glissement" },
  { value: "pulse", label: "Pulsation" },
];

export const AdminServicesPanel: React.FC<AdminServicesPanelProps> = ({
  services = [],
  serviceQuotes = [],
  onAddService,
  onUpdateService,
  onDeleteService,
  onToggleServiceActive,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<ServicePackage>({
    id: "",
    title: "",
    category: "Design & Graphisme",
    description: "",
    startingPrice: 50,
    estimatedDays: "3 jours",
    iconName: "Briefcase",
    deliverables: [],
    options: [],
    borderStyle: "gold",
    cardAnimation: "fade-up",
    accentColor: "#D69E25",
    badgeText: "",
    featured: false,
    isActive: true,
  });

  const [deliverableInput, setDeliverableInput] = useState("");
  const [optionInput, setOptionInput] = useState({ name: "", price: 0 });

  const resetForm = () => {
    setForm({
      id: "",
      title: "",
      category: "Design & Graphisme",
      description: "",
      startingPrice: 50,
      estimatedDays: "3 jours",
      iconName: "Briefcase",
      deliverables: [],
      options: [],
      borderStyle: "gold",
      cardAnimation: "fade-up",
      accentColor: "#D69E25",
      badgeText: "",
      featured: false,
      isActive: true,
    });
    setDeliverableInput("");
    setOptionInput({ name: "", price: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (serv: ServicePackage) => {
    setEditingId(serv.id);
    setForm({
      ...serv,
      deliverables: serv.deliverables || [],
      options: serv.options || [],
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("Veuillez saisir un titre de service.");
      return;
    }

    const newId = editingId ? editingId : "serv-" + Date.now();
    const serviceToSave: ServicePackage = {
      ...form,
      id: newId,
      options: form.options || [],
    };

    if (editingId) {
      onUpdateService(serviceToSave);
    } else {
      onAddService(serviceToSave);
    }
    resetForm();
  };

  const addDeliverable = () => {
    if (!deliverableInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      deliverables: [...(prev.deliverables || []), deliverableInput.trim()],
    }));
    setDeliverableInput("");
  };

  const removeDeliverable = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      deliverables: (prev.deliverables || []).filter((_, i) => i !== idx),
    }));
  };

  const addOption = () => {
    if (!optionInput.name.trim() || optionInput.price <= 0) return;
    setForm((prev) => ({
      ...prev,
      options: [
        ...(prev.options || []),
        { name: optionInput.name.trim(), price: Number(optionInput.price) },
      ],
    }));
    setOptionInput({ name: "", price: 0 });
  };

  const removeOption = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== idx),
    }));
  };

  const getBorderClasses = (style?: ServiceCardBorderStyle) => {
    const found = BORDER_STYLES.find((b) => b.value === style);
    return found ? found.classes : "border-slate-200";
  };

  const getAnimationClass = (anim?: ServiceCardAnimation) => {
    switch (anim) {
      case "fade-up": return "hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl";
      case "zoom-in": return "hover:scale-105 transition-transform duration-300";
      case "flip": return "hover:rotate-1 hover:scale-[1.02] transition-all duration-300";
      case "slide-in": return "hover:translate-x-2 transition-transform duration-300";
      case "pulse": return "hover:animate-pulse transition-all duration-300";
      default: return "transition-all duration-300 hover:shadow-xl";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#021231] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm flex items-center gap-2">
              <span>Gestion des Services Agence</span>
              <span className="bg-amber-500/20 text-[#D69E25] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/40">
                {services.length} publiés
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajoutez, modifiez et personnalisez les cartes de services visibles sur la page Services.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Service</span>
          </button>
        )}
        {showForm && (
          <button
            onClick={resetForm}
            className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Annuler</span>
          </button>
        )}
      </div>

      {/* Formulaire Ajout / Modification */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#011D46] rounded-2xl border border-slate-700 p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <h4 className="text-white font-black text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D69E25]" />
              <span>{editingId ? "Modifier le Service" : "Créer un Nouveau Service"}</span>
            </h4>
            <span className="text-[10px] text-slate-400 bg-[#021231] px-2 py-1 rounded-full border border-slate-700">
              Remplissez le formulaire complet
            </span>
          </div>

          {/* Informations principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Titre du Service *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Conception de Logo Professionnel"
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              >
                <option>Design & Graphisme</option>
                <option>Rédaction & Stratégie</option>
                <option>Branding & Identité</option>
                <option>Développement Web</option>
                <option>Marketing Digital</option>
                <option>Photo & Vidéo</option>
                <option>Conseil & Accompagnement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Icône de la carte
              </label>
              <select
                value={form.iconName}
                onChange={(e) => setForm({ ...form, iconName: e.target.value })}
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Prix Départ ($ USD)
              </label>
              <input
                type="number"
                min="1"
                value={form.startingPrice}
                onChange={(e) => setForm({ ...form, startingPrice: Number(e.target.value) })}
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              />
              <span className="text-[10px] text-amber-400 font-semibold">
                ≈ {(form.startingPrice * 600).toLocaleString()} FCFA
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Délai estimé
              </label>
              <input
                type="text"
                value={form.estimatedDays}
                onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                placeholder="Ex: 3 à 5 jours"
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Description du service
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez ce que le client recevra comme prestation..."
                className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
              />
            </div>
          </div>

          {/* Livrables */}
          <div className="bg-[#021231] p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Livrables inclus
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={deliverableInput}
                onChange={(e) => setDeliverableInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDeliverable();
                  }
                }}
                placeholder="Ex: Logo vectoriel haute résolution"
                className="flex-1 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="px-3 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-600 transition"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.deliverables || []).map((d, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                >
                  <Check className="w-3 h-3" />
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDeliverable(idx)}
                    className="text-emerald-300/60 hover:text-red-400 transition ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Options supplémentaires */}
          <div className="bg-[#021231] p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Options payantes supplémentaires
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={optionInput.name}
                onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                placeholder="Ex: Livraison express 24h"
                className="flex-1 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
              <input
                type="number"
                min="1"
                placeholder="Prix"
                value={optionInput.price || ""}
                onChange={(e) => setOptionInput({ ...optionInput, price: Number(e.target.value) })}
                className="w-24 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-600 transition"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.options || []).map((opt, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                >
                  <DollarSign className="w-3 h-3" />
                  {opt.name} (+${opt.price})
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-[#D69E25]/60 hover:text-red-400 transition ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Personnalisation visuelle */}
          <div className="bg-[#021231] p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#D69E25] flex items-center gap-2 uppercase tracking-wider">
                <Palette className="w-4 h-4" />
                <span>Personnalisation de la carte</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-[#D69E25]"
                  />
                  <span>⭐ Mettre en avant</span>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive ?? true}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-500"
                  />
                  <span>Visible</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Style de bordure
                </label>
                <select
                  value={form.borderStyle || "gold"}
                  onChange={(e) => setForm({ ...form, borderStyle: e.target.value as ServiceCardBorderStyle })}
                  className="w-full bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  {BORDER_STYLES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Animation de la carte
                </label>
                <select
                  value={form.cardAnimation || "fade-up"}
                  onChange={(e) => setForm({ ...form, cardAnimation: e.target.value as ServiceCardAnimation })}
                  className="w-full bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                >
                  {ANIMATIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Couleur d'accent (hex)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.accentColor || "#D69E25"}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <input
                    type="text"
                    value={form.accentColor || "#D69E25"}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="flex-1 bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Badge / Étiquette (optionnel)
              </label>
              <input
                type="text"
                value={form.badgeText || ""}
                onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                placeholder="Ex: Populaire, Best-Seller, Nouveau"
                className="w-full bg-[#011D46] border border-slate-700 text-sm rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D69E25]"
              />
            </div>
          </div>

          {/* Aperçu en temps réel */}
          {form.title && (
            <div className="bg-[#021231] p-5 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-black text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D69E25]" />
                <span>Aperçu en temps réel</span>
              </label>
              <div className={"bg-white rounded-2xl border p-6 shadow-md " + getBorderClasses(form.borderStyle) + " " + getAnimationClass(form.cardAnimation)}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: form.accentColor || "#D69E25", color: "#021231" }}
                    >
                      <Briefcase className="w-6 h-6" />
                    </div>
                    {form.badgeText && (
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                        style={{
                          color: form.accentColor || "#D69E25",
                          borderColor: form.accentColor || "#D69E25",
                          backgroundColor: form.accentColor ? form.accentColor + "22" : "#D69E2522",
                        }}
                      >
                        {form.badgeText}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-[#021231] text-base">{form.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {form.description || "Description du service..."}
                  </p>
                  <div className="pt-2 space-y-1.5 border-t border-slate-100 text-xs text-slate-700">
                    {(form.deliverables || []).slice(0, 3).map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: form.accentColor || "#D69E25" }} />
                        <span className="text-[11px] leading-tight text-slate-600">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">À partir de</span>
                      <span className="text-xl font-black text-[#021231]">${form.startingPrice}</span>
                      <span className="text-[10px] text-slate-400 block">≈ {(form.startingPrice * 600).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5" style={{ color: form.accentColor || "#D69E25" }} />
                      <span>{form.estimatedDays}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-sm rounded-xl shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{editingId ? "Enregistrer les Modifications" : "Publier le Service"}</span>
          </button>
        </form>
      )}

      {/* Liste des services */}
      {!showForm && (
        <div className="bg-[#011D46] rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h4 className="text-white font-black text-sm">
              Services publiés ({services.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-800">
            {services.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Aucun service créé pour le moment. Cliquez sur « Nouveau Service » pour commencer.
              </div>
            )}
            {services.map((serv) => (
              <div key={serv.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div
                  className={"w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md " + (serv.isActive === false ? "opacity-40 grayscale" : "")}
                  style={{
                    backgroundColor: serv.accentColor || "#D69E25",
                    color: "#021231",
                  }}
                >
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-white font-bold text-sm truncate">{serv.title}</h5>
                    {serv.badgeText && (
                      <span className="text-[9px] font-bold text-[#D69E25] bg-amber-500/15 border border-[#D69E25]/40 px-2 py-0.5 rounded-full">
                        {serv.badgeText}
                      </span>
                    )}
                    {serv.featured && (
                      <span className="text-[9px] font-bold text-amber-300 bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        ⭐ En avant
                      </span>
                    )}
                    <span
                      className={"text-[9px] font-bold px-2 py-0.5 rounded-full border " + (serv.isActive === false
                        ? "bg-red-500/10 border-red-500/40 text-red-400"
                        : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400")}
                    >
                      {serv.isActive === false ? "Masqué" : "Visible"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{serv.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-semibold">
                    <span className="text-[#D69E25] font-black">${serv.startingPrice}</span>
                    <span>•</span>
                    <span>{serv.category}</span>
                    <span>•</span>
                    <span>📦 {serv.estimatedDays}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleServiceActive(serv.id)}
                    className={"p-2 rounded-lg transition " + (serv.isActive === false
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                    title={serv.isActive === false ? "Activer" : "Masquer"}
                  >
                    {serv.isActive === false ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(serv)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Supprimer le service \"" + serv.title + "\" ?")) {
                        onDeleteService(serv.id);
                      }
                    }}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section des devis reçus */}
      {serviceQuotes.length > 0 && (
        <div className="bg-[#011D46] rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h4 className="text-white font-black text-sm">
              Devis reçus ({serviceQuotes.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {serviceQuotes.map((q: any) => (
              <div key={q.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm">{q.serviceTitle}</span>
                  <span className="text-[#D69E25] font-black text-sm">${q.estimatedPrice}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">{q.clientName}</strong> • {q.clientEmail}
                </p>
                {q.details && (
                  <p className="text-[11px] text-slate-500 bg-[#021231] border border-slate-800 rounded-lg p-2">
                    {q.details}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">{q.date}</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    {q.status || "Reçu"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};