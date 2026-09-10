import { PlanConfig, SimulationParams, SimulationResult, LedgerPreviewEntry } from '../types';

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 1,
    code: 'FREE',
    name: 'Free (Gratuit)',
    monthlyPrice: 0,
    maxTontines: 1,
    maxMembers: 15,
    commissionEnabled: true,
    maxCommissionRate: 0.015, // 1.5%
    description: 'Idéal pour tester ou gérer une petite tontine familiale ou de quartier.',
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
    accentBorder: 'hover:border-stone-400',
  },
  {
    id: 2,
    code: 'STARTER',
    name: 'Starter',
    monthlyPrice: 2500,
    maxTontines: 5,
    maxMembers: 50,
    commissionEnabled: true,
    maxCommissionRate: 0.025, // 2.5%
    description: 'Pour les gestionnaires gérant plusieurs groupes associatifs ou commerçants.',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    accentBorder: 'hover:border-emerald-500',
    popular: true,
  },
  {
    id: 3,
    code: 'PREMIUM',
    name: 'Premium',
    monthlyPrice: 5000,
    maxTontines: 20,
    maxMembers: 200,
    commissionEnabled: true,
    maxCommissionRate: 0.030, // 3.0%
    description: 'Pour les organisateurs aguerris et mutuelles de microfinance.',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
    accentBorder: 'hover:border-blue-500',
  },
  {
    id: 4,
    code: 'BUSINESS',
    name: 'Business',
    monthlyPrice: 10000,
    maxTontines: null,
    maxMembers: null,
    commissionEnabled: true,
    maxCommissionRate: 0.035, // 3.5%
    description: 'Accès illimité sans plafond de membres ni de tontines avec commission maximale.',
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
    accentBorder: 'hover:border-amber-500',
  },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export const formatXOF = formatCurrency;

export function formatPercent(rate: number): string {
  return (rate * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: rate * 100 % 1 === 0 ? 1 : 1,
    maximumFractionDigits: 2,
  }) + '%';
}

export function calculateSimulation(
  plan: PlanConfig,
  params: Omit<SimulationParams, 'planCode'>,
  customRate?: number
): SimulationResult {
  const rateApplied = customRate !== undefined ? customRate : plan.maxCommissionRate;
  const totalTurnCollection = params.contributionAmount * params.memberCount;
  const commissionPerContribution = Math.round(params.contributionAmount * rateApplied);
  const totalTurnCommission = commissionPerContribution * params.memberCount;
  const netTontinePayout = totalTurnCollection - totalTurnCommission;
  
  // Frais techniques estimés (ex: 0.5% ou passerelle Mobile Money)
  const estimatedPlatformFee = Math.round(totalTurnCollection * 0.005);
  
  let cyclesPerMonth = 1;
  if (params.frequency === 'DAILY') cyclesPerMonth = 26; // ~26 jours ouvrés
  if (params.frequency === 'WEEKLY') cyclesPerMonth = 4;
  if (params.frequency === 'MONTHLY') cyclesPerMonth = 1;

  const monthlyEstimatedCommission = totalTurnCommission * cyclesPerMonth;
  const monthlySubscriptionCost = plan.monthlyPrice;
  const netManagerMonthlyProfit = monthlyEstimatedCommission - monthlySubscriptionCost;

  return {
    plan,
    rateApplied,
    ratePercentage: formatPercent(rateApplied),
    totalTurnCollection,
    commissionPerContribution,
    totalTurnCommission,
    netTontinePayout,
    estimatedPlatformFee,
    managerNetEarnings: totalTurnCommission,
    cyclesPerMonth,
    monthlyEstimatedCommission,
    monthlySubscriptionCost,
    netManagerMonthlyProfit,
  };
}

