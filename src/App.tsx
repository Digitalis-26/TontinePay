import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { PlanCard } from './components/PlanCard';
import { CommissionSimulator } from './components/CommissionSimulator';
import { RegistrationView } from './components/RegistrationView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
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
  ShieldCheck,
  UserPlus,
  LayoutDashboard,
  LogIn,
  Coins,
  PlusCircle,
  Wallet,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Users,
  CreditCard,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans' | 'registration' | 'login'>('dashboard');
  const [users, setUsers] = useState<RegisteredUser[]>(INITIAL_USERS);
  const [connectedUser, setConnectedUser] = useState<RegisteredUser | null>(INITIAL_USERS[0]);
  const [tontines, setTontines] = useState<TontineRecord[]>(INITIAL_TONTINES);
  const [payments, setPayments] = useState<MemberContributionPayment[]>(INITIAL_CONTRIBUTION_PAYMENTS);
  const [walletTransactions, setWalletTransactions] = useState<ManagerWalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );

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
    setUsers((prev) => [newUser, ...prev]);
    setConnectedUser(newUser);
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
    setActiveTab('login');
    showToast(
      prevUser
        ? `Déconnexion réussie (${prevUser.firstName} ${prevUser.lastName})`
        : 'Session déconnectée.'
    );
  };

  // Manager: Withdraw from wallet
  const handleWithdraw = (amount: number, provider: string, account: string) => {
    if (!connectedUser?.managerDetails) return;

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

    showToast(`Retrait de ${formatXOF(amount)} exécuté avec succès vers ${provider} !`);
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

  // Manager: Payout round to beneficiary and collect commission
  const handlePayoutBeneficiary = (tontineId: string, roundNumber: number) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour verser une cagnotte.');
      setActiveTab('login');
      return;
    }

    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    if (tontine.managerId !== connectedUser.id) {
      showToast('Accès refusé : Seul le gestionnaire créateur de cette tontine peut verser la cagnotte.');
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

    showToast(
      `Tour #${roundNumber} versé au bénéficiaire (${formatXOF(netPayout)}) ! Commission de ${formatXOF(
        commission
      )} créditée sur votre portefeuille.`
    );
  };

  // Member: Pay contribution for a tontine
  const handlePayContribution = (tontineId: string, amount: number, paymentMethod: string) => {
    if (!connectedUser) {
      showToast('Veuillez vous connecter pour effectuer un versement.');
      setActiveTab('login');
      return;
    }

    const tontine = tontines.find((t) => t.id === tontineId);
    if (!tontine) return;

    const isAuthorized =
      tontine.members.some((m) => m.userId === connectedUser.id) || tontine.managerId === connectedUser.id;
    if (!isAuthorized) {
      showToast("Accès refusé : Vous ne faites pas partie de cette tontine.");
      return;
    }

    const roundNumber = tontine.currentRound;
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

    const grossAmount = tontine.contributionAmount * tontine.members.length;
    const netPot = Math.round(grossAmount * (1 - tontine.commissionRate));

    showToast(
      `Tour #${newTurnNumber} de cagnotte confirmé avec succès ! (${formatXOF(netPot)} à percevoir)`
    );
  };

  const isManager = connectedUser?.role === 'MANAGER';
  const myAccessibleTontines = connectedUser
    ? getUserAccessibleTontines(tontines, connectedUser.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        registeredCount={users.length}
        connectedUser={connectedUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* =========================================================================
            HEADLINE CARD - Left-Anchored, Airy, High-Contrast & Animated
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-6 sm:p-10 shadow-xs">
          {/* Subtle decorative glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* LEFT COLUMN: Clean, Left-Aligned Headline & Tâches Fortes */}
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="lg:col-span-7 space-y-4 text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-300/60 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Plateforme Tontine Digitale & Commissions</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Gérez vos tontines et commissions en toute simplicité.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Suivi transparent des tours, versements instantanés Mobile Money (Wave, Orange Money, MTN) et rétribution automatique des gestionnaires.
              </p>

              {/* Tâches Fortes (Primary High-Impact Actions) */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {connectedUser ? (
                  <>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Ouvrir mon tableau de bord</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>

                    {isManager ? (
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 text-slate-800 transition-colors border border-slate-200 shadow-xs flex items-center gap-2"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600" />
                        <span>Créer une tontine</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 text-slate-800 transition-colors border border-slate-200 shadow-xs flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Payer ma cotisation</span>
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab('plans')}
                      className="px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                    >
                      Voir les forfaits
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('login')}
                      className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-2 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Se connecter</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>

                    <button
                      onClick={() => setActiveTab('registration')}
                      className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 text-slate-800 transition-colors border border-slate-200 shadow-xs flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      <span>Créer un compte</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('plans')}
                      className="px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                    >
                      Tarifs dès 2 500 F
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            {/* RIGHT COLUMN: Interactive Status & Key Highlights Card */}
            <motion.div
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              className="lg:col-span-5"
            >
              <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                {connectedUser ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isManager
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {connectedUser.firstName.charAt(0)}
                          {connectedUser.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {connectedUser.firstName} {connectedUser.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isManager ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            {isManager
                              ? `Gestionnaire (Plan ${connectedUser.managerDetails?.planCode || 'STARTER'})`
                              : `Membre Cotisant (${connectedUser.memberDetails?.paymentMethod || 'WAVE'})`}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('login')}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        title="Changer de profil"
                      >
                        Changer
                      </button>
                    </div>

                    {/* Quick Metric highlight */}
                    {isManager ? (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Solde Portefeuille Commissions</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Disponible
                          </span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                          {formatXOF(connectedUser.managerDetails?.walletBalance || 0)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Tontines gérées : {myAccessibleTontines.length}</span>
                          <button
                            onClick={() => setActiveTab('dashboard')}
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                          >
                            Retirer <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Mes Tontines Actives</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {myAccessibleTontines.length} groupe(s)
                          </span>
                        </div>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                          {myAccessibleTontines[0]?.name || 'Prêt pour une tontine'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Mode : {connectedUser.memberDetails?.paymentMethod || 'Mobile Money'}</span>
                          <button
                            onClick={() => setActiveTab('dashboard')}
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                          >
                            Payer mon tour <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Garanties de la plateforme
                    </div>
                    <ul className="space-y-3 text-xs text-slate-700">
                      <li className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <span>
                          <strong className="text-slate-900">Cloisonnement strict</strong> : chaque tontine est 100% isolée et protégée.
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <span>
                          <strong className="text-slate-900">Mobile Money</strong> : Wave, Orange Money, MTN MoMo intégrés.
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                        <span>
                          <strong className="text-slate-900">Tarifs clairs</strong> : Starter 2 500 F • Premium 5 000 F • Business 10 000 F.
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => setActiveTab('login')}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Se connecter en 1 clic
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* =========================================================================
            TÂCHES FORTES (Quick Task Actions Bar)
            ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {isManager ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Créer une Tontine</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Fixer la cotisation, la périodicité et générer le code d'invitation.
                </div>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Verser la Cagnotte</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Distribuer les fonds au bénéficiaire et encaisser votre commission.
                </div>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Retirer mes Gains</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Transférer vos commissions directement vers Wave ou Orange Money.
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Payer ma Cotisation</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Régler le tour en cours en 1 clic via Mobile Money sécurisé.
                </div>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Rejoindre avec Code</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Entrer un code d'invitation TNT-... pour intégrer une tontine.
                </div>
              </button>

              <button
                onClick={() => setActiveTab('plans')}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Simuler la Rentabilité</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Calculer les montants collectés et commissions potentielles.
                </div>
              </button>
            </>
          )}
        </motion.div>

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
            onPayContribution={handlePayContribution}
            onJoinTontineWithCode={handleJoinTontineWithCode}
            onUpdateMemberTurn={handleUpdateMemberTurn}
            onNavigateToSimulate={handleSelectForSimulation}
            onNavigateToRegister={() => setActiveTab('registration')}
            onNavigateToLogin={() => setActiveTab('login')}
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

      {/* Modern, Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">TontinePay</span> — Plateforme d'épargne rotative et commissions transparentes.
          </div>
          <div className="flex items-center gap-3 font-medium">
            <span>Starter 2 500 F</span>
            <span>•</span>
            <span>Premium 5 000 F</span>
            <span>•</span>
            <span>Business 10 000 F</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
