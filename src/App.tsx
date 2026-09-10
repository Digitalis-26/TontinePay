import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { PlanCard } from './components/PlanCard';
import { CommissionSimulator } from './components/CommissionSimulator';
import { LedgerPreview } from './components/LedgerPreview';
import { CodeExportPanel } from './components/CodeExportPanel';
import { SchemaViewer } from './components/SchemaViewer';
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
  canUserAccessTontine,
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
  Percent,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Coins,
  UserPlus,
  LayoutDashboard,
  LogIn,
  LogOut,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'login' | 'plans' | 'simulator' | 'ledger' | 'registration' | 'export' | 'schema'
  >('dashboard');
  const [users, setUsers] = useState<RegisteredUser[]>(INITIAL_USERS);
  const [connectedUser, setConnectedUser] = useState<RegisteredUser | null>(INITIAL_USERS[0]);
  const [tontines, setTontines] = useState<TontineRecord[]>(INITIAL_TONTINES);
  const [payments, setPayments] = useState<MemberContributionPayment[]>(INITIAL_CONTRIBUTION_PAYMENTS);
  const [walletTransactions, setWalletTransactions] = useState<ManagerWalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );

  // Exact requested rates:
  // Free: 1.5% (0.0150)
  // Starter: 2.5% (0.0250)
  // Premium: 3.0% (0.0300)
  // Business: 3.5% (0.0350)
  const [rates, setRates] = useState<Record<PlanConfig['code'], number>>({
    FREE: 0.015,
    STARTER: 0.025,
    PREMIUM: 0.030,
    BUSINESS: 0.035,
  });

  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanConfig['code']>('STARTER');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRateChange = (code: PlanConfig['code'], newRate: number) => {
    setRates((prev) => ({
      ...prev,
      [code]: Math.round(newRate * 10000) / 10000,
    }));
  };

  const handleResetRate = (code: PlanConfig['code']) => {
    const defaultPlan = DEFAULT_PLANS.find((p) => p.code === code);
    if (defaultPlan) {
      setRates((prev) => ({
        ...prev,
        [code]: defaultPlan.maxCommissionRate,
      }));
      showToast(`Taux du plan ${code} réinitialisé à ${formatPercent(defaultPlan.maxCommissionRate)}`);
    }
  };

  const handleResetAll = () => {
    setRates({
      FREE: 0.015,
      STARTER: 0.025,
      PREMIUM: 0.030,
      BUSINESS: 0.035,
    });
    showToast('Tous les taux ont été réinitialisés aux valeurs cibles (1,5%, 2,5%, 3%, 3,5%)');
  };

  const handleSelectForSimulation = (code: PlanConfig['code']) => {
    setSelectedPlanCode(code);
    setActiveTab('simulator');
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

    // Update manager balance
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

    // Strict access check: only the manager of this tontine can payout
    if (tontine.managerId !== connectedUser.id) {
      showToast('Accès refusé : Seul le gestionnaire créateur de cette tontine peut verser la cagnotte.');
      return;
    }

    const potAmount = tontine.contributionAmount * tontine.members.length;
    const commission = Math.round(potAmount * tontine.commissionRate);
    const netPayout = potAmount - commission;

    const currentBal = connectedUser?.managerDetails?.walletBalance || 0;
    const newBal = currentBal + commission;

    // Credit manager wallet
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

    // Update tontine round
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

    // Update manager balance
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

    // Strict access check: only a participant or creator can contribute
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

    // Update tontine
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

  // Member: Join a tontine using invitation code
  const handleJoinTontineWithCode = (code: string): boolean => {
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

    const newParticipation: TontineMemberParticipation = {
      id: `tm-${Date.now()}`,
      userId: connectedUser.id,
      name: `${connectedUser.firstName} ${connectedUser.lastName}`,
      phone: connectedUser.phone,
      turnNumber: tontine.members.length + 1,
      hasPaidCurrentRound: false,
      isCurrentBeneficiary: false,
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

    showToast(`Félicitations ! Vous avez rejoint la tontine "${tontine.name}" (Rang #${newParticipation.turnNumber}).`);
    return true;
  };

  const anyModified =
    Math.abs(rates.FREE - 0.015) > 0.0001 ||
    Math.abs(rates.STARTER - 0.025) > 0.0001 ||
    Math.abs(rates.PREMIUM - 0.030) > 0.0001 ||
    Math.abs(rates.BUSINESS - 0.035) > 0.0001;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans">
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
        {/* Banner Alert confirming the update */}
        <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-6 shadow-md border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                Tableaux de Bord Connectés & Gestion des Tontines
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Espace TontinePay : Tableaux de Bord, Inscriptions & Commissions
              </h1>
              <p className="text-sm text-stone-300 max-w-3xl leading-relaxed">
                Taux paramétrés :{' '}
                <strong className="text-amber-400">Free : 1,5%</strong> (0.0150),{' '}
                <strong className="text-emerald-400">Starter : 2,5%</strong> (0.0250),{' '}
                <strong className="text-blue-400">Premium : 3,0%</strong> (0.0300) et{' '}
                <strong className="text-amber-300">Business : 3,5%</strong> (0.0350).{' '}
                {connectedUser ? (
                  <>
                    Session active :{' '}
                    <strong className="text-white">
                      {connectedUser.firstName} {connectedUser.lastName} (
                      {connectedUser.role === 'MANAGER' ? 'Gestionnaire' : 'Membre Cotisant'})
                    </strong>
                    .
                  </>
                ) : (
                  <span className="text-amber-300 font-semibold">
                    Aucune session active — Connectez-vous avec vos identifiants pour accéder à votre espace.
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {connectedUser ? (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Accéder au Dashboard ({connectedUser.role === 'MANAGER' ? 'Manager' : 'Membre'})
                  </button>
                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors border border-stone-700 flex items-center gap-1.5"
                    title="Changer d'utilisateur ou se connecter à un autre compte"
                  >
                    <LogIn className="w-3.5 h-3.5 text-amber-400" />
                    Changer de compte
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveTab('login')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </button>
              )}
              <button
                onClick={() => setActiveTab('registration')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-950 transition-colors shadow-sm flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-amber-600" />
                Inscrire un compte
              </button>
            </div>
          </div>

          {/* Quick Rates Metric Strip */}
          <div className="mt-6 pt-6 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                Free
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-white">{formatPercent(rates.FREE)}</span>
                <span className="text-[10px] font-mono text-stone-400">0.0150</span>
              </div>
            </div>

            <div className="bg-stone-800/60 p-3 rounded-xl border border-emerald-900/40">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
                Starter
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-emerald-300">{formatPercent(rates.STARTER)}</span>
                <span className="text-[10px] font-mono text-emerald-500">0.0250</span>
              </div>
            </div>

            <div className="bg-stone-800/60 p-3 rounded-xl border border-blue-900/40">
              <span className="text-[11px] uppercase tracking-wider text-blue-400 font-semibold block">
                Premium
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-blue-300">{formatPercent(rates.PREMIUM)}</span>
                <span className="text-[10px] font-mono text-blue-500">0.0300</span>
              </div>
            </div>

            <div className="bg-stone-800/60 p-3 rounded-xl border border-amber-900/40">
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block">
                Business
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-amber-300">{formatPercent(rates.BUSINESS)}</span>
                <span className="text-[10px] font-mono text-amber-500">0.0350</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Plans View */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  Grille Tarifaire des Plans & Taux de Commission
                </h2>
                <p className="text-xs text-stone-500">
                  Chaque plan définit un pourcentage maximal de commission applicable sur les cotisations des membres.
                </p>
              </div>

              <div className="text-xs text-stone-500 flex items-center gap-2">
                <span>Total : 4 plans configurés</span>
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {DEFAULT_PLANS.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  currentRate={rates[plan.code]}
                  onRateChange={handleRateChange}
                  onResetRate={handleResetRate}
                  onSelectForSimulation={handleSelectForSimulation}
                  isSimulated={selectedPlanCode === plan.code}
                />
              ))}
            </div>

            {/* Quick summary comparison card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-stone-900 mb-2">
                Synthèse des plafonds & règles métiers (Prisma ORM)
              </h3>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                Le modèle Prisma <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">SubscriptionPlan</code> intègre le champ{' '}
                <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">maxCommissionRate (Decimal(5, 4))</code>. Lors de la création d'une tontine ou d'une règle{' '}
                <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">CommissionRule</code>, le taux renseigné ne peut excéder la valeur autorisée par l'abonnement du gestionnaire.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900">1. Plan Free (Gratuit)</div>
                  <div className="text-stone-600 mt-1">
                    Commission : <strong className="text-stone-900">{formatPercent(rates.FREE)}</strong> (0.0150)<br />
                    Tontine max : 1 tontine<br />
                    Membres max : 15 personnes
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="font-bold text-emerald-950">2. Plan Starter (5 000 F)</div>
                  <div className="text-emerald-900 mt-1">
                    Commission : <strong className="text-emerald-950">{formatPercent(rates.STARTER)}</strong> (0.0250)<br />
                    Tontines max : 5 tontines<br />
                    Membres max : 50 personnes
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
                  <div className="font-bold text-blue-950">3. Plan Premium (10 000 F)</div>
                  <div className="text-blue-900 mt-1">
                    Commission : <strong className="text-blue-950">{formatPercent(rates.PREMIUM)}</strong> (0.0300)<br />
                    Tontines max : 20 tontines<br />
                    Membres max : 200 personnes
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
                  <div className="font-bold text-amber-950">4. Plan Business (15 000 F)</div>
                  <div className="text-amber-900 mt-1">
                    Commission : <strong className="text-amber-950">{formatPercent(rates.BUSINESS)}</strong> (0.0350)<br />
                    Tontines : Illimitées<br />
                    Membres : Illimités
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Login View */}
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

        {/* Tab 0: Dashboard for Connected User (Manager or Member) */}
        {activeTab === 'dashboard' && (
          <DashboardView
            users={users}
            connectedUser={connectedUser}
            onSelectConnectedUser={(u) => setConnectedUser(u)}
            tontines={connectedUser ? getUserAccessibleTontines(tontines, connectedUser.id) : []}
            allTontinesCount={tontines.length}
            payments={payments}
            walletTransactions={walletTransactions}
            currentRates={rates}
            onWithdraw={handleWithdraw}
            onCreateTontine={handleCreateTontine}
            onPayoutBeneficiary={handlePayoutBeneficiary}
            onPayContribution={handlePayContribution}
            onJoinTontineWithCode={handleJoinTontineWithCode}
            onNavigateToSimulate={handleSelectForSimulation}
            onNavigateToRegister={() => setActiveTab('registration')}
            onNavigateToLogin={() => setActiveTab('login')}
          />
        )}

        {/* Tab 2: Simulation */}
        {activeTab === 'simulator' && (
          <CommissionSimulator
            plans={DEFAULT_PLANS}
            rates={rates}
            selectedPlanCode={selectedPlanCode}
            onSelectPlan={(code) => setSelectedPlanCode(code)}
            onGoToLedger={() => setActiveTab('ledger')}
          />
        )}

        {/* Tab 3: Ledger Accounting */}
        {activeTab === 'ledger' && (
          <LedgerPreview
            plans={DEFAULT_PLANS}
            rates={rates}
            selectedPlanCode={selectedPlanCode}
            onSelectPlan={(code) => setSelectedPlanCode(code)}
          />
        )}

        {/* Tab: Registration for Members and Managers */}
        {activeTab === 'registration' && (
          <RegistrationView
            plans={DEFAULT_PLANS}
            currentRates={rates}
            users={users}
            onAddUser={handleAddUser}
            onSelectManagerForSimulation={(code) => {
              setSelectedPlanCode(code);
              setActiveTab('simulator');
            }}
            onLoginAsUser={handleLoginAsUser}
            onNavigateToLogin={() => setActiveTab('login')}
          />
        )}

        {/* Tab 4: SQL & Prisma Scripts */}
        {activeTab === 'export' && (
          <CodeExportPanel plans={DEFAULT_PLANS} rates={rates} />
        )}

        {/* Tab 5: Schema Viewer */}
        {activeTab === 'schema' && <SchemaViewer />}
      </main>

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-stone-900 text-white px-4 py-3 shadow-xl border border-stone-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span className="font-semibold text-stone-700">TontinePay Commission Engine</span> —{' '}
            Modèle relationnel PostgreSQL & Prisma ORM.
          </div>
          <div className="flex items-center gap-4">
            <span>Free: 1,5%</span>
            <span>•</span>
            <span>Starter: 2,5%</span>
            <span>•</span>
            <span>Premium: 3%</span>
            <span>•</span>
            <span>Business: 3,5%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
