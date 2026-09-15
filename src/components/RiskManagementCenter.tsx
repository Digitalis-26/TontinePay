import React, { useState } from 'react';
import {
  TontineRecord,
  TontineMemberParticipation,
  RegisteredUser,
} from '../types';
import { formatXOF } from '../data/plans';
import {
  evaluateMemberTontineScore,
  computeLatePenalty,
} from '../utils/riskManagement';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  UserX,
  Coins,
  Scale,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Send,
  HelpCircle,
  TrendingDown,
  Info,
  BadgeCheck,
  FileCheck,
} from 'lucide-react';

interface RiskManagementCenterProps {
  tontines: TontineRecord[];
  connectedUser: RegisteredUser | null;
  onUpdateTontineRiskConfig?: (
    tontineId: string,
    updates: Partial<TontineRecord>
  ) => void;
  onUpdateMemberRiskData?: (
    tontineId: string,
    memberId: string,
    updates: Partial<TontineMemberParticipation>
  ) => void;
  onShowToast?: (message: string) => void;
  onNavigateToWhatsApp?: () => void;
}

export function RiskManagementCenter({
  tontines,
  connectedUser,
  onUpdateTontineRiskConfig,
  onUpdateMemberRiskData,
  onShowToast,
  onNavigateToWhatsApp,
}: RiskManagementCenterProps) {
  const [selectedTontineId, setSelectedTontineId] = useState<string>(
    tontines[0]?.id || ''
  );
  const [activeSubTab, setActiveSubTab] = useState<
    'escrow' | 'guarantors' | 'penalties' | 'scores'
  >('escrow');

  // Selected tontine
  const currentTontine =
    tontines.find((t) => t.id === selectedTontineId) || tontines[0];

  // Modal states for assigning a guarantor
  const [assigningGuarantorMember, setAssigningGuarantorMember] =
    useState<TontineMemberParticipation | null>(null);
  const [guarantorNameInput, setGuarantorNameInput] = useState('');
  const [guarantorPhoneInput, setGuarantorPhoneInput] = useState('');
  const [guarantorRelationInput, setGuarantorRelationInput] = useState(
    'Membre de la famille / Conjoint(e)'
  );

  // Settings modification
  const [editingConfig, setEditingConfig] = useState(false);
  const [tempPenaltyPerDay, setTempPenaltyPerDay] = useState<number>(
    currentTontine?.penaltyPerDay || 1000
  );
  const [tempPenaltyDest, setTempPenaltyDest] = useState<'CAGNOTTE' | 'MANAGER'>(
    currentTontine?.penaltyDestination || 'CAGNOTTE'
  );
  const [tempGraceDays, setTempGraceDays] = useState<number>(
    currentTontine?.gracePeriodDays ?? 1
  );
  const [tempEscrowEnabled, setTempEscrowEnabled] = useState<boolean>(
    currentTontine?.escrowCautionEnabled ?? true
  );

  if (!currentTontine) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-stone-200">
        <p className="text-stone-500">Aucune tontine active trouvée.</p>
      </div>
    );
  }

  const members = currentTontine.members;
  const escrowCautionAmount =
    currentTontine.cautionPerMember || currentTontine.contributionAmount;
  const totalEscrowPotential = members.length * escrowCautionAmount;
  const totalEscrowLocked = members
    .filter((m) => (m.cautionStatus ?? 'ESCROWED') === 'ESCROWED')
    .reduce((acc, m) => acc + (m.cautionAmount || escrowCautionAmount), 0);

  // Members at risk in Tour 1 and 2
  const priorityMembers = members.filter((m) => m.turnNumber <= 2);
  const priorityAtRisk = priorityMembers.filter(
    (m) =>
      m.guarantorStatus !== 'VERIFIED' &&
      evaluateMemberTontineScore(m, currentTontine).tier !== 'A'
  );

  // Members with late days
  const lateMembers = members.filter((m) => !m.hasPaidCurrentRound);

  const handleSaveRiskConfig = () => {
    if (onUpdateTontineRiskConfig) {
      onUpdateTontineRiskConfig(currentTontine.id, {
        penaltyPerDay: tempPenaltyPerDay,
        penaltyDestination: tempPenaltyDest,
        gracePeriodDays: tempGraceDays,
        escrowCautionEnabled: tempEscrowEnabled,
      });
    }
    setEditingConfig(false);
    onShowToast?.(
      'Paramètres anti-défaut & pénalités mis à jour avec succès !'
    );
  };

  const handleToggleEscrowStatus = (member: TontineMemberParticipation) => {
    const currentStatus = member.cautionStatus ?? 'ESCROWED';
    let nextStatus: 'ESCROWED' | 'RELEASED' | 'FORFEITED' = 'ESCROWED';

    if (currentStatus === 'ESCROWED') {
      nextStatus = 'RELEASED';
    } else if (currentStatus === 'RELEASED') {
      nextStatus = 'FORFEITED';
    } else {
      nextStatus = 'ESCROWED';
    }

    if (onUpdateMemberRiskData) {
      onUpdateMemberRiskData(currentTontine.id, member.id, {
        cautionStatus: nextStatus,
        cautionAmount:
          nextStatus === 'ESCROWED'
            ? escrowCautionAmount
            : nextStatus === 'RELEASED'
            ? 0
            : 0,
      });
    }

    onShowToast?.(
      `Statut caution de ${member.name} mis à jour : ${
        nextStatus === 'RELEASED'
          ? 'Restituée au membre'
          : nextStatus === 'FORFEITED'
          ? 'Saisie conservatoire (couvre impayé)'
          : 'Bloquée sous séquestre'
      }`
    );
  };

  const handleSaveGuarantor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningGuarantorMember) return;

    if (!guarantorNameInput.trim() || !guarantorPhoneInput.trim()) {
      alert('Veuillez renseigner le nom et le numéro de téléphone du garant.');
      return;
    }

    if (onUpdateMemberRiskData) {
      onUpdateMemberRiskData(currentTontine.id, assigningGuarantorMember.id, {
        guarantorName: guarantorNameInput.trim(),
        guarantorPhone: guarantorPhoneInput.trim(),
        guarantorRelation: guarantorRelationInput,
        guarantorStatus: 'VERIFIED',
      });
    }

    onShowToast?.(
      `Garant solidaire validé pour ${assigningGuarantorMember.name} (${guarantorNameInput}) !`
    );
    setAssigningGuarantorMember(null);
    setGuarantorNameInput('');
    setGuarantorPhoneInput('');
  };

  const handleWaivePenalty = (member: TontineMemberParticipation) => {
    if (onUpdateMemberRiskData) {
      onUpdateMemberRiskData(currentTontine.id, member.id, {
        penaltiesAmount: 0,
        daysLate: 0,
      });
    }
    onShowToast?.(
      `Pénalité de retard exceptionnellement remise pour ${member.name}.`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-stone-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Bouclier Anti-Défaut & Gestion du Risque</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sécurisation des Cagnottes & Prévention des Impayés
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Le risque critique des tontines rotatives : un membre perçoit la
              cagnotte aux Tours 1 ou 2 puis disparaît. Ce centre d'opérations
              déploie 4 garde-fous stricts : <strong>Caution sous séquestre</strong>,{' '}
              <strong>Garants solidaires obligatoires</strong>,{' '}
              <strong>Pénalités journalières automatiques</strong> et{' '}
              <strong>Tontine Score de solvabilité</strong>.
            </p>
          </div>

          {/* Tontine Selector */}
          <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-3 min-w-[240px]">
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">
              Cercle sous surveillance :
            </label>
            <select
              value={selectedTontineId}
              onChange={(e) => setSelectedTontineId(e.target.value)}
              className="w-full bg-stone-900 text-amber-400 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 border border-stone-700 focus:outline-hidden focus:border-amber-400 cursor-pointer"
            >
              {tontines.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({formatXOF(t.contributionAmount)})
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
              <span>Tour en cours : {currentTontine.currentRound}/{currentTontine.totalRounds}</span>
              <span className="text-emerald-400 font-semibold">Protégé</span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Stat Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-800 text-left">
          <div className="bg-stone-800/50 rounded-2xl p-3.5 border border-stone-700/50">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <Lock className="w-4 h-4" />
              <span>Séquestre Cautions</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatXOF(totalEscrowLocked)}
            </div>
            <div className="text-[11px] text-stone-400">
              Sur {formatXOF(totalEscrowPotential)} attendus (1 tour/membre)
            </div>
          </div>

          <div className="bg-stone-800/50 rounded-2xl p-3.5 border border-stone-700/50">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Garants Tours 1 & 2</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {priorityMembers.filter((m) => m.guarantorStatus === 'VERIFIED').length} / {priorityMembers.length}
            </div>
            <div className="text-[11px] text-stone-400">
              {priorityAtRisk.length === 0 ? (
                <span className="text-emerald-400 font-medium">100% Co-cautionnés ✅</span>
              ) : (
                <span className="text-rose-400 font-medium">{priorityAtRisk.length} à régulariser !</span>
              )}
            </div>
          </div>

          <div className="bg-stone-800/50 rounded-2xl p-3.5 border border-stone-700/50">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>Pénalités Retard</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatXOF(currentTontine.penaltyPerDay || 1000)} / jour
            </div>
            <div className="text-[11px] text-stone-400">
              Destination :{' '}
              <span className="text-stone-200 font-bold">
                {currentTontine.penaltyDestination === 'CAGNOTTE'
                  ? 'Cagnotte commune'
                  : 'Gestionnaire'}
              </span>
            </div>
          </div>

          <div className="bg-stone-800/50 rounded-2xl p-3.5 border border-stone-700/50">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <BadgeCheck className="w-4 h-4" />
              <span>Indice Solvabilité</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              88.4 / 100
            </div>
            <div className="text-[11px] text-stone-400">
              Moyenne communauté (Palier A/B)
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('escrow')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'escrow'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>1. Compte Séquestre & Cautions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guarantors')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'guarantors'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Garants Tours Prioritaires</span>
            {priorityAtRisk.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {priorityAtRisk.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('penalties')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'penalties'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>3. Pénalités de Retard Journalières</span>
            {lateMembers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] flex items-center justify-center font-bold">
                {lateMembers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('scores')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'scores'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BadgeCheck className="w-4 h-4" />
            <span>4. Tontine Score & Solvabilité</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setEditingConfig(!editingConfig)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-stone-500" />
          <span>{editingConfig ? 'Fermer réglages' : 'Configurer barèmes'}</span>
        </button>
      </div>

      {/* Configuration Drawer if Open */}
      {editingConfig && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Paramètres Anti-Défaut pour « {currentTontine.name} »</span>
            </h3>
            <span className="text-xs text-amber-700">Modifiable par le gestionnaire</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-amber-200">
              <label className="block font-bold text-stone-800 mb-1">
                Caution Séquestre (Collatéral)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="toggle-escrow"
                  checked={tempEscrowEnabled}
                  onChange={(e) => setTempEscrowEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
                <label htmlFor="toggle-escrow" className="text-stone-700 text-xs">
                  Exiger 1 tour d'avance ({formatXOF(currentTontine.contributionAmount)})
                </label>
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Les fonds sont bloqués sur un coffre séquestre et libérés au Tour {currentTontine.totalRounds}.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200">
              <label className="block font-bold text-stone-800 mb-1">
                Pénalité Journalière de Retard
              </label>
              <select
                value={tempPenaltyPerDay}
                onChange={(e) => setTempPenaltyPerDay(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold bg-stone-50"
              >
                <option value={500}>500 FCFA / jour ouvré</option>
                <option value={1000}>1 000 FCFA / jour ouvré (Standard)</option>
                <option value={2000}>2 000 FCFA / jour ouvré (Dissuasif)</option>
              </select>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-stone-500">Délai de grâce :</span>
                <select
                  value={tempGraceDays}
                  onChange={(e) => setTempGraceDays(Number(e.target.value))}
                  className="border border-stone-200 rounded px-1.5 py-0.5 text-xs font-semibold"
                >
                  <option value={0}>0 jour (Immédiat)</option>
                  <option value={1}>1 jour (24h de tolérance)</option>
                  <option value={2}>2 jours (48h)</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200">
              <label className="block font-bold text-stone-800 mb-1">
                Destination des pénalités
              </label>
              <div className="space-y-1.5 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dest"
                    checked={tempPenaltyDest === 'CAGNOTTE'}
                    onChange={() => setTempPenaltyDest('CAGNOTTE')}
                    className="text-amber-500"
                  />
                  <span className="text-stone-700">Reversée à la cagnotte (Solidarité)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dest"
                    checked={tempPenaltyDest === 'MANAGER'}
                    onChange={() => setTempPenaltyDest('MANAGER')}
                    className="text-amber-500"
                  />
                  <span className="text-stone-700">Au gestionnaire (Frais de relance)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingConfig(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveRiskConfig}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-xs"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Compte Séquestre & Cautions Bloquées */}
      {activeSubTab === 'escrow' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-stone-900">
                    Coffre Séquestre des Cautions (Escrow Vault)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
                  Chaque membre verse 1 tour d'avance ({formatXOF(escrowCautionAmount)})
                  conservé sur un compte de cantonnement bloqué. Cette somme est restituée
                  au terme du cycle complet ou utilisée en dernier recours pour combler un impayé.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-right">
                <div className="text-[11px] uppercase font-bold text-amber-800">
                  Total Sous Séquestre Garanti
                </div>
                <div className="text-2xl font-black text-amber-900">
                  {formatXOF(totalEscrowLocked)}
                </div>
                <div className="text-[11px] text-amber-700">
                  {members.filter((m) => (m.cautionStatus ?? 'ESCROWED') === 'ESCROWED').length} / {members.length} membres sécurisés
                </div>
              </div>
            </div>

            {/* Escrow Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px] bg-stone-50">
                    <th className="py-3 px-4 rounded-l-xl">Membre</th>
                    <th className="py-3 px-3">Tour</th>
                    <th className="py-3 px-3">Montant Caution</th>
                    <th className="py-3 px-3">Statut Séquestre</th>
                    <th className="py-3 px-3">Condition Déblocage</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action Gestionnaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map((member) => {
                    const status = member.cautionStatus ?? 'ESCROWED';
                    const amount = member.cautionAmount ?? escrowCautionAmount;
                    const isRound1or2 = member.turnNumber <= 2;

                    return (
                      <tr key={member.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div>{member.name}</div>
                            <div className="text-[11px] text-stone-400 font-normal">{member.phone}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            isRound1or2 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            Tour {member.turnNumber} {isRound1or2 && '⭐'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-stone-900">
                          {status === 'FORFEITED' ? (
                            <span className="line-through text-rose-500">{formatXOF(escrowCautionAmount)}</span>
                          ) : (
                            formatXOF(amount)
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {status === 'ESCROWED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              Séquestrée (Sécurisé)
                            </span>
                          )}
                          {status === 'RELEASED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Unlock className="w-3 h-3 text-blue-600" />
                              Restituée en fin de cycle
                            </span>
                          )}
                          {status === 'FORFEITED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Saisie pour couvrir impayé
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-500 text-[11px]">
                          {status === 'ESCROWED' ? (
                            <span>Cycle final (Tour {currentTontine.totalRounds}) sans impayé</span>
                          ) : status === 'RELEASED' ? (
                            <span className="text-blue-600 font-medium">Restitution effectuée</span>
                          ) : (
                            <span className="text-rose-600 font-medium">Affectée au solde du cercle</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleEscrowStatus(member)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                            title="Modifier l'état de la caution"
                          >
                            {status === 'ESCROWED'
                              ? 'Restituer'
                              : status === 'RELEASED'
                              ? 'Saisir (Impayé)'
                              : 'Ré-engager'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Informational Callout */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex items-start gap-3 text-xs text-stone-600">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-stone-900">
                  Principe de protection des cagnottes de premier tour :
                </div>
                <div>
                  En conservant 1 tour d'avance sous séquestre, si le bénéficiaire du Tour 1
                  décide de ne plus honorer ses cotisations futures, sa caution couvre
                  immédiatement la première défaillance tandis que son garant légal est
                  assigné pour solder le cycle.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Garants / Parrains pour Tours Prioritaires */}
      {activeSubTab === 'guarantors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-stone-900">
                    Système de Garants & Parrains (Tours 1 & 2 Prioritaires)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
                  Tout membre souhaitant encaisser la cagnotte dès les premiers tours doit
                  obligatoirement être co-cautionné solidairement par un autre membre du cercle
                  ou une caution morale externe vérifiée.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-right">
                <div className="text-[11px] uppercase font-bold text-indigo-800">
                  Couverture Tours 1 & 2
                </div>
                <div className="text-2xl font-black text-indigo-900">
                  {priorityMembers.filter((m) => m.guarantorStatus === 'VERIFIED').length} / {priorityMembers.length}
                </div>
                <div className="text-[11px] text-indigo-700">
                  Co-cautionnements vérifiés
                </div>
              </div>
            </div>

            {/* List of Priority Round Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorityMembers.map((member) => {
                const scoreDetails = evaluateMemberTontineScore(member, currentTontine);
                const hasGuarantor = member.guarantorStatus === 'VERIFIED';

                return (
                  <div
                    key={member.id}
                    className={`rounded-2xl border p-5 space-y-4 ${
                      hasGuarantor
                        ? 'bg-white border-stone-200 shadow-xs'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-stone-950">
                            Tour {member.turnNumber} (Prioritaire)
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${scoreDetails.badgeColor}`}
                          >
                            Score {scoreDetails.score}/100
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-stone-900 pt-1">
                          {member.name}
                        </h4>
                        <p className="text-xs text-stone-500">{member.phone}</p>
                      </div>

                      <div>
                        {hasGuarantor ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Co-cautionné
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Garant Requis
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Guarantor Details Box */}
                    <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2 text-xs">
                      {hasGuarantor ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Garant désigné :</span>
                            <span className="font-bold text-stone-900">{member.guarantorName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Téléphone :</span>
                            <span className="font-mono text-stone-700">{member.guarantorPhone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Lien / Rôle :</span>
                            <span className="text-stone-700">{member.guarantorRelation || 'Co-caution solidaire'}</span>
                          </div>
                          <div className="pt-2 border-t border-stone-200 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Acte d'engagement solidaire validé électroniquement</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-rose-700 text-xs leading-relaxed">
                            ⚠️ Ce membre a réservé le Tour {member.turnNumber}. Sans garant co-cautionneur vérifié,
                            la cagnotte ne pourra pas lui être décaissée.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningGuarantorMember(member);
                              setGuarantorNameInput(member.guarantorName || '');
                              setGuarantorPhoneInput(member.guarantorPhone || '');
                            }}
                            className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Ajouter / Valider un Garant</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {hasGuarantor && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningGuarantorMember(member);
                            setGuarantorNameInput(member.guarantorName || '');
                            setGuarantorPhoneInput(member.guarantorPhone || '');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                        >
                          Modifier le garant
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Other turns info */}
            <div className="border-t border-stone-200 pt-5">
              <h3 className="text-sm font-bold text-stone-900 mb-2">
                Autres Tours (Tours 3 à {currentTontine.totalRounds})
              </h3>
              <p className="text-xs text-stone-500">
                Pour les tours 3 et au-delà, le risque de défaut est modéré car le membre a
                déjà cotisé plusieurs tours avant de percevoir la cagnotte. La caution séquestre
                standard de 1 tour suffit comme garantie de continuité.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Pénalités de Retard Journalières */}
      {activeSubTab === 'penalties' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-rose-500" />
                  <h2 className="text-lg font-bold text-stone-900">
                    Pénalités de Retard Paramétrables & Majoration Automatique
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
                  Barème dissuasif de <strong>{formatXOF(currentTontine.penaltyPerDay || 1000)} / jour</strong>{' '}
                  au-delà du délai de grâce ({currentTontine.gracePeriodDays ?? 1} jour).
                  Les pénalités sont reversées à :{' '}
                  <span className="font-bold text-stone-800">
                    {currentTontine.penaltyDestination === 'CAGNOTTE'
                      ? 'la Cagnotte commune (dédommagement des membres)'
                      : 'au Gestionnaire (frais de recouvrement)'}
                  </span>.
                </p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-right">
                <div className="text-[11px] uppercase font-bold text-rose-800">
                  Cotisations en Souffrance
                </div>
                <div className="text-2xl font-black text-rose-900">
                  {lateMembers.length}
                </div>
                <div className="text-[11px] text-rose-700">
                  Membres en retard sur le Tour {currentTontine.currentRound}
                </div>
              </div>
            </div>

            {/* Late Members Register */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Suivi des impayés & calcul des majorations
              </h3>

              {lateMembers.length === 0 ? (
                <div className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <div className="font-bold text-emerald-950 text-sm">
                    Aucun impayé en cours !
                  </div>
                  <div className="text-xs text-emerald-700">
                    Tous les membres de ce cercle sont à jour de leur cotisation pour le Tour {currentTontine.currentRound}.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                  {lateMembers.map((member) => {
                    const daysLate = member.daysLate || 2;
                    const { chargeableDays, penaltyAmount } = computeLatePenalty(
                      daysLate,
                      currentTontine.penaltyPerDay || 1000,
                      currentTontine.gracePeriodDays ?? 1
                    );
                    const totalDue = currentTontine.contributionAmount + penaltyAmount;

                    return (
                      <div
                        key={member.id}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-stone-50/80 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">
                              {member.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              {daysLate} jours de retard
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 font-mono">
                            {member.phone} • Tour d'encaissement : {member.turnNumber}
                          </p>
                          <div className="text-xs text-stone-600 pt-1 flex items-center gap-3">
                            <span>Cotisation de base : <strong>{formatXOF(currentTontine.contributionAmount)}</strong></span>
                            <span>+ Pénalité ({chargeableDays}j facturés) : <strong className="text-rose-600">{formatXOF(penaltyAmount)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-stone-400">Total à percevoir</div>
                            <div className="text-lg font-black text-stone-900">
                              {formatXOF(totalDue)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `Bonjour ${member.name}, rappel amical TONTINE : votre cotisation pour le Tour ${currentTontine.currentRound} accuse un retard de ${daysLate} jours. Montant dû : ${formatXOF(currentTontine.contributionAmount)} + ${formatXOF(penaltyAmount)} de pénalités (${formatXOF(currentTontine.penaltyPerDay || 1000)}/j). Merci de régulariser par Wave ou Orange Money : https://tontine.monsite.africa/pay/${currentTontine.code}`;
                                window.open(`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                              title="Envoyer relance WhatsApp avec pénalités calculées"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Relancer WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleWaivePenalty(member)}
                              className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
                              title="Remise gracieuse de la pénalité"
                            >
                              Exonérer
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Score de Crédit Communautaire (Tontine Score) */}
      {activeSubTab === 'scores' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-stone-900">
                    Score de Crédit Communautaire (Tontine Score)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
                  Algorithme de réputation basé sur la régularité des cotisations, les délais
                  de paiement et les cycles complétés avec succès. Permet aux gestionnaires de
                  filtrer les mauvais payeurs et d'accorder les tours prioritaires en toute confiance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-700">
                  Moyenne Cercle : <strong>88 / 100</strong>
                </span>
              </div>
            </div>

            {/* Score Tier Legend */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-emerald-900">🌟 Palier A (85-100)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">Étoile</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Ponctualité irréprochable. Éligible d'office aux Tours 1 & 2 sans garant.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-teal-900">🛡️ Palier B (70-84)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">Fiable</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  Bon payeur habituel. Accès libre à tous les tours (garant recommandé au Tour 1).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-amber-900">⚠️ Palier C (50-69)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">Vigilance</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Retards occasionnels. Caution sous séquestre stricte et garant obligatoires.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-rose-900">🚨 Palier D (&lt;50)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">Risqué</span>
                </div>
                <p className="text-[11px] text-rose-800">
                  Historique de défaut. Tours 1 à 3 formellement interdits pour protéger le cercle.
                </p>
              </div>
            </div>

            {/* Member Ratings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px] bg-stone-50">
                    <th className="py-3 px-4 rounded-l-xl">Membre & Téléphone</th>
                    <th className="py-3 px-3">Tour Choisie</th>
                    <th className="py-3 px-3">Tontine Score</th>
                    <th className="py-3 px-3">Fiabilité & Ponctualité</th>
                    <th className="py-3 px-3">Autorisation Tours 1 & 2</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Diagnostic Risque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map((member) => {
                    const evalScore = evaluateMemberTontineScore(member, currentTontine);

                    return (
                      <tr key={member.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{member.name}</div>
                          <div className="text-[11px] text-stone-400">{member.phone}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          Tour {member.turnNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-stone-900">
                              {evalScore.score}
                            </span>
                            <span className="text-[11px] text-stone-400">/ 100</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${evalScore.badgeColor}`}
                            >
                              Palier {evalScore.tier}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="w-28 bg-stone-200 rounded-full h-1.5 overflow-hidden mb-1">
                            <div
                              className={`h-full ${
                                evalScore.score >= 85
                                  ? 'bg-emerald-500'
                                  : evalScore.score >= 70
                                  ? 'bg-teal-500'
                                  : evalScore.score >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${evalScore.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-stone-500">
                            {Math.round(evalScore.onTimeRatio * 100)}% paiements à l'heure
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {evalScore.canPickPriorityTurns ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Éligible Direct
                            </span>
                          ) : member.guarantorStatus === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                              Autorisé (Garant Valide)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              Verrouillé (Garant Exigé)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-stone-600 text-[11px]">
                          {evalScore.recommendation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Assign or Verify Guarantor */}
      {assigningGuarantorMember && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-stone-200 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-bold text-base text-stone-900">
                  Désigner un Garant Co-cautionneur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningGuarantorMember(null)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              Engagement solidaire pour <strong>{assigningGuarantorMember.name}</strong>{' '}
              (Tour {assigningGuarantorMember.turnNumber} - {formatXOF(currentTontine.contributionAmount)}).
              En cas de défaillance, le garant s'engage à régulariser sous 48h.
            </div>

            <form onSubmit={handleSaveGuarantor} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nom & Prénom du Garant
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Moussa Fall"
                  value={guarantorNameInput}
                  onChange={(e) => setGuarantorNameInput(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Numéro WhatsApp du Garant (avec indicatif)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: +221 77 123 45 67"
                  value={guarantorPhoneInput}
                  onChange={(e) => setGuarantorPhoneInput(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Lien de parenté / Relation
                </label>
                <select
                  value={guarantorRelationInput}
                  onChange={(e) => setGuarantorRelationInput(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs bg-stone-50 font-semibold"
                >
                  <option value="Membre de la famille / Conjoint(e)">Membre de la famille / Conjoint(e)</option>
                  <option value="Autre membre du même cercle tontine">Autre membre du même cercle tontine (Caution croisée)</option>
                  <option value="Employeur / Collègue certifié">Employeur / Collègue certifié</option>
                  <option value="Caution morale / Notabilité de quartier">Caution morale / Notabilité de quartier</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningGuarantorMember(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  Valider & Co-cautionner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
