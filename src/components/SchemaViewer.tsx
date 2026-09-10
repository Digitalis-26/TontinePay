import { useState } from 'react';
import { Database, ShieldCheck, FileText, ChevronRight, Layers, CreditCard } from 'lucide-react';

export function SchemaViewer() {
  const [activeModel, setActiveModel] = useState<string>('SubscriptionPlan');

  const models = [
    {
      name: 'SubscriptionPlan',
      description: 'Définit les forfaits (FREE, STARTER, PREMIUM, BUSINESS) et le plafond de commission maximal (maxCommissionRate).',
      fields: [
        { name: 'id', type: 'Int', desc: 'Identifiant auto-incrémenté' },
        { name: 'code', type: 'String @unique', desc: 'FREE, STARTER, PREMIUM, BUSINESS' },
        { name: 'name', type: 'String', desc: 'Intitulé affiché du plan' },
        { name: 'monthlyPrice', type: 'BigInt', desc: 'Prix mensuel en XOF (0, 2500, 5000, 10000)' },
        { name: 'maxCommissionRate', type: 'Decimal(5, 4)', desc: 'Taux max : 0.0150 (1,5%), 0.0250 (2,5%), 0.0300 (3,0%), 0.0350 (3,5%)' },
        { name: 'commissionEnabled', type: 'Boolean', desc: 'Défini à true pour autoriser les commissions' },
        { name: 'maxTontines', type: 'Int?', desc: '1, 5, 20 ou null (illimité)' },
        { name: 'maxMembers', type: 'Int?', desc: '15, 50, 200 ou null (illimité)' },
      ],
    },
    {
      name: 'CommissionRule',
      description: 'Règle de commissionnement spécifique par tontine ou par plan d\'abonnement.',
      fields: [
        { name: 'id', type: 'Uuid', desc: 'UUID primaire' },
        { name: 'subscriptionPlanId', type: 'Int?', desc: 'Liaison facultative avec SubscriptionPlan' },
        { name: 'tontineId', type: 'Uuid?', desc: 'Liaison facultative avec une tontine spécifique' },
        { name: 'rate', type: 'Decimal(5, 4)', desc: 'Pourcentage appliqué (ex: 0.0150 pour 1,5%)' },
        { name: 'fixedAmount', type: 'BigInt', desc: 'Montant fixe optionnel en XOF' },
        { name: 'minAmount / maxAmount', type: 'BigInt?', desc: 'Plafonds plancher / plafond en XOF' },
        { name: 'active', type: 'Boolean', desc: 'Règle active' },
      ],
    },
    {
      name: 'ManagerCommission',
      description: 'Trace chaque commission calculée et attribuée au gestionnaire lors d\'un paiement.',
      fields: [
        { name: 'id', type: 'Uuid', desc: 'UUID primaire' },
        { name: 'managerId', type: 'Uuid', desc: 'Gestionnaire bénéficiaire' },
        { name: 'tontineId', type: 'Uuid', desc: 'Tontine rattachée' },
        { name: 'paymentId', type: 'Uuid @unique', desc: 'Paiement source de cotisation' },
        { name: 'baseAmount', type: 'BigInt', desc: 'Montant de base (cotisation brute en XOF)' },
        { name: 'rate', type: 'Decimal(5, 4)', desc: 'Taux effectif appliqué (1,5% à 3,5%)' },
        { name: 'commissionAmount', type: 'BigInt', desc: 'Montant calculé : baseAmount × rate' },
        { name: 'status', type: 'CommissionStatus', desc: 'PENDING, AVAILABLE, CANCELLED, REVERSED' },
      ],
    },
    {
      name: 'Wallet & WalletTransaction',
      description: 'Portefeuille du gestionnaire crédité de la commission après confirmation du paiement.',
      fields: [
        { name: 'currentBalance', type: 'BigInt', desc: 'Solde disponible du gestionnaire' },
        { name: 'status', type: 'WalletStatus', desc: 'ACTIVE, SUSPENDED, CLOSED' },
        { name: 'transactionType', type: 'WalletTransactionType', desc: 'COMMISSION, WITHDRAWAL, REVERSAL, ADJUSTMENT' },
        { name: 'amount', type: 'BigInt', desc: 'Montant crédité ou débité' },
      ],
    },
    {
      name: 'Payment & LedgerEntry',
      description: 'Enregistrement de la transaction et écritures comptables en partie double.',
      fields: [
        { name: 'amount', type: 'BigInt', desc: 'Montant total encaissé' },
        { name: 'managerCommission', type: 'BigInt', desc: 'Part gestionnaire (1,5% - 3,5%)' },
        { name: 'platformFee', type: 'BigInt', desc: 'Part plateforme' },
        { name: 'netAmount', type: 'BigInt', desc: 'Part nette pour la cagnotte tontine' },
        { name: 'entryType', type: 'LedgerEntryType', desc: 'CONTRIBUTION, COMMISSION_MANAGER, PLATFORM_FEE' },
      ],
    },
  ];

  const currentModel = models.find((m) => m.name === activeModel) || models[0];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
          <Layers className="w-5 h-5 text-amber-600" />
          Architecture Prisma & Schéma Relationnel
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Explorez les entités PostgreSQL/Prisma régissant la tarification, le prélèvement des commissions
          et la tenue comptable du modèle.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model list */}
        <div className="space-y-1.5">
          {models.map((m) => (
            <button
              key={m.name}
              onClick={() => setActiveModel(m.name)}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                activeModel === m.name
                  ? 'border-stone-900 bg-stone-900 text-white font-semibold shadow-sm'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span>{m.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          ))}
        </div>

        {/* Selected model details */}
        <div className="md:col-span-2 rounded-xl border border-stone-200 p-5 bg-stone-50/50">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h4 className="text-sm font-bold text-stone-900 font-mono">
              model {currentModel.name}
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
              Prisma Model
            </span>
          </div>

          <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
            {currentModel.description}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="pb-2 font-semibold">Champ</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Rôle & Règles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {currentModel.fields.map((f, i) => (
                  <tr key={i} className="hover:bg-white transition-colors">
                    <td className="py-2.5 font-bold text-stone-900">{f.name}</td>
                    <td className="py-2.5 text-blue-700 text-[11px]">{f.type}</td>
                    <td className="py-2.5 font-sans text-stone-600 text-xs">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
