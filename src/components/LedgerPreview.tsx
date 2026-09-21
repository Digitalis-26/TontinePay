import { useState } from 'react';
import { PlanConfig } from '../types';
import { generateLedgerEntries, formatCurrency, formatPercent } from '../data/plans';
import { BookOpen, CheckCircle2, ArrowRightLeft, Info, Wallet } from 'lucide-react';

interface LedgerPreviewProps {
  plans: PlanConfig[];
  rates: Record<PlanConfig['code'], number>;
  selectedPlanCode: PlanConfig['code'];
  onSelectPlan: (code: PlanConfig['code']) => void;
}

export function LedgerPreview({
  plans,
  rates,
  selectedPlanCode,
  onSelectPlan,
}: LedgerPreviewProps) {
  const [contributionAmount, setContributionAmount] = useState<number>(25000);

  const activePlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];
  const activeRate = rates[activePlan.code];

  const ledgerEntries = generateLedgerEntries(contributionAmount, activeRate);
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const isBalanced = totalDebit === totalCredit;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
              <BookOpen className="w-5 h-5 text-amber-600" />
              Grand Livre Comptable & Écritures en Partie Double
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Traçabilité intégrale et écritures équilibrées pour chaque tour de cotisation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Plan :</span>
            <div className="flex gap-1">
              {plans.map((p) => (
                <button
                  key={p.code}
                  onClick={() => onSelectPlan(p.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    p.code === selectedPlanCode
                      ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {p.code} ({formatPercent(rates[p.code])})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input amount */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-4">
          <label className="text-xs font-semibold text-stone-700 whitespace-nowrap">
            Montant de la cotisation testée :
          </label>
          <div className="relative max-w-xs">
            <input
              type="number"
              step="1000"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(Math.max(100, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
            <span className="absolute right-3 top-2 text-[11px] text-stone-400">XOF</span>
          </div>
          <div className="text-xs text-stone-500">
            Commission calculée ({formatPercent(activeRate)}) :{' '}
            <strong className="text-amber-800 font-bold">
              {formatCurrency(Math.round(contributionAmount * activeRate))}
            </strong>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-stone-900">
              Journal d'écriture : Paiement de cotisation de {formatCurrency(contributionAmount)}
            </h4>
            <p className="text-xs text-stone-500">
              Taux appliqué : {formatPercent(activeRate)} (Plan {activePlan.name})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Écritures Équilibrées (Débit = Crédit)
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Déséquilibre détecté
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-700">
                <th className="py-3 px-4 font-semibold">Compte Grand Livre (accountCode)</th>
                <th className="py-3 px-4 font-semibold">Intitulé du Compte</th>
                <th className="py-3 px-4 font-semibold">Type (entryType)</th>
                <th className="py-3 px-4 font-semibold">Description / Référence</th>
                <th className="py-3 px-4 font-semibold text-right">Débit (XOF)</th>
                <th className="py-3 px-4 font-semibold text-right">Crédit (XOF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ledgerEntries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">
                    {entry.accountCode}
                  </td>
                  <td className="py-3 px-4 text-stone-800 font-medium">
                    {entry.accountName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-stone-100 text-stone-700">
                      {entry.entryType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    {entry.description}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-stone-300 bg-stone-50 font-bold text-stone-900">
                <td colSpan={4} className="py-3 px-4 text-right">
                  TOTAUX :
                </td>
                <td className="py-3 px-4 text-right font-mono text-stone-900">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-900">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note on Manager Wallet sync */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900">
          <Wallet className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Impact sur le modèle Wallet du Gestionnaire :</span>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Dès validation du paiement (<code className="font-mono bg-amber-100/60 px-1 rounded">PaymentStatus = SUCCESS</code>), la commission de{' '}
              <strong>{formatCurrency(Math.round(contributionAmount * activeRate))}</strong> est créditée sur le solde du compte{' '}
              <code className="font-mono bg-amber-100/60 px-1 rounded">Wallet (current_balance)</code> via un enregistrement{' '}
              <code className="font-mono bg-amber-100/60 px-1 rounded">WalletTransactionType.COMMISSION</code>. Le gestionnaire peut ensuite demander un retrait (<code className="font-mono bg-amber-100/60 px-1 rounded">Withdrawal</code>) vers son Mobile Money.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
