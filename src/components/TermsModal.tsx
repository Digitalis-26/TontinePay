import { useState } from 'react';
import {
  X,
  ShieldCheck,
  Briefcase,
  Users,
  Lock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Printer,
  Sparkles,
  Scale,
} from 'lucide-react';
import { TERMS_SECTIONS, TONTINE_TERMS_METADATA, TermsSection } from '../data/termsOfUse';
import { UserRoleType } from '../types';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  highlightRole?: UserRoleType;
  alreadyAccepted?: boolean;
}

export function TermsModal({
  isOpen,
  onClose,
  onAccept,
  highlightRole,
  alreadyAccepted = false,
}: TermsModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'MANAGER' | 'MEMBER'>(
    highlightRole === 'MANAGER' ? 'MANAGER' : highlightRole === 'MEMBER' ? 'MEMBER' : 'ALL'
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(
    highlightRole === 'MANAGER' ? 'managers' : highlightRole === 'MEMBER' ? 'members' : 'preamble'
  );

  if (!isOpen) return null;

  const filteredSections = TERMS_SECTIONS.filter((s) => {
    if (selectedFilter === 'ALL') return true;
    return s.audience === 'ALL' || s.audience === selectedFilter;
  });

  const activeSection = TERMS_SECTIONS.find((s) => s.id === activeSectionId) || TERMS_SECTIONS[0];

  const handleAcceptAndClose = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white flex items-start justify-between gap-4 border-b border-emerald-700/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Scale className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">
                Charte Juridique & Cadre Réglementaire
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700/60 text-emerald-100 font-mono">
                v{TONTINE_TERMS_METADATA.version}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {TONTINE_TERMS_METADATA.title}
            </h2>
            <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl">
              {TONTINE_TERMS_METADATA.regulatoryFramework} • Entrée en vigueur : {TONTINE_TERMS_METADATA.effectiveDate}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Filters & Audience selector */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Filtrer par rôle :</span>
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Règles Générales ({TERMS_SECTIONS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFilter('MANAGER');
                setActiveSectionId('managers');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'MANAGER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>Pour les Gestionnaires</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFilter('MEMBER');
                setActiveSectionId('members');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'MEMBER'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Pour les Membres Cotisants</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Document opposable et certifié
          </div>
        </div>

        {/* Main Content Body (Sidebar + Articles) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Navigation Sidebar */}
          <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 p-3 sm:p-4 overflow-y-auto space-y-1.5 max-h-56 md:max-h-none">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Sommaire des sections
            </div>
            {filteredSections.map((section) => {
              const isSelected = section.id === activeSection.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {section.audience === 'MANAGER' ? (
                      <Briefcase className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                    ) : section.audience === 'MEMBER' ? (
                      <Users className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                    ) : (
                      <ShieldCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-bold">{section.title}</div>
                    <div
                      className={`text-[10px] line-clamp-1 mt-0.5 ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {section.summary}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Section Content */}
          <div className="md:col-span-8 p-4 sm:p-6 overflow-y-auto space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    activeSection.audience === 'MANAGER'
                      ? 'bg-amber-100 text-amber-900'
                      : activeSection.audience === 'MEMBER'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-teal-100 text-teal-900'
                  }`}
                >
                  {activeSection.audience === 'MANAGER'
                    ? 'Applicable aux Gestionnaires'
                    : activeSection.audience === 'MEMBER'
                    ? 'Applicable aux Cotisants'
                    : 'Règle Commune TONTINE'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">{activeSection.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{activeSection.summary}</p>
            </div>

            <div className="space-y-4">
              {activeSection.articles.map((article) => (
                <div
                  key={article.num}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <span className="text-emerald-700 font-mono">{article.num}</span>
                    <span>—</span>
                    <span>{article.title}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{article.content}</p>

                  {article.bulletPoints && article.bulletPoints.length > 0 && (
                    <ul className="mt-2 space-y-1.5 pl-2 text-xs text-slate-600">
                      {article.bulletPoints.map((bp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Legal reassurance footer */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                En acceptant cette charte, vous certifiez l'exactitude de vos informations et vous vous engagez à respecter les délais de paiement et les règles d'intégrité de la plateforme TONTINE.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {alreadyAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Vous avez déjà accepté la Politique d'Utilisation
              </span>
            ) : (
              <span>L'acceptation est obligatoire pour créer ou rejoindre une tontine.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fermer
            </button>

            {onAccept && !alreadyAccepted && (
              <button
                type="button"
                onClick={handleAcceptAndClose}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>J'accepte sans réserve</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
