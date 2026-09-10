import { useState } from 'react';
import { PlanConfig, SimulationParams } from '../types';
import { calculateSimulation, formatCurrency, formatPercent } from '../data/plans';
import { Calculator, ArrowRight, TrendingUp, DollarSign, Users, Calendar, Sparkles } from 'lucide-react';

interface CommissionSimulatorProps {
  plans: PlanConfig[];
  rates: Record<PlanConfig['code'], number>;
  selectedPlanCode: PlanConfig['code'];
  onSelectPlan: (code: PlanConfig['code']) => void;
  onGoToLedger: () => void;
}

export function CommissionSimulator({
  plans,
  rates,
  selectedPlanCode,
  onSelectPlan,
  onGoToLedger,
}: CommissionSimulatorProps) {
  const [params, setParams] = useState<Omit<SimulationParams, 'planCode'>>({
    contributionAmount: 25000, // 25 000 FCFA
    memberCount: 20,
    frequency: 'MONTHLY',
  });

  const activePlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];
  const activeRate = rates[activePlan.code];

  const activeResult = calculateSimulation(activePlan, params, activeRate);

  // Compare all 4 plans
  const comparisonResults = plans.map((p) =>
    calculateSimulation(p, params, rates[p.code])
  );

  const presets = [
    {
      label: 'Tontine Familiale (10 000 F)',
      amount: 10000,
      members: 10,
      frequency: 'MONTHLY' as const,
    },
    {
      label: 'Tontine Commerçants Marché (5 000 F / jour)',
      amount: 5000,
      members: 30,
      frequency: 'DAILY' as const,
    },
    {
      label: 'Tontine Salariale Entreprise (50 000 F / mois)',
      amount: 50000,
      members: 20,
      frequency: 'MONTHLY' as const,
    },
    {
      label: 'Tontine Cadres & Tontine d’Or (100 000 F / mois)',
      amount: 100000,
      members: 15,
      frequency: 'MONTHLY' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Introduction banner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
              <Calculator className="w-5 h-5 text-amber-600" />
              Simulateur de Tontine & Calcul de Commission
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Calculez la commission perçue par versement et les gains mensuels pour chaque plan
              selon les taux configurés : <span className="font-semibold text-stone-700">Free 1,5%</span>,{' '}
              <span className="font-semibold text-stone-700">Starter 2,5%</span>,{' '}
              <span className="font-semibold text-stone-700">Premium 3%</span>, et{' '}
              <span className="font-semibold text-stone-700">Business 3,5%</span>.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-400 mr-1">Cas réels :</span>
            {presets.map((pr, idx) => (
              <button
                key={idx}
                onClick={() =>
                  setParams({
                    contributionAmount: pr.amount,
                    memberCount: pr.members,
                    frequency: pr.frequency,
                  })
                }
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-stone-100">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Plan sélectionné
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {plans.map((p) => {
                const isSelected = p.code === selectedPlanCode;
                return (
                  <button
                    key={p.code}
                    onClick={() => onSelectPlan(p.code)}
                    className={`px-2 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-bold">{p.code}</div>
                    <div className={`text-[11px] ${isSelected ? 'text-amber-300' : 'text-stone-500'}`}>
                      {formatPercent(rates[p.code])}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contribution Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Cotisation par membre (FCFA)
            </label>
            <div className="relative">
              <input
                type="number"
                min="500"
                step="500"
                value={params.contributionAmount}
                onChange={(e) =>
                  setParams({ ...params, contributionAmount: Math.max(100, Number(e.target.value) || 0) })
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <span className="absolute right-3 top-2.5 text-xs text-stone-400">XOF</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {[5000, 10000, 25000, 50000].map((val) => (
                <button
                  key={val}
                  onClick={() => setParams({ ...params, contributionAmount: val })}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  {val / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Member Count */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Nombre de membres
            </label>
            <div className="relative">
              <input
                type="number"
                min="2"
                max="500"
                value={params.memberCount}
                onChange={(e) =>
                  setParams({ ...params, memberCount: Math.max(2, Number(e.target.value) || 2) })
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <Users className="absolute right-3 top-2.5 w-4 h-4 text-stone-400" />
            </div>
            <div className="flex gap-1 mt-1.5">
              {[5, 10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setParams({ ...params, memberCount: val })}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Periodicity */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Périodicité des tours
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { code: 'DAILY' as const, label: 'Jour' },
                { code: 'WEEKLY' as const, label: 'Semaine' },
                { code: 'MONTHLY' as const, label: 'Mois' },
              ].map((freq) => (
                <button
                  key={freq.code}
                  onClick={() => setParams({ ...params, frequency: freq.code })}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all ${
                    params.frequency === freq.code
                      ? 'border-stone-900 bg-stone-900 text-white font-semibold'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
            <span className="block text-[11px] text-stone-400 mt-1.5">
              {params.frequency === 'DAILY' && '~26 tours / mois'}
              {params.frequency === 'WEEKLY' && '4 tours / mois'}
              {params.frequency === 'MONTHLY' && '1 tour / mois'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Plan Calculation Breakdown */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Détail du calcul pour
            </span>
            <h4 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Plan {activePlan.name} • Commission {formatPercent(activeRate)}
            </h4>
          </div>
          <button
            onClick={onGoToLedger}
            className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
          >
            Voir écriture comptable Grand Livre <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Key Metrics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
            <span className="text-xs text-stone-500 font-medium">Cagnotte Brute / Tour</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">
              {formatCurrency(activeResult.totalTurnCollection)}
            </div>
            <span className="text-[11px] text-stone-500">
              {params.memberCount} membres × {formatCurrency(params.contributionAmount)}
            </span>
          </div>

          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
            <span className="text-xs text-amber-800 font-medium">
              Commission Gestionnaire ({formatPercent(activeRate)})
            </span>
            <div className="text-2xl font-bold text-amber-900 mt-1">
              {formatCurrency(activeResult.totalTurnCommission)}
            </div>
            <span className="text-[11px] text-amber-700">
              {formatCurrency(activeResult.commissionPerContribution)} par cotisation
            </span>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
            <span className="text-xs text-emerald-800 font-medium">Reversé au Bénéficiaire</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              {formatCurrency(activeResult.netTontinePayout)}
            </div>
            <span className="text-[11px] text-emerald-700">
              Montant net attribué à chaque rotation
            </span>
          </div>

          <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
            <span className="text-xs text-blue-800 font-medium">Gain Mensuel Estimé</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(activeResult.monthlyEstimatedCommission)}
            </div>
            <span className="text-[11px] text-blue-700">
              Sur {activeResult.cyclesPerMonth} tour(s) par mois
            </span>
          </div>
        </div>

        {/* Mathematical verification formula */}
        <div className="mt-6 rounded-xl bg-stone-900 text-stone-100 p-4 font-mono text-xs space-y-1">
          <div className="text-stone-400 font-sans text-xs font-semibold flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Vérification selon le schéma Prisma (ManagerCommission & Payment)
          </div>
          <div className="text-amber-300">
            base_amount = {params.contributionAmount} XOF
          </div>
          <div className="text-stone-300">
            rate = {activeRate.toFixed(4)} ({formatPercent(activeRate)})
          </div>
          <div className="text-emerald-400">
            commission_amount = base_amount × rate = {params.contributionAmount} × {activeRate.toFixed(4)} = {activeResult.commissionPerContribution} XOF
          </div>
          <div className="text-stone-400 pt-1 border-t border-stone-800">
            Total pour {params.memberCount} membres : {activeResult.commissionPerContribution} × {params.memberCount} = {formatCurrency(activeResult.totalTurnCommission)}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix of all 4 Plans */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-bold text-stone-900">
            Comparatif des 4 Plans de Commission pour cette tontine
          </h4>
          <p className="text-xs text-stone-500">
            Visualisez immédiatement la différence d'encaissement selon le taux appliqué (1.5%, 2.5%, 3%, 3.5%).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-4 font-semibold">Taux Configuré</th>
                <th className="py-3 px-4 font-semibold">Commission / Cotisation</th>
                <th className="py-3 px-4 font-semibold">Commission / Tour</th>
                <th className="py-3 px-4 font-semibold">Net Bénéficiaire</th>
                <th className="py-3 px-4 font-semibold">Gain Mensuel Brut</th>
                <th className="py-3 px-4 font-semibold">Abonnement Mensuel</th>
                <th className="py-3 px-4 font-semibold">Gain Net Gestionnaire</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {comparisonResults.map((res) => {
                const isCurrent = res.plan.code === selectedPlanCode;
                return (
                  <tr
                    key={res.plan.code}
                    className={`transition-colors ${
                      isCurrent ? 'bg-amber-50/50 font-medium' : 'hover:bg-stone-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          res.plan.code === 'FREE'
                            ? 'bg-stone-400'
                            : res.plan.code === 'STARTER'
                            ? 'bg-emerald-500'
                            : res.plan.code === 'PREMIUM'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      {res.plan.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 font-bold text-stone-900 border border-stone-200">
                        {res.ratePercentage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-stone-800">
                      {formatCurrency(res.commissionPerContribution)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-800">
                      {formatCurrency(res.totalTurnCommission)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-800 font-semibold">
                      {formatCurrency(res.netTontinePayout)}
                    </td>
                    <td className="py-3.5 px-4 text-stone-900 font-medium">
                      {formatCurrency(res.monthlyEstimatedCommission)}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500">
                      {res.plan.monthlyPrice === 0 ? '0 FCFA' : formatCurrency(res.plan.monthlyPrice)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-stone-900">
                      {formatCurrency(res.netManagerMonthlyProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isCurrent ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                          Sélectionné
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectPlan(res.plan.code)}
                          className="text-[11px] font-medium text-stone-700 hover:text-stone-900 underline"
                        >
                          Choisir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
