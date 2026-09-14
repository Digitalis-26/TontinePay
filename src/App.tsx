import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanCard } from './components/PlanCard';
import { CommissionSimulator } from './components/CommissionSimulator';
import { RegistrationView } from './components/RegistrationView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { ProfileView } from './components/ProfileView';
import { TermsModal } from './components/TermsModal';
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
} from 'lucide-react';
import {
  AttractiveBackground,
  BackgroundTheme,
  THEMES,
} from './components/AttractiveBackground';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans' | 'registration' | 'login' | 'profile'>('dashboard');
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
  const [connectedUser, setConnectedUser] = useState<RegisteredUser | null>(() => {
    try {
      const saved = localStorage.getItem('tontine_connected_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tontines, setTontines] = useState<TontineRecord[]>(INITIAL_TONTINES);
  const [payments, setPayments] = useState<MemberContributionPayment[]>(INITIAL_CONTRIBUTION_PAYMENTS);
  const [walletTransactions, setWalletTransactions] = useState<ManagerWalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );

  // Synchronize users and connectedUser to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tontine_users', JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users in localStorage', e);
    }
  }, [users]);

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

  const activeTheme = THEMES[bgTheme] || THEMES.emerald;

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-500 selection:bg-emerald-100 selection:text-emerald-900 ${
        activeTheme.isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {/* High-End Dynamic Ambient Background (Mesh gradients, animated glow orbs, geometric dot matrix) */}
      <AttractiveBackground currentTheme={bgTheme} onThemeChange={handleThemeChange} />

      {/* Top Status & Ambiance Bar */}
      <header className="relative z-10 w-full border-b border-emerald-900/10 bg-white/75 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Hub Tontine Digital</span>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline text-[11px] text-slate-500">
              Espace Sécurisé UEMOA & CEMAC • Mobile Money Intégré
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick theme ambiance switcher chips */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleThemeChange('emerald')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  bgTheme === 'emerald'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
                title="Ambiance Émeraude & Or (Défaut)"
              >
                Émeraude
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('ocean')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  bgTheme === 'ocean'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-teal-700'
                }`}
                title="Ambiance Lagon Turquoise"
              >
                Lagon
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('ivory')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  bgTheme === 'ivory'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
                title="Ambiance Nacre Dorée"
              >
                Nacre
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('night')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  bgTheme === 'night'
                    ? 'bg-slate-900 text-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ambiance Obsidienne Nuit"
              >
                Nuit
              </button>
            </div>

            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantie Sécurisée</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* =========================================================================
            HEADLINE CARD - Left-Anchored, Airy, Animated Green Gradient Background
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 animated-green-gradient p-6 sm:p-10 shadow-lg text-white">
          {/* Animated subtle floating glow shapes */}
          <motion.div
            animate={{
              x: [0, 25, 0],
              y: [0, -20, 0],
              scale: [1, 1.15, 1],
              opacity: [0.35, 0.6, 0.35],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/25 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -30, 0],
              y: [0, 25, 0],
              scale: [1, 1.2, 1],
              opacity: [0.25, 0.5, 0.25],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="pointer-events-none absolute -bottom-24 -left-20 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              opacity: [0.15, 0.35, 0.15],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="pointer-events-none absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-200/15 rounded-full blur-2xl"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* LEFT COLUMN: Clean Headline with TONTINE in grand characters */}
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={connectedUser ? "lg:col-span-7 space-y-4 text-left" : "lg:col-span-12 space-y-4 text-left"}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/40 backdrop-blur-md text-emerald-200 border border-emerald-400/30 text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Plateforme Tontine Digitale & Commissions</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight text-white leading-none">
                TONTINE
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-100/95 tracking-tight leading-snug">
                Gérez vos tontines et commissions en toute simplicité.
              </p>

              <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl leading-relaxed">
                Suivi transparent des tours, versements instantanés Mobile Money (Wave, Orange Money, MTN) et rétribution automatique des gestionnaires.
              </p>

              {/* Connected user quick shortcuts */}
              {connectedUser && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-emerald-50 text-emerald-950 transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                    <span>Ouvrir mon tableau de bord</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>

                  {isManager ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-950/50 hover:bg-emerald-900/60 text-white transition-colors border border-emerald-400/30 shadow-xs flex items-center gap-2 backdrop-blur-xs cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-300" />
                      <span>Créer une tontine</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-950/50 hover:bg-emerald-900/60 text-white transition-colors border border-emerald-400/30 shadow-xs flex items-center gap-2 backdrop-blur-xs cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-300" />
                      <span>Payer ma cotisation</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className="px-3.5 py-3 rounded-xl text-xs font-semibold text-emerald-100 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    Voir les forfaits
                  </button>
                </div>
              )}
            </motion.div>

            {/* RIGHT COLUMN: Active Session Quick Highlight (only when connectedUser is active) */}
            {connectedUser && (
              <motion.div
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                className="lg:col-span-5"
              >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-400/20 p-5 sm:p-6 shadow-xl space-y-4 text-slate-900">
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          connectedUser.kyc?.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 animate-pulse'
                        }`}
                        title="Gérer mon profil et ma vérification KYC"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{connectedUser.kyc?.status === 'VERIFIED' ? 'KYC Vérifié' : 'Vérifier KYC'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('login')}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                        title="Changer de profil"
                      >
                        Changer
                      </button>
                    </div>
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
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
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
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          Payer mon tour <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
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
          {!connectedUser ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('registration')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Créer un Compte Gestionnaire</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Lancez votre propre tontine et encaissez vos commissions de gestion.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('registration')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Rejoindre en tant que Membre</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Intégrez une tontine avec votre code d'invitation et cotisez via Mobile Money.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Simuler la Rentabilité</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Calculer les montants collectés et commissions potentielles selon votre formule.
                </div>
              </button>
            </>
          ) : isManager ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
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
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
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
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
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
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">Payer ma Cotisation</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Régler le tour en cours via Mobile Money sécurisé.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
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
                type="button"
                onClick={() => setActiveTab('plans')}
                className="p-4 rounded-2xl bg-white/85 backdrop-blur-md hover:bg-white border border-emerald-900/10 hover:border-emerald-400/50 transition-all text-left shadow-xs hover:shadow-md group cursor-pointer"
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
            CLEAN NAVIGATION TABS BAR
            ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-emerald-900/10 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tableau de Bord</span>
            </button>

            <button
              id="nav-tab-plans"
              onClick={() => setActiveTab('plans')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Forfaits & Simulateur</span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mon Profil & KYC</span>
              {connectedUser && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    connectedUser.kyc?.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}
                >
                  {connectedUser.kyc?.status === 'VERIFIED' ? 'Niv. 2' : 'À vérifier'}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="nav-tab-registration"
              onClick={() => setActiveTab('registration')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'registration'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Inscription</span>
            </button>

            <button
              id="nav-tab-login"
              onClick={() => setActiveTab('login')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          </div>
        </div>

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
            onNavigateToProfile={() => setActiveTab('profile')}
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
      </main>

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern, Clean Glassmorphic Footer */}
      <footer className="border-t border-emerald-900/10 bg-white/80 backdrop-blur-md py-6 mt-16 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-800">TONTINE</span>
            <span>—</span>
            <span>Plateforme d'épargne rotative et commissions transparentes.</span>
            <button
              type="button"
              onClick={() => setShowFooterTermsModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              Politique d'Utilisation
            </button>
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

      {/* Global Terms of Use Modal */}
      <TermsModal
        isOpen={showFooterTermsModal}
        onClose={() => setShowFooterTermsModal(false)}
        highlightRole={connectedUser?.role}
        alreadyAccepted={!!connectedUser?.acceptedTerms}
      />
    </div>
  );
}
