import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanCard } from './components/PlanCard';
import { CommissionSimulator } from './components/CommissionSimulator';
import { RegistrationView } from './components/RegistrationView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { ProfileView } from './components/ProfileView';
import { TermsModal } from './components/TermsModal';
import { WhatsAppBotCenter } from './components/WhatsAppBotCenter';
import { RiskManagementCenter } from './components/RiskManagementCenter';
import { apiClient } from './utils/apiClient';
import {
  acquireFinancialLock,
  releaseFinancialLock,
  checkAndRecordIdempotency,
  validateKycWithdrawalLimits,
  assertTontineManagerOwnership,
} from './utils/security';
import { DEFAULT_PLANS, formatPercent, formatXOF } from './data/plans';
import { INITIAL_USERS } from './data/users';
import {
  INITIAL_TONTINES,
  INITIAL_CONTRIBUTION_PAYMENTS,
  INITIAL_WALLET_TRANSACTIONS,
  getUserAccessibleTontines,
} from './data/tontines';
import {
  PlanConfig,
  RegisteredUser,
  TontineRecord,
  TontineMemberParticipation,
  MemberContributionPayment,
  ManagerWalletTransaction,
} from './types';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Coins,
  PlusCircle,
  CheckCircle2,
  ArrowUpRight,
  Users,
  CreditCard,
  ShieldCheck,
  User,
  LogIn,
  UserPlus,
  Palette,
  MessageSquare,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import {
  AttractiveBackground,
  BackgroundTheme,
  THEMES,
} from './components/AttractiveBackground';

