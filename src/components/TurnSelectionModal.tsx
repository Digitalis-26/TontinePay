import { useState } from 'react';
import { TontineRecord } from '../types';
import { formatPercent, formatXOF } from '../data/plans';
import {
  Calendar,
  Gift,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck,
  Coins,
} from 'lucide-react';

interface TurnSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tontine: TontineRecord;
  currentUserId: string;
  onConfirmTurn: (tontineId: string, newTurnNumber: number) => void;
}

export function TurnSelectionModal({
  isOpen,
  onClose,
  tontine,
  currentUserId,
  onConfirmTurn,
}: TurnSelectionModalProps) {
  if (!isOpen) return null;

  const currentMember = tontine.members.find((m) => m.userId === currentUserId);
  const currentTurn = currentMember?.turnNumber;

  const [selectedTurn, setSelectedTurn] = useState<number>(currentTurn || 1);

  const totalMembers = tontine.members.length;
  const grossTurnAmount = tontine.contributionAmount * totalMembers;
  const commission = Math.round(grossTurnAmount * tontine.commissionRate);
  const netPayout = grossTurnAmount - commission;

  // Build the list of all turns from 1 to tontine.totalRounds
  const roundsList = Array.from({ length: tontine.totalRounds }, (_, i) => {
    const roundNumber = i + 1;
    const occupyingMember = tontine.members.find((m) => m.turnNumber === roundNumber);
    const isPast = roundNumber < tontine.currentRound;
    const isCurrentRound = roundNumber === tontine.currentRound;
    const isMine = occupyingMember?.userId === currentUserId;
    const isFree = !occupyingMember;
    const isAvailableToPick = isFree || isMine;

    return {
      roundNumber,
      occupyingMember,
      isPast,
      isCurrentRound,
      isMine,
      isFree,
      isAvailableToPick,
    };
  });

  const handleConfirm = () => {
    if (selectedTurn && selectedTurn !== currentTurn) {
      onConfirmTurn(tontine.id, selectedTurn);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Choisir mon tour de cagnotte
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {tontine.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {tontine.name} • {tontine.totalRounds} tours au total
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-lg leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Payout Summary Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-slate-50 border border-emerald-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Cagnotte nette perçue</span>
            <span className="text-xl font-black text-emerald-800 font-mono">
              {formatXOF(netPayout)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Cotisation par tour</span>
            <span className="text-sm font-bold text-slate-800 font-mono">
              {formatXOF(tontine.contributionAmount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Votre tour actuel</span>
            <span className="text-sm font-black text-slate-900 font-mono flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              Tour #{currentTurn || 'Non attribué'}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900">Fonctionnement du tour de cagnotte :</strong>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Le numéro de tour correspond au moment où vous recevrez l'intégralité de la cagnotte des cotisations. Les tours libres (en vert) sont immédiatement sélectionnables.
            </p>
          </div>
        </div>

        {/* Grid of Tours */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Sélectionnez votre tour ({roundsList.filter((r) => r.isFree).length} tour(s) libre(s))
            </span>
            <span className="text-[11px]">Tour en cours du groupe : <strong>Tour #{tontine.currentRound}</strong></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
            {roundsList.map((round) => {
              const isSelected = selectedTurn === round.roundNumber;
              const isMine = round.isMine;
              const isPast = round.isPast;
              const isOccupied = !round.isFree && !isMine;

              let cardBg = 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30';
              if (isSelected) {
                cardBg = 'bg-emerald-500/10 border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs';
              } else if (isPast) {
                cardBg = 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed';
              } else if (isOccupied) {
                cardBg = 'bg-slate-50 border-slate-200/80 text-slate-400 cursor-not-allowed';
              }

              return (
                <button
                  key={round.roundNumber}
                  type="button"
                  disabled={isPast || isOccupied}
                  onClick={() => setSelectedTurn(round.roundNumber)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[96px] relative ${cardBg}`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-black text-sm text-slate-900">
                      Tour #{round.roundNumber}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {isOccupied && !isPast && (
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </div>

                  {/* Middle: Payout or Round tag */}
                  <div className="mt-1">
                    {round.isCurrentRound && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 block w-fit">
                        En cours
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-600 block mt-0.5">
                      {formatXOF(netPayout)}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] truncate">
                    {isMine ? (
                      <span className="text-emerald-700 font-bold">✓ Votre tour</span>
                    ) : isPast ? (
                      <span className="text-slate-400">Déjà clôturé</span>
                    ) : isOccupied ? (
                      <span className="text-slate-500 truncate block" title={round.occupyingMember?.name}>
                        {round.occupyingMember?.name.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Disponible</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Strategy recommendation guide */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Guide de choix du tour :</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            • <strong>Premiers tours</strong> : Parfait si vous avez besoin d'un financement d'urgence ou d'achats de stock.<br />
            • <strong>Derniers tours</strong> : Idéal pour constituer une solide épargne de sécurité et capitaliser sans tentation de dépense.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            disabled={!selectedTurn || selectedTurn === currentTurn}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
              selectedTurn && selectedTurn !== currentTurn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <span>Confirmer mon Tour #{selectedTurn}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
