import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TontineRecord, MemberContributionPayment, ManagerWalletTransaction } from '../types';
import { formatXOF, formatPercent } from '../data/plans';

/**
 * Utility to trigger download of a generated file in browser
 */
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format CSV field safely with RFC 4180 rules
 */
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 1. EXPORT PER-TONTINE TRANSACTIONS & PAYMENTS TO CSV
 */
export function exportTontineToCSV(
  tontine: TontineRecord,
  allPayments: MemberContributionPayment[] = []
) {
  const tontinePayments = allPayments.filter((p) => p.tontineId === tontine.id);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // Use semicolon ';' for seamless compatibility with French / Excel in Francophone Africa
  const sep = ';';
  const rows: string[] = [];

  // UTF-8 BOM for Microsoft Excel compatibility
  rows.push('\uFEFF');

  // Header info
  rows.push(`${escapeCSV('RELEVÉ DES TRANSACTIONS ET PAIEMENTS - TONTINE')}${sep}${escapeCSV(tontine.name)}`);
  rows.push(`${escapeCSV('Code Tontine')}${sep}${escapeCSV(tontine.code)}`);
  rows.push(`${escapeCSV('Gestionnaire')}${sep}${escapeCSV(tontine.managerName)}`);
  rows.push(`${escapeCSV('Date d\'export')}${sep}${escapeCSV(now.toLocaleString('fr-FR'))}`);
  rows.push(`${escapeCSV('Tour actuel')}${sep}${escapeCSV(`${tontine.currentRound} / ${tontine.totalRounds}`)}`);
  rows.push(`${escapeCSV('Montant cotisation par membre')}${sep}${escapeCSV(formatXOF(tontine.contributionAmount))}`);
  rows.push(`${escapeCSV('Taux commission')}${sep}${escapeCSV(formatPercent(tontine.commissionRate))}`);
  rows.push('');

  // SECTION 1: HISTORIQUE DES TRANSACTIONS ENREGISTRÉES
  rows.push(`${escapeCSV('=== HISTORIQUE DES PAIEMENTS ET COTISATIONS EFFECTUÉS ===')}`);
  const paymentHeaders = [
    'Date & Heure',
    'Réf Transaction',
    'Tour',
    'Membre / Utilisateur',
    'Montant Cotisé (FCFA)',
    'Commission Manager (FCFA)',
    'Part Cagnotte (FCFA)',
    'Moyen de Paiement',
    'Statut',
  ];
  rows.push(paymentHeaders.map(escapeCSV).join(sep));

  if (tontinePayments.length > 0) {
    tontinePayments.forEach((p) => {
      const netPool = p.amount - p.commissionAmount;
      const memberObj = tontine.members.find((m) => m.userId === p.userId);
      const memberName = memberObj ? memberObj.name : `Membre (${p.userId})`;

      rows.push(
        [
          p.paidAt ? new Date(p.paidAt).toLocaleString('fr-FR') : 'Non daté',
          p.transactionRef || 'N/A',
          `Tour #${p.roundNumber}`,
          memberName,
          p.amount,
          p.commissionAmount,
          netPool,
          p.paymentMethod || 'SASPAY',
          p.status === 'PAID' ? 'PAYÉ ✓' : p.status === 'PENDING' ? 'EN ATTENTE' : 'RETARD',
        ]
          .map(escapeCSV)
          .join(sep)
      );
    });
  } else {
    // If no direct payment log was found in payments list, list payments deduced from current round
    tontine.members.forEach((m) => {
      if (m.hasPaidCurrentRound) {
        const comm = Math.round(tontine.contributionAmount * tontine.commissionRate);
        const netPool = tontine.contributionAmount - comm;
        rows.push(
          [
            tontine.startDate || dateStr,
            `AUTO-TR-${tontine.currentRound}-${m.id.slice(-4)}`,
            `Tour #${tontine.currentRound}`,
            m.name,
            tontine.contributionAmount,
            comm,
            netPool,
            m.paymentMethod || 'ORANGE_MONEY',
            'PAYÉ (Cycle en cours)',
          ]
            .map(escapeCSV)
            .join(sep)
        );
      }
    });
  }

  rows.push('');
  // SECTION 2: ÉTAT DÉTAILLÉ DES MEMBRES ET TOURS DU CYCLE
  rows.push(`${escapeCSV('=== REGISTRE COMPLET DES MEMBRES ET ÉTAT DU CYCLE ACTUEL ===')}`);
  const memberHeaders = [
    'Tour Attribué',
    'Nom Complet',
    'Téléphone',
    'Moyen Paiement Préféré',
    'Statut Cotisation Tour Actuel',
    'Bénéficiaire du Tour Actuel',
    'Montant Caution Séquestrée (FCFA)',
    'Statut Garant',
    'Pénalités Retard (FCFA)',
  ];
  rows.push(memberHeaders.map(escapeCSV).join(sep));

  tontine.members.forEach((m) => {
    rows.push(
      [
        `Tour #${m.turnNumber}`,
        m.name,
        m.phone,
        m.paymentMethod || 'ORANGE_MONEY',
        m.hasPaidCurrentRound ? 'Cotisation réglée' : 'Non réglée (En attente)',
        m.isCurrentBeneficiary ? 'OUI (Cagnotte perçue)' : 'Non',
        m.cautionAmount ?? tontine.contributionAmount,
        m.guarantorStatus || 'VERIFIED',
        m.penaltiesAmount ?? 0,
      ]
        .map(escapeCSV)
        .join(sep)
    );
  });

  const csvContent = rows.join('\r\n');
  const filename = `Tontine_${tontine.code}_transactions_${dateStr}.csv`;
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * 2. EXPORT PER-TONTINE FINANCIAL STATEMENT & TRANSACTIONS TO PDF
 */
export function exportTontineToPDF(
  tontine: TontineRecord,
  allPayments: MemberContributionPayment[] = []
) {
  const tontinePayments = allPayments.filter((p) => p.tontineId === tontine.id);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary brand colors (Emerald)
  const primaryColor: [number, number, number] = [5, 150, 105]; // #059669
  const darkColor: [number, number, number] = [15, 23, 42]; // #0f172a
  const textMuted: [number, number, number] = [100, 116, 139]; // #64748b

  // Top header banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TONTINE 2.0 • RELEVÉ FINANCIER & PAIEMENTS', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rapport certifié pour la tontine : ${tontine.name} (${tontine.code})`, 14, 18);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 23);

  // Financial Summary Cards Box
  let startY = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, pageWidth - 28, 30, 3, 3, 'FD');

  const grossTurn = tontine.contributionAmount * tontine.members.length;
  const commTurn = Math.round(grossTurn * tontine.commissionRate);
  const netTurn = grossTurn - commTurn;

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Gestionnaire :', 18, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(tontine.managerName, 42, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Tour en cours :', 18, startY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tour ${tontine.currentRound} sur ${tontine.totalRounds} (${tontine.periodicity === 'MONTHLY' ? 'Mensuelle' : 'Hebdomadaire'})`, 43, startY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Cotisation membre :', 18, startY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(formatXOF(tontine.contributionAmount), 50, startY + 21);

  // Column 2 inside Summary Box
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Cagnotte Brute / Tour :', col2X, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(formatXOF(grossTurn), col2X + 40, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Commission Manager :', col2X, startY + 14);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatXOF(commTurn)} (${formatPercent(tontine.commissionRate)})`, col2X + 40, startY + 14);

  doc.setTextColor(...darkColor);
  doc.text('Net Bénéficiaire :', col2X, startY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(formatXOF(netTurn), col2X + 40, startY + 21);

  // Section 1: Detailed Transactions & Payments Table
  startY = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('1. Historique des Versements et Cotisations Effectués', 14, startY);

  const paymentData: (string | number)[][] = [];

  if (tontinePayments.length > 0) {
    tontinePayments.forEach((p) => {
      const memberObj = tontine.members.find((m) => m.userId === p.userId);
      paymentData.push([
        p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : dateStr,
        p.transactionRef || 'TR-REF',
        `Tour ${p.roundNumber}`,
        memberObj ? memberObj.name : `Membre ${p.userId.slice(-4)}`,
        formatXOF(p.amount),
        formatXOF(p.commissionAmount),
        p.paymentMethod || 'SASPAY',
        p.status === 'PAID' ? 'PAYÉ ✓' : 'EN COURS',
      ]);
    });
  } else {
    // Use current round member paid statuses
    tontine.members.forEach((m) => {
      const comm = Math.round(tontine.contributionAmount * tontine.commissionRate);
      paymentData.push([
        tontine.startDate || dateStr,
        `SAS-${tontine.currentRound}-${m.id.slice(-4)}`,
        `Tour ${tontine.currentRound}`,
        m.name,
        formatXOF(tontine.contributionAmount),
        formatXOF(comm),
        m.paymentMethod || 'ORANGE_MONEY',
        m.hasPaidCurrentRound ? 'PAYÉ ✓' : 'EN ATTENTE',
      ]);
    });
  }

  autoTable(doc, {
    startY: startY + 4,
    head: [['Date', 'Réf', 'Tour', 'Membre', 'Montant', 'Commission', 'Moyen', 'Statut']],
    body: paymentData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: darkColor,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Section 2: Members Register & Payout Turn Allocation
  // @ts-expect-error autoTable adds lastAutoTable to doc
  let nextY = (doc.lastAutoTable?.finalY || 140) + 12;

  // Add new page if not enough space
  if (nextY > 210) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('2. Ordre de Passage des Bénéficiaires & Cautions Séquestrées', 14, nextY);

  const memberTableData: (string | number)[][] = tontine.members.map((m) => [
    `Tour #${m.turnNumber}`,
    m.name,
    m.phone,
    m.hasPaidCurrentRound ? 'À jour ✓' : 'En attente',
    m.isCurrentBeneficiary ? 'BÉNÉFICIAIRE ACTUEL' : m.turnNumber < tontine.currentRound ? 'Déjà perçu' : `Attente (Tour ${m.turnNumber})`,
    formatXOF(m.cautionAmount ?? tontine.contributionAmount),
    m.guarantorStatus === 'VERIFIED' ? 'Garant Validé ✓' : 'Standard',
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Tour', 'Participant', 'Téléphone', 'Cotisation T.' + tontine.currentRound, 'Rôle Cagnotte', 'Séquestre Caution', 'Garant']],
    body: memberTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: darkColor,
    },
    columnStyles: {
      4: { fontStyle: 'bold' },
    },
  });

  // Footer & Compliance signature on the last page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(
    `Document officiel Tontine 2.0 • Traçabilité Mobile Money (Moov Money & Orange Money) • Page ${doc.getNumberOfPages()}`,
    14,
    pageHeight - 10
  );

  doc.save(`Tontine_${tontine.code}_rapport_${dateStr}.pdf`);
}

