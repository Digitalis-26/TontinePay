export interface PlanConfig {
  id: number;
  code: 'FREE' | 'STARTER' | 'PREMIUM' | 'BUSINESS';
  name: string;
  monthlyPrice: number; // in XOF
  maxTontines: number | null; // null = unlimited
  maxMembers: number | null; // null = unlimited
  commissionEnabled: boolean;
  maxCommissionRate: number; // decimal, e.g. 0.015 for 1.5%
  description: string;
  badgeColor: string;
  accentBorder: string;
  popular?: boolean;
}

export interface SimulationParams {
  planCode: 'FREE' | 'STARTER' | 'PREMIUM' | 'BUSINESS';
  contributionAmount: number; // Amount per member per turn in XOF
  memberCount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  customRate?: number; // Optional override
}

export interface SimulationResult {
  plan: PlanConfig;
  rateApplied: number; // e.g. 0.015 (1.5%)
  ratePercentage: string; // "1,5%"
  totalTurnCollection: number; // contributionAmount * memberCount
  commissionPerContribution: number;
  totalTurnCommission: number; // commissionPerContribution * memberCount
  netTontinePayout: number; // totalTurnCollection - totalTurnCommission
  estimatedPlatformFee: number; // ~0.5% or fixed
  managerNetEarnings: number; // totalTurnCommission
  cyclesPerMonth: number;
  monthlyEstimatedCommission: number;
  monthlySubscriptionCost: number;
  netManagerMonthlyProfit: number;
}

export interface LedgerPreviewEntry {
  accountCode: string;
  accountName: string;
  entryType: 'CONTRIBUTION' | 'COMMISSION_MANAGER' | 'PLATFORM_FEE' | 'PAYMENT_FEE';
  debit: number;
  credit: number;
  description: string;
}

export type KycStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type KycDocumentType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVING_LICENSE' | 'RESIDENCE_PERMIT';

export interface KycVerificationData {
  status: KycStatus;
  level: 1 | 2 | 3;
  documentType?: KycDocumentType;
  documentNumber?: string;
  documentExpiryDate?: string;
  frontDocumentFileName?: string;
  backDocumentFileName?: string;
  selfieFileName?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  addressProofFileName?: string;
  fullNameMatched?: boolean;
}

export type UserRoleType = 'MEMBER' | 'MANAGER';

export interface RegisteredUser {
  id: string;
  role: UserRoleType;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city?: string;
  countryCode: string;
  countryName: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  createdAt: string;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
  pinCode?: string;
  password?: string;
  kyc?: KycVerificationData;
  // Specific to member
  memberDetails?: {
    paymentMethod: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CASH';
    identityNumber?: string;
    tontineInvitationCode?: string;
    joinedTontinesCount: number;
  };
  // Specific to manager
  managerDetails?: {
    businessName: string;
    planCode: 'FREE' | 'STARTER' | 'PREMIUM' | 'BUSINESS';
    commissionRate: number; // e.g. 0.015, 0.025, 0.03, 0.035
    commissionEnabled: boolean;
    payoutProvider: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER';
    payoutAccount: string;
    activeTontinesCount: number;
    walletBalance: number; // in XOF
  };
}

export interface TontineMemberParticipation {
  id: string;
  userId: string;
  name: string;
  phone: string;
  turnNumber: number;
  hasPaidCurrentRound: boolean;
  isCurrentBeneficiary: boolean;
  paymentMethod: string;
}

export interface TontineRecord {
  id: string;
  code: string; // e.g. "TERANGA-2025"
  name: string;
  managerId: string;
  managerName: string;
  contributionAmount: number; // e.g. 50 000 XOF
  periodicity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  currentRound: number;
  totalRounds: number;
  commissionRate: number; // e.g. 0.025
  status: 'ACTIVE' | 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  nextDueDate: string;
  members: TontineMemberParticipation[];
}

export interface MemberContributionPayment {
  id: string;
  tontineId: string;
  tontineName: string;
  userId: string;
  roundNumber: number;
  amount: number;
  commissionAmount: number;
  paymentMethod: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CASH';
  status: 'PAID' | 'PENDING' | 'LATE';
  transactionRef: string;
  paidAt: string;
}

export interface ManagerWalletTransaction {
  id: string;
  managerId: string;
  type: 'COMMISSION_CREDIT' | 'WITHDRAWAL';
  amount: number;
  balanceAfter: number;
  description: string;
  provider?: string;
  account?: string;
  date: string;
  status: 'COMPLETED' | 'PENDING';
}

