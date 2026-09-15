import { TontineRecord, TontineMemberParticipation } from '../types';

export interface TontineScoreDetails {
  score: number;
  tier: 'A' | 'B' | 'C' | 'D';
  tierLabel: string;
  badgeColor: string;
  onTimeRatio: number; // e.g. 0.95 (95%)
  completedCycles: number;
  averageDelayDays: number;
  canPickPriorityTurns: boolean;
  requiresGuarantor: boolean;
  recommendation: string;
}

/**
 * Evaluates a member's Community Credit Score (Tontine Score) based on behavior & history
 */
export function evaluateMemberTontineScore(
  member: TontineMemberParticipation,
  tontine?: TontineRecord
): TontineScoreDetails {
  const baseScore = member.tontineScore ?? (
    member.turnNumber <= 2 ? 92 : member.hasPaidCurrentRound ? 88 : 74
  );

  // Determine tier
  let tier: 'A' | 'B' | 'C' | 'D' = 'B';
  let tierLabel = 'Fiable (Palier B)';
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let canPickPriorityTurns = false;
  let requiresGuarantor = false;
  let recommendation = 'Membre régulier apte aux cycles standards.';

  if (baseScore >= 85) {
    tier = 'A';
    tierLabel = 'Cotisant Étoile (Palier A)';
    badgeColor = 'bg-emerald-500/15 text-emerald-700 border-emerald-400/40';
    canPickPriorityTurns = true;
    requiresGuarantor = false;
    recommendation = 'Historique exemplaire. Autorisé aux Tours 1 & 2 sans garant.';
  } else if (baseScore >= 70) {
    tier = 'B';
    tierLabel = 'Fiable (Palier B)';
    badgeColor = 'bg-teal-500/15 text-teal-800 border-teal-400/40';
    canPickPriorityTurns = true;
    requiresGuarantor = member.turnNumber <= 2;
    recommendation = 'Bon payeur. Garant recommandé pour les tours d’ouverture.';
  } else if (baseScore >= 50) {
    tier = 'C';
    tierLabel = 'Vigilance (Palier C)';
    badgeColor = 'bg-amber-500/15 text-amber-800 border-amber-400/40';
    canPickPriorityTurns = false;
    requiresGuarantor = true;
    recommendation = 'Quelques retards observés. Caution séquestrée et garant obligatoires.';
  } else {
    tier = 'D';
    tierLabel = 'Risque Élevé (Palier D)';
    badgeColor = 'bg-rose-500/15 text-rose-800 border-rose-400/40';
    canPickPriorityTurns = false;
    requiresGuarantor = true;
    recommendation = 'Incident de paiement antérieur. Exclu des premiers tours (Tours 1 à 3).';
  }

  // Adjust for active delays
  const daysLate = member.daysLate || 0;
  const onTimeRatio = Math.max(0.4, 1 - (daysLate * 0.08));

  return {
    score: baseScore,
    tier,
    tierLabel,
    badgeColor,
    onTimeRatio,
    completedCycles: member.turnNumber > 3 ? 3 : 1,
    averageDelayDays: daysLate,
    canPickPriorityTurns,
    requiresGuarantor,
    recommendation,
  };
}

/**
 * Calculate late penalty based on configured rate and days late
 */
export function computeLatePenalty(
  daysLate: number,
  penaltyPerDay: number = 1000,
  gracePeriodDays: number = 1
): { chargeableDays: number; penaltyAmount: number } {
  if (daysLate <= gracePeriodDays) {
    return { chargeableDays: 0, penaltyAmount: 0 };
  }
  const chargeableDays = daysLate - gracePeriodDays;
  return {
    chargeableDays,
    penaltyAmount: chargeableDays * penaltyPerDay,
  };
}

/**
 * Validate whether a member is qualified for a priority round (Round 1 or Round 2)
 */
export function checkPriorityTurnEligibility(
  member: TontineMemberParticipation,
  targetTurn: number,
  tontine: TontineRecord
): {
  eligible: boolean;
  reason?: string;
  requiresGuarantorAction?: boolean;
} {
  const isPriorityTurn = targetTurn <= 2;
  if (!isPriorityTurn) {
    return { eligible: true };
  }

  const scoreDetails = evaluateMemberTontineScore(member, tontine);

  // If score is Tier A and caution escrowed, allowed directly
  if (scoreDetails.tier === 'A' && (!tontine.escrowCautionEnabled || member.cautionStatus === 'ESCROWED')) {
    return { eligible: true };
  }

  // Otherwise, requires a verified guarantor
  if (member.guarantorStatus === 'VERIFIED') {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Les Tours 1 & 2 sont prioritaires : ils exigent un Tontine Score Palier A ou un Garant Co-cautionneur vérifié. (Statut actuel : ${member.guarantorStatus || 'Aucun garant'}).`,
    requiresGuarantorAction: true,
  };
}