/**
 * 3. EXPORT WALLET TRANSACTIONS & COMMISSIONS TO CSV
 */
export function exportWalletTransactionsToCSV(
  transactions: ManagerWalletTransaction[],
  managerName: string
) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const sep = ';';
  const rows: string[] = [];

  rows.push('\uFEFF');
  rows.push(`${escapeCSV('HISTORIQUE DU WALLET ET DES COMMISSIONS')}${sep}${escapeCSV(managerName)}`);
  rows.push(`${escapeCSV('Date de génération')}${sep}${escapeCSV(now.toLocaleString('fr-FR'))}`);
  rows.push(`${escapeCSV('Nombre d\'opérations')}${sep}${escapeCSV(transactions.length)}`);
  rows.push('');

  const headers = [
    'Date & Heure',
    'Type d\'opération',
    'Description',
    'Moyen / Fournisseur',
    'Compte Cible',
    'Montant (FCFA)',
    'Solde Après (FCFA)',
    'Statut',
  ];
  rows.push(headers.map(escapeCSV).join(sep));

  transactions.forEach((tx) => {
    rows.push(
      [
        tx.date ? new Date(tx.date).toLocaleString('fr-FR') : 'N/A',
        tx.type === 'COMMISSION_CREDIT' ? 'COMMISSION PERÇUE' : 'RETRAIT EFFECTUÉ',
        tx.description,
        tx.provider || 'ORANGE_MONEY',
        tx.account || 'Compte Manager',
        tx.type === 'COMMISSION_CREDIT' ? `+${tx.amount}` : `-${tx.amount}`,
        tx.balanceAfter,
        tx.status === 'COMPLETED' ? 'CONFIRMÉ ✓' : 'EN COURS',
      ]
        .map(escapeCSV)
        .join(sep)
    );
  });

  const filename = `Wallet_Commissions_${dateStr}.csv`;
  downloadBlob(rows.join('\r\n'), filename, 'text/csv;charset=utf-8;');
}

