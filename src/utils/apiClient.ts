import { TontineRecord, RegisteredUser } from '../types';

const AUTH_TOKEN_KEY = 'tontine_auth_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

export function mapDbUserToRegisteredUser(u: any): RegisteredUser {
  return {
    id: u.uid,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone || '',
    role: u.role === 'MANAGER' ? 'MANAGER' : 'MEMBER',
    countryCode: 'SN',
    countryName: 'Sénégal',
    status: 'ACTIVE',
    createdAt: u.createdAt || new Date().toISOString(),
    kyc: {
      status: u.kycStatus || 'UNVERIFIED',
      level: u.kycStatus === 'VERIFIED' ? 2 : 1,
      documentType: u.kycDocumentType,
    },
    managerDetails:
      u.role === 'MANAGER'
        ? {
            businessName: `${u.firstName} ${u.lastName}`,
            planCode: u.managerPlanCode || 'STARTER',
            commissionRate: 0.025,
            commissionEnabled: true,
            payoutProvider: 'ORANGE_MONEY',
            payoutAccount: u.phone || '',
            activeTontinesCount: 0,
            walletBalance: u.walletBalance || 0,
          }
        : undefined,
    memberDetails:
      u.role === 'MEMBER'
        ? {
            paymentMethod: u.memberPaymentMethod === 'MOOV_MONEY' ? 'MOOV_MONEY' : 'ORANGE_MONEY',
            joinedTontinesCount: 0,
          }
        : undefined,
  };
}

export const apiClient = {
  clearSessionToken() {
    setAuthToken(null);
  },

  async login(identifier: string, password: string): Promise<{ token: string; user: RegisteredUser }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Identifiant ou mot de passe incorrect.');
    }
    setAuthToken(data.token);
    return {
      token: data.token,
      user: mapDbUserToRegisteredUser(data.user),
    };
  },

  async register(payload: {
    email?: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'MANAGER' | 'MEMBER';
    managerPlanCode?: string;
    memberPaymentMethod?: string;
  }): Promise<{ token: string; user: RegisteredUser }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Impossible de créer le compte.');
    }
    setAuthToken(data.token);
    return {
      token: data.token,
      user: mapDbUserToRegisteredUser(data.user),
    };
  },

  async getCurrentUser(): Promise<RegisteredUser | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) setAuthToken(null);
        return null;
      }
      const data = await res.json();
      return data.user ? mapDbUserToRegisteredUser(data.user) : null;
    } catch {
      return null;
    }
  },

  async getHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  async getUsers(): Promise<RegisteredUser[] | null> {
    if (!getAuthToken()) return null;
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.map(mapDbUserToRegisteredUser);
    } catch {
      return null;
    }
  },

  async syncUser(user: RegisteredUser): Promise<void> {
    if (!getAuthToken()) return;
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
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
    if (!getAuthToken()) return null;
    try {
      const res = await fetch('/api/tontines', {
        headers: getAuthHeaders(),
      });
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
        startDate: t.createdAt || new Date().toISOString(),
        nextDueDate: t.nextDueDate || new Date().toISOString(),
        escrowCautionEnabled: t.cautionRequired,
        cautionPerMember: t.cautionAmount || t.contributionAmount,
        totalEscrowHeld: t.totalEscrowAmount,
        guarantorRequiredForPriorityRounds: t.requireGuarantorForEarlyRounds,
        penaltyPerDay: t.latePenaltyPerDay,
        gracePeriodDays: t.lateGraceDays,
        penaltyDestination: t.penaltyRecipient === 'MANAGER' ? 'MANAGER' : 'CAGNOTTE',
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ managerId, amount, provider, destinationAccount }),
      });
    } catch (e) {
      console.warn('Failed to withdraw in Cloud SQL:', e);
    }
  },

  async triggerCron(): Promise<any> {
    try {
      const res = await fetch('/api/cron/trigger', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getCronLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/cron/logs', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
};
