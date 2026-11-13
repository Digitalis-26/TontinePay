import crypto from 'crypto';
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
import {
  AppSecurityError,
  assertPositiveIntegerAmount,
  hashPassword,
  verifyPassword,
  sanitizeUserForPublic,
  pickAllowedTontineRiskUpdates,
  pickAllowedMemberRiskUpdates,
} from '../server/security.ts';

const PUBLIC_USER_COLUMNS = {
  id: users.id,
  uid: users.uid,
  email: users.email,
  phone: users.phone,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  kycStatus: users.kycStatus,
  kycDocumentType: users.kycDocumentType,
  walletBalance: users.walletBalance,
  managerPlanCode: users.managerPlanCode,
  memberPaymentMethod: users.memberPaymentMethod,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\.\(\)]/g, '');
}

const ALLOWED_PAYMENT_METHODS = new Set(['MOOV_MONEY', 'ORANGE_MONEY']);

function sanitizePaymentMethod(method?: string): 'MOOV_MONEY' | 'ORANGE_MONEY' {
  if (method && ALLOWED_PAYMENT_METHODS.has(method)) {
    return method as 'MOOV_MONEY' | 'ORANGE_MONEY';
  }
  return 'ORANGE_MONEY';
}

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT (HASHED PASSWORDS + SAFE PROJECTION)
// ============================================================================

export async function registerUserAuth(input: {
  email?: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'MANAGER' | 'MEMBER';
  managerPlanCode?: string;
  memberPaymentMethod?: string;
}) {
  if (!input.phone || normalizePhone(input.phone).length < 8) {
    throw new AppSecurityError('Numéro de téléphone invalide (minimum 8 chiffres).', 400);
  }
  if (!input.password || input.password.length < 6) {
    throw new AppSecurityError('Le mot de passe doit contenir au moins 6 caractères.', 400);
  }
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    throw new AppSecurityError('Le prénom et le nom sont obligatoires.', 400);
  }
  const role = input.role === 'MANAGER' ? 'MANAGER' : 'MEMBER';
  const cleanEmail = (input.email?.trim() || `${normalizePhone(input.phone)}@tontine.local`).toLowerCase();
  const cleanPhone = input.phone.trim();
  const passwordHash = hashPassword(input.password);
  const uid = `usr-${role.toLowerCase()}-${crypto.randomUUID().slice(0, 12)}`;

  return await db.transaction(async (tx) => {
    const existingUsers = await tx
      .select({
        uid: users.uid,
        email: users.email,
        phone: users.phone,
      })
      .from(users);

    const normInputPhone = normalizePhone(cleanPhone);
    const conflict = existingUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (u.phone && normalizePhone(u.phone) === normInputPhone)
    );
    if (conflict) {
      throw new AppSecurityError(
        'Un compte existe déjà avec cette adresse email ou ce numéro de téléphone.',
        409
      );
    }

    const [inserted] = await tx
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role,
        kycStatus: 'UNVERIFIED',
        walletBalance: 0,
        managerPlanCode: input.managerPlanCode || 'STARTER',
        memberPaymentMethod: sanitizePaymentMethod(input.memberPaymentMethod),
      })
      .returning(PUBLIC_USER_COLUMNS);

    return inserted;
  });
}

export async function authenticateUserAuth(identifier: string, password: string) {
  if (!identifier?.trim() || !password) {
    throw new AppSecurityError('Identifiant et mot de passe requis.', 400);
  }

  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');
  const cleanEmail = trimmed.toLowerCase();
  const normPhone = normalizePhone(trimmed);

  const allUsers = await db.select().from(users);
  const matched = allUsers.find((u) => {
    if (isEmail) {
      return u.email.toLowerCase() === cleanEmail;
    }
    if (!u.phone) return false;
    const uPhone = normalizePhone(u.phone);
    return uPhone === normPhone || (normPhone.length >= 8 && uPhone.endsWith(normPhone.slice(-8)));
  });

  if (!matched || !verifyPassword(password, matched.passwordHash)) {
    return null;
  }

  return sanitizeUserForPublic(matched);
}