export default function App() {
  const [connectedUser, setConnectedUser] = useState<RegisteredUser | null>(() => {
    try {
      const saved = localStorage.getItem('tontine_connected_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans' | 'registration' | 'login' | 'profile' | 'whatsapp' | 'risk'>(() => {
    try {
      const saved = localStorage.getItem('tontine_connected_user');
      return saved ? 'dashboard' : 'login';
    } catch {
      return 'login';
    }
  });
  const [showFooterTermsModal, setShowFooterTermsModal] = useState(false);
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>(() => {
    try {
      const saved = localStorage.getItem('tontine_bg_theme');
      return (saved as BackgroundTheme) || 'emerald';
    } catch {
      return 'emerald';
    }
  });

  const handleThemeChange = (theme: BackgroundTheme) => {
    setBgTheme(theme);
    try {
      localStorage.setItem('tontine_bg_theme', theme);
    } catch (e) {
      console.error('Failed to persist theme', e);
    }
  };

  const [users, setUsers] = useState<RegisteredUser[]>(() => {
    try {
      const saved = localStorage.getItem('tontine_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });
  const [tontines, setTontines] = useState<TontineRecord[]>(INITIAL_TONTINES);
  const [payments, setPayments] = useState<MemberContributionPayment[]>(INITIAL_CONTRIBUTION_PAYMENTS);
  const [walletTransactions, setWalletTransactions] = useState<ManagerWalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );

  const [cloudSqlConnected, setCloudSqlConnected] = useState<boolean>(true);

  // Synchronize users and connectedUser to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tontine_users', JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users in localStorage', e);
    }
  }, [users]);

  // Load from Cloud SQL on mount
  useEffect(() => {
    async function loadCloudSqlData() {
      try {
        const health = await apiClient.getHealth();
        if (health && health.status === 'ok') {
          setCloudSqlConnected(true);
        }
        const remoteTontines = await apiClient.getTontines();
        if (remoteTontines && remoteTontines.length > 0) {
          setTontines(remoteTontines);
        }
        const remoteUsers = await apiClient.getUsers();
        if (remoteUsers && remoteUsers.length > 0) {
          setUsers((prev) => {
            const map = new Map();
            prev.forEach((u) => map.set(u.id, u));
            remoteUsers.forEach((u) => map.set(u.id, u));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('Cloud SQL initial sync:', err);
      }
    }
    loadCloudSqlData();
  }, []);

  useEffect(() => {
    try {
      if (connectedUser) {
        localStorage.setItem('tontine_connected_user', JSON.stringify(connectedUser));
      } else {
        localStorage.removeItem('tontine_connected_user');
      }
    } catch (e) {
      console.error('Failed to sync session in localStorage', e);
    }
  }, [connectedUser]);

  // Ensure non-connected users are kept on the official 'Bon retour' login interface
  useEffect(() => {
    if (!connectedUser && (activeTab === 'dashboard' || activeTab === 'profile' || activeTab === 'whatsapp' || activeTab === 'risk')) {
      setActiveTab('login');
    }
  }, [connectedUser, activeTab]);

  // Official fixed rates:
  // Free: 1.5%
  // Starter: 2.5%
  // Premium: 3.0%
  // Business: 3.5%
  const rates: Record<PlanConfig['code'], number> = {
    FREE: 0.015,
    STARTER: 0.025,
    PREMIUM: 0.030,
    BUSINESS: 0.035,
  };

  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanConfig['code']>('STARTER');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectForSimulation = (code: PlanConfig['code']) => {
    setSelectedPlanCode(code);
    setActiveTab('plans');
  };

  const handleAddUser = (newUser: RegisteredUser) => {
    setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
    setConnectedUser(newUser);
    apiClient.syncUser(newUser);
    setActiveTab('dashboard');
    showToast(
      newUser.role === 'MANAGER'
        ? `Nouveau gestionnaire "${newUser.firstName} ${newUser.lastName}" enregistré et connecté !`
        : `Nouveau membre cotisant "${newUser.firstName} ${newUser.lastName}" enregistré et connecté !`
    );
  };

  const handleLoginAsUser = (user: RegisteredUser) => {
    setConnectedUser(user);
    setActiveTab('dashboard');
    showToast(
      `Connexion réussie : ${user.firstName} ${user.lastName} (${
        user.role === 'MANAGER' ? 'Gestionnaire' : 'Membre Cotisant'
      })`
    );
  };

  const handleLogout = () => {
    const prevUser = connectedUser;
    setConnectedUser(null);
    try {
      localStorage.removeItem('tontine_connected_user');
    } catch {}
    setActiveTab('login');
    showToast(
      prevUser
        ? `Déconnexion réussie (${prevUser.firstName} ${prevUser.lastName})`
        : 'Session déconnectée.'
    );
  };

  const handleUpdateUser = (updatedUser: RegisteredUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (connectedUser && connectedUser.id === updatedUser.id) {
      setConnectedUser(updatedUser);
    }
    showToast('Profil et vérification KYC mis à jour avec succès !');
  };

  // Manager: Withdraw from wallet (Secured with Mutex & BCEAO KYC limits)
  const handleWithdraw = (amount: number, provider: string, account: string) => {
    if (!connectedUser?.managerDetails) return;

    if (amount <= 0 || isNaN(amount)) {
      showToast('Montant de retrait invalide.');
      return;
    }

    // 1. Concurrency Mutex Lock (Anti-Double Spend)
    const lockKey = `wallet_lock_${connectedUser.id}`;
    if (!acquireFinancialLock(lockKey, 3000)) {
      showToast('Transaction concurrente détectée : une opération de retrait est déjà en cours.');
      return;
    }

    try {
      // 2. Regulatory Compliance & BCEAO KYC Ceiling
      const kycValidation = validateKycWithdrawalLimits(connectedUser, amount);
      if (!kycValidation.allowed) {
        showToast(kycValidation.reason || 'Plafond réglementaire dépassé.');
        return;
      }

      // 3. Balance Check
      if (amount > connectedUser.managerDetails.walletBalance) {
        showToast('Solde insuffisant pour ce montant de retrait.');
        return;
      }

      const currentBal = connectedUser.managerDetails.walletBalance;
      const newBal = currentBal - amount;

      const newTx: ManagerWalletTransaction = {
        id: `wtx_${Date.now()}`,
        managerId: connectedUser.id,
        type: 'WITHDRAWAL',
        amount,
        balanceAfter: newBal,
        description: `Retrait vers ${provider} (${account})`,
        provider,
        account,
        date: new Date().toISOString(),
        status: 'COMPLETED',
      };

      setWalletTransactions((prev) => [newTx, ...prev]);

      const updatedUser: RegisteredUser = {
        ...connectedUser,
        managerDetails: {
          ...connectedUser.managerDetails,
          walletBalance: newBal,
        },
      };

      setConnectedUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      apiClient.withdrawWallet(connectedUser.id, amount, provider, account);

      showToast(`Retrait de ${formatXOF(amount)} exécuté avec succès vers ${provider} !`);
    } finally {
      releaseFinancialLock(lockKey);
    }
  };

  // Manager: Create a new Tontine
  const handleCreateTontine = (tontineData: Omit<TontineRecord, 'id'>) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour créer une tontine.');
      setActiveTab('login');
      return;
    }

    const newTontine: TontineRecord = {
      ...tontineData,
      id: `tontine_${Date.now()}`,
    };

    setTontines((prev) => [newTontine, ...prev]);
    apiClient.createTontine(newTontine);

    if (connectedUser.managerDetails) {
      const updatedUser: RegisteredUser = {
        ...connectedUser,
        managerDetails: {
          ...connectedUser.managerDetails,
          createdTontinesCount: (connectedUser.managerDetails.createdTontinesCount || 0) + 1,
        },
      };
      setConnectedUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }

    showToast(`Tontine "${newTontine.name}" créée avec code invitation : ${newTontine.code}`);
  };

  // Manager: Update / fix contribution amount for a managed tontine
  const handleUpdateTontineAmount = (tontineId: string, newAmount: number) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour modifier la tontine.');
      setActiveTab('login');
      return;
    }

    if (newAmount < 500) {
      showToast('Le montant de la cotisation doit être au minimum de 500 F CFA.');
      return;
    }

    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    // Strict Anti-IDOR Authorization Check
    const authCheck = assertTontineManagerOwnership(connectedUser, tontine);
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Accès refusé : Seul le gestionnaire créateur peut modifier ce montant.');
      return;
    }

    setTontines((prev) =>
      prev.map((t) => {
        if (t.id === tontineId) {
          return {
            ...t,
            contributionAmount: newAmount,
          };
        }
        return t;
      })
    );

    showToast(`Montant de cotisation fixé à ${formatXOF(newAmount)} pour "${tontine.name}".`);
  };

  // Manager: Payout round to beneficiary and collect commission (Protected with Mutex & IDOR Guard)
  const handlePayoutBeneficiary = (tontineId: string, roundNumber: number) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour verser une cagnotte.');
      setActiveTab('login');
      return;
    }

    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    // 1. Strict Anti-IDOR Authorization Check
    const authCheck = assertTontineManagerOwnership(connectedUser, tontine);
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Accès refusé : Seul le gestionnaire créateur de cette tontine peut verser la cagnotte.');
      return;
    }

    // 2. Concurrency Mutex Lock (Anti-Double Decaissement)
    const payoutLockKey = `payout_lock_${tontineId}_${roundNumber}`;
    if (!acquireFinancialLock(payoutLockKey, 4000)) {
      showToast('Opération en cours : ce tour de tontine est déjà en cours de décaissement.');
      return;
    }

    try {
      const currentBeneficiary = tontine.members.find((m) => m.turnNumber === roundNumber);
      if (!currentBeneficiary) {
        showToast(`Aucun membre cotisant n'est encore assigné au Tour #${roundNumber}. Le gestionnaire n'intervient pas dans les cagnottes : seul un membre cotisant participant peut la percevoir.`);
        return;
      }

      const potAmount = tontine.contributionAmount * tontine.members.length;
      const commission = Math.round(potAmount * tontine.commissionRate);
      const netPayout = potAmount - commission;

      const currentBal = connectedUser?.managerDetails?.walletBalance || 0;
      const newBal = currentBal + commission;

      const commTx: ManagerWalletTransaction = {
        id: `wtx_${Date.now()}`,
        managerId: tontine.managerId,
        type: 'COMMISSION_CREDIT',
        amount: commission,
        balanceAfter: newBal,
        description: `Commission ${formatPercent(tontine.commissionRate)} retenue sur Tour ${roundNumber} - ${tontine.name}`,
        date: new Date().toISOString(),
        status: 'COMPLETED',
      };

      setWalletTransactions((prev) => [commTx, ...prev]);

      setTontines((prev) =>
        prev.map((t) => {
          if (t.id === tontineId) {
            const nextRound = Math.min(t.totalRounds, t.currentRound + 1);
            return {
              ...t,
              currentRound: nextRound,
              status: nextRound >= t.totalRounds ? 'COMPLETED' : 'ACTIVE',
            };
          }
          return t;
        })
      );

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === tontine.managerId && u.managerDetails) {
            const updated = {
              ...u,
              managerDetails: {
                ...u.managerDetails,
                walletBalance: u.managerDetails.walletBalance + commission,
              },
            };
            if (connectedUser?.id === u.id) {
              setConnectedUser(updated);
            }
            return updated;
          }
          return u;
        })
      );

      apiClient.payoutBeneficiary(tontineId, roundNumber, tontine.managerId, commission);

      showToast(
        `Tour #${roundNumber} versé au bénéficiaire (${formatXOF(netPayout)}) ! Commission de ${formatXOF(
          commission
        )} créditée sur votre portefeuille.`
      );
    } finally {
      releaseFinancialLock(payoutLockKey);
    }
  };

  // Member: Pay contribution for a tontine (Protected with Idempotency)
  const handlePayContribution = (tontineId: string, amount: number, paymentMethod: string) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour effectuer un versement.');
      setActiveTab('login');
      return;
    }

    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    const isEnrolledMember = tontine.members.some((m) => m.userId === connectedUser.id);
    if (!isEnrolledMember) {
      if (tontine.managerId === connectedUser.id) {
        showToast("En tant que gestionnaire non-participant de cette tontine, vous n'êtes pas tenu de cotiser. Seuls les membres cotisants enregistrés effectuent des versements.");
        return;
      }
      showToast("Accès refusé : Vous ne faites pas partie des cotisants de cette tontine.");
      return;
    }

    const roundNumber = tontine.currentRound;

    // Idempotency: prevent double payment submissions
    const idempotencyKey = `idemp_pay_${tontine.id}_${connectedUser.id}_${roundNumber}`;
    const idemCheck = checkAndRecordIdempotency(idempotencyKey);
    if (idemCheck.isDuplicate) {
      showToast(`Doublon détecté : la cotisation pour le Tour #${roundNumber} a déjà été enregistrée (Règle d'idempotence).`);
      return;
    }

    const validMethod = (['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'CASH'].includes(paymentMethod)
      ? paymentMethod
      : 'WAVE') as 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CASH';

    const commAmount = Math.round(amount * tontine.commissionRate);

    const newPayment: MemberContributionPayment = {
      id: `pay_${Date.now()}`,
      tontineId: tontine.id,
      tontineName: tontine.name,
      userId: connectedUser.id,
      roundNumber,
      amount,
      commissionAmount: commAmount,
      paymentMethod: validMethod,
      status: 'PAID',
      transactionRef: `PAY-${Date.now().toString().slice(-8)}`,
      paidAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    setTontines((prev) =>
      prev.map((t) => {
        if (t.id === tontineId) {
          const updatedMembers = t.members.map((m) => {
            if (m.userId === connectedUser.id) {
              return {
                ...m,
                hasPaidCurrentRound: true,
              };
            }
            return m;
          });

          return {
            ...t,
            members: updatedMembers,
          };
        }
        return t;
      })
    );

    apiClient.recordPayment(tontineId, connectedUser.id, newPayment);

    showToast(
      `Cotisation de ${formatXOF(amount)} pour le Tour #${roundNumber} réglée avec succès via ${paymentMethod} !`
    );
  };

  // Member: Join a tontine using invitation code & choose preferred turn
  const handleJoinTontineWithCode = (code: string, preferredTurn?: number): boolean => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour rejoindre une tontine.');
      setActiveTab('login');
      return false;
    }

    const cleanCode = code.trim().toUpperCase();
    const tontine = tontines.find((t) => t.code.toUpperCase() === cleanCode);

    if (!tontine) {
      showToast(`Code "${cleanCode}" introuvable. Veuillez vérifier le code.`);
      return false;
    }

    const alreadyJoined = tontine.members.some((m) => m.userId === connectedUser.id);
    if (alreadyJoined) {
      showToast(`Vous faites déjà partie de la tontine "${tontine.name}".`);
      return false;
    }

    // Determine assigned turn:
    const occupiedTurns = new Set(tontine.members.map((m) => m.turnNumber));
    let assignedTurn = preferredTurn;

    if (!assignedTurn || assignedTurn < 1 || assignedTurn > tontine.totalRounds || occupiedTurns.has(assignedTurn)) {
      // Find first available turn from 1 to totalRounds
      for (let i = 1; i <= tontine.totalRounds; i++) {
        if (!occupiedTurns.has(i)) {
          assignedTurn = i;
          break;
        }
      }
      // If still not found, fallback to next sequential number
      if (!assignedTurn) {
        assignedTurn = tontine.members.length + 1;
      }
    }

    const newParticipation: TontineMemberParticipation = {
      id: `tm-${Date.now()}`,
      userId: connectedUser.id,
      name: `${connectedUser.firstName} ${connectedUser.lastName}`,
      phone: connectedUser.phone,
      turnNumber: assignedTurn,
      hasPaidCurrentRound: false,
      isCurrentBeneficiary: assignedTurn === tontine.currentRound,
      paymentMethod: connectedUser.memberDetails?.paymentMethod || 'WAVE',
    };

    setTontines((prev) =>
      prev.map((t) => {
        if (t.id === tontine.id) {
          return {
            ...t,
            members: [...t.members, newParticipation],
          };
        }
        return t;
      })
    );

    if (connectedUser.memberDetails) {
      const updatedUser: RegisteredUser = {
        ...connectedUser,
        memberDetails: {
          ...connectedUser.memberDetails,
          joinedTontinesCount: (connectedUser.memberDetails.joinedTontinesCount || 0) + 1,
        },
      };
      setConnectedUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }

    apiClient.joinTontine(tontine.id, newParticipation);

    showToast(`Félicitations ! Vous avez rejoint "${tontine.name}" avec le Tour #${newParticipation.turnNumber} réservé.`);
    return true;
  };

  // Member or Manager: Update / choose pot turn
  const handleUpdateMemberTurn = (tontineId: string, memberUserId: string, newTurnNumber: number) => {
    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    if (newTurnNumber < 1 || newTurnNumber > tontine.totalRounds) {
      showToast(`Le tour sélectionné doit être compris entre 1 et ${tontine.totalRounds}.`);
      return;
    }

    const existingOccupant = tontine.members.find(
      (m) => m.turnNumber === newTurnNumber && m.userId !== memberUserId
    );

    if (existingOccupant) {
      showToast(`Le Tour #${newTurnNumber} est déjà réservé par ${existingOccupant.name}.`);
      return;
    }

    setTontines((prev) =>
      prev.map((t) => {
        if (t.id === tontineId) {
          const updatedMembers = t.members.map((m) => {
            if (m.userId === memberUserId) {
              return {
                ...m,
                turnNumber: newTurnNumber,
                isCurrentBeneficiary: newTurnNumber === t.currentRound,
              };
            }
            return m;
          });

          return {
            ...t,
            members: updatedMembers,
          };
        }
        return t;
      })
    );

    apiClient.updateMemberTurn(tontineId, memberUserId, newTurnNumber);

    const grossAmount = tontine.contributionAmount * tontine.members.length;
    const netPot = Math.round(grossAmount * (1 - tontine.commissionRate));

    showToast(
      `Tour #${newTurnNumber} de cagnotte confirmé avec succès ! (${formatXOF(netPot)} à percevoir)`
    );
  };

  // Risk & Escrow management handlers
  const handleUpdateTontineRiskConfig = (tontineId: string, updates: Partial<TontineRecord>) => {
    setTontines((prev) =>
      prev.map((t) => (t.id === tontineId ? { ...t, ...updates } : t))
    );
    apiClient.updateRiskConfig(tontineId, updates);
  };

  const handleUpdateMemberRiskData = (
    tontineId: string,
    memberId: string,
    updates: Partial<TontineMemberParticipation>
  ) => {
    setTontines((prev) =>
      prev.map((t) => {
        if (t.id !== tontineId) return t;
        return {
          ...t,
          members: t.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m)),
        };
      })
    );
    apiClient.updateMemberRisk(tontineId, memberId, updates);
  };

  const isManager = connectedUser?.role === 'MANAGER';
  const myAccessibleTontines = connectedUser
    ? getUserAccessibleTontines(tontines, connectedUser.id)
    : [];

  const activeTheme = THEMES[bgTheme] || THEMES.emerald;

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-500 selection:bg-emerald-100 selection:text-emerald-900 ${
        activeTheme.isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {/* High-End Dynamic Ambient Background (Mesh gradients, animated glow orbs, geometric dot matrix) */}
      <AttractiveBackground currentTheme={bgTheme} onThemeChange={handleThemeChange} />

      {/* Main Container */}
      <main className={`relative z-10 flex-1 max-w-7xl w-full mx-auto ${activeTab === 'login' ? 'px-0 py-0 space-y-0 max-w-none' : 'px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6'}`}>
        {/* =========================================================================
            HEADER - Clean, Compact & Slim (Contained Length)
            ========================================================================= */}
        {activeTab !== 'login' && (
          <div className="flex justify-center w-full">
            <div className="w-fit max-w-full relative overflow-hidden rounded-xl border border-emerald-500/30 animated-green-gradient px-5 py-2 sm:px-6 sm:py-2.5 shadow-sm text-white">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 relative z-10">
                {/* Brand & Role */}
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    TONTINE
                  </h1>
                  {connectedUser && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isManager ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      {isManager ? 'Gestionnaire' : 'Membre'}
                    </span>
                  )}
                </div>

                {/* Profile & Quick Actions */}
                {connectedUser ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
                      title="Gérer mon profil"
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                        isManager ? 'bg-amber-400 text-stone-950' : 'bg-emerald-400 text-stone-950'
                      }`}>
                        {connectedUser.firstName.charAt(0)}{connectedUser.lastName.charAt(0)}
                      </div>
                      <span>{connectedUser.firstName} {connectedUser.lastName}</span>
                      {connectedUser.kyc?.status === 'VERIFIED' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-300" />
                          KYC
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/30 text-amber-200 font-bold">
                          KYC à vérifier
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-xs font-medium text-emerald-100 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      title="Changer de profil"
                    >
                      Changer
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 rounded-xl text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition-colors cursor-pointer"
                      title="Se déconnecter"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Return bar (only shown when not on the main dashboard and not on login) */}
        {activeTab !== 'dashboard' && activeTab !== 'login' && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 font-bold text-xs shadow-xs border border-slate-200 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour au Tableau de Bord</span>
            </button>

            {connectedUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 1: DASHBOARD
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <DashboardView
            users={users}
            connectedUser={connectedUser}
            onSelectConnectedUser={(u) => setConnectedUser(u)}
            tontines={myAccessibleTontines}
            allTontinesCount={tontines.length}
            payments={payments}
            walletTransactions={walletTransactions}
            currentRates={rates}
            onWithdraw={handleWithdraw}
            onCreateTontine={handleCreateTontine}
            onPayoutBeneficiary={handlePayoutBeneficiary}
            onUpdateTontineAmount={handleUpdateTontineAmount}
            onPayContribution={handlePayContribution}
            onJoinTontineWithCode={handleJoinTontineWithCode}
            onUpdateMemberTurn={handleUpdateMemberTurn}
            onNavigateToSimulate={handleSelectForSimulation}
            onNavigateToRegister={() => setActiveTab('registration')}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToProfile={() => setActiveTab('profile')}
            onNavigateToRisk={() => setActiveTab('risk')}
          />
        )}

        {/* =========================================================================
            TAB 2: PLANS & SIMULATOR (Unified & Clean, No Sliders)
            ========================================================================= */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Forfaits Mensuels & Taux de Commission
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tarifs transparents en Francs CFA (XOF) avec commission plafonnée sur les cotisations.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                4 formules disponibles
              </div>
            </div>

            {/* 4 Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {DEFAULT_PLANS.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  currentRate={rates[plan.code]}
                  onSelectForSimulation={handleSelectForSimulation}
                  isSimulated={selectedPlanCode === plan.code}
                />
              ))}
            </div>

            {/* Direct Interactive Simulator right below */}
            <div className="pt-4">
              <CommissionSimulator
                plans={DEFAULT_PLANS}
                rates={rates}
                selectedPlanCode={selectedPlanCode}
                onSelectPlan={(code) => setSelectedPlanCode(code)}
                onGoToLedger={() => setActiveTab('dashboard')}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: REGISTRATION
            ========================================================================= */}
        {activeTab === 'registration' && (
          <RegistrationView
            plans={DEFAULT_PLANS}
            currentRates={rates}
            users={users}
            onAddUser={handleAddUser}
            onSelectManagerForSimulation={(code) => {
              setSelectedPlanCode(code);
              setActiveTab('plans');
            }}
            onLoginAsUser={handleLoginAsUser}
            onNavigateToLogin={() => setActiveTab('login')}
          />
        )}

        {/* =========================================================================
            TAB 4: LOGIN
            ========================================================================= */}
        {activeTab === 'login' && (
          <LoginView
            users={users}
            connectedUser={connectedUser}
            onLogin={handleLoginAsUser}
            onLogout={handleLogout}
            onNavigateToRegister={() => setActiveTab('registration')}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onSelectPlan={(code) => {
              setSelectedPlanCode(code);
              setActiveTab('registration');
            }}
            onOpenTerms={() => setShowFooterTermsModal(true)}
          />
        )}

        {/* =========================================================================
            TAB 5: PROFILE & KYC
            ========================================================================= */}
        {activeTab === 'profile' && (
          <ProfileView
            user={connectedUser}
            onUpdateUser={handleUpdateUser}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToRegister={() => setActiveTab('registration')}
          />
        )}

        {/* =========================================================================
            TAB 6: WHATSAPP BOT & NOTIFICATIONS
            ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <WhatsAppBotCenter
            tontines={tontines}
            currentUser={connectedUser}
            onPayContribution={handlePayContribution}
            showToast={showToast}
          />
        )}

        {/* =========================================================================
            TAB 7: GESTION DU RISQUE DE DÉFAUT & DES IMPAYÉS
            ========================================================================= */}
        {activeTab === 'risk' && (
          <RiskManagementCenter
            tontines={tontines}
            connectedUser={connectedUser}
            onUpdateTontineRiskConfig={handleUpdateTontineRiskConfig}
            onUpdateMemberRiskData={handleUpdateMemberRiskData}
            onShowToast={showToast}
            onNavigateToWhatsApp={() => setActiveTab('whatsapp')}
          />
        )}
      </main>

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern, Clean Glassmorphic Footer */}
      <footer className="border-t border-emerald-900/10 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md py-6 mt-16 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              © 2026 Tontine. Tous droits réservés.
            </span>
            <span className="hidden sm:inline text-stone-300 dark:text-stone-700">•</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Burkina Faso
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setShowFooterTermsModal(true)}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
            >
              Mentions légales
            </button>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <button
              type="button"
              onClick={() => setShowFooterTermsModal(true)}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
            >
              Politique de confidentialité
            </button>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <button
              type="button"
              onClick={() => setShowFooterTermsModal(true)}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
            >
              CGV
            </button>
          </div>
        </div>
      </footer>

      {/* Global Terms of Use Modal */}
      <TermsModal
        isOpen={showFooterTermsModal}
        onClose={() => setShowFooterTermsModal(false)}
        highlightRole={connectedUser?.role}
        alreadyAccepted={!!connectedUser?.acceptedTerms}
      />

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
