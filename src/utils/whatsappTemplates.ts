import { TontineRecord, TontineMemberParticipation, WhatsAppNotificationTemplate } from '../types';
import { formatXOF, formatPercent } from '../data/plans';

/**
 * Standard WhatsApp Cloud API Templates approved for FinTech & rotational savings in WAEMU / Africa
 */
export const WHATSAPP_OFFICIAL_TEMPLATES: WhatsAppNotificationTemplate[] = [
  {
    id: 'tmpl_01',
    code: 'DUE_DATE_REMINDER_48H',
    name: "Rappel d'Échéance (J-2)",
    category: 'UTILITY',
    description: 'Envoyé automatiquement 48h avant la date limite de cotisation du tour.',
    sampleBody:
      'Bonjour {{1}} 👋, Rappel pour la {{2}} : le Tour #{{3}} arrive à échéance le {{4}}.\n\nMontant : *{{5}}*.\n👉 Réglez en 1 clic via Wave ou Orange Money : {{6}}\n\nMerci de votre ponctualité !',
  },
  {
    id: 'tmpl_02',
    code: 'PAYMENT_RECEIPT',
    name: 'Reçu de Paiement & Quittance',
    category: 'UTILITY',
    description: 'Envoyé instantanément au membre dès validation de son versement.',
    sampleBody:
      '✅ *Quittance de Cotisation Tontine*\n\nBonjour {{1}}, votre versement de *{{2}}* pour le Tour #{{3}} de la "{{4}}" a bien été reçu et sécurisé.\n\nRéf Transaction : `{{5}}`\nMode : {{6}}\nDate : {{7}}\n\nVotre statut est désormais à jour pour ce cycle.',
  },
  {
    id: 'tmpl_03',
    code: 'BENEFICIARY_POT_ALERT',
    name: 'Attribution de la Cagnotte au Bénéficiaire',
    category: 'MARKETING',
    description: 'Diffusé dans le groupe WhatsApp du cercle lors du décaissement de la cagnotte.',
    sampleBody:
      '🎉 *FÉLICITATIONS AU BÉNÉFICIAIRE !* 🎉\n\nLa cagnotte du Tour #{{1}} de la "{{2}}" est complète !\n\n👤 Bénéficiaire : *{{3}}*\n💰 Cagnotte Brute : *{{4}}*\n🏷️ Retenue de Gestion ({{5}}) : {{6}}\n💵 *Montant Net Décaissé : {{7}}*\n\nBravo à tous les participants pour leur solidarité ! Prochain tour : le {{8}}.',
  },
  {
    id: 'tmpl_04',
    code: 'LATE_NOTICE',
    name: 'Alerte Retard & Régularisation',
    category: 'UTILITY',
    description: 'Relance bienveillante mais ferme en cas de dépassement de la date d’échéance.',
    sampleBody:
      '⚠️ *Alerte Échéance Dépassée*\n\nBonjour {{1}}, la date limite du Tour #{{2}} pour la "{{3}}" était le {{4}}.\n\nMontant attendu : *{{5}}*.\nPour préserver la confiance du cercle et permettre au bénéficiaire d’encaisser sa cagnotte, merci de régulariser sans délai : {{6}}',
  },
  {
    id: 'tmpl_05',
    code: 'MONTHLY_REPORT',
    name: 'Bilan Comptable du Cercle',
    category: 'UTILITY',
    description: 'Synthèse financière globale mensuelle à partager dans le groupe WhatsApp.',
    sampleBody:
      '📊 *BILAN FINANCIER MENSUEL - {{1}}*\n\nCycle : Tour #{{2}} / {{3}}\nCotisation unitaire : {{4}}\nCollecte totale réalisée : {{5}} ({{6}}%)\nMembres à jour : {{7}} / {{8}}\n\n🔗 Consultez le Grand Livre audité : {{9}}',
  },
];

/**
 * Format a clean international phone number for WhatsApp deep-linking
 */
export function sanitizePhoneForWhatsApp(rawPhone: string): string {
  // Remove all spaces, parentheses, dashes and plus sign
  const digits = rawPhone.replace(/\D/g, '');
  return digits;
}

/**
 * Generate a direct click-to-chat WhatsApp link targeting an individual member
 */
export function buildWhatsAppDirectLink(phone: string, text: string): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Generate a click-to-share WhatsApp link suitable for groups or broadcasts
 */
