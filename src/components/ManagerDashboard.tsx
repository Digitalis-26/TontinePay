import React, { useState } from 'react';
import { RegisteredUser, TontineRecord, ManagerWalletTransaction, PlanConfig } from '../types';
import { formatPercent, formatXOF } from '../data/plans';
import { TurnSelectionModal } from './TurnSelectionModal';
import {
  Briefcase,
  Wallet,
  TrendingUp,
  Coins,
  ArrowUpRight,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  ShieldCheck,
  Send,
  Download,
  Filter,
  Code2,
  Gift,
  Info,
  Pencil,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';

interface ManagerDashboardProps {
  manager: RegisteredUser;
  tontines: TontineRecord[];
  walletTransactions: ManagerWalletTransaction[];
  currentRates: Record<PlanConfig['code'], number>;
  onWithdraw: (amount: number, provider: string, account: string) => void;
  onCreateTontine: (tontine: Omit<TontineRecord, 'id'>) => void;
  onPayoutBeneficiary: (tontineId: string, roundNumber: number) => void;
  onUpdateTontineAmount?: (tontineId: string, newAmount: number) => void;
  onUpdateMemberTurn?: (tontineId: string, memberUserId: string, newTurnNumber: number) => void;
  onNavigateToSimulate?: (planCode: PlanConfig['code']) => void;
  onNavigateToRisk?: () => void;
}

export function ManagerDashboard({
  manager,
  tontines,
  walletTransactions,
  currentRates,
  onWithdraw,
  onCreateTontine,
  onPayoutBeneficiary,
  onUpdateTontineAmount,
  onUpdateMemberTurn,
  onNavigateToSimulate,
  onNavigateToRisk,
}: ManagerDashboardProps) {
  const managerDetails = manager.managerDetails;
  const planCode = managerDetails?.planCode || 'STARTER';
  const effectiveMaxRate = currentRates[planCode] ?? managerDetails?.commissionRate ?? 0.025;

  // Modals & UI States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAmountTontine, setEditingAmountTontine] = useState<TontineRecord | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<number>(50000);
  const [managingTurnData, setManagingTurnData] = useState<{ tontine: TontineRecord; memberUserId: string } | null>(null);
  const [expandedTontineId, setExpandedTontineId] = useState<string | null>(tontines[0]?.id || null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showPrismaQuery, setShowPrismaQuery] = useState(false);

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState(50000);
  const [withdrawProvider, setWithdrawProvider] = useState<'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER'>(
    managerDetails?.payoutProvider || 'WAVE'
  );
  const [withdrawAccount, setWithdrawAccount] = useState(managerDetails?.payoutAccount || manager.phone);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Create Tontine form
  const [newTontineName, setNewTontineName] = useState('');
  const [newContributionAmount, setNewContributionAmount] = useState(50000);
  const [newTotalRounds, setNewTotalRounds] = useState(10);
  const [newPeriodicity, setNewPeriodicity] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [newCommissionRate, setNewCommissionRate] = useState(effectiveMaxRate);

  // Le manager n'est pas tenu de participer aux cagnottes (défaut : false)
  const [managerParticipates, setManagerParticipates] = useState(false);
  const [managerPreferredTurn, setManagerPreferredTurn] = useState(1);
  const [seedDemoMembers, setSeedDemoMembers] = useState(true);

  // Filter manager's tontines: created vs joined
  const myManagedTontines = tontines.filter((t) => t.managerId === manager.id);
  const myJoinedTontines = tontines.filter(
    (t) => t.managerId !== manager.id && t.members.some((m) => m.userId === manager.id)
  );
  const myTontines = myManagedTontines;
  const myWalletTransactions = walletTransactions.filter((tx) => tx.managerId === manager.id);

  // Computed metrics
  const walletBalance = managerDetails?.walletBalance ?? 0;
  const totalCollectedVolume = myTontines.reduce(
    (acc, t) => acc + t.contributionAmount * t.members.length * t.currentRound,
    0
  );
  const totalCommissionsEarned = myTontines.reduce(
    (acc, t) => acc + t.contributionAmount * t.members.length * t.currentRound * t.commissionRate,
    0
  );
  const totalMembersCount = myTontines.reduce((acc, t) => acc + t.members.length, 0);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > walletBalance) return;

    onWithdraw(withdrawAmount, withdrawProvider, withdrawAccount);
    setWithdrawSuccess(
      `Virement de ${formatXOF(withdrawAmount)} ordonné vers ${withdrawProvider} (${withdrawAccount}). Les fonds sont crédités instantanément.`
    );
    setTimeout(() => {
      setShowWithdrawModal(false);
      setWithdrawSuccess(null);
    }, 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTontineName.trim()) return;

    const code = `TNT-${newTontineName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialMembers: TontineRecord['members'] = [];

    // Le manager n'est PAS tenu de participer à la tontine.
    // Il participe UNIQUEMENT s'il coche explicitement l'option "Participer également en tant que membre cotisant".
    if (managerParticipates) {
      initialMembers.push({
        id: `tm-mgr-${Date.now()}`,
        userId: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        phone: manager.phone,
        turnNumber: managerPreferredTurn || 1,
        hasPaidCurrentRound: true,
        isCurrentBeneficiary: (managerPreferredTurn || 1) === 1,
        paymentMethod: managerDetails?.payoutProvider || 'WAVE',
      });
    }

    // Amorçage optionnel avec membres de test de la communauté pour animer la rotation
    if (seedDemoMembers) {
      const communityMembers = [
        { name: 'Kadiatou Diallo', phone: '+221 78 456 78 90', method: 'ORANGE_MONEY' },
        { name: 'Ousmane Fall', phone: '+221 77 123 45 67', method: 'WAVE' },
        { name: 'Aminata Sanogo', phone: '+223 76 54 32 10', method: 'MTN_MOMO' },
      ];

      communityMembers.forEach((cand, idx) => {
        let turn = idx + 1;
        if (managerParticipates && turn === managerPreferredTurn) {
          turn = idx + 2;
        }
        if (turn <= newTotalRounds) {
          initialMembers.push({
            id: `tm-demo-${Date.now()}-${idx}`,
            userId: `usr-demo-${idx + 10}`,
            name: cand.name,
            phone: cand.phone,
            turnNumber: turn,
            hasPaidCurrentRound: true,
            isCurrentBeneficiary: turn === 1 && (!managerParticipates || managerPreferredTurn !== 1),
            paymentMethod: cand.method,
          });
        }
      });
    }

    const newTontine: Omit<TontineRecord, 'id'> = {
      code,
      name: newTontineName.trim(),
      managerId: manager.id,
      managerName: `${manager.firstName} ${manager.lastName} (${managerDetails?.businessName || 'Tontine'})`,
      contributionAmount: newContributionAmount,
      periodicity: newPeriodicity,
      currentRound: 1,
      totalRounds: newTotalRounds,
      commissionRate: Math.min(newCommissionRate, effectiveMaxRate),
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      nextDueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      managerParticipatesAsMember: managerParticipates,
      members: initialMembers,
    };

    onCreateTontine(newTontine);
    setShowCreateModal(false);
    setNewTontineName('');
    setManagerParticipates(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Profile Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 text-xl font-bold shrink-0">
              {manager.firstName.charAt(0)}
              {manager.lastName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                  {manager.firstName} {manager.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-stone-950 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Gestionnaire
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                  {manager.countryName} ({manager.city})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  {managerDetails?.businessName || 'Organisation Tontine'}
                </span>
                <span>•</span>
                <span className="font-mono text-stone-500">{manager.phone}</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Statut : {manager.status}
                </span>
              </div>
            </div>
          </div>

          {/* Plan & Commission Badge */}
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <div className="text-[11px] text-stone-500 font-medium">Abonnement Actif</div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                Plan {planCode}
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">
                  Max {formatPercent(effectiveMaxRate)}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-stone-200" />
            <div>
              <div className="text-[11px] text-stone-500 font-medium">Portefeuille Reversement</div>
              <div className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-stone-500" />
                {managerDetails?.payoutProvider} ({managerDetails?.payoutAccount || manager.phone})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="bg-stone-900 text-white p-5 rounded-2xl border border-stone-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-medium">Solde Portefeuille Commissions</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
              {formatXOF(walletBalance)}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Disponible pour virement immédiat
            </p>
          </div>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={walletBalance <= 0}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Retirer les commissions
          </button>
        </div>

        {/* Total Earned */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Commissions Cumulées</span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
              {formatXOF(totalCommissionsEarned)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Taux appliqué : <strong className="text-amber-700">{formatPercent(effectiveMaxRate)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Retenue automatique :</span>
            <span className="font-semibold text-emerald-600">Active ✓</span>
          </div>
        </div>

        {/* Total Funds Managed */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Volume Collecté & Tournant</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
              {formatXOF(totalCollectedVolume)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Cotisations collectées sur l'ensemble des tours
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Taux de recouvrement :</span>
            <span className="font-bold text-stone-900">96.8%</span>
          </div>
        </div>

        {/* Tontines & Members */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Tontines Actives</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
              {myTontines.length} <span className="text-sm font-normal text-stone-500">tontines</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {totalMembersCount} membres cotisants enregistrés
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            Créer une tontine
          </button>
        </div>
      </div>

      {/* TONTINES MANAGEMENT LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Tontines sous votre Gestion ({myTontines.length})
            </h2>
            <p className="text-xs text-stone-500">
              Suivez l'état des tours, les cotisations des membres et les retenues de vos commissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToSimulate && (
              <button
                onClick={() => onNavigateToSimulate(planCode)}
                className="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                Simuler un cycle ({formatPercent(effectiveMaxRate)})
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle Tontine
            </button>
          </div>
        </div>

        {/* Tontine Cards List */}
        {myTontines.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-3">
            <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-sm font-bold text-stone-800">Aucune tontine créée pour le moment</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Lancez votre première tontine en définissant le montant de la cotisation, le nombre de tours et le taux de commission autorisé par votre plan {planCode}.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer ma première tontine
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myTontines.map((tontine) => {
              const isExpanded = expandedTontineId === tontine.id;
              const isManagerParticipating = tontine.members.some((m) => m.userId === manager.id);
              const managerTurn = tontine.members.find((m) => m.userId === manager.id)?.turnNumber;
              const grossTurnAmount = tontine.contributionAmount * tontine.members.length;
              const commissionTurnAmount = grossTurnAmount * tontine.commissionRate;
              const netBeneficiaryPayout = grossTurnAmount - commissionTurnAmount;
              const currentBeneficiary = tontine.members.find((m) => m.turnNumber === tontine.currentRound);
              const paidMembersCount = tontine.members.filter((m) => m.hasPaidCurrentRound).length;

              return (
                <div
                  key={tontine.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Card Header Summary */}
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-stone-100">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900">{tontine.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tontine.status}
                        </span>

                        {/* Rôle du Manager dans cette Tontine */}
                        {isManagerParticipating ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Gestionnaire & Cotisant (Tour #{managerTurn})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1" title="Le manager est superviseur et perçoit sa commission sans obligation de cotiser">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            Superviseur uniquement (Non-cotisant)
                          </span>
                        )}

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-mono">
                          <span>Code : {tontine.code}</span>
                          <button
                            onClick={() => handleCopyCode(tontine.code)}
                            className="text-stone-400 hover:text-stone-800"
                            title="Copier le code d'invitation"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {copiedCode === tontine.code && (
                          <span className="text-[10px] text-emerald-600 font-semibold">Copié !</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1 font-medium text-stone-700">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          Périodicité : {tontine.periodicity === 'MONTHLY' ? 'Mensuelle' : 'Hebdomadaire'}
                        </span>
                        <span>•</span>
                        <span>
                          Prochaine échéance :{' '}
                          <strong className="text-stone-800">{tontine.nextDueDate}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Membres :{' '}
                          <strong className="text-stone-800">{tontine.members.length} participants</strong>
                        </span>
                      </div>
                    </div>

                    {/* Financial Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/80 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-stone-500 block">Cotisation unitaire</span>
                          {tontine.managerId === manager.id && onUpdateTontineAmount && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAmountTontine(tontine);
                                setEditAmountValue(tontine.contributionAmount);
                              }}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
                              title="Fixer ou modifier le montant de la cotisation"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Fixer</span>
                            </button>
                          )}
                        </div>
                        <span className="font-bold text-stone-900 font-mono block mt-0.5">
                          {formatXOF(tontine.contributionAmount)}
                        </span>
                        <span className="text-[9px] text-emerald-700 font-medium">
                          Fixé par le Manager
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Cagnotte Brute</span>
                        <span className="font-bold text-stone-900 font-mono">
                          {formatXOF(grossTurnAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Votre Commission</span>
                        <span className="font-black text-amber-700 font-mono">
                          {formatXOF(commissionTurnAmount)}{' '}
                          <span className="text-[10px] font-normal text-amber-800">
                            ({formatPercent(tontine.commissionRate)})
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Cagnotte Nette Bénéficiaire</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {formatXOF(netBeneficiaryPayout)}
                        </span>
                      </div>
                    </div>

                    {/* Anti-Default & Risk Guard Strip */}
                    <div className="mt-3 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>Séquestre Cautions : <strong>{formatXOF(tontine.totalEscrowHeld || tontine.contributionAmount * tontine.members.length)}</strong></span>
                        </div>
                        <div className="text-stone-600">
                          Garants Tours 1 & 2 : <strong className="text-indigo-700">{tontine.members.filter(m => m.turnNumber <= 2 && m.guarantorStatus === 'VERIFIED').length} / {tontine.members.filter(m => m.turnNumber <= 2).length} vérifiés</strong>
                        </div>
                        <div className="text-stone-600">
                          Pénalités retard : <strong className="text-rose-700">{formatXOF(tontine.penaltyPerDay || 1000)} / jour</strong>
                        </div>
                      </div>
                      {onNavigateToRisk && (
                        <button
                          type="button"
                          onClick={onNavigateToRisk}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Gérer les cautions & risques</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress & Current Beneficiary Banner */}
                  <div className="px-5 sm:px-6 py-3.5 bg-stone-50/70 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Cycle Progress bar */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700">
                          Progression du cycle : Tour {tontine.currentRound} sur {tontine.totalRounds}
                        </span>
                        <span className="font-bold text-stone-900">
                          {Math.round((tontine.currentRound / tontine.totalRounds) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(tontine.currentRound / tontine.totalRounds) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Current Beneficiary Pill */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider">
                          Bénéficiaire du Tour {tontine.currentRound}
                        </span>
                        <span className="text-xs font-bold text-stone-900">
                          {currentBeneficiary ? (
                            <span className="text-emerald-800 flex items-center gap-1 justify-end">
                              <span>{currentBeneficiary.name}</span>
                              {currentBeneficiary.userId === manager.id ? (
                                <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-md font-semibold">
                                  (Vous)
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md font-semibold">
                                  (Membre)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">
                              Tour libre (en attente d'adhésion)
                            </span>
                          )}
                        </span>
                      </div>

                      {currentBeneficiary ? (
                        <button
                          onClick={() => onPayoutBeneficiary(tontine.id, tontine.currentRound)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Verser la cagnotte ({formatXOF(netBeneficiaryPayout)})
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-400 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
                          title="Le gestionnaire ne perçoit pas la cagnotte. Un membre cotisant doit occuper ce tour."
                        >
                          <Clock className="w-3 h-3" />
                          En attente de bénéficiaire
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedTontineId(isExpanded ? null : tontine.id)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Member List */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 bg-white space-y-4">
                      {!isManagerParticipating && (
                        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs flex items-start gap-2.5 text-amber-950">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <strong className="font-bold text-stone-900">Régime de Gestionnaire Non-Cotisant :</strong> En tant que manager, vous n'êtes <strong>pas tenu de participer aux cagnottes</strong>. Vous supervisez la discipline financière, approuvez les versements des membres listés ci-dessous et prélevez automatiquement votre commission réglementée de {formatPercent(tontine.commissionRate)} à chaque tour versé.
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                          <div className="font-bold text-stone-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-stone-500" />
                            Participants & Statut des Cotisations (Tour {tontine.currentRound})
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono text-[11px]">
                              {paidMembersCount} / {tontine.members.length} cotisations payées
                            </span>
                          </div>
                          <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" />
                            {tontine.members.length} / {tontine.totalRounds} tours de cagnotte attribués
                          </span>
                        </div>

                        {/* Rounds Allocation Visual Bar */}
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-stone-600 mr-1 flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-emerald-600" />
                            Tours :
                          </span>
                          {Array.from({ length: tontine.totalRounds }, (_, i) => i + 1).map((rn) => {
                            const occupant = tontine.members.find((m) => m.turnNumber === rn);
                            const isCurrent = rn === tontine.currentRound;
                            return (
                              <button
                                key={rn}
                                type="button"
                                onClick={() => {
                                  if (occupant) {
                                    setManagingTurnData({ tontine, memberUserId: occupant.userId });
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                                  occupant
                                    ? isCurrent
                                      ? 'bg-amber-500 text-stone-950 ring-1 ring-amber-600/30 font-black cursor-pointer'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300/60 cursor-pointer'
                                    : 'bg-white text-stone-400 border border-dashed border-stone-300 cursor-default'
                                }`}
                                title={occupant ? `Tour #${rn} : ${occupant.name} (Cliquez pour réassigner)` : `Tour #${rn} : Libre`}
                              >
                                T#{rn} {occupant ? occupant.name.split(' ')[0] : 'libre'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-stone-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 w-24 text-center">Tour Cagnotte</th>
                              <th className="py-2.5 px-3">Membre</th>
                              <th className="py-2.5 px-3">Téléphone</th>
                              <th className="py-2.5 px-3">Paiement Mobile</th>
                              <th className="py-2.5 px-3">Score & Sécurité</th>
                              <th className="py-2.5 px-3 text-center">Statut Tour {tontine.currentRound}</th>
                              <th className="py-2.5 px-3 text-right">Rôle dans le Tour</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {tontine.members.map((member) => {
                              const isTurnBeneficiary = member.turnNumber === tontine.currentRound;
                              return (
                                <tr
                                  key={member.id}
                                  className={`hover:bg-stone-50/70 transition-colors ${
                                    isTurnBeneficiary ? 'bg-amber-50/30 font-medium' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setManagingTurnData({ tontine, memberUserId: member.userId })}
                                      className="font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300/60 transition-colors inline-flex items-center gap-1"
                                      title="Cliquez pour changer le tour de cagnotte de ce membre"
                                    >
                                      #{member.turnNumber}
                                      <span className="text-[9px] text-emerald-600">✎</span>
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-stone-900">{member.name}</span>
                                      {member.userId === manager.id && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                          Vous (Cotisant)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-stone-600">{member.phone}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                                      {member.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                                          (member.tontineScore ?? 90) >= 85
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : (member.tontineScore ?? 90) >= 70
                                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                                            : 'bg-rose-50 text-rose-800 border-rose-300'
                                        }`}
                                      >
                                        Score {member.tontineScore ?? 90}/100
                                      </span>
                                      {member.cautionStatus === 'ESCROWED' && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-semibold border border-stone-200" title="Caution bloquée sous séquestre">
                                          🔒 Séquestre
                                        </span>
                                      )}
                                      {member.turnNumber <= 2 && (
                                        <span
                                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                            member.guarantorStatus === 'VERIFIED'
                                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                                          }`}
                                          title={
                                            member.guarantorStatus === 'VERIFIED'
                                              ? `Garant vérifié: ${member.guarantorName || 'Parrain validé'}`
                                              : 'Garant obligatoire pour Tour 1 ou 2'
                                          }
                                        >
                                          {member.guarantorStatus === 'VERIFIED' ? '🛡️ Co-cautionné' : '⚠️ Garant Requis'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {member.hasPaidCurrentRound ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Payé ({formatXOF(tontine.contributionAmount)})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        <Clock className="w-3 h-3" />
                                        En attente
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {isTurnBeneficiary ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                                        🎉 Bénéficiaire
                                      </span>
                                    ) : member.turnNumber < tontine.currentRound ? (
                                      <span className="text-[11px] text-stone-400">Déjà perçu</span>
                                    ) : (
                                      <span className="text-[11px] text-stone-500">
                                        Tour #{member.turnNumber}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tontines where this manager is a participant (joined) */}
        {myJoinedTontines.length > 0 && (
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Tontines où vous cotisez comme membre ({myJoinedTontines.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Tontines créées par d'autres gestionnaires auxquelles vous avez adhéré.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myJoinedTontines.map((tontine) => {
                const myPart = tontine.members.find((m) => m.userId === manager.id);
                const isTurnBeneficiary = myPart?.turnNumber === tontine.currentRound;
                return (
                  <div
                    key={tontine.id}
                    className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{tontine.name}</h4>
                        <p className="text-xs text-stone-500">
                          Gérée par {tontine.managerName} • Code : <span className="font-mono font-bold text-stone-700">{tontine.code}</span>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700 font-mono">
                        Tour {tontine.currentRound}/{tontine.totalRounds}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-stone-200/60 gap-2">
                      <span className="text-stone-600">Cotisation : <strong>{formatXOF(tontine.contributionAmount)}</strong></span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-600">Votre tour : <strong className="text-emerald-700 font-mono">#{myPart?.turnNumber}</strong></span>
                        <button
                          type="button"
                          onClick={() => setManagingTurnData({ tontine, memberUserId: manager.id })}
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Choisir ou changer votre tour de cagnotte"
                        >
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          <span>Changer</span>
                        </button>
                      </div>
                      {myPart?.hasPaidCurrentRound ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                          Cotisation à jour
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                          À régler
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* WALLET TRANSACTIONS & COMMISSION LOG */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              Journal des Mouvements du Portefeuille de Commissions
            </h3>
            <p className="text-xs text-stone-500">
              Historique vérifiable des crédits de commissions retenues et des retraits vers votre Mobile Money.
            </p>
          </div>

          <button
            onClick={() => setShowPrismaQuery(!showPrismaQuery)}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 self-start"
          >
            <Code2 className="w-4 h-4 text-amber-600" />
            {showPrismaQuery ? 'Masquer la requête Prisma' : 'Voir la requête Prisma'}
          </button>
        </div>

        {showPrismaQuery && (
          <div className="p-4 rounded-xl bg-stone-950 text-stone-300 font-mono text-[11px] overflow-x-auto border border-stone-800 space-y-1">
            <p className="text-stone-500">// Requête ORM pour charger le portefeuille et le grand livre du Manager</p>
            <pre>{`const managerData = await prisma.manager.findUnique({
  where: { id: "${manager.id}" },
  include: {
    wallet: true,
    tontines: {
      include: {
        members: { include: { user: true } },
        commissions: true
      }
    },
    commissions: { orderBy: { createdAt: 'desc' }, take: 20 },
    withdrawals: { orderBy: { createdAt: 'desc' } }
  }
});`}</pre>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Montant</th>
                <th className="py-2.5 px-3 text-right">Solde Après</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {myWalletTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-stone-600">
                    {new Date(tx.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    {tx.type === 'COMMISSION_CREDIT' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Commission perçue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        Retrait effectué
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-stone-800">{tx.description}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      tx.type === 'COMMISSION_CREDIT' ? 'text-emerald-700' : 'text-stone-900'
                    }`}
                  >
                    {tx.type === 'COMMISSION_CREDIT' ? '+' : '-'} {formatXOF(tx.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-stone-600">{formatXOF(tx.balanceAfter)}</td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Effectué ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RETRAIT DE COMMISSION */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Retrait des Commissions</h3>
                  <p className="text-[11px] text-stone-500">Vers votre compte Mobile Money</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Virement réussi !
                </div>
                <p className="leading-relaxed">{withdrawSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                  <span className="text-stone-600">Solde disponible :</span>
                  <span className="text-base font-black text-amber-700 font-mono">
                    {formatXOF(walletBalance)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Montant à retirer (FCFA) *</label>
                  <input
                    type="number"
                    min={1000}
                    max={walletBalance}
                    step={1000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <div className="flex gap-2 pt-1">
                    {[25000, 50000, 100000, walletBalance].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWithdrawAmount(preset)}
                        className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-mono text-stone-700"
                      >
                        {formatXOF(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Opérateur de destination *</label>
                  <select
                    value={withdrawProvider}
                    onChange={(e) => setWithdrawProvider(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="WAVE">Wave Mobile Money (Frais 0%)</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                    <option value="BANK_TRANSFER">Virement Bancaire (RIB)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    Numéro de téléphone / Compte récepteur *
                  </label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="+221 77 452 89 12"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawAmount <= 0 || withdrawAmount > walletBalance}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Valider le virement
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CRÉER UNE NOUVELLE TONTINE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Créer une Nouvelle Tontine</h3>
                  <p className="text-[11px] text-stone-500">
                    Souscrit avec le plan {planCode} (plafond : {formatPercent(effectiveMaxRate)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Nom de la Tontine *</label>
                <input
                  type="text"
                  required
                  value={newTontineName}
                  onChange={(e) => setNewTontineName(e.target.value)}
                  placeholder="Ex: Tontine des Femmes Entrepreneures, Cercle Épargne Auto..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    Montant de la cotisation (Fixé par le Manager) *
                  </label>
                  <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {formatXOF(newContributionAmount)} / tour
                  </span>
                </div>

                {/* Quick amount presets for manager */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-stone-500 mr-1">Paliers rapides :</span>
                  {[5000, 10000, 25000, 50000, 100000, 200000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewContributionAmount(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        newContributionAmount === preset
                          ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset} F
                    </button>
                  ))}
                </div>

                {/* Direct custom amount input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="number"
                        min={500}
                        step={500}
                        required
                        value={newContributionAmount}
                        onChange={(e) => setNewContributionAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="Montant libre..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-500 font-mono pointer-events-none">
                        FCFA
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">
                      Saisissez n'importe quel montant personnalisé (min. 500 F CFA).
                    </span>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="number"
                      min={3}
                      max={50}
                      value={newTotalRounds}
                      onChange={(e) => setNewTotalRounds(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <span className="text-[10px] text-stone-500 block">
                      Nombre de participants cotisants (3 à 50 membres).
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Fréquence des tours</label>
                  <select
                    value={newPeriodicity}
                    onChange={(e) => setNewPeriodicity(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="MONTHLY">Mensuelle (Chaque mois)</option>
                    <option value="WEEKLY">Hebdomadaire (Chaque semaine)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    Taux de Commission (Max {formatPercent(effectiveMaxRate)})
                  </label>
                  <input
                    type="number"
                    min={0.005}
                    max={effectiveMaxRate}
                    step={0.001}
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              {/* Choix du rôle du Gestionnaire dans la Tontine */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Participation du Gestionnaire aux cagnottes
                  </label>
                  <span className="text-[10px] text-stone-500 font-medium">Optionnel</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Le manager n'est <strong>pas tenu de participer</strong> à la tontine. Vous pouvez la créer et la piloter comme superviseur indépendant sans cotiser.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Option A: Superviseur uniquement (défaut) */}
                  <button
                    type="button"
                    onClick={() => setManagerParticipates(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      !managerParticipates
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                        Superviseur uniquement
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-600 mt-1 leading-snug">
                      Vous ne cotisez pas et ne recevez pas de cagnotte. Vous prélevez votre commission de {formatPercent(newCommissionRate)} à chaque tour.
                    </p>
                  </button>

                  {/* Option B: Participant cotisant */}
                  <button
                    type="button"
                    onClick={() => setManagerParticipates(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      managerParticipates
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        Participer aussi
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                        Double rôle
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-600 mt-1 leading-snug">
                      Vous cotisez à chaque tour et choisissez un numéro de tour pour percevoir vous-même une cagnotte nette.
                    </p>
                  </button>
                </div>

                {/* Si le manager participe : sélection du tour souhaité */}
                {managerParticipates && (
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1.5 mt-2">
                    <label className="text-[11px] font-semibold text-stone-700 flex items-center justify-between">
                      <span>Votre tour de cagnotte souhaité :</span>
                      <span className="font-mono text-xs font-bold text-amber-700">
                        Tour #{managerPreferredTurn} sur {newTotalRounds}
                      </span>
                    </label>
                    <select
                      value={managerPreferredTurn}
                      onChange={(e) => setManagerPreferredTurn(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {Array.from({ length: newTotalRounds }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Tour #{n} {n === 1 ? '(Bénéficiaire du 1er tour)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Option d'amorçage avec membres communautaires */}
                <label className="flex items-start gap-2.5 pt-2 border-t border-stone-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedDemoMembers}
                    onChange={(e) => setSeedDemoMembers(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-stone-800 block">
                      Pré-inscrire 3 membres cotisants invités (Kadiatou, Ousmane, Aminata)
                    </span>
                    <span className="text-stone-500 block">
                      Permet d'expérimenter immédiatement la rotation et les paiements sans attendre des inscriptions manuelles.
                    </span>
                  </div>
                </label>
              </div>

              {/* Live Preview of Economics */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-2">
                <div className="font-bold text-amber-950">Aperçu financier par tour :</div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">Cagnotte Brute :</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {formatXOF(newContributionAmount * newTotalRounds)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Votre Commission :</span>
                    <span className="font-bold text-amber-800 font-mono">
                      {formatXOF(newContributionAmount * newTotalRounds * newCommissionRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Cagnotte Nette Bénéficiaire :</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatXOF(
                        newContributionAmount * newTotalRounds * (1 - newCommissionRate)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Créer et générer le code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FIXER / MODIFIER LE MONTANT DE LA COTISATION */}
      {editingAmountTontine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Fixer le Montant de la Cotisation
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {editingAmountTontine.name} • {editingAmountTontine.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAmountTontine(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                <span className="block text-[11px] text-stone-500">Montant actuel enregistré :</span>
                <span className="font-bold text-stone-900 font-mono text-sm">
                  {formatXOF(editingAmountTontine.contributionAmount)} / membre
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Nouveau montant de la cotisation unitaire (Fixé par vous) :
                </label>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[5000, 10000, 25000, 50000, 100000, 200000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditAmountValue(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        editAmountValue === preset
                          ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {formatXOF(preset)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={editAmountValue}
                    onChange={(e) => setEditAmountValue(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 font-mono pointer-events-none">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Simulation recalculée */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>Impact financier par tour :</span>
                  <span className="text-[10px] font-normal text-stone-600">
                    {editingAmountTontine.members.length} participants
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-200/60 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">Cagnotte Brute :</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {formatXOF(editAmountValue * editingAmountTontine.members.length)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">
                      Commission ({formatPercent(editingAmountTontine.commissionRate)}) :
                    </span>
                    <span className="font-bold text-amber-800 font-mono">
                      {formatXOF(
                        editAmountValue *
                          editingAmountTontine.members.length *
                          editingAmountTontine.commissionRate
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Cagnotte Nette :</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatXOF(
                        editAmountValue *
                          editingAmountTontine.members.length *
                          (1 - editingAmountTontine.commissionRate)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 leading-snug">
                En tant que gestionnaire, vous pouvez réajuster la cotisation unitaire selon les décisions prises en accord avec les membres de votre groupe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEditingAmountTontine(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateTontineAmount && editAmountValue >= 500) {
                    onUpdateTontineAmount(editingAmountTontine.id, editAmountValue);
                    setEditingAmountTontine(null);
                  }
                }}
                disabled={editAmountValue < 500}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Fixer ce Montant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTION & CHOIX DU TOUR DE CAGNOTTE */}
      {managingTurnData && (
        <TurnSelectionModal
          isOpen={Boolean(managingTurnData)}
          onClose={() => setManagingTurnData(null)}
          tontine={managingTurnData.tontine}
          currentUserId={managingTurnData.memberUserId}
          onConfirmTurn={(tontineId, newTurn) => {
            if (onUpdateMemberTurn) {
              onUpdateMemberTurn(tontineId, managingTurnData.memberUserId, newTurn);
            }
          }}
        />
      )}
    </div>
  );
}