/**
 * 4. EXPORT WALLET TRANSACTIONS & COMMISSIONS TO PDF
 */
export function exportWalletTransactionsToPDF(
  transactions: ManagerWalletTransaction[],
  managerName: string,
  walletBalance: number
) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [180, 83, 9]; // Amber #b45309 for commissions
  const darkColor: [number, number, number] = [15, 23, 42];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TONTINE 2.0 • REGISTRE DES COMMISSIONS & RETRAITS', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Relevé d'activité du Gestionnaire : ${managerName}`, 14, 18);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 23);

  // Solde Actuel Summary Card
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, 34, pageWidth - 28, 20, 3, 3, 'FD');

  doc.setTextColor(146, 64, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLDE ACTUEL DU WALLET GESTIONNAIRE :', 20, 44);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatXOF(walletBalance), 120, 45);

  const txData = transactions.map((tx) => [
    tx.date ? new Date(tx.date).toLocaleDateString('fr-FR') : dateStr,
    tx.type === 'COMMISSION_CREDIT' ? 'Commission perçue' : 'Retrait vers Mobile Money',
    tx.description,
    `${tx.type === 'COMMISSION_CREDIT' ? '+' : '-'} ${formatXOF(tx.amount)}`,
    formatXOF(tx.balanceAfter),
    tx.status === 'COMPLETED' ? 'Effectué ✓' : 'En cours',
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Type d\'opération', 'Description / Référence', 'Montant', 'Solde Après', 'Statut']],
    body: txData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: darkColor,
    },
    columnStyles: {
      3: { fontStyle: 'bold' },
    },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document d'audit Tontine 2.0 • Traçabilité intégrale des flux de commissions • Page ${doc.getNumberOfPages()}`,
    14,
    pageHeight - 10
  );

  doc.save(`Commissions_Retraits_${dateStr}.pdf`);
}

