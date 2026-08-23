import React from 'react';
import { Logo } from './Logo';
import { 
  Target, 
  Compass, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Palette, 
  Layers, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface BrandIdentityViewProps {
  setActiveTab: (tab: string) => void;
}

export const BrandIdentityView: React.FC<BrandIdentityViewProps> = ({ setActiveTab }) => {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header Hero */}
        <div className="bg-[#021231] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-[#D69E25]/40 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-[#D69E25]/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D69E25]/20 text-[#D69E25] border border-[#D69E25]/40 text-xs font-bold uppercase tracking-wider">
              <span>Présentation Officielle</span>
            </div>
            
            <div className="py-2">
              <Logo variant="light" size="lg" />
            </div>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              FORTIA HUB est l'écosystème d'excellence dédié à la formation professionnelle, au design numérique, aux services freelances vérifiés et au développement des entreprises d'élite en Afrique et dans le monde.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => setActiveTab('courses')}
                className="px-6 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-bold text-sm hover:bg-amber-400 transition flex items-center gap-2 shadow-lg"
              >
                <span>Découvrir nos Formations</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('freelance')}
                className="px-6 py-3 rounded-xl bg-[#011D46] text-white border border-[#D69E25]/40 font-semibold text-sm hover:bg-[#021231] transition"
              >
                Explorer la Marketplace
              </button>
            </div>
          </div>
        </div>

        {/* Vision, Mission, Objectifs, Valeurs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vision */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#021231]">Notre Vision</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Devenir la plateforme africaine de référence globale interconnectant les compétences du Web3, de l'IA, du design et du digital avec les opportunités du marché mondial.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#021231]">Notre Mission</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Démocratiser l'apprentissage des technologies d'avenir, certifier des compétences réelles et offrir un cadre commercial sécurisé aux freelances et entreprises.
            </p>
          </div>

          {/* Objectifs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#021231]">Nos Objectifs</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Former plus de 100 000 professionnels d'ici 2028, propulser des milliers de créatifs indépendants et garantir une confiance totale via nos badges de vérification KYC.
            </p>
          </div>

          {/* Valeurs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#021231]">Nos Valeurs</h3>
            <ul className="text-slate-600 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Excellence & Rigueur</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Transparence & Sécurité</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Innovation Continue</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Impact Communautaire</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Charte Graphique & Identité de la marque */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <Palette className="w-8 h-8 text-[#D69E25]" />
            <div>
              <h2 className="text-2xl font-black text-[#021231]">Charte Graphique & Logo Officiel</h2>
              <p className="text-slate-500 text-sm">Normes visuelles et identité graphique de la marque FORTIA HUB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Logo showcase */}
            <div className="bg-[#021231] rounded-2xl p-8 border border-[#D69E25]/30 space-y-6 text-center">
              <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Aperçu du Logo Officiel</span>
              <div className="flex justify-center py-4">
                <Logo variant="light" size="lg" />
              </div>
              <p className="text-xs text-slate-300">
                Le logo combine l'emblème héraldique du lion royal et du bouclier (symbole de force et de sécurité) habillé d'un dégradé or d'exception <span className="text-[#D69E25] font-semibold">#D69E25</span> sur fond bleu nuit <span className="text-blue-300 font-semibold">#021231</span>.
              </p>
            </div>

            {/* Colors Palette */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#021231] flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>Palette de Couleurs Officielles</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-[#021231] shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Bleu Nuit Institutionnel</div>
                    <div className="text-slate-500">HEX: #021231</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-[#D69E25] shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Or Imperial Fortia</div>
                    <div className="text-slate-500">HEX: #D69E25</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-[#011D46] shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Bleu Saphir Subordonné</div>
                    <div className="text-slate-500">HEX: #011D46</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-[#10B981] shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Vert Badge Freelance</div>
                    <div className="text-slate-500">HEX: #10B981</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-[#F59E0B] shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Or Badge Entreprise</div>
                    <div className="text-slate-500">HEX: #F59E0B</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-slate-100 shadow-md border border-slate-200" />
                  <div className="text-xs">
                    <div className="font-bold text-[#021231]">Blanc Épuré Canvas</div>
                    <div className="text-slate-500">HEX: #F8FAFC</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