export function buildWhatsAppGroupShareLink(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Generate a dynamic 48h Due Date Reminder message for a member
 */
export function generateDueReminderMessage(
  tontine: TontineRecord,
  member: TontineMemberParticipation
): string {
  const paymentLink = `https://tontine.africa/pay/${tontine.code}?user=${member.userId}`;
  return `Bonjour *${member.name}* 👋,

Rappel bienveillant de votre tontine *"${tontine.name}"* :
📅 Échéance du Tour #${tontine.currentRound} : *${tontine.nextDueDate}* (dans 48h)
💰 Montant de votre cotisation : *${formatXOF(tontine.contributionAmount)}*

👉 *Réglez directement en 1 clic via Mobile Money* :
${paymentLink}

(Accepte Wave, Orange Money, MTN MoMo & Moov).
Merci pour votre ponctualité et votre engagement solidaire ! ✨`;
}

/**
 * Generate a formal Payment Receipt for WhatsApp
 */
export function generatePaymentReceiptMessage(
  tontine: TontineRecord,
  member: TontineMemberParticipation,
  txRef: string,
  paymentMethod: string
): string {
  return `✅ *QUITTANCE DE PAIEMENT CERTIFIÉE*

Bonjour *${member.name}*, votre cotisation a bien été confirmée !

📋 *Détails de la Transaction :*
• Tontine : *${tontine.name}* (Code : ${tontine.code})
• Tour de passage : Tour #${tontine.currentRound}
• Montant réglé : *${formatXOF(tontine.contributionAmount)}*
• Mode de versement : ${paymentMethod}
• Référence officielle : \`${txRef}\`
• Horodatage : ${new Date().toLocaleString('fr-FR')}

🔒 Votre versement a été scellé dans le Grand Livre Immuable SHA-256.
Merci de votre confiance !`;
}

/**
 * Generate an announcement for the WhatsApp Group when a pot is disbursed
 */
export function generateBeneficiaryDisbursementAlert(
  tontine: TontineRecord,
  beneficiaryName: string,
  netPot: number,
  commissionAmount: number
): string {
  const totalPot = tontine.contributionAmount * tontine.members.length;
  return `🎉 *FÉLICITATIONS AU BÉNÉFICIAIRE DU TOUR #${tontine.currentRound} !* 🎉

Chers membres de la *"${tontine.name}"*, la cagnotte a été intégralement collectée et décaissée avec succès !

👤 *Heureux(se) Bénéficiaire :* ${beneficiaryName}
💰 *Cagnotte Brute :* ${formatXOF(totalPot)}
🏷️ *Commission Gestionnaire (${formatPercent(tontine.commissionRate)}) :* -${formatXOF(commissionAmount)}
💵 *VERSEMENT NET EFFECTUÉ :* *${formatXOF(netPot)}*

👏 Bravo à tous pour le respect strict des échéances !
📅 Ouverture du Tour #${Math.min(tontine.totalRounds, tontine.currentRound + 1)} dans quelques jours.

_Tontine sécurisée par Tontine SaaS Platform_`;
}

/**
 * Generate a complete text report for the WhatsApp circle
 */
export function generateWhatsAppCircleReport(tontine: TontineRecord): string {
  const paidCount = tontine.members.filter((m) => m.hasPaidCurrentRound).length;
  const totalMembers = tontine.members.length;
  const pct = Math.round((paidCount / (totalMembers || 1)) * 100);
  const collected = paidCount * tontine.contributionAmount;
  const target = totalMembers * tontine.contributionAmount;
  const currentBeneficiary = tontine.members.find((m) => m.turnNumber === tontine.currentRound);

  const memberRows = tontine.members
    .sort((a, b) => a.turnNumber - b.turnNumber)
    .map((m) => {
      const statusIcon = m.hasPaidCurrentRound ? '✅' : '⏳';
      const turnTag = m.turnNumber === tontine.currentRound ? '🎯 (Bénéficiaire en cours)' : '';
      return `${statusIcon} Tour #${m.turnNumber} : ${m.name} ${turnTag}`;
    })
    .join('\n');

  return `📊 *RELEVÉ OFFICIEL DU CERCLE - ${tontine.name.toUpperCase()}*
Réf : \`${tontine.code}\` | Gestionnaire : ${tontine.managerName}
------------------------------------
🎯 *Cycle en cours :* Tour #${tontine.currentRound} sur ${tontine.totalRounds}
👤 *Bénéficiaire actuel :* ${currentBeneficiary?.name || 'En attente'}
💰 *Cotisation unitaire :* ${formatXOF(tontine.contributionAmount)}
💵 *Collecte réalisée :* ${formatXOF(collected)} / ${formatXOF(target)} (*${pct}%*)
📈 *Membres à jour :* ${paidCount} sur ${totalMembers}

👥 *ÉTAT DÉTAILLÉ DES TOURS :*
${memberRows}

🔒 *Garantie FinTech :* Transactions vérifiées avec signature cryptographique & règles prudentielles BCEAO.`;
}

/**
 * Conversational Logic for the WhatsApp Tontine Bot
 * Handles user inputs (1, 2, 3, 4 or natural language)
 */
export interface BotProcessResult {
  replyText: string;
  suggestedAction?: 'SHOW_PAYMENT' | 'SHOW_CALENDAR' | 'SHOW_REPORT';
  paymentLink?: {
    provider: string;
    url: string;
    amount: number;
  };
}

export function processWhatsAppBotMessage(
  userMessage: string,
  currentTontine: TontineRecord,
  memberUser?: { id: string; name: string; phone: string }
): BotProcessResult {
  const normalized = userMessage.trim().toLowerCase();
  const memberName = memberUser?.name || 'Cher(e) cotisant(e)';
  const currentBeneficiary = currentTontine.members.find(
    (m) => m.turnNumber === currentTontine.currentRound
  );
  const isBeneficiaryNow = memberUser
    ? currentTontine.members.some(
        (m) => m.userId === memberUser.id && m.turnNumber === currentTontine.currentRound
      )
    : false;

  const myTurn = memberUser
    ? currentTontine.members.find((m) => m.userId === memberUser.id)?.turnNumber
    : undefined;

  // Option 1: View my turn and next due date
  if (
    normalized === '1' ||
    normalized.includes('tour') ||
    normalized.includes('date') ||
    normalized.includes('échéance') ||
    normalized.includes('quand')
  ) {
    const turnInfo = myTurn
      ? `Vous êtes positionné au *Tour #${myTurn}* sur ${currentTontine.totalRounds}.`
      : `Le groupe est actuellement au *Tour #${currentTontine.currentRound}* sur ${currentTontine.totalRounds}.`;

    const beneficiaryInfo = isBeneficiaryNow
      ? `🎉 *C'EST VOTRE TOUR !* Vous êtes le bénéficiaire de la cagnotte pour ce cycle.`
      : `👤 Bénéficiaire du tour actuel : *${currentBeneficiary?.name || 'Attribué'}*.`;

    return {
      replyText: `Bonjour ${memberName} 👋\n\n📌 *Votre Statut Tontine :*\n${turnInfo}\n${beneficiaryInfo}\n\n📅 Prochaine échéance de cotisation : *${currentTontine.nextDueDate}*\n💰 Montant dû : *${formatXOF(currentTontine.contributionAmount)}*\n\nTapez *2* pour recevoir votre lien de paiement instantané Mobile Money.`,
      suggestedAction: 'SHOW_CALENDAR',
    };
  }

  // Option 2: Payment link Wave / Orange Money
  if (
    normalized === '2' ||
    normalized.includes('payer') ||
    normalized.includes('cotiser') ||
    normalized.includes('wave') ||
    normalized.includes('orange') ||
    normalized.includes('lien')
  ) {
    const payUrl = `https://pay.tontine.africa/${currentTontine.code}?amount=${currentTontine.contributionAmount}`;
    return {
      replyText: `💳 *Paiement Sécurisé - Tour #${currentTontine.currentRound}*\n\nMontant : *${formatXOF(currentTontine.contributionAmount)}*\nCercle : *${currentTontine.name}*\n\nCliquez sur ce lien direct pour valider votre cotisation sans frais :\n👉 ${payUrl}\n\n📲 *Moyens acceptés :*\n• Wave Côte d'Ivoire & Sénégal (0% frais)\n• Orange Money Web & QR\n• MTN MoMo\n• Moov Money\n\nUn reçu numérique horodaté vous sera immédiatement envoyé ici dès confirmation !`,
      suggestedAction: 'SHOW_PAYMENT',
      paymentLink: {
        provider: 'Wave & Orange Money',
        url: payUrl,
        amount: currentTontine.contributionAmount,
      },
    };
  }

  // Option 3: Circle overview and pot amount
  if (
    normalized === '3' ||
    normalized.includes('groupe') ||
    normalized.includes('cagnotte') ||
    normalized.includes('cercle') ||
    normalized.includes('combien')
  ) {
    const totalPot = currentTontine.contributionAmount * currentTontine.members.length;
    const comm = Math.round(totalPot * currentTontine.commissionRate);
    const netPot = totalPot - comm;
    const paidCount = currentTontine.members.filter((m) => m.hasPaidCurrentRound).length;

    return {
      replyText: `👥 *Informations du Cercle "${currentTontine.name}"*\n\n• Nombre de membres : *${currentTontine.members.length} participants*\n• Membres déjà à jour ce tour : *${paidCount} / ${currentTontine.members.length}*\n• Cagnotte brute du tour : *${formatXOF(totalPot)}*\n• Retenue gestion (${formatPercent(currentTontine.commissionRate)}) : -${formatXOF(comm)}\n• *Cagnotte nette reversée : ${formatXOF(netPot)}*\n\nTapez *4* pour recevoir le bilan complet du cercle.`,
      suggestedAction: 'SHOW_REPORT',
    };
  }

  // Option 4: Full detailed circle report
  if (normalized === '4' || normalized.includes('bilan') || normalized.includes('reçu') || normalized.includes('rapport')) {
    return {
      replyText: generateWhatsAppCircleReport(currentTontine),
      suggestedAction: 'SHOW_REPORT',
    };
  }

  // Default fallback with conversational menu
  return {
    replyText: `Bonjour *${memberName}* 👋\nBienvenue sur l'assistant WhatsApp de la tontine *"${currentTontine.name}"* !\n\nComment puis-je vous aider aujourd'hui ?\n\n👉 *1* : Connaître mon tour et ma date de cotisation\n👉 *2* : Obtenir mon lien direct de paiement Wave / Orange Money\n👉 *3* : Voir le montant de la cagnotte et l'état du groupe\n👉 *4* : Recevoir le relevé complet du cercle certifié\n\n_Répondez simplement par 1, 2, 3 ou 4._`,
  };
}
