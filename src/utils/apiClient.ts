import { TontineRecord, RegisteredUser, MemberContributionPayment, ManagerWalletTransaction } from '../types';

export const apiClient = {
  async getHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  async getUsers(): Promise<RegisteredUser[] | null> {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return null;
      const data = await res.json();
      return data.map((u: any) => ({
        id: u.uid,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        kyc: {
          status: u.kycStatus,
          documentType: u.kycDocumentType,
        },
        managerDetails: u.role === 'MANAGER' ? {
          planCode: u.managerPlanCode || 'STARTER',
          walletBalance: u.walletBalance || 0,
        } : undefined,
        memberDetails: u.role === 'MEMBER' ? {
          paymentMethod: u.memberPaymentMethod || 'WAVE',
        } : undefined,
      }));
    } catch {
      return null;
    }
  },

  async syncUser(user: RegisteredUser): Promise<void> {
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          kycStatus: user.kyc?.status,
          managerPlanCode: user.managerDetails?.planCode,
          memberPaymentMethod: user.memberDetails?.paymentMethod,
        }),
      });
    } catch (e) {
      console.warn('Could not sync user to Cloud SQL:', e);
    }
  },

  async getTontines(): Promise<TontineRecord[] | null> {
    try {
      const res = await fetch('/api/tontines');
      if (!res.ok) return null;
      const data = await res.json();
      return data.map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        managerId: t.managerId,
        managerName: 'Gestionnaire Agréé',
        contributionAmount: t.contributionAmount,
        periodicity: t.frequency || 'MONTHLY',
        currentRound: t.currentRound,
        totalRounds: t.totalRounds,
        commissionRate: typeof t.commissionRate === 'string' ? parseFloat(t.commissionRate) : t.commissionRate,
        status: t.status,
        escrowCautionEnabled: t.cautionRequired,
        cautionPerMember: t.cautionAmount || t.contributionAmount,
        totalEscrowHeld: t.totalEscrowAmount,
        guarantorRequiredForPriorityRounds: t.requireGuarantorForEarlyRounds,
        penaltyPerDay: t.latePenaltyPerDay,
        gracePeriodDays: t.lateGraceDays,
        penaltyDestination: t.penaltyRecipient === 'MANAGER' ? 'COMMISSION_GESTIONNAIRE' : 'CAGNOTTE',
        members: (t.members || []).map((m: any) => ({
          id: m.id,
          userId: m.userId,
          name: m.name,
          phone: m.phone,
          turnNumber: m.turnNumber,
          hasPaidCurrentRound: m.hasPaidCurrentRound,
          isCurrentBeneficiary: m.isCurrentBeneficiary,
          paymentMethod: m.paymentMethod,
          cautionStatus: m.cautionStatus,
          cautionAmount: m.cautionAmount,
          guarantorName: m.guarantorName,
          guarantorPhone: m.guarantorPhone,
          guarantorStatus: m.guarantorVerified ? 'VERIFIED' : 'PENDING',
          tontineScore: m.tontineScore,
          daysLate: 0,
          penaltiesAmount: 0,
        })),
      }));
    } catch {
      return null;
    }
  },

  async createTontine(tontine: TontineRecord): Promise<void> {
    try {
      await fetch('/api/tontines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tontine: {
            id: tontine.id,
            code: tontine.code,
            name: tontine.name,
            description: tontine.name,
            managerId: tontine.managerId,
            contributionAmount: tontine.contributionAmount,
            totalRounds: tontine.totalRounds,
            currentRound: tontine.currentRound,
            frequency: tontine.periodicity,
            commissionRate: String(tontine.commissionRate),
            status: tontine.status,
            cautionRequired: tontine.escrowCautionEnabled ?? true,
            cautionAmount: tontine.cautionPerMember ?? tontine.contributionAmount,
            latePenaltyPerDay: tontine.penaltyPerDay ?? 500,
            lateGraceDays: tontine.gracePeriodDays ?? 2,
            penaltyRecipient: tontine.penaltyDestination === 'MANAGER' ? 'MANAGER' : 'POT',
            requireGuarantorForEarlyRounds: tontine.guarantorRequiredForPriorityRounds ?? true,
            totalEscrowAmount: tontine.totalEscrowHeld ?? 0,
          },
          members: tontine.members.map((m) => ({
            id: m.id,
            tontineId: tontine.id,
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
          })),
        }),
      });
    } catch (e) {
      console.warn('Failed to post tontine to Cloud SQL:', e);
    }
  },

  async joinTontine(tontineId: string, memberData: any): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });
    } catch (e) {
      console.warn('Failed to join tontine in Cloud SQL:', e);
    }
  },

  async recordPayment(tontineId: string, memberUserId: string, paymentData: any): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUserId, paymentData }),
      });
    } catch (e) {
      console.warn('Failed to record payment in Cloud SQL:', e);
    }
  },

  async payoutBeneficiary(tontineId: string, roundNumber: number, managerId: string, commissionAmount: number): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNumber, managerId, commissionAmount }),
      });
    } catch (e) {
      console.warn('Failed to record payout in Cloud SQL:', e);
    }
  },

  async updateMemberTurn(tontineId: string, memberUserId: string, newTurnNumber: number): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/turn`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUserId, newTurnNumber }),
      });
    } catch (e) {
      console.warn('Failed to update turn in Cloud SQL:', e);
    }
  },

  async updateRiskConfig(tontineId: string, updates: any): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/risk-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Failed to update risk config in Cloud SQL:', e);
    }
  },

  async updateMemberRisk(tontineId: string, memberId: string, updates: any): Promise<void> {
    try {
      await fetch(`/api/tontines/${tontineId}/members/${memberId}/risk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Failed to update member risk in Cloud SQL:', e);
    }
  },

  async withdrawWallet(managerId: string, amount: number, provider: string, destinationAccount: string): Promise<void> {
    try {
      await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, amount, provider, destinationAccount }),
      });
    } catch (e) {
      console.warn('Failed to withdraw in Cloud SQL:', e);
    }
  },

  async triggerCron(): Promise<any> {
    try {
      const res = await fetch('/api/cron/trigger', { method: 'POST' });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getCronLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/cron/logs');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
};
