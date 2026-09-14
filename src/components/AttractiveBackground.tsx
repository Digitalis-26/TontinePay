import React, { useState } from 'react';
import { Palette, Check, Sparkles, Sun, Moon } from 'lucide-react';

export type BackgroundTheme = 'emerald' | 'ocean' | 'ivory' | 'night';

export interface ThemeConfig {
  id: BackgroundTheme;
  name: string;
  tagline: string;
  gradientBadge: string;
  dotColor: string;
  glow1: string;
  glow2: string;
  glow3: string;
  baseBg: string;
  isDark: boolean;
}

export const THEMES: Record<BackgroundTheme, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Émeraude & Or',
    tagline: 'Prestige & Prospérité Africaine',
    gradientBadge: 'from-emerald-600 to-amber-500',
    dotColor: 'rgba(5, 150, 105, 0.12)',
    glow1: 'rgba(16, 185, 129, 0.18)',
    glow2: 'rgba(245, 158, 11, 0.13)',
    glow3: 'rgba(20, 184, 166, 0.14)',
    baseBg: '#f7faf8',
    isDark: false,
  },
  ocean: {
    id: 'ocean',
    name: 'Lagon Turquoise',
    tagline: 'Fluidité & Innovation Digitale',
    gradientBadge: 'from-teal-500 to-cyan-500',
    dotColor: 'rgba(14, 165, 233, 0.12)',
    glow1: 'rgba(6, 182, 212, 0.18)',
    glow2: 'rgba(59, 130, 246, 0.13)',
    glow3: 'rgba(16, 185, 129, 0.12)',
    baseBg: '#f3f8fb',
    isDark: false,
  },
  ivory: {
    id: 'ivory',
    name: 'Nacre & Sable Doré',
    tagline: 'Élégance Épurée & Clarté',
    gradientBadge: 'from-amber-400 to-stone-400',
    dotColor: 'rgba(120, 113, 108, 0.11)',
    glow1: 'rgba(217, 119, 6, 0.10)',
    glow2: 'rgba(16, 185, 129, 0.08)',
    glow3: 'rgba(148, 163, 184, 0.08)',
    baseBg: '#faf8f5',
    isDark: false,
  },
  night: {
    id: 'night',
    name: 'Obsidienne Royale',
    tagline: 'Contraste Sombre & Néon Émeraude',
    gradientBadge: 'from-slate-900 to-emerald-900',
    dotColor: 'rgba(52, 211, 153, 0.14)',
    glow1: 'rgba(16, 185, 129, 0.22)',
    glow2: 'rgba(5, 150, 105, 0.18)',
    glow3: 'rgba(245, 158, 11, 0.12)',
    baseBg: '#090f0d',
    isDark: true,
  },
};

interface AttractiveBackgroundProps {
  currentTheme: BackgroundTheme;
  onThemeChange: (theme: BackgroundTheme) => void;
}

export function AttractiveBackground({
  currentTheme,
  onThemeChange,
}: AttractiveBackgroundProps) {
  const [isOpenSelector, setIsOpenSelector] = useState(false);
  const active = THEMES[currentTheme] || THEMES.emerald;

  return (
    <>
      {/* Dynamic Background Canvas (Fixed behind all content) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-700"
        style={{ backgroundColor: active.baseBg }}
      >
        {/* Ambient Floating Glow Orb 1 - Top Left */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-3xl ambient-orb-1 transition-all duration-1000"
          style={{ backgroundColor: active.glow1 }}
        />

        {/* Ambient Floating Glow Orb 2 - Top Right (Warm accent) */}
        <div
          className="absolute -top-24 -right-28 w-[540px] h-[540px] rounded-full blur-3xl ambient-orb-2 transition-all duration-1000"
          style={{ backgroundColor: active.glow2 }}
        />

        {/* Ambient Floating Glow Orb 3 - Center Right / Mid View */}
        <div
          className="absolute top-1/3 -right-20 w-[480px] h-[480px] rounded-full blur-3xl ambient-orb-3 transition-all duration-1000"
          style={{ backgroundColor: active.glow3 }}
        />

        {/* Ambient Floating Glow Orb 4 - Bottom Left */}
        <div
          className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] rounded-full blur-3xl ambient-orb-1 transition-all duration-1000"
          style={{ backgroundColor: active.glow1 }}
        />

        {/* High-Precision Geometric Dot Matrix Grid Overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: `radial-gradient(circle at 1.5px 1.5px, ${active.dotColor} 1.5px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Subtle Decorative Geometric Mandala / Tontine Rotation Rings (African cyclical solidarity) */}
        <svg
          className="absolute -top-40 right-10 w-[700px] h-[700px] opacity-[0.045] pointer-events-none text-emerald-950 animate-spin"
          style={{ animationDuration: '160s' }}
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="200" cy="200" r="190" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="200" cy="200" r="155" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" />
          <circle cx="200" cy="200" r="85" stroke="currentColor" strokeWidth="2" />
          <circle cx="200" cy="200" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
          {/* Rotational cross rays */}
          <line x1="200" y1="5" x2="200" y2="395" stroke="currentColor" strokeWidth="0.75" />
          <line x1="5" y1="200" x2="395" y2="200" stroke="currentColor" strokeWidth="0.75" />
          <line x1="62" y1="62" x2="338" y2="338" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="62" y1="338" x2="338" y2="62" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>

        {/* Second Subtle Geometric Ring in bottom corner */}
        <svg
          className="absolute -bottom-48 -left-32 w-[620px] h-[620px] opacity-[0.035] pointer-events-none text-emerald-900"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" />
        </svg>

        {/* Top subtle vignette light beam */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
      </div>

      {/* Floating Theme Selector Control Dock */}
      <div className="fixed bottom-6 left-6 z-40">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpenSelector(!isOpenSelector)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold border border-emerald-500/25 shadow-lg hover:shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer group"
            title="Personnaliser l'ambiance et le fond de la plateforme"
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${active.gradientBadge} shadow-2xs group-hover:scale-110 transition-transform`} />
            <span className="hidden sm:inline text-slate-700 font-semibold">Fond :</span>
            <span className="text-emerald-800 font-bold">{active.name}</span>
            <Palette className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
          </button>

          {/* Theme Dropdown Menu */}
          {isOpenSelector && (
            <div className="absolute bottom-full left-0 mb-3 w-72 p-3 rounded-2xl bg-white/98 backdrop-blur-xl border border-emerald-500/30 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ambiance & Design du Fond</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">4 Styles</span>
              </div>

              <div className="space-y-1.5 pt-1">
                {(Object.values(THEMES) as ThemeConfig[]).map((thm) => {
                  const isSelected = thm.id === currentTheme;
                  return (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => {
                        onThemeChange(thm.id);
                        setIsOpenSelector(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/90 border border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg bg-gradient-to-tr ${thm.gradientBadge} shadow-xs shrink-0 flex items-center justify-center`}
                        >
                          {thm.isDark ? (
                            <Moon className="w-2.5 h-2.5 text-emerald-300" />
                          ) : (
                            <Sun className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{thm.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal truncate">
                            {thm.tagline}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 text-center">
                Design fluide avec micro-grille et lueurs ambiantes
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