export async function getUserByUid(uid: string) {
  const [user] = await db
    .select(PUBLIC_USER_COLUMNS)
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return user || null;
}

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
          // Never elevate role or overwrite walletBalance via sync
          kycStatus:
            userData.kycStatus && ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'].includes(userData.kycStatus)
              ? userData.kycStatus
              : existing[0].kycStatus,
          kycDocumentType: userData.kycDocumentType ?? existing[0].kycDocumentType,
          managerPlanCode: userData.managerPlanCode ?? existing[0].managerPlanCode,
          memberPaymentMethod: userData.memberPaymentMethod ?? existing[0].memberPaymentMethod,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, userData.uid))
        .returning(PUBLIC_USER_COLUMNS);
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
        role: userData.role === 'MANAGER' ? 'MANAGER' : 'MEMBER',
        kycStatus: 'UNVERIFIED',
        kycDocumentType: userData.kycDocumentType,
        managerPlanCode: userData.managerPlanCode || 'STARTER',
        memberPaymentMethod: sanitizePaymentMethod(userData.memberPaymentMethod),
      })
      .returning(PUBLIC_USER_COLUMNS);
    return inserted;
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new AppSecurityError('Échec de synchronisation du profil utilisateur.', 500);
  }
}

export async function getAllUsers() {
  try {
    return await db.select(PUBLIC_USER_COLUMNS).from(users);
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new AppSecurityError('Impossible de récupérer la liste des utilisateurs.', 500);
  }
}

// ============================================================================
// 2. TONTINES & ACID FINANCIAL TRANSACTIONS
// ============================================================================

