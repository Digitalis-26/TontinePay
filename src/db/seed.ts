import { eq, and, isNull } from 'drizzle-orm';
import { db } from './index.ts';
import { users, tontines, tontineMembers, contributionPayments, walletTransactions } from './schema.ts';
import { INITIAL_TONTINES, INITIAL_CONTRIBUTION_PAYMENTS, INITIAL_WALLET_TRANSACTIONS } from '../data/tontines.ts';
import { hashPassword } from '../server/security.ts';

export async function seedInitialDataIfEmpty() {
  try {
    const defaultSeedPasswordHash = hashPassword(process.env.SEED_DEMO_PASSWORD || 'Tontine2026!');

    // Ensure seeded accounts have a scrypt password hash if migrated from pre-hardening schema
    for (const seedUid of ['usr-mgr-001', 'usr-mbr-001', 'usr-mbr-002']) {
      await db
        .update(users)
        .set({ passwordHash: defaultSeedPasswordHash })
        .where(and(eq(users.uid, seedUid), isNull(users.passwordHash)));
    }

    const existing = await db.select().from(tontines).limit(1);
    if (existing.length > 0) {
      return; // Already seeded
    }

    console.log('Seeding initial tontine and user data into Cloud SQL PostgreSQL...');

    // Seed default users
    const defaultUsers = [
      {
        uid: 'usr-mgr-001',
        email: 'awa.diop@teranga.sn',
        phone: '+221 77 123 45 67',
        passwordHash: defaultSeedPasswordHash,
        firstName: 'Awa',
        lastName: 'Diop',
        role: 'MANAGER',
        kycStatus: 'VERIFIED',
        kycDocumentType: 'PASSPORT',
        walletBalance: 87500,
        managerPlanCode: 'STARTER',
      },
      {
        uid: 'usr-mbr-001',
        email: 'fatou.ndiaye@gmail.com',
        phone: '+221 70 890 12 34',
        passwordHash: defaultSeedPasswordHash,
        firstName: 'Fatou',
        lastName: 'Ndiaye',
        role: 'MEMBER',
        kycStatus: 'VERIFIED',
        kycDocumentType: 'CNI',
        memberPaymentMethod: 'MOOV_MONEY',
      },
      {
        uid: 'usr-mbr-002',
        email: 'koffi.kouame@gmail.com',
        phone: '+225 07 45 67 89',
        passwordHash: defaultSeedPasswordHash,
        firstName: 'Koffi',
        lastName: 'Kouamé',
        role: 'MEMBER',
        kycStatus: 'PENDING',
        memberPaymentMethod: 'ORANGE_MONEY',
      },
    ];

    for (const u of defaultUsers) {
      await db
        .insert(users)
        .values(u)
        .onConflictDoNothing({ target: users.uid });
    }

    // Seed tontines and their members
    for (const t of INITIAL_TONTINES) {
      await db.insert(tontines).values({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.name,
        managerId: t.managerId,
        contributionAmount: t.contributionAmount,
        totalRounds: t.totalRounds,
        currentRound: t.currentRound,
        frequency: t.periodicity,
        commissionRate: String(t.commissionRate),
        status: t.status,
        cautionRequired: t.escrowCautionEnabled ?? true,
        cautionAmount: t.cautionPerMember ?? t.contributionAmount,
        latePenaltyPerDay: t.penaltyPerDay ?? 500,
        lateGraceDays: t.gracePeriodDays ?? 2,
        penaltyRecipient: t.penaltyDestination === 'MANAGER' ? 'MANAGER' : 'POT',
        requireGuarantorForEarlyRounds: t.guarantorRequiredForPriorityRounds ?? true,
        totalEscrowAmount: t.totalEscrowHeld ?? 0,
      }).onConflictDoNothing({ target: tontines.id });

      for (const m of t.members) {
        await db.insert(tontineMembers).values({
          id: m.id,
          tontineId: t.id,
          userId: m.userId,
          name: m.name,
          phone: m.phone,
          turnNumber: m.turnNumber,
          hasPaidCurrentRound: m.hasPaidCurrentRound,
          isCurrentBeneficiary: m.isCurrentBeneficiary,
          paymentMethod: m.paymentMethod,
          cautionStatus: m.cautionStatus || 'ESCROWED',
          cautionAmount: m.cautionAmount,
          guarantorName: m.guarantorName,
          guarantorPhone: m.guarantorPhone,
          guarantorVerified: m.guarantorStatus === 'VERIFIED',
          tontineScore: m.tontineScore || 95,
        }).onConflictDoNothing({ target: tontineMembers.id });
      }
    }

    // Seed payments
    for (const p of INITIAL_CONTRIBUTION_PAYMENTS) {
      await db.insert(contributionPayments).values({
        id: p.id,
        tontineId: p.tontineId,
        memberUserId: p.userId,
        memberName: p.userId,
        roundNumber: p.roundNumber,
        amount: p.amount,
        date: p.paidAt,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef,
        status: p.status,
      }).onConflictDoNothing({ target: contributionPayments.id });
    }

    // Seed wallet transactions
    for (const w of INITIAL_WALLET_TRANSACTIONS) {
      await db.insert(walletTransactions).values({
        id: w.id,
        managerId: w.managerId,
        tontineId: null,
        type: w.type,
        amount: w.amount,
        date: w.date,
        description: w.description,
        provider: w.provider || null,
        destinationAccount: w.account || null,
      }).onConflictDoNothing({ target: walletTransactions.id });
    }

    console.log('Database seeded successfully with initial tontines and users.');
  } catch (err) {
    console.error('Initial seeding warning (non-fatal):', err);
  }
}
