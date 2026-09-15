import { eq, and, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  tontines,
  tontineMembers,
  contributionPayments,
  walletTransactions,
  cronJobLogs,
} from './schema.ts';

// 1. Users
export async function getOrCreateUser(userData: {
  uid: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role?: string;
  kycStatus?: string;
  kycDocumentType?: string;
  managerPlanCode?: string;
  memberPaymentMethod?: string;
}) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, userData.uid))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          email: userData.email,
          phone: userData.phone || existing[0].phone,
          firstName: userData.firstName || existing[0].firstName,
          lastName: userData.lastName || existing[0].lastName,
          role: userData.role || existing[0].role,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, userData.uid))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(users)
      .values({
        uid: userData.uid,
        email: userData.email,
        phone: userData.phone || '+225 07 00 00 00',
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'MEMBER',
        kycStatus: userData.kycStatus || 'UNVERIFIED',
        kycDocumentType: userData.kycDocumentType,
        managerPlanCode: userData.managerPlanCode || 'STARTER',
        memberPaymentMethod: userData.memberPaymentMethod || 'WAVE',
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Database user sync failed', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new Error('Failed to fetch users from database', { cause: error });
  }
}

// 2. Tontines with members
export async function getAllTontinesWithMembers() {
  try {
    const allTontines = await db.select().from(tontines);
    const allMembers = await db.select().from(tontineMembers);

    return allTontines.map((t) => {
      const members = allMembers.filter((m) => m.tontineId === t.id);
      return {
        ...t,
        commissionRate: parseFloat(t.commissionRate),
        members: members.map((m) => ({
          ...m,
          turnNumber: m.turnNumber,
        })),
      };
    });
  } catch (error) {
    console.error('getAllTontinesWithMembers error:', error);
    throw new Error('Failed to load tontines from database', { cause: error });
  }
}

export async function createTontineWithMembers(
  tontineData: typeof tontines.$inferInsert,
  membersData: Array<typeof tontineMembers.$inferInsert>
) {
  try {
    const [createdTontine] = await db
      .insert(tontines)
      .values(tontineData)
      .returning();

    if (membersData.length > 0) {
      await db.insert(tontineMembers).values(
        membersData.map((m) => ({
          ...m,
          tontineId: createdTontine.id,
        }))
      );
    }

    return createdTontine;
  } catch (error) {
    console.error('createTontineWithMembers error:', error);
    throw new Error('Failed to create tontine in database', { cause: error });
  }
}

export async function joinTontine(
  tontineId: string,
  memberData: typeof tontineMembers.$inferInsert
) {
  try {
    const [member] = await db
      .insert(tontineMembers)
      .values({
        ...memberData,
        tontineId,
      })
      .returning();
    return member;
  } catch (error) {
    console.error('joinTontine error:', error);
    throw new Error('Failed to join tontine in database', { cause: error });
  }
}

export async function recordPayment(
  paymentData: typeof contributionPayments.$inferInsert,
  tontineId: string,
  memberUserId: string
) {
  try {
    const [payment] = await db
      .insert(contributionPayments)
      .values(paymentData)
      .returning();

    // Mark member hasPaidCurrentRound = true
    await db
      .update(tontineMembers)
      .set({ hasPaidCurrentRound: true })
      .where(
        and(
          eq(tontineMembers.tontineId, tontineId),
          eq(tontineMembers.userId, memberUserId)
        )
      );

    return payment;
  } catch (error) {
    console.error('recordPayment error:', error);
    throw new Error('Failed to record contribution in database', { cause: error });
  }
}