export async function getAllTontinesWithMembers(scopedUserId?: string) {
  try {
    const allTontines = await db.select().from(tontines);
    const allMembers = await db.select().from(tontineMembers);

    const mapped = allTontines.map((t) => {
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

    if (scopedUserId) {
      return mapped.filter(
        (t) =>
          t.managerId === scopedUserId ||
          t.members.some((m) => m.userId === scopedUserId)
      );
    }

    return mapped;
  } catch (error) {
    console.error('getAllTontinesWithMembers error:', error);
    throw new AppSecurityError('Impossible de charger les tontines.', 500);
  }
}

export async function createTontineWithMembers(
  tontineData: typeof tontines.$inferInsert,
  membersData: Array<typeof tontineMembers.$inferInsert>,
  authenticatedUid?: string
) {
  if (authenticatedUid && tontineData.managerId !== authenticatedUid) {
    throw new AppSecurityError(
      'Accès refusé : impossible de créer une tontine au nom d\'un autre gestionnaire.',
      403
    );
  }

  assertPositiveIntegerAmount(tontineData.contributionAmount, 'contributionAmount', 500, 50_000_000);
  assertPositiveIntegerAmount(tontineData.totalRounds, 'totalRounds', 2, 100);

  const parsedRate = parseFloat(String(tontineData.commissionRate ?? '0.025'));
  if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 0.1) {
    throw new AppSecurityError('Taux de commission invalide (autorisé : 0% à 10%).', 400);
  }

  return await db.transaction(async (tx) => {
    const [createdTontine] = await tx
      .insert(tontines)
      .values({
        ...tontineData,
        managerId: authenticatedUid || tontineData.managerId,
        currentRound: 1,
        status: 'ACTIVE',
      })
      .returning();

    if (membersData.length > 0) {
      const seenTurns = new Set<number>();
      for (const m of membersData) {
        if (m.turnNumber < 1 || m.turnNumber > createdTontine.totalRounds || seenTurns.has(m.turnNumber)) {
          throw new AppSecurityError(`Numéro de tour invalide ou en double : ${m.turnNumber}`, 400);
        }
        seenTurns.add(m.turnNumber);
      }

      await tx.insert(tontineMembers).values(
        membersData.map((m) => ({
          ...m,
          tontineId: createdTontine.id,
        }))
      );
    }

    return createdTontine;
  });
}

export async function joinTontine(
  tontineId: string,
  memberData: Omit<typeof tontineMembers.$inferInsert, 'tontineId'>,
  authenticatedUid: string
) {
  return await db.transaction(async (tx) => {
    const lockedTontines = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .for('update');

    const tontine = lockedTontines[0];
    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }
    if (tontine.status !== 'ACTIVE') {
      throw new AppSecurityError('Cette tontine n\'accepte plus de nouveaux membres.', 400);
    }

    const existingMembers = await tx
      .select()
      .from(tontineMembers)
      .where(eq(tontineMembers.tontineId, tontineId));

    if (existingMembers.some((m) => m.userId === authenticatedUid)) {
      throw new AppSecurityError('Vous êtes déjà inscrit dans cette tontine.', 409);
    }

    if (existingMembers.length >= tontine.totalRounds) {
      throw new AppSecurityError('Capacité maximale de la tontine atteinte.', 409);
    }

    const occupiedTurns = new Set(existingMembers.map((m) => m.turnNumber));
    let assignedTurn = memberData.turnNumber;
    if (
      !Number.isInteger(assignedTurn) ||
      assignedTurn < 1 ||
      assignedTurn > tontine.totalRounds ||
      occupiedTurns.has(assignedTurn)
    ) {
      assignedTurn = 0;
      for (let i = 1; i <= tontine.totalRounds; i++) {
        if (!occupiedTurns.has(i)) {
          assignedTurn = i;
          break;
        }
      }
      if (assignedTurn === 0) {
        throw new AppSecurityError('Aucun tour disponible dans cette tontine.', 409);
      }
    }

    const [member] = await tx
      .insert(tontineMembers)
      .values({
        ...memberData,
        id: memberData.id || `tm-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        tontineId,
        userId: authenticatedUid,
        turnNumber: assignedTurn,
        isCurrentBeneficiary: assignedTurn === tontine.currentRound,
      })
      .returning();

    return member;
  });
}

export async function recordPayment(
  paymentData: typeof contributionPayments.$inferInsert,
  tontineId: string,
  memberUserId: string
) {
  assertPositiveIntegerAmount(paymentData.amount, 'amount', 1, 100_000_000);
  const roundNumber = assertPositiveIntegerAmount(
    paymentData.roundNumber,
    'roundNumber',
    1,
    1000
  );

  return await db.transaction(async (tx) => {
    const lockedTontines = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .for('update');

    const tontine = lockedTontines[0];
    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }
    if (tontine.status !== 'ACTIVE') {
      throw new AppSecurityError('Impossible d\'enregistrer un paiement sur une tontine clôturée.', 400);
    }

    const [membership] = await tx
      .select()
      .from(tontineMembers)
      .where(
        and(
          eq(tontineMembers.tontineId, tontineId),
          eq(tontineMembers.userId, memberUserId)
        )
      )
      .for('update');

    if (!membership) {
      throw new AppSecurityError(
        'Violation BOLA : Vous n\'êtes pas inscrit comme cotisant dans cette tontine.',
        403
      );
    }

    if (roundNumber !== tontine.currentRound) {
      throw new AppSecurityError(
        `Tour invalide : le tour actif de cette tontine est le Tour #${tontine.currentRound}.`,
        409
      );
    }

    const existingPayment = await tx
      .select()
      .from(contributionPayments)
      .where(
        and(
          eq(contributionPayments.tontineId, tontineId),
          eq(contributionPayments.memberUserId, memberUserId),
          eq(contributionPayments.roundNumber, roundNumber)
        )
      )
      .limit(1);

    if (existingPayment.length > 0) {
      throw new AppSecurityError(
        `Doublon bloqué (idempotence) : la cotisation du Tour #${roundNumber} est déjà enregistrée.`,
        409
      );
    }

    const [payment] = await tx
      .insert(contributionPayments)
      .values({
        ...paymentData,
        id: paymentData.id || `pay-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        tontineId,
        memberUserId,
        memberName: paymentData.memberName || membership.name || 'Cotisant',
        roundNumber,
        amount: paymentData.amount,
        date: paymentData.date || new Date().toISOString(),
        paymentMethod:
          paymentData.paymentMethod === 'SASPAY'
            ? 'SASPAY'
            : sanitizePaymentMethod(paymentData.paymentMethod || membership.paymentMethod),
        transactionRef: paymentData.transactionRef || `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        status: paymentData.status || 'SUCCESS',
      })
      .returning();

    await tx
      .update(tontineMembers)
      .set({ hasPaidCurrentRound: true })
      .where(eq(tontineMembers.id, membership.id));

    return payment;
  });
}