export function generateLedgerEntries(
  contributionAmount: number,
  rateApplied: number
): LedgerPreviewEntry[] {
  const managerComm = Math.round(contributionAmount * rateApplied);
  const platformFee = Math.round(contributionAmount * 0.005);
  const netToTontine = contributionAmount - managerComm - platformFee;

  return [
    {
      accountCode: '411_PAYMENT_GATEWAY',
      accountName: 'Fournisseur Paiement (Mobile Money / CinetPay)',
      entryType: 'CONTRIBUTION',
      debit: contributionAmount,
      credit: 0,
      description: `Encaissement cotisation membre (${formatCurrency(contributionAmount)})`,
    },
    {
      accountCode: '467_TONTINE_POOL',
      accountName: 'Compte de Dépôt Tontine (Cagnotte membres)',
      entryType: 'CONTRIBUTION',
      debit: 0,
      credit: netToTontine,
      description: `Part nette reversée à la cagnotte tontine`,
    },
    {
      accountCode: '468_MANAGER_WALLET',
      accountName: 'Wallet Gestionnaire (Commission)',
      entryType: 'COMMISSION_MANAGER',
      debit: 0,
      credit: managerComm,
      description: `Commission gestionnaire (${formatPercent(rateApplied)})`,
    },
    {
      accountCode: '706_PLATFORM_FEE',
      accountName: 'Revenus Plateforme (Frais de service)',
      entryType: 'PLATFORM_FEE',
      debit: 0,
      credit: platformFee,
      description: `Frais techniques d'infrastructure (0.5%)`,
    },
  ];
}

export function generateSQLScript(plans: PlanConfig[]): string {
  return `-- ============================================================
-- MIGRATION SQL : Mise à jour des taux de commission par plan
-- Base de données : PostgreSQL
-- Taux configurés :
--   - FREE     : 1.5% (0.0150)
--   - STARTER  : 2.5% (0.0250)
--   - PREMIUM  : 3.0% (0.0300)
--   - BUSINESS : 3.5% (0.0350)
-- ============================================================

BEGIN;

-- 1. Mise à jour des plans d'abonnement (subscription_plans)
${plans
  .map(
    (p) =>
      `UPDATE subscription_plans \nSET max_commission_rate = ${(p.maxCommissionRate).toFixed(4)}, \n    commission_enabled = true\nWHERE code = '${p.code}';`
  )
  .join('\n\n')}

-- 2. Mise à jour ou insertion des règles par défaut (commission_rules)
${plans
  .map(
    (p) =>
      `UPDATE commission_rules 
SET rate = ${(p.maxCommissionRate).toFixed(4)}
WHERE subscription_plan_id IN (
  SELECT id FROM subscription_plans WHERE code = '${p.code}'
) AND active = true;`
  )
  .join('\n\n')}

COMMIT;
`;
}

export function generatePrismaSeed(plans: PlanConfig[]): string {
  return `import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const SUBSCRIPTION_PLANS = [
${plans
  .map(
    (p) => `  {
    code: '${p.code}',
    name: '${p.name}',
    monthlyPrice: BigInt(${p.monthlyPrice}),
    maxTontines: ${p.maxTontines === null ? 'null' : p.maxTontines},
    maxMembers: ${p.maxMembers === null ? 'null' : p.maxMembers},
    commissionEnabled: true,
    maxCommissionRate: new Prisma.Decimal('${(p.maxCommissionRate).toFixed(4)}'), // ${formatPercent(p.maxCommissionRate)}
    active: true,
  }`
  )
  .join(',\n')}
];

async function main() {
  console.log('Mise à jour des plans avec les nouveaux pourcentages de commission...');

  for (const plan of SUBSCRIPTION_PLANS) {
    const savedPlan = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        maxCommissionRate: plan.maxCommissionRate,
        commissionEnabled: plan.commissionEnabled,
        monthlyPrice: plan.monthlyPrice,
        maxTontines: plan.maxTontines,
        maxMembers: plan.maxMembers,
      },
      create: plan,
    });

    console.log(\`✓ Plan \${savedPlan.code} configuré avec commission max : \${savedPlan.maxCommissionRate} (\${Number(savedPlan.maxCommissionRate) * 100}%)\`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
}