/**
 * 5. EXPORT ALL MANAGED TONTINES CONSOLIDATED REPORT (CSV & PDF)
 */
export function exportAllTontinesToCSV(
  tontines: TontineRecord[],
  allPayments: MemberContributionPayment[] = [],
  managerName: string
) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const sep = ';';
  const rows: string[] = [];

  rows.push('\uFEFF');
  rows.push(`${escapeCSV('RAPPORT GLOBAL CONSOLIDÉ DES TONTINES')}${sep}${escapeCSV(managerName)}`);
  rows.push(`${escapeCSV('Date de génération')}${sep}${escapeCSV(now.toLocaleString('fr-FR'))}`);
  rows.push(`${escapeCSV('Nombre de tontines actives')}${sep}${escapeCSV(tontines.length)}`);
  rows.push('');

  const headers = [
    'Code Tontine',
    'Nom Tontine',
    'Périodicité',
    'Tour Actuel',
    'Total Tours',
    'Membres Inscrits',
    'Cotisation / Membre (FCFA)',
    'Cagnotte Brute / Tour (FCFA)',
    'Taux Commission',
    'Commission / Tour (FCFA)',
    'Total Volume Collecté Estimé (FCFA)',
    'Statut',
  ];
  rows.push(headers.map(escapeCSV).join(sep));

  tontines.forEach((t) => {
    const gross = t.contributionAmount * t.members.length;
    const comm = Math.round(gross * t.commissionRate);
    const totalVolume = gross * t.currentRound;

    rows.push(
      [
        t.code,
        t.name,
        t.periodicity === 'MONTHLY' ? 'Mensuelle' : 'Hebdomadaire',
        t.currentRound,
        t.totalRounds,
        t.members.length,
        t.contributionAmount,
        gross,
        formatPercent(t.commissionRate),
        comm,
        totalVolume,
        t.status,
      ]
        .map(escapeCSV)
        .join(sep)
    );
  });

  const filename = `Tontines_Consolidees_${dateStr}.csv`;
  downloadBlob(rows.join('\r\n'), filename, 'text/csv;charset=utf-8;');
}

export function exportAllTontinesToPDF(
  tontines: TontineRecord[],
  allPayments: MemberContributionPayment[] = [],
  managerName: string
) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [5, 150, 105];
  const darkColor: [number, number, number] = [15, 23, 42];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TONTINE 2.0 • ÉTAT GLOBAL DU PORTEFEUILLE DE TONTINES', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rapport consolidé pour le Gestionnaire : ${managerName}`, 14, 18);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 22);

  const tableData = tontines.map((t) => {
    const gross = t.contributionAmount * t.members.length;
    const comm = Math.round(gross * t.commissionRate);
    return [
      t.code,
      t.name,
      `Tour ${t.currentRound}/${t.totalRounds}`,
      `${t.members.length} participants`,
      formatXOF(t.contributionAmount),
      formatXOF(gross),
      formatPercent(t.commissionRate),
      formatXOF(comm),
      formatXOF(gross - comm),
      t.status,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Code', 'Nom de la Tontine', 'Progression', 'Membres', 'Cotisation', 'Cagnotte Brute', 'Taux', 'Commission', 'Net Bénéficiaire', 'Statut']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: darkColor,
    },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document officiel Tontine 2.0 • Page ${doc.getNumberOfPages()} • Généré électroniquement`,
    14,
    pageHeight - 8
  );

  doc.save(`Tontines_Consolidees_${dateStr}.pdf`);
}
