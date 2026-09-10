import { Check, ShieldCheck, Users, Wallet, Sparkles, Percent, RotateCcw } from 'lucide-react';
import { PlanConfig } from '../types';
import { formatCurrency, formatPercent } from '../data/plans';

interface PlanCardProps {
  key?: string | number;
  plan: PlanConfig;
  currentRate: number;
  onRateChange: (code: PlanConfig['code'], newRate: number) => void;
  onResetRate: (code: PlanConfig['code']) => void;
  onSelectForSimulation: (code: PlanConfig['code']) => void;
  isSimulated: boolean;
}

export function PlanCard({
  plan,
  currentRate,
  onRateChange,
  onResetRate,
  onSelectForSimulation,
  isSimulated,
}: PlanCardProps) {
  const isCustomized = Math.abs(currentRate - plan.maxCommissionRate) > 0.0001;

  const colorStyles = {
    FREE: {
      tag: 'bg-stone-100 text-stone-800 border-stone-300',
      badge: 'bg-stone-800 text-white',
      border: isSimulated ? 'border-stone-800 ring-2 ring-stone-400' : 'border-stone-200 hover:border-stone-400',
      bgAccent: 'bg-stone-50',
    },
    STARTER: {
      tag: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badge: 'bg-emerald-600 text-white',
      border: isSimulated ? 'border-emerald-600 ring-2 ring-emerald-400' : 'border-emerald-200 hover:border-emerald-400',
      bgAccent: 'bg-emerald-50/40',
    },
    PREMIUM: {
      tag: 'bg-blue-50 text-blue-800 border-blue-300',
      badge: 'bg-blue-600 text-white',
      border: isSimulated ? 'border-blue-600 ring-2 ring-blue-400' : 'border-blue-200 hover:border-blue-400',
      bgAccent: 'bg-blue-50/40',
    },
    BUSINESS: {
      tag: 'bg-amber-50 text-amber-900 border-amber-300',
      badge: 'bg-amber-600 text-white',
      border: isSimulated ? 'border-amber-600 ring-2 ring-amber-400' : 'border-amber-200 hover:border-amber-400',
      bgAccent: 'bg-amber-50/40',
    },
  }[plan.code];

  return (
    <div
      id={`plan-card-${plan.code.toLowerCase()}`}
      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 ${colorStyles.border}`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
          Recommandé Gestionnaires
        </div>
      )}

      <div>
        {/* Header: Name and Code */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider text-stone-500 uppercase">
              Plan {plan.code}
            </span>
            <h3 className="text-xl font-bold text-stone-900 mt-0.5">{plan.name}</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${colorStyles.tag}`}
          >
            <Percent className="w-3 h-3" />
            {formatPercent(currentRate)}
          </span>
        </div>

        {/* Commission Rate Showcase */}
        <div className={`mt-4 rounded-xl p-4 border border-stone-200 ${colorStyles.bgAccent}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-stone-600 font-medium">Taux de Commission</span>
            <span className="text-xs font-mono text-stone-500">
              Prisma: {currentRate.toFixed(4)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-900">
              {formatPercent(currentRate)}
            </span>
            <span className="text-xs text-stone-600">sur chaque versement</span>
          </div>

          {/* Quick slider adjuster */}
          <div className="mt-3 pt-3 border-t border-stone-200/80">
            <div className="flex items-center justify-between text-[11px] text-stone-600 mb-1">
              <span>Ajuster taux (test)</span>
              {isCustomized && (
                <button
                  onClick={() => onResetRate(plan.code)}
                  className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Rétablir {formatPercent(plan.maxCommissionRate)}
                </button>
              )}
            </div>
            <input
              type="range"
              min="0.005"
              max="0.080"
              step="0.001"
              value={currentRate}
              onChange={(e) => onRateChange(plan.code, parseFloat(e.target.value))}
              className="w-full accent-stone-900 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Price & Limits */}
        <div className="mt-4 pb-4 border-b border-stone-100">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-stone-900">
              {plan.monthlyPrice === 0 ? 'Gratuit' : formatCurrency(plan.monthlyPrice)}
            </span>
            {plan.monthlyPrice > 0 && (
              <span className="text-xs text-stone-500">/ mois</span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">{plan.description}</p>
        </div>

        {/* Features Checklist */}
        <ul className="mt-4 space-y-2.5 text-xs text-stone-700">
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Commission activée : <strong className="text-stone-900">Oui (commission_enabled)</strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-stone-500 shrink-0" />
            <span>
              Tontines max :{' '}
              <strong className="text-stone-900">
                {plan.maxTontines === null ? 'Illimité' : `${plan.maxTontines} tontine(s)`}
              </strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-500 shrink-0" />
            <span>
              Membres max :{' '}
              <strong className="text-stone-900">
                {plan.maxMembers === null ? 'Illimité' : `${plan.maxMembers} membres`}
              </strong>
            </span>
          </li>
        </ul>
      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-stone-100">
        <button
          id={`btn-simulate-${plan.code.toLowerCase()}`}
          onClick={() => onSelectForSimulation(plan.code)}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            isSimulated
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
          }`}
        >
          {isSimulated ? (
            <>
              <Check className="w-3.5 h-3.5" /> Plan Actif en Simulation
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Simuler ce Plan ({formatPercent(currentRate)})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
