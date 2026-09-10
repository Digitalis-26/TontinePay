import React, { useState } from 'react';
import { RegisteredUser, TontineRecord, ManagerWalletTransaction, PlanConfig } from '../types';
import { formatPercent, formatXOF } from '../data/plans';
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
} from 'lucide-react';

interface ManagerDashboardProps {
  manager: RegisteredUser;
  tontines: TontineRecord[];
  walletTransactions: ManagerWalletTransaction[];
  currentRates: Record<PlanConfig['code'], number>;
  onWithdraw: (amount: number, provider: string, account: string) => void;
  onCreateTontine: (tontine: Omit<TontineRecord, 'id'>) => void;
  onPayoutBeneficiary: (tontineId: string, roundNumber: number) => void;
  onNavigateToSimulate?: (planCode: PlanConfig['code']) => void;
}

export function ManagerDashboard({
  manager,
  tontines,
  walletTransactions,
  currentRates,
  onWithdraw,
  onCreateTontine,
  onPayoutBeneficiary,
  onNavigateToSimulate,
}: ManagerDashboardProps) {
  const managerDetails = manager.managerDetails;
  const planCode = managerDetails?.planCode || 'STARTER';
  const effectiveMaxRate = currentRates[planCode] ?? managerDetails?.commissionRate ?? 0.025;

  // Modals & UI States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Filter manager's tontines
  const myTontines = tontines.filter((t) => t.managerId === manager.id);
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
      members: [
        {
          id: `tm-lead-${Date.now()}`,
          userId: manager.id,
          name: `${manager.firstName} ${manager.lastName}`,
          phone: manager.phone,
          turnNumber: 1,
          hasPaidCurrentRound: true,
          isCurrentBeneficiary: true,
          paymentMethod: managerDetails?.payoutProvider || 'WAVE',
        },
      ],
    };

    onCreateTontine(newTontine);
    setShowCreateModal(false);
    setNewTontineName('');
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
                        <span className="text-[10px] text-stone-500 block">Cotisation unitaire</span>
                        <span className="font-bold text-stone-900 font-mono">
                          {formatXOF(tontine.contributionAmount)}
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
                          {currentBeneficiary ? currentBeneficiary.name : 'Attribué'}
                        </span>
                      </div>

                      <button
                        onClick={() => onPayoutBeneficiary(tontine.id, tontine.currentRound)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        Verser la cagnotte ({formatXOF(netBeneficiaryPayout)})
                      </button>

                      <button
                        onClick={() => setExpandedTontineId(isExpanded ? null : tontine.id)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Member List */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 bg-white space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-bold text-stone-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-stone-500" />
                          Participants & Statut des Cotisations (Tour {tontine.currentRound})
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono text-[11px]">
                            {paidMembersCount} / {tontine.members.length} cotisations payées
                          </span>
                        </div>
                        <span className="text-stone-500 text-[11px]">
                          Ordre de rotation déterminé à l'ouverture
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-stone-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 w-16 text-center">Tour</th>
                              <th className="py-2.5 px-3">Membre</th>
                              <th className="py-2.5 px-3">Téléphone</th>
                              <th className="py-2.5 px-3">Paiement Mobile</th>
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
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-600">
                                    #{member.turnNumber}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-semibold text-stone-900">{member.name}</span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-stone-600">{member.phone}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                                      {member.paymentMethod}
                                    </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Cotisation par membre *</label>
                  <input
                    type="number"
                    min={5000}
                    step={5000}
                    value={newContributionAmount}
                    onChange={(e) => setNewContributionAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Nombre de participants *</label>
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={newTotalRounds}
                    onChange={(e) => setNewTotalRounds(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
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
                    <span className="text-stone-500 block">Cagnotte Nette :</span>
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
    </div>
  );
}
