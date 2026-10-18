import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light';
  size?: 'sm' | 'md' | 'lg';
  /** Texte affiché sous la marque (par défaut : LEARN. BUILD. SUCCEED.) */
  tagline?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'full',
  size = 'md',
  tagline = 'LEARN. BUILD. SUCCEED.'
}) => {
  const heightMap = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-11'
  };

  const mainColor = '#FFFFFF';

  return (
    <div className={`fortia-logo-container flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-xl transition-colors ${className}`}>
      {/* Emblème FORTIA HUB.
          ⚡ Poids : on affiche l'icône 96×96 (8,7 Ko) au lieu de la 192×192
          (29,9 Ko, jamais affichée à plus de 44 px → 3× de densité suffisent).
          Les fichiers lourds (192/384/512, maskable) restent inchangés : ils
          sont exigés par le manifeste PWA et les notifications système. */}
      <img
        src="/pwa-96x96.png"
        alt="FORTIA HUB"
        width={96}
        height={96}
        className={`${heightMap[size]} w-auto shrink-0 rounded-lg object-contain`}
      />

      {/* Brand Typography FORTIA HUB - Protected from light mode */}
      {variant !== 'compact' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 leading-none">
            <span className="fortia-logo-text font-black tracking-tight text-base md:text-lg">
              FORTIA
            </span>
            <span className="font-black tracking-tight text-base md:text-lg text-[#D69E25]" style={{ color: '#D69E25' }}>
              HUB
            </span>
          </div>
          <div className="fortia-logo-sub flex items-center gap-1 text-[8px] md:text-[8.5px] font-bold tracking-widest mt-0.5 uppercase">
            <span className="w-2 h-[1px] bg-[#D69E25]" style={{ backgroundColor: '#D69E25' }} />
            <span>{tagline}</span>
            <span className="w-2 h-[1px] bg-[#D69E25]" style={{ backgroundColor: '#D69E25' }} />
          </div>
        </div>
      )}
    </div>
  );
};