export async function payoutBeneficiary(
  tontineId: string,
  roundNumber: number,
  authenticatedManagerId: string,
  _clientCommissionOverride?: number
) {
  assertPositiveIntegerAmount(roundNumber, 'roundNumber', 1, 1000);

  return await db.transaction(async (tx) => {
    // 1. Lock tontine row exclusively (FOR UPDATE) to prevent concurrent double payout
    const lockedTontines = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .for('update');

    const tontine = lockedTontines[0];
    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }

    // 2. Strict Anti-IDOR ownership verification
    if (tontine.managerId !== authenticatedManagerId) {
      throw new AppSecurityError(
        'Violation IDOR : Seul le gestionnaire créateur de cette tontine peut verser la cagnotte.',
        403
      );
    }

    // 3. Enforce round state invariant (no double payout / replay on completed round)
    if (tontine.status !== 'ACTIVE') {
      throw new AppSecurityError('Cette tontine est déjà clôturée.', 409);
    }
    if (tontine.currentRound !== roundNumber) {
      throw new AppSecurityError(
        `Tour déjà traité ou invalide : le tour courant est #${tontine.currentRound}, pas #${roundNumber}.`,
        409
      );
    }

    // 4. Verify beneficiary exists for this round
    const members = await tx
      .select()
      .from(tontineMembers)
      .where(eq(tontineMembers.tontineId, tontineId));

    const beneficiary = members.find((m) => m.turnNumber === roundNumber);
    if (!beneficiary) {
      throw new AppSecurityError(
        `Aucun membre cotisant assigné au Tour #${roundNumber}.`,
        400
      );
    }

    // 5. Server-side deterministic commission calculation (never trust arbitrary client numbers)
    const potAmount = tontine.contributionAmount * members.length;
    const commissionRate = parseFloat(tontine.commissionRate) || 0;
    const serverCommissionAmount = Math.round(potAmount * commissionRate);

    const nextRound = roundNumber + 1;
    const isCompleted = nextRound > tontine.totalRounds;

    // 6. Atomically advance tontine round
    await tx
      .update(tontines)
      .set({
        currentRound: isCompleted ? tontine.totalRounds : nextRound,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(tontines.id, tontineId));

    // 7. Atomically reset payments & reassign next beneficiary
    await tx
      .update(tontineMembers)
      .set({
        hasPaidCurrentRound: false,
        isCurrentBeneficiary: sql`turn_number = ${isCompleted ? -1 : nextRound}`,
      })
      .where(eq(tontineMembers.tontineId, tontineId));

    // 8. Lock manager row and credit wallet + ledger transaction atomically
    let newBalance: number | undefined;
    if (serverCommissionAmount > 0) {
      const [manager] = await tx
        .select()
        .from(users)
        .where(eq(users.uid, authenticatedManagerId))
        .for('update');

      if (!manager) {
        throw new AppSecurityError('Compte gestionnaire introuvable pour le crédit de commission.', 404);
      }

      const [updatedManager] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance} + ${serverCommissionAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, authenticatedManagerId))
        .returning({ walletBalance: users.walletBalance });

      newBalance = updatedManager.walletBalance;

      await tx.insert(walletTransactions).values({
        id: `tx-comm-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        managerId: authenticatedManagerId,
        tontineId,
        type: 'COMMISSION',
        amount: serverCommissionAmount,
        balanceAfter: newBalance,
        date: new Date().toISOString().split('T')[0],
        description: `Commission Tour #${roundNumber} - ${tontine.name}`,
        provider: 'PLATFORM_ESCROW',
        status: 'COMPLETED',
      });
    }

    return {
      nextRound: isCompleted ? tontine.totalRounds : nextRound,
      isCompleted,
      commissionCredited: serverCommissionAmount,
      balanceAfter: newBalance,
    };
  });
}