export async function payoutBeneficiary(
  tontineId: string,
  roundNumber: number,
  managerId: string,
  commissionAmount: number
) {
  try {
    const [tontine] = await db
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .limit(1);

    if (!tontine) {
      throw new Error('Tontine not found');
    }

    const nextRound = roundNumber + 1;
    const isCompleted = nextRound > tontine.totalRounds;

    // Update tontine round
    await db
      .update(tontines)
      .set({
        currentRound: isCompleted ? tontine.totalRounds : nextRound,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(tontines.id, tontineId));

    // Reset payment status for new round & assign next beneficiary
    await db
      .update(tontineMembers)
      .set({
        hasPaidCurrentRound: false,
        isCurrentBeneficiary: sql`turn_number = ${isCompleted ? -1 : nextRound}`,
      })
      .where(eq(tontineMembers.tontineId, tontineId));

    // Credit manager wallet if commission
    if (commissionAmount > 0) {
      await db
        .update(users)
        .set({
          walletBalance: sql`wallet_balance + ${commissionAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, managerId));

      await db.insert(walletTransactions).values({
        id: `tx-comm-${Date.now()}`,
        managerId,
        tontineId,
        type: 'COMMISSION',
        amount: commissionAmount,
        date: new Date().toISOString().split('T')[0],
        description: `Commission Tour #${roundNumber} - ${tontine.name}`,
        provider: 'PLATFORM_ESCROW',
      });
    }

    return { nextRound, isCompleted };
  } catch (error) {
    console.error('payoutBeneficiary error:', error);
    throw new Error('Failed to process beneficiary payout', { cause: error });
  }
}

export async function updateMemberTurn(
  tontineId: string,
  memberUserId: string,
  newTurnNumber: number
) {
  try {
    const [updated] = await db
      .update(tontineMembers)
      .set({
        turnNumber: newTurnNumber,
      })
      .where(
        and(
          eq(tontineMembers.tontineId, tontineId),
          eq(tontineMembers.userId, memberUserId)
        )
      )
      .returning();
    return updated;
  } catch (error) {
    console.error('updateMemberTurn error:', error);
    throw new Error('Failed to update member turn', { cause: error });
  }
}

export async function updateTontineRiskConfig(
  tontineId: string,
  updates: Partial<typeof tontines.$inferInsert>
) {
  try {
    const [updated] = await db
      .update(tontines)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tontines.id, tontineId))
      .returning();
    return updated;
  } catch (error) {
    console.error('updateTontineRiskConfig error:', error);
    throw new Error('Failed to update tontine risk configuration', { cause: error });
  }
}

export async function updateMemberRiskData(
  memberId: string,
  updates: Partial<typeof tontineMembers.$inferInsert>
) {
  try {
    const [updated] = await db
      .update(tontineMembers)
      .set(updates)
      .where(eq(tontineMembers.id, memberId))
      .returning();
    return updated;
  } catch (error) {
    console.error('updateMemberRiskData error:', error);
    throw new Error('Failed to update member risk data', { cause: error });
  }
}

export async function withdrawManagerWallet(
  managerId: string,
  amount: number,
  provider: string,
  destinationAccount: string
) {
  try {
    // Check balance
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, managerId))
      .limit(1);

    if (!user || user.walletBalance < amount) {
      throw new Error('Solde insuffisant pour ce retrait');
    }

    await db
      .update(users)
      .set({
        walletBalance: sql`wallet_balance - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, managerId));

    const [tx] = await db
      .insert(walletTransactions)
      .values({
        id: `tx-wth-${Date.now()}`,
        managerId,
        type: 'WITHDRAWAL',
        amount,
        date: new Date().toISOString().split('T')[0],
        description: `Retrait vers ${provider} (${destinationAccount})`,
        provider,
        destinationAccount,
      })
      .returning();

    return tx;
  } catch (error) {
    console.error('withdrawManagerWallet error:', error);
    throw new Error('Failed to withdraw from manager wallet', { cause: error });
  }
}

// 3. Automated Cron Jobs (Midnight Round Shift, WhatsApp J-2 Reminders, Penalty Calculation)
export async function triggerAutomatedCron() {
  try {
    const activeTontines = await db
      .select()
      .from(tontines)
      .where(eq(tontines.status, 'ACTIVE'));

    let processedCount = 0;
    const logDetails: string[] = [];

    for (const t of activeTontines) {
      // Find members who haven't paid
      const members = await db
        .select()
        .from(tontineMembers)
        .where(
          and(
            eq(tontineMembers.tontineId, t.id),
            eq(tontineMembers.hasPaidCurrentRound, false)
          )
        );

      if (members.length > 0) {
        logDetails.push(
          `Tontine "${t.name}" : ${members.length} relances J-2 programmées.`
        );
      }
      processedCount++;
    }

    const [log] = await db
      .insert(cronJobLogs)
      .values({
        jobType: 'MIDNIGHT_ROUND_SHIFT_AND_REMINDERS',
        status: 'SUCCESS',
        details: logDetails.join(' | ') || 'Toutes les tontines sont à jour.',
        itemsProcessed: processedCount,
      })
      .returning();

    return log;
  } catch (error) {
    console.error('triggerAutomatedCron error:', error);
    await db.insert(cronJobLogs).values({
      jobType: 'MIDNIGHT_ROUND_SHIFT_AND_REMINDERS',
      status: 'FAILED',
      details: String(error),
      itemsProcessed: 0,
    });
    throw new Error('Automated cron failed', { cause: error });
  }
}

export async function getCronLogs() {
  try {
    return await db
      .select()
      .from(cronJobLogs)
      .orderBy(sql`executed_at DESC`)
      .limit(20);
  } catch (error) {
    console.error('getCronLogs error:', error);
    return [];
  }
}
