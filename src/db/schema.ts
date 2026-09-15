import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID / local system id
  email: text('email').notNull(),
  phone: text('phone'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull().default('MEMBER'), // 'MANAGER' | 'MEMBER'
  kycStatus: text('kyc_status').notNull().default('UNVERIFIED'),
  kycDocumentType: text('kyc_document_type'),
  walletBalance: integer('wallet_balance').notNull().default(0),
  managerPlanCode: text('manager_plan_code').default('STARTER'),
  memberPaymentMethod: text('member_payment_method').default('WAVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Tontines table
export const tontines = pgTable('tontines', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  managerId: text('manager_id').notNull(),
  contributionAmount: integer('contribution_amount').notNull(),
  totalRounds: integer('total_rounds').notNull(),
  currentRound: integer('current_round').notNull().default(1),
  frequency: text('frequency').notNull().default('MONTHLY'),
  commissionRate: text('commission_rate').notNull().default('0.05'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'COMPLETED' | 'PAUSED'
  cautionRequired: boolean('caution_required').notNull().default(true),
  cautionAmount: integer('caution_amount'),
  cautionRule: text('caution_rule').default('ONE_ROUND_ADVANCE'),
  latePenaltyPerDay: integer('late_penalty_per_day').notNull().default(500),
  lateGraceDays: integer('late_grace_days').notNull().default(2),
  penaltyRecipient: text('penalty_recipient').notNull().default('POT'),
  requireGuarantorForEarlyRounds: boolean('require_guarantor_early_rounds').notNull().default(true),
  earlyRoundsThreshold: integer('early_rounds_threshold').notNull().default(2),
  totalEscrowAmount: integer('total_escrow_amount').notNull().default(0),
  nextDueDate: timestamp('next_due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Tontine Member Participations table
export const tontineMembers = pgTable('tontine_members', {
  id: text('id').primaryKey(),
  tontineId: text('tontine_id')
    .references(() => tontines.id)
    .notNull(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  turnNumber: integer('turn_number').notNull(),
  hasPaidCurrentRound: boolean('has_paid_current_round').notNull().default(false),
  isCurrentBeneficiary: boolean('is_current_beneficiary').notNull().default(false),
  paymentMethod: text('payment_method').notNull().default('WAVE'),
  cautionStatus: text('caution_status').notNull().default('ESCROWED'),
  cautionAmount: integer('caution_amount'),
  guarantorName: text('guarantor_name'),
  guarantorPhone: text('guarantor_phone'),
  guarantorRelationship: text('guarantor_relationship'),
  guarantorVerified: boolean('guarantor_verified').notNull().default(false),
  tontineScore: integer('tontine_score').notNull().default(95),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// 4. Member Contribution Payments table
export const contributionPayments = pgTable('contribution_payments', {
  id: text('id').primaryKey(),
  tontineId: text('tontine_id')
    .references(() => tontines.id)
    .notNull(),
  memberUserId: text('member_user_id').notNull(),
  memberName: text('member_name').notNull(),
  roundNumber: integer('round_number').notNull(),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionRef: text('transaction_ref').notNull().unique(),
  status: text('status').notNull().default('SUCCESS'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Manager Wallet Transactions table
export const walletTransactions = pgTable('wallet_transactions', {
  id: text('id').primaryKey(),
  managerId: text('manager_id').notNull(),
  tontineId: text('tontine_id'),
  type: text('type').notNull(), // 'COMMISSION' | 'WITHDRAWAL' | 'ESCROW_RELEASE'
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  provider: text('provider'),
  destinationAccount: text('destination_account'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Cron / Automated Background Jobs Log
export const cronJobLogs = pgTable('cron_job_logs', {
  id: serial('id').primaryKey(),
  jobType: text('job_type').notNull(), // 'MIDNIGHT_ROUND_SHIFT' | 'WHATSAPP_REMINDERS_J2' | 'PENALTY_CALC'
  status: text('status').notNull(),
  details: text('details'),
  itemsProcessed: integer('items_processed').default(0),
  executedAt: timestamp('executed_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tontineMembers),
}));

export const tontinesRelations = relations(tontines, ({ many }) => ({
  members: many(tontineMembers),
  payments: many(contributionPayments),
}));

export const tontineMembersRelations = relations(tontineMembers, ({ one }) => ({
  tontine: one(tontines, {
    fields: [tontineMembers.tontineId],
    references: [tontines.id],
  }),
}));

export const contributionPaymentsRelations = relations(contributionPayments, ({ one }) => ({
  tontine: one(tontines, {
    fields: [contributionPayments.tontineId],
    references: [tontines.id],
  }),
}));
