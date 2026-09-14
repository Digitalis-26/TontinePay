import { Check, ShieldCheck, Users, Wallet, Sparkles, Percent } from 'lucide-react';
import { PlanConfig } from '../types';
import { formatCurrency, formatPercent } from '../data/plans';

interface PlanCardProps {
  key?: string | number;
  plan: PlanConfig;
  currentRate: number;
  onRateChange?: (code: PlanConfig['code'], newRate: number) => void;
  onResetRate?: (code: PlanConfig['code']) => void;
  onSelectForSimulation: (code: PlanConfig['code']) => void;
  isSimulated: boolean;
}

export function PlanCard({
  plan,
  currentRate,
  onSelectForSimulation,
  isSimulated,
}: PlanCardProps) {
  const colorStyles = {
    FREE: {
      tag: 'bg-slate-100 text-slate-700 border-slate-200',
      badge: 'bg-slate-800 text-white',
      border: isSimulated ? 'border-slate-900 ring-2 ring-slate-400' : 'border-slate-200 hover:border-slate-400',
      bgAccent: 'bg-slate-50',
      btn: isSimulated ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    },
    STARTER: {
      tag: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      border: isSimulated ? 'border-emerald-600 ring-2 ring-emerald-300 shadow-md' : 'border-emerald-200 hover:border-emerald-400',
      bgAccent: 'bg-emerald-50/50',
      btn: isSimulated ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    },
    PREMIUM: {
      tag: 'bg-blue-50 text-blue-800 border-blue-200',
      badge: 'bg-blue-600 text-white',
      border: isSimulated ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200 hover:border-blue-300',
      bgAccent: 'bg-blue-50/40',
      btn: isSimulated ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-900 hover:bg-blue-100',
    },
    BUSINESS: {
      tag: 'bg-amber-50 text-amber-900 border-amber-200',
      badge: 'bg-amber-600 text-white',
      border: isSimulated ? 'border-amber-600 ring-2 ring-amber-300' : 'border-slate-200 hover:border-amber-300',
      bgAccent: 'bg-amber-50/40',
      btn: isSimulated ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900 hover:bg-amber-100',
    },
  }[plan.code];

  return (
    <div
      id={`plan-card-${plan.code.toLowerCase()}`}
      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 ${colorStyles.border}`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
          Le plus populaire
        </div>
      )}

      <div>
        {/* Header: Name and Code */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Formule {plan.code}
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{plan.name}</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${colorStyles.tag}`}
          >
            <Percent className="w-3 h-3" />
            {formatPercent(currentRate)}
          </span>
        </div>

        {/* Commission Rate Showcase - Clean, no sliders */}
        <div className={`mt-4 rounded-xl p-4 border border-slate-200/80 ${colorStyles.bgAccent}`}>
          <div className="text-xs text-slate-600 font-medium">Commission par versement</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {formatPercent(currentRate)}
            </span>
            <span className="text-xs text-slate-600 font-medium">maximum</span>
          </div>
        </div>

        {/* Price & Limits */}
        <div className="mt-4 pb-4 border-b border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {plan.monthlyPrice === 0 ? 'Gratuit' : formatCurrency(plan.monthlyPrice)}
            </span>
            {plan.monthlyPrice > 0 && (
              <span className="text-xs text-slate-500 font-medium">/ mois</span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{plan.description}</p>
        </div>

        {/* Features Checklist */}
        <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Commission : <strong className="text-slate-900">{formatPercent(currentRate)} max</strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Tontines autorisées :{' '}
              <strong className="text-slate-900">
                {plan.maxTontines === null ? 'Illimité' : `${plan.maxTontines} groupe(s)`}
              </strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Membres max :{' '}
              <strong className="text-slate-900">
                {plan.maxMembers === null ? 'Illimité' : `${plan.maxMembers} membres`}
              </strong>
            </span>
          </li>
        </ul>
      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          id={`btn-simulate-${plan.code.toLowerCase()}`}
          onClick={() => onSelectForSimulation(plan.code)}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${colorStyles.btn}`}
        >
          {isSimulated ? (
            <>
              <Check className="w-3.5 h-3.5" /> Plan sélectionné
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Simuler la rentabilité
            </>
          )}
        </button>
      </div>
    </div>
  );
}
