import React, { useState } from 'react';
import { RegisteredUser, TontineRecord, MemberContributionPayment } from '../types';
import { formatPercent, formatXOF } from '../data/plans';
import {
  User,
  Wallet,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Gift,
  Building2,
  Smartphone,
  Receipt,
  FileText,
  Sparkles,
  ExternalLink,
  Code2,
  Lock,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

interface MemberDashboardProps {
  member: RegisteredUser;
  tontines: TontineRecord[];
  payments: MemberContributionPayment[];
  onPayContribution: (tontineId: string, amount: number, paymentMethod: string) => void;
  onJoinTontineWithCode: (code: string) => boolean;
}

export function MemberDashboard({
  member,
  tontines,
  payments,
  onPayContribution,
  onJoinTontineWithCode,
}: MemberDashboardProps) {
  const memberDetails = member.memberDetails;
  const defaultMethod = memberDetails?.paymentMethod || 'WAVE';

  // Modals
  const [selectedTontineToPay, setSelectedTontineToPay] = useState<TontineRecord | null>(null);
  const [paymentProvider, setPaymentProvider] = useState(defaultMethod);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    tontineName: string;
    amount: number;
    ref: string;
    date: string;
  } | null>(null);

  // Join Tontine by code
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [joinFeedback, setJoinFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Prisma Inspector
  const [showPrismaQuery, setShowPrismaQuery] = useState(false);

  // Filter tontines where this member participates
  const myParticipations = tontines.filter((t) =>
    t.members.some((m) => m.userId === member.id)
  );

  // Member's payment history
  const myPayments = payments.filter((p) => p.userId === member.id);

  // Computed metrics
  const totalPaidAmount = myPayments.reduce((acc, p) => acc + p.amount, 0);

  // Find if member is beneficiary anywhere this round
  const beneficiaryTontines = myParticipations.filter((t) => {
    const p = t.members.find((m) => m.userId === member.id);
    return p && p.turnNumber === t.currentRound;
  });

  // Calculate upcoming due payment
  const unpaidCurrentTontines = myParticipations.filter((t) => {
    const p = t.members.find((m) => m.userId === member.id);
    return p && !p.hasPaidCurrentRound;
  });

  const nextDueAmount = unpaidCurrentTontines.reduce((acc, t) => acc + t.contributionAmount, 0);

  const handleStartPayment = (tontine: TontineRecord) => {
    setSelectedTontineToPay(tontine);
    setPaymentReceipt(null);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTontineToPay) return;

    setIsProcessingPayment(true);
    setTimeout(() => {
      onPayContribution(selectedTontineToPay.id, selectedTontineToPay.contributionAmount, paymentProvider);
      const receiptRef = `${paymentProvider.slice(0, 2)}-TX-${Math.floor(100000 + Math.random() * 900000)}`;
      setPaymentReceipt({
        tontineName: selectedTontineToPay.name,
        amount: selectedTontineToPay.contributionAmount,
        ref: receiptRef,
        date: new Date().toISOString(),
      });
      setIsProcessingPayment(false);
    }, 900);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = invitationCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    const success = onJoinTontineWithCode(cleanCode);
    if (success) {
      setJoinFeedback({
        success: true,
        message: `Félicitations ! Vous avez rejoint la tontine avec succès.`,
      });
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinFeedback(null);
        setInvitationCodeInput('');
      }, 1500);
    } else {
      setJoinFeedback({
        success: false,
        message: `Code "${cleanCode}" introuvable ou vous êtes déjà inscrit dans ce groupe.`,
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Profile Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
              {member.firstName.charAt(0)}
              {member.lastName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                  {member.firstName} {member.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-stone-950 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Membre Cotisant
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                  {member.countryName} ({member.city})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                <span className="font-mono text-stone-700 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                  {member.phone}
                </span>
                <span>•</span>
                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Paiement favori : {memberDetails?.paymentMethod || 'WAVE'}
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  KYC : {member.status}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Join Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              Rejoindre une Tontine par Code
            </button>
          </div>
        </div>
      </div>

      {/* 4 Member KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contributed */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Total Épargné / Cotisé</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
              {formatXOF(totalPaidAmount)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Sur {myPayments.length} cotisations réglées avec succès
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Régularité :</span>
            <span className="font-semibold text-emerald-700">100% Ponctuel ✓</span>
          </div>
        </div>

        {/* Next Due Payment */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Prochaine Échéance</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
              {formatXOF(nextDueAmount)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {unpaidCurrentTontines.length > 0
                ? `${unpaidCurrentTontines.length} cotisation en attente`
                : 'Toutes vos cotisations sont à jour ✓'}
            </p>
          </div>
          {unpaidCurrentTontines.length > 0 ? (
            <button
              onClick={() => handleStartPayment(unpaidCurrentTontines[0])}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Régler maintenant
            </button>
          ) : (
            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> À jour pour ce mois
            </div>
          )}
        </div>

        {/* Current Turn & Beneficiary Status */}
        <div className="bg-stone-900 text-white p-5 rounded-2xl border border-stone-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-medium">Votre Tour de Réception</span>
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            {beneficiaryTontines.length > 0 ? (
              <div className="mt-2">
                <div className="text-xl font-black text-amber-400">
                  🎉 C'est votre tour !
                </div>
                <p className="text-[11px] text-stone-300 mt-1">
                  Bénéficiaire du Tour dans {beneficiaryTontines[0].name}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <div className="text-xl font-black text-white">
                  En attente de tour
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Vos rangs programmés approchent
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Score Cotisant :</span>
            <span className="font-mono text-emerald-400 font-bold">98 / 100 (Excellent)</span>
          </div>
        </div>

        {/* Tontines Joined */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium">Tontines Rejointes</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
              {myParticipations.length} <span className="text-sm font-normal text-stone-500">groupes</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Gérées par des gestionnaires agréés
            </p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-stone-600" />
            Rejoindre une autre tontine
          </button>
        </div>
      </div>

      {/* MY ACTIVE TONTINES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Mes Tontines Actives ({myParticipations.length})
            </h2>
            <p className="text-xs text-stone-500">
              Cotisez en toute sécurité avec vos portefeuilles Wave, Orange Money ou MTN MoMo.
            </p>
          </div>
        </div>

        {myParticipations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-3">
            <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-sm font-bold text-stone-800">Vous n'avez rejoint aucune tontine pour le moment</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Demandez un code d'invitation à votre gestionnaire de tontine pour intégrer un groupe de cotisants.
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Saisir un code d'invitation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myParticipations.map((tontine) => {
              const myPart = tontine.members.find((m) => m.userId === member.id);
              const isTurnBeneficiary = myPart?.turnNumber === tontine.currentRound;
              const hasPaid = myPart?.hasPaidCurrentRound;
              const grossTurnAmount = tontine.contributionAmount * tontine.members.length;
              const netPayout = grossTurnAmount * (1 - tontine.commissionRate);

              return (
                <div
                  key={tontine.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-stone-900">{tontine.name}</h3>
                        </div>
                        <p className="text-xs text-stone-500 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-stone-400" />
                          Gérée par <strong className="text-stone-700">{tontine.managerName}</strong>
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-mono text-[11px] font-bold text-stone-700">
                        {tontine.code}
                      </span>
                    </div>

                    {/* Beneficiary Banner */}
                    {isTurnBeneficiary && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-500/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <div>C'est votre tour ce mois-ci ! (Tour {tontine.currentRound})</div>
                            <div className="text-[11px] font-normal text-amber-800">
                              Cagnotte nette à percevoir : <strong>{formatXOF(netPayout)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key stats row */}
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl text-xs border border-stone-100">
                      <div>
                        <span className="text-[10px] text-stone-500 block">Cotisation</span>
                        <span className="font-bold text-stone-900 font-mono">
                          {formatXOF(tontine.contributionAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Votre Tour</span>
                        <span className="font-bold text-stone-900 font-mono">
                          Tour #{myPart?.turnNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Avancement</span>
                        <span className="font-bold text-stone-900 font-mono">
                          {tontine.currentRound} / {tontine.totalRounds}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>Progression de la tontine</span>
                        <span className="font-semibold text-stone-800">
                          {Math.round((tontine.currentRound / tontine.totalRounds) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${(tontine.currentRound / tontine.totalRounds) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {hasPaid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Cotisation Tour {tontine.currentRound} payée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold text-xs bg-amber-100 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Cotisation en attente
                        </span>
                      )}
                    </div>

                    {!hasPaid ? (
                      <button
                        onClick={() => handleStartPayment(tontine)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Payer {formatXOF(tontine.contributionAmount)}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartPayment(tontine)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Reçu de paiement
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTRIBUTION HISTORY & RECEIPTS */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Historique des Cotisations Payées & Reçus Dématérialisés
            </h3>
            <p className="text-xs text-stone-500">
              Reçus officiels horodatés certifiant vos versements auprès du gestionnaire.
            </p>
          </div>

          <button
            onClick={() => setShowPrismaQuery(!showPrismaQuery)}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 self-start"
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            {showPrismaQuery ? 'Masquer la requête Prisma' : 'Voir la requête Prisma'}
          </button>
        </div>

        {showPrismaQuery && (
          <div className="p-4 rounded-xl bg-stone-950 text-stone-300 font-mono text-[11px] overflow-x-auto border border-stone-800 space-y-1">
            <p className="text-stone-500">// Requête ORM pour charger les cotisations du membre</p>
            <pre>{`const memberData = await prisma.user.findUnique({
  where: { id: "${member.id}" },
  include: {
    tontineMemberships: {
      include: {
        tontine: {
          include: { manager: true }
        }
      }
    },
    contributions: {
      orderBy: { paidAt: 'desc' }
    }
  }
});`}</pre>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Tontine</th>
                <th className="py-2.5 px-3">Tour</th>
                <th className="py-2.5 px-3">Moyen de Paiement</th>
                <th className="py-2.5 px-3">Référence Transaction</th>
                <th className="py-2.5 px-3 text-right">Montant Réglé</th>
                <th className="py-2.5 px-3 text-center">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {myPayments.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-stone-600">
                    {new Date(p.paidAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-medium text-stone-900">{p.tontineName}</td>
                  <td className="py-2.5 px-3 text-stone-600">Tour #{p.roundNumber}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-500">{p.transactionRef}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    {formatXOF(p.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <button
                      onClick={() => {
                        setPaymentReceipt({
                          tontineName: p.tontineName,
                          amount: p.amount,
                          ref: p.transactionRef,
                          date: p.paidAt,
                        });
                        setSelectedTontineToPay(null);
                      }}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold inline-flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-stone-500" />
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PAYER MA COTISATION (MOBILE MONEY) */}
      {selectedTontineToPay && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Payer ma Cotisation</h3>
                  <p className="text-[11px] text-stone-500">{selectedTontineToPay.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTontineToPay(null);
                  setPaymentReceipt(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {paymentReceipt ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Paiement Confirmé !
                </div>
                <div className="space-y-1.5 font-mono text-[11px] bg-white p-3 rounded-lg border border-emerald-200">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Tontine :</span>
                    <span className="font-bold text-stone-900">{paymentReceipt.tontineName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Montant Cotisé :</span>
                    <span className="font-bold text-emerald-700">{formatXOF(paymentReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Réf Transaction :</span>
                    <span className="text-stone-800 font-bold">{paymentReceipt.ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Date :</span>
                    <span className="text-stone-800">{new Date(paymentReceipt.date).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-600 font-sans">
                  Votre versement a été crédité sur la cagnotte de la tontine et notifié au gestionnaire.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTontineToPay(null);
                    setPaymentReceipt(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPayment} className="space-y-4">
                {/* Amount details */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Montant de la cotisation :</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {formatXOF(selectedTontineToPay.contributionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Tour concerné :</span>
                    <span className="font-semibold text-stone-800">
                      Tour #{selectedTontineToPay.currentRound} sur {selectedTontineToPay.totalRounds}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Commission de gestionnaire incluse :</span>
                    <span className="font-mono text-amber-800 font-semibold">
                      {formatPercent(selectedTontineToPay.commissionRate)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm text-stone-900">
                    <span>Total à débiter :</span>
                    <span className="font-mono text-emerald-700">
                      {formatXOF(selectedTontineToPay.contributionAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Choisir le compte Mobile Money</label>
                  <select
                    value={paymentProvider}
                    onChange={(e) => setPaymentProvider(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                  >
                    <option value="WAVE">Wave Mobile Money ({member.phone})</option>
                    <option value="ORANGE_MONEY">Orange Money ({member.phone})</option>
                    <option value="MTN_MOMO">MTN MoMo ({member.phone})</option>
                    <option value="MOOV_MONEY">MoMo Moov Africa ({member.phone})</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Un push USSD / notification de confirmation sera envoyé instantanément sur votre téléphone ({member.phone}).
                  </span>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTontineToPay(null)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Paiement en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmer le paiement ({formatXOF(selectedTontineToPay.contributionAmount)})
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REÇU SEUL */}
      {paymentReceipt && !selectedTontineToPay && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">Reçu Officiel de Cotisation</h3>
              </div>
              <button
                onClick={() => setPaymentReceipt(null)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Cotisant :</span>
                <span className="font-bold text-stone-900">{member.firstName} {member.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Téléphone :</span>
                <span>{member.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Tontine :</span>
                <span className="font-bold text-stone-800">{paymentReceipt.tontineName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Montant :</span>
                <span className="font-bold text-emerald-700">{formatXOF(paymentReceipt.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Réf Transaction :</span>
                <span className="text-amber-800 font-bold">{paymentReceipt.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Date :</span>
                <span>{new Date(paymentReceipt.date).toLocaleString('fr-FR')}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-sans text-emerald-700 font-semibold">
                <span>Certification BDD :</span>
                <span>Valide & Enregistré ✓</span>
              </div>
            </div>

            <button
              onClick={() => setPaymentReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs"
            >
              Fermer le reçu
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REJOINDRE UNE TONTINE AVEC UN CODE */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Rejoindre une Tontine</h3>
                  <p className="text-[11px] text-stone-500">Code d'invitation fourni par le gestionnaire</p>
                </div>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {joinFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                  joinFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border border-red-200 text-red-900'
                }`}
              >
                {joinFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{joinFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Code d'invitation de la tontine *</label>
                <input
                  type="text"
                  required
                  value={invitationCodeInput}
                  onChange={(e) => setInvitationCodeInput(e.target.value)}
                  placeholder="Ex: TERANGA-2025, ADJAME-VIP, FASO-PROG-01..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <p className="font-semibold text-stone-800">Codes disponibles pour essai direct :</p>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  {['TERANGA-2025', 'ADJAME-VIP', 'FASO-PROG-01', 'COTONOU-FREE-01'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setInvitationCodeInput(c)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-stone-200 text-[10px] text-stone-800"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Rejoindre le groupe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