export async function updateMemberTurn(
  tontineId: string,
  memberUserId: string,
  newTurnNumber: number,
  authenticatedUid: string
) {
  assertPositiveIntegerAmount(newTurnNumber, 'newTurnNumber', 1, 1000);

  return await db.transaction(async (tx) => {
    const lockedTontines = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .for('update');

    const tontine = lockedTontines[0];
    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }

    if (authenticatedUid !== memberUserId && authenticatedUid !== tontine.managerId) {
      throw new AppSecurityError(
        'Accès refusé : vous ne pouvez modifier que votre propre tour ou ceux de vos tontines.',
        403
      );
    }

    if (newTurnNumber > tontine.totalRounds) {
      throw new AppSecurityError(
        `Le tour doit être compris entre 1 et ${tontine.totalRounds}.`,
        400
      );
    }

    const members = await tx
      .select()
      .from(tontineMembers)
      .where(eq(tontineMembers.tontineId, tontineId))
      .for('update');

    const targetMember = members.find((m) => m.userId === memberUserId);
    if (!targetMember) {
      throw new AppSecurityError('Membre non inscrit dans cette tontine.', 404);
    }

    const conflict = members.find(
      (m) => m.turnNumber === newTurnNumber && m.userId !== memberUserId
    );
    if (conflict) {
      throw new AppSecurityError(
        `Le Tour #${newTurnNumber} est déjà occupé par ${conflict.name}.`,
        409
      );
    }

    const [updated] = await tx
      .update(tontineMembers)
      .set({
        turnNumber: newTurnNumber,
        isCurrentBeneficiary: newTurnNumber === tontine.currentRound,
      })
      .where(eq(tontineMembers.id, targetMember.id))
      .returning();

    return updated;
  });
}

export async function updateTontineRiskConfig(
  tontineId: string,
  rawUpdates: Record<string, any>,
  authenticatedManagerId: string
) {
  const safeUpdates = pickAllowedTontineRiskUpdates(rawUpdates || {});
  if (Object.keys(safeUpdates).length === 0) {
    throw new AppSecurityError('Aucun champ autorisé fourni pour la mise à jour.', 400);
  }

  return await db.transaction(async (tx) => {
    const [tontine] = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .for('update');

    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }
    if (tontine.managerId !== authenticatedManagerId) {
      throw new AppSecurityError(
        'Violation IDOR : Seul le gestionnaire propriétaire peut modifier les règles de risque.',
        403
      );
    }

    const [updated] = await tx
      .update(tontines)
      .set({
        ...safeUpdates,
        updatedAt: new Date(),
      })
      .where(eq(tontines.id, tontineId))
      .returning();

    return updated;
  });
}

export async function updateMemberRiskData(
  tontineId: string,
  memberId: string,
  rawUpdates: Record<string, any>,
  authenticatedManagerId: string
) {
  const safeUpdates = pickAllowedMemberRiskUpdates(rawUpdates || {});
  if (Object.keys(safeUpdates).length === 0) {
    throw new AppSecurityError('Aucun champ de risque autorisé fourni.', 400);
  }

  return await db.transaction(async (tx) => {
    const [tontine] = await tx
      .select()
      .from(tontines)
      .where(eq(tontines.id, tontineId))
      .limit(1);

    if (!tontine) {
      throw new AppSecurityError('Tontine introuvable.', 404);
    }
    if (tontine.managerId !== authenticatedManagerId) {
      throw new AppSecurityError(
        'Violation IDOR : Seul le gestionnaire propriétaire peut modifier les données de risque d\'un membre.',
        403
      );
    }

    const [member] = await tx
      .select()
      .from(tontineMembers)
      .where(and(eq(tontineMembers.id, memberId), eq(tontineMembers.tontineId, tontineId)))
      .for('update');

    if (!member) {
      throw new AppSecurityError('Participation membre introuvable dans cette tontine.', 404);
    }

    const [updated] = await tx
      .update(tontineMembers)
      .set(safeUpdates)
      .where(eq(tontineMembers.id, memberId))
      .returning();

    return updated;
  });
}

// ============================================================================
// 3. MANAGER WALLET WITHDRAWALS (ACID + ROW LOCK + BCEAO KYC GUARD)
// ============================================================================

const BCEAO_TIER1_MAX_PER_TX = 150_000;
const BCEAO_TIER1_MAX_30D = 300_000;
const BCEAO_TIER2_MAX_PER_TX = 5_000_000;

