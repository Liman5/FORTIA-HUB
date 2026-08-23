import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'full',
  size = 'md'
}) => {
  const heightMap = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-11'
  };

  const mainColor = '#FFFFFF';

  return (
    <div className={`fortia-logo-container flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-xl transition-colors ${className}`}>
      {/* SVG Emblem for FORTIA HUB */}
      <svg 
        viewBox="0 0 200 200" 
        className={`${heightMap[size]} w-auto shrink-0`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F6E05E" />
            <stop offset="40%" stopColor="#D69E25" />
            <stop offset="100%" stopColor="#AB6F10" />
          </linearGradient>
        </defs>

        {/* Mortarboard Cap Roof */}
        <path 
          d="M 100 12 L 184 40 L 100 68 L 16 40 Z" 
          fill={mainColor}
          stroke="#011D46"
          strokeWidth="1.5"
        />
        {/* Cap Bottom Rim */}
        <path 
          d="M 52 48 L 52 68 C 52 82 148 82 148 68 L 148 48" 
          fill={mainColor}
          opacity="0.9"
        />

        {/* Gold Arch under Cap */}
        <path 
          d="M 44 62 C 80 46 120 46 156 62 C 148 72 80 72 44 62 Z" 
          fill="url(#goldGradient)"
        />

        {/* Gold Tassel */}
        <path 
          d="M 28 42 L 28 72" 
          stroke="url(#goldGradient)" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />
        <path 
          d="M 28 72 L 23 88 L 33 88 Z" 
          fill="url(#goldGradient)"
        />
        <circle cx="28" cy="90" r="3.5" fill="#D69E25" />

        {/* Monogram 'FH' */}
        <rect x="42" y="80" width="24" height="106" rx="2" fill={mainColor} />
        <rect x="66" y="80" width="38" height="20" rx="1" fill={mainColor} />
        <rect x="66" y="118" width="28" height="18" rx="1" fill={mainColor} />

        <rect x="106" y="80" width="22" height="106" rx="2" fill={mainColor} />
        <rect x="128" y="118" width="24" height="18" fill={mainColor} />
        <rect x="152" y="80" width="22" height="106" rx="2" fill={mainColor} />

        {/* Sweeping Gold Ribbon across FH */}
        <path 
          d="M 70 188 C 102 152 142 120 192 110 C 166 130 120 160 88 188 Z" 
          fill="url(#goldGradient)"
        />
      </svg>

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
            <span>LEARN. BUILD. SUCCEED.</span>
            <span className="w-2 h-[1px] bg-[#D69E25]" style={{ backgroundColor: '#D69E25' }} />
          </div>
        </div>
      )}
    </div>
  );
};