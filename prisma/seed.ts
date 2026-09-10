/**
 * Seed database with updated subscription plans & commission rates:
 * - FREE: 1.5% (max_commission_rate: 0.0150)
 * - STARTER: 2.5% (max_commission_rate: 0.0250)
 * - PREMIUM: 3.0% (max_commission_rate: 0.0300)
 * - BUSINESS: 3.5% (max_commission_rate: 0.0350)
 */

export const SUBSCRIPTION_PLANS_SEED = [
  {
    code: 'FREE',
    name: 'Plan Gratuit',
    monthlyPrice: 0n,
    maxTontines: 1,
    maxMembers: 15,
    commissionEnabled: true,
    maxCommissionRate: '0.0150', // 1.5%
    active: true,
  },
  {
    code: 'STARTER',
    name: 'Plan Starter',
    monthlyPrice: 2500n, // 2 500 XOF
    maxTontines: 5,
    maxMembers: 50,
    commissionEnabled: true,
    maxCommissionRate: '0.0250', // 2.5%
    active: true,
  },
  {
    code: 'PREMIUM',
    name: 'Plan Premium',
    monthlyPrice: 5000n, // 5 000 XOF
    maxTontines: 20,
    maxMembers: 200,
    commissionEnabled: true,
    maxCommissionRate: '0.0300', // 3.0%
    active: true,
  },
  {
    code: 'BUSINESS',
    name: 'Plan Business',
    monthlyPrice: 10000n, // 10 000 XOF
    maxTontines: null, // Illimité
    maxMembers: null, // Illimité
    commissionEnabled: true,
    maxCommissionRate: '0.0350', // 3.5%
    active: true,
  },
];

/*
Example Prisma seed function:

import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  for (const plan of SUBSCRIPTION_PLANS_SEED) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        maxTontines: plan.maxTontines,
        maxMembers: plan.maxMembers,
        commissionEnabled: plan.commissionEnabled,
        maxCommissionRate: new Prisma.Decimal(plan.maxCommissionRate),
        active: plan.active,
      },
      create: {
        code: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        maxTontines: plan.maxTontines,
        maxMembers: plan.maxMembers,
        commissionEnabled: plan.commissionEnabled,
        maxCommissionRate: new Prisma.Decimal(plan.maxCommissionRate),
        active: plan.active,
      },
    });
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
*/