export async function withdrawManagerWallet(
  managerId: string,
  amount: number,
  provider: string,
  destinationAccount: string
) {
  assertPositiveIntegerAmount(amount, 'amount', 1, 50_000_000);
  if (!provider?.trim() || !destinationAccount?.trim()) {
    throw new AppSecurityError('Opérateur et compte de destination requis.', 400);
  }
  const normalizedProvider = provider.trim().toUpperCase();
  if (!ALLOWED_PAYMENT_METHODS.has(normalizedProvider)) {
    throw new AppSecurityError(
      'Opérateur non supporté : seuls Moov Money (MOOV_MONEY) et Orange Money (ORANGE_MONEY) sont autorisés.',
      400
    );
  }

  return await db.transaction(async (tx) => {
    // 1. Pessimistic row-level lock (SELECT ... FOR UPDATE) prevents concurrent double spend
    const lockedUsers = await tx
      .select()
      .from(users)
      .where(eq(users.uid, managerId))
      .for('update');

    const user = lockedUsers[0];
    if (!user) {
      throw new AppSecurityError('Compte gestionnaire introuvable.', 404);
    }
    if (user.role !== 'MANAGER') {
      throw new AppSecurityError('Accès refusé : seul un gestionnaire peut effectuer un retrait.', 403);
    }

    // 2. Enforce BCEAO KYC limits server-side
    const isVerified = user.kycStatus === 'VERIFIED';
    const maxPerTx = isVerified ? BCEAO_TIER2_MAX_PER_TX : BCEAO_TIER1_MAX_PER_TX;
    if (amount > maxPerTx) {
      throw new AppSecurityError(
        `Conformité BCEAO : montant (${amount} F CFA) supérieur au plafond autorisé (${maxPerTx} F CFA) pour le niveau KYC actuel.`,
        403
      );
    }

    if (!isVerified) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentWithdrawals = await tx
        .select({ amount: walletTransactions.amount, createdAt: walletTransactions.createdAt })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.managerId, managerId),
            eq(walletTransactions.type, 'WITHDRAWAL')
          )
        );

      const past30dTotal = recentWithdrawals
        .filter((w) => !w.createdAt || w.createdAt >= thirtyDaysAgo)
        .reduce((acc, w) => acc + w.amount, 0);

      if (past30dTotal + amount > BCEAO_TIER1_MAX_30D) {
        throw new AppSecurityError(
          `Conformité BCEAO (Palier 1) : plafond mensuel de ${BCEAO_TIER1_MAX_30D} F CFA dépassé.`,
          403
        );
      }
    }

    // 3. Guarded balance check & atomic update
    if (user.walletBalance < amount) {
      throw new AppSecurityError('Solde insuffisant pour ce retrait.', 400);
    }

    const updatedRows = await tx
      .update(users)
      .set({
        walletBalance: sql`${users.walletBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.uid, managerId), sql`${users.walletBalance} >= ${amount}`))
      .returning({ walletBalance: users.walletBalance });

    if (updatedRows.length === 0) {
      throw new AppSecurityError('Solde insuffisant pour ce retrait (conflit concurrent).', 409);
    }

    const balanceAfter = updatedRows[0].walletBalance;

    // 4. Record immutable wallet ledger entry inside same ACID transaction
    const [txRecord] = await tx
      .insert(walletTransactions)
      .values({
        id: `tx-wth-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        managerId,
        type: 'WITHDRAWAL',
        amount,
        balanceAfter,
        date: new Date().toISOString().split('T')[0],
        description: `Retrait vers ${normalizedProvider === 'MOOV_MONEY' ? 'Moov Money' : 'Orange Money'} (${destinationAccount.trim()})`,
        provider: normalizedProvider,
        destinationAccount: destinationAccount.trim(),
        status: 'COMPLETED',
      })
      .returning();

    return {
      ...txRecord,
      balanceAfter,
    };
  });
}

// ============================================================================
// 4. AUTOMATED CRON JOBS
// ============================================================================

export async function triggerAutomatedCron() {
  try {
    const activeTontines = await db
      .select()
      .from(tontines)
      .where(eq(tontines.status, 'ACTIVE'));

    let processedCount = 0;
    const logDetails: string[] = [];

    for (const t of activeTontines) {
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
    throw new AppSecurityError('Automated cron failed', 500);
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
