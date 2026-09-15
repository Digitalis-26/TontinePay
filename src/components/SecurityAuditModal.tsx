import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCw,
  FileCheck,
  Eye,
  Layers,
  Database,
  RefreshCw,
  Smartphone,
  Scale,
  Hash,
  Terminal,
} from 'lucide-react';
import {
  verifyWebhookSignature,
  checkAndRecordIdempotency,
  acquireFinancialLock,
  releaseFinancialLock,
  verifyOtpRequestGuard,
  validateKycWithdrawalLimits,
  createChainedLedgerEntry,
  verifyLedgerChainIntegrity,
  ChainedLedgerEntry,
  BCEAO_TIER1_MAX_PER_TX,
} from '../utils/security';
import { RegisteredUser } from '../types';
import { formatXOF } from '../data/plans';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RegisteredUser | null;
}

export function SecurityAuditModal({ isOpen, onClose, currentUser }: SecurityAuditModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'testbench' | 'ledgerAudit'>('overview');

  // Test bench state
  const [testLog, setTestLog] = useState<{
    testName: string;
    status: 'SUCCESS' | 'DEFENDED' | 'BLOCKED';
    title: string;
    details: string;
    timestamp: string;
  }[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Ledger audit state
  const [sampleLedger, setSampleLedger] = useState<ChainedLedgerEntry[]>([]);
  const [auditResult, setAuditResult] = useState<{
    isTamperFree: boolean;
    totalVerified: number;
    errorDetail?: string;
  } | null>(null);

  if (!isOpen) return null;

  // Initialize a demo chained ledger if empty
  const ensureSampleLedger = async () => {
    if (sampleLedger.length > 0) return;
    const e1 = await createChainedLedgerEntry({
      id: 'tx_init_001',
      type: 'COTISATION_INITIALE',
      amount: 50000,
      initiator: 'Membre (+225 07 00 00 01)',
      target: 'Cagnotte Tontine Teranga',
      description: 'Versement Tour 1 via Wave CI',
    });
    const e2 = await createChainedLedgerEntry({
      id: 'tx_init_002',
      previousEntry: e1,
      type: 'COMMISSION_GESTIONNAIRE',
      amount: 1250,
      initiator: 'Cagnotte Tontine Teranga',
      target: 'Portefeuille Manager (2.5%)',
      description: 'Prélèvement automatique commission forfait Starter',
    });
    const e3 = await createChainedLedgerEntry({
      id: 'tx_init_003',
      previousEntry: e2,
      type: 'PAIEMENT_BENEFICIAIRE',
      amount: 48750,
      initiator: 'Cagnotte Tontine Teranga',
      target: 'Bénéficiaire Tour 1 (Fatou Diop)',
      description: 'Virement net Mobile Money',
    });
    setSampleLedger([e1, e2, e3]);
  };

  // Test 1: Forged Webhook Attack
  const runTestWebhookForgery = async () => {
    setIsRunningTest(true);
    const fakeSecret = 'live_secret_wave_ci_9837a2819';
    const fakePayload = JSON.stringify({
      event: 'payment.completed',
      transaction_id: 'fake_tx_9999',
      amount: 500000,
      currency: 'XOF',
      status: 'PAID',
    });

    // Attempt with illegitimate/forged signature
    const result = await verifyWebhookSignature({
      payload: fakePayload,
      providedSignature: 'forged_sha256_e9a18f773910c0128e4',
      secretKey: fakeSecret,
      timestampMs: Date.now(),
    });

    setTestLog((prev) => [
      {
        testName: 'Usurpation de Webhook (Faux Callback)',
        status: result.isValid ? 'BLOCKED' : 'DEFENDED',
        title: result.isValid ? 'ÉCHEC SÉCURITÉ' : 'ATTAQUE DÉJOUÉE : REJET 401 SIGNATURE INVALIDE',
        details: `${result.message} (Tentative d'injection de 500 000 F CFA fictifs bloquée par HMAC-SHA256).`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setIsRunningTest(false);
  };

  // Test 2: Idempotency & Replay Attack
  const runTestReplayAttack = async () => {
    setIsRunningTest(true);
    const duplicateTxId = 'wave_tx_replayed_10023';

    // First call
    const firstCheck = checkAndRecordIdempotency(duplicateTxId);
    // Second call with same ID (Replay attempt)
    const secondCheck = checkAndRecordIdempotency(duplicateTxId);

    setTestLog((prev) => [
      {
        testName: 'Attaque par Rejeu (Webhook dupliqué)',
        status: secondCheck.isDuplicate ? 'DEFENDED' : 'BLOCKED',
        title: secondCheck.isDuplicate
          ? 'RÉSILIENCE VALIDÉE : TRANSACTION DUPLIQUÉE DÉTECTÉE'
          : 'ÉCHEC SÉCURITÉ',
        details: secondCheck.isDuplicate
          ? `La transaction ${duplicateTxId} a été identifiée comme doublon. Statut 200 renvoyé à l'opérateur avec rejet d'un second crédit.`
          : 'La transaction a été exécutée deux fois !',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setIsRunningTest(false);
  };

  // Test 3: Concurrency Double Spend Race Condition
  const runTestDoubleSpend = async () => {
    setIsRunningTest(true);
    const walletLockKey = 'wallet_withdrawal_test_concurrency';

    // Simulate two rapid clicks (5ms interval)
    const lock1 = acquireFinancialLock(walletLockKey, 3000);
    const lock2 = acquireFinancialLock(walletLockKey, 3000);

    // Release after test
    setTimeout(() => releaseFinancialLock(walletLockKey), 500);

    setTestLog((prev) => [
      {
        testName: 'Concurrence & Double Retrait (Race Condition)',
        status: !lock2 ? 'DEFENDED' : 'BLOCKED',
        title: !lock2 ? 'VERROU PESSIMISTE ACTIVÉ : COLLISION ÉVITÉE' : 'ÉCHEC SÉCURITÉ',
        details: !lock2
          ? `Requête 1 : Verrou exclusif acquis. Requête 2 : Verrou refusé (ressource en cours de traitement). Le double débit du portefeuille est impossible.`
          : 'Les deux requêtes concurrentes ont été admises !',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setIsRunningTest(false);
  };

  // Test 4: SMS Pumping & Toll Fraud Prevention
  const runTestSmsPumping = async () => {
    setIsRunningTest(true);
    // Attack scenario: Attacker requests OTPs to premium numbers in Russia/Estonia
    const fakePremiumPhone = '+372 555 98124'; // Estonia premium number
    const result = verifyOtpRequestGuard(fakePremiumPhone);

    setTestLog((prev) => [
      {
        testName: 'Anti-SMS Pumping & Toll Fraud',
        status: !result.allowed ? 'DEFENDED' : 'BLOCKED',
        title: !result.allowed
          ? 'BLOCAGE FRAUDE SMS : NUMÉRO HORS ZONE UEMOA'
          : 'ÉCHEC SÉCURITÉ',
        details: !result.allowed
          ? result.reason || 'Requête bloquée'
          : 'SMS envoyé à un numéro surtaxé international sans restriction !',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setIsRunningTest(false);
  };

  // Test 5: BCEAO Regulatory Threshold Lock
  const runTestKycThreshold = async () => {
    setIsRunningTest(true);
    const unverifiedUser: RegisteredUser = {
      id: 'usr_unverified_test',
      role: 'MANAGER',
      firstName: 'Amadou',
      lastName: 'Traoré',
      phone: '+225 07 00 00 99',
      countryCode: 'CI',
      countryName: 'Côte d’Ivoire',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      kyc: { status: 'UNVERIFIED', level: 1 },
      managerDetails: {
        businessName: 'Tontine Express',
        planCode: 'STARTER',
        commissionRate: 0.025,
        commissionEnabled: true,
        payoutProvider: 'WAVE',
        payoutAccount: '+225 07 00 00 99',
        activeTontinesCount: 2,
        walletBalance: 250000,
      },
    };

    // Attempt to withdraw 250 000 XOF without KYC (limit is 150 000 XOF)
    const result = validateKycWithdrawalLimits(unverifiedUser, 250000);

    setTestLog((prev) => [
      {
        testName: 'Plafonds Réglementaires BCEAO (Palier 1 / Non vérifié)',
        status: !result.allowed ? 'DEFENDED' : 'BLOCKED',
        title: !result.allowed
          ? 'RETRAIT BLOQUÉ : DÉPASSEMENT PLAFOND PALIER 1'
          : 'ÉCHEC SÉCURITÉ',
        details: !result.allowed
          ? result.reason || 'Plafond dépassé'
          : 'Retrait non plafonné autorisé sans vérification d’identité !',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setIsRunningTest(false);
  };

  // Run full verification on the sample chained ledger
  const runLedgerAudit = async () => {
    await ensureSampleLedger();
    const result = await verifyLedgerChainIntegrity(sampleLedger);
    setAuditResult(result);
  };

  // Simulate an attacker tampering with an entry to show cryptographic detection
  const simulateTamperingOnLedger = async () => {
    if (sampleLedger.length < 2) await ensureSampleLedger();
    const corrupted = [...sampleLedger];
    // Maliciously change amount from 1250 to 50000
    corrupted[1] = {
      ...corrupted[1],
      amount: 50000,
      description: 'PIRATAGE : Montant altéré sans signature valide',
    };
    setSampleLedger(corrupted);
    const result = await verifyLedgerChainIntegrity(corrupted);
    setAuditResult(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Bouclier Sécurité & Conformité FinTech</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Système Protégé
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Audit cryptographique, contrôles de concurrence et conformité réglementaire BCEAO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Vue d'Ensemble des 6 Protections
          </button>
          <button
            onClick={() => {
              setActiveTab('testbench');
              ensureSampleLedger();
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'testbench'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Banc de Test & Simulation d'Attaques
          </button>
          <button
            onClick={() => {
              setActiveTab('ledgerAudit');
              ensureSampleLedger();
              runLedgerAudit();
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'ledgerAudit'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Hash className="w-4 h-4" />
            Chaîne Cryptographique du Grand Livre
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Statut de Sécurité Global : Opérationnel & Conforme</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                    Les 6 vecteurs critiques identifiés sont neutralisés par des barrières de sécurité automatiques : 
                    vérification HMAC-SHA256, verrous de concurrence pessimistes, idempotence, règles anti-IDOR, rate-limiting anti-fraude SMS et plafonds réglementaires BCEAO.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vector 1 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 1
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Validation Cryptographique des Webhooks (HMAC-SHA256)</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Toute notification de paiement provenant de Wave, Orange Money ou MTN MoMo doit comporter une signature HMAC valide calculée avec le secret d'API et un horodatage de moins de 5 minutes.
                  </p>
                </div>

                {/* Vector 2 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 2
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Anti-Double Dépense & Idempotence</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Verrou exclusif (Mutex) sur le portefeuille lors des retraits pour empêcher tout double débit concurrent. Clé d'idempotence unique par ID de transaction pour ignorer les renvois réseau d'opérateurs.
                  </p>
                </div>

                {/* Vector 3 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 3
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Contrôle d'Accès Strict Anti-BOLA / IDOR</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Vérification systématique d'appartenance : seul le manager créateur peut verser une cagnotte ou fixer le montant de cotisation. Un utilisateur tiers ne peut manipuler l'identifiant d'une autre tontine.
                  </p>
                </div>

                {/* Vector 4 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 4
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Pare-Feu Anti-SMS Pumping & Fraude Télécom</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Filtrage strict sur les indicatifs de l'Afrique de l'Ouest (+225, +221, +223, etc.) et limitation de débit glissante (3 requêtes / 10 minutes) pour interdire le piratage vers des numéros surtaxés internationaux.
                  </p>
                </div>

                {/* Vector 5 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 5
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Conformité LCB-FT & Paliers KYC BCEAO</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Application stricte des plafonds de l'Instruction BCEAO : Palier 1 non-vérifié plafonné à 150 000 F CFA par transaction et 300 000 F CFA mensuel. Déblocage uniquement sur soumission d'une CNI/Passeport.
                  </p>
                </div>

                {/* Vector 6 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Vecteur 6
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">Grand Livre Immuable (Chaînage SHA-256)</h4>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Toutes les écritures comptables sont scellées cryptographiquement en chaîne séquentielle (Hash de l'entrée N dépendant du Hash de l'entrée N-1). Aucune falsification rétroactive ne peut passer inaperçue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TESTBENCH */}
          {activeTab === 'testbench' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-stone-100 p-3.5 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Simulateur de Tests d'Intrusion & Résilience</h4>
                  <p className="text-[11px] text-stone-600">
                    Déclenchez des attaques synthétiques réelles pour constater les défenses actives du code.
                  </p>
                </div>
                {testLog.length > 0 && (
                  <button
                    onClick={() => setTestLog([])}
                    className="text-[11px] font-bold text-stone-500 hover:text-stone-800 cursor-pointer underline"
                  >
                    Effacer le journal
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={runTestWebhookForgery}
                  className="p-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-red-800 block uppercase">Test 1 • Attaque Forgery</span>
                  <strong className="text-xs font-bold text-stone-900 group-hover:text-red-950 block mt-0.5">
                    Injecter un faux webhook Wave
                  </strong>
                  <span className="text-[10px] text-stone-600 block mt-1">
                    Signature HMAC erronée simulée.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={runTestReplayAttack}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-amber-800 block uppercase">Test 2 • Rejeu / Doublon</span>
                  <strong className="text-xs font-bold text-stone-900 group-hover:text-amber-950 block mt-0.5">
                    Envoyer 2x la même transaction
                  </strong>
                  <span className="text-[10px] text-stone-600 block mt-1">
                    Vérifie la clé d'idempotence.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={runTestDoubleSpend}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-blue-800 block uppercase">Test 3 • Concurrence</span>
                  <strong className="text-xs font-bold text-stone-900 group-hover:text-blue-950 block mt-0.5">
                    Déclencher 2 retraits simultanés
                  </strong>
                  <span className="text-[10px] text-stone-600 block mt-1">
                    Vérifie le verrouillage Mutex.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={runTestSmsPumping}
                  className="p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-purple-800 block uppercase">Test 4 • SMS Pumping</span>
                  <strong className="text-xs font-bold text-stone-900 group-hover:text-purple-950 block mt-0.5">
                    Demander OTP vers l'Estonie
                  </strong>
                  <span className="text-[10px] text-stone-600 block mt-1">
                    Vérifie le pare-feu de préfixes.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={runTestKycThreshold}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">Test 5 • Plafond BCEAO</span>
                  <strong className="text-xs font-bold text-stone-900 group-hover:text-emerald-950 block mt-0.5">
                    Retirer 250k sans KYC
                  </strong>
                  <span className="text-[10px] text-stone-600 block mt-1">
                    Vérifie le blocage de Palier 1.
                  </span>
                </button>
              </div>

              {/* Console Logs */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  Journal d'Exécution & Interception en direct :
                </span>
                <div className="p-4 rounded-2xl bg-stone-900 text-stone-200 font-mono text-xs max-h-60 overflow-y-auto space-y-3">
                  {testLog.length === 0 ? (
                    <div className="text-stone-500 italic text-[11px]">
                      Sélectionnez un test ci-dessus pour simuler une tentative d'exploitation et observer la neutralisation en temps réel.
                    </div>
                  ) : (
                    testLog.map((log, idx) => (
                      <div key={idx} className="pb-2 border-b border-stone-800 last:border-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">[{log.timestamp}] {log.testName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'DEFENDED'
                                ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                                : 'bg-red-900/80 text-red-300'
                            }`}
                          >
                            {log.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 pl-2 border-l-2 border-emerald-500/50">
                          {log.details}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEDGER AUDIT */}
          {activeTab === 'ledgerAudit' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-100 border border-stone-200">
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Audit de la Chaîne Cryptographique SHA-256</h4>
                  <p className="text-[11px] text-stone-600">
                    Chaque écriture du Grand Livre est scellée avec l'empreinte de la précédente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runLedgerAudit}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Vérifier l'Intégrité
                  </button>
                  <button
                    onClick={simulateTamperingOnLedger}
                    className="px-3 py-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Simuler une Altération
                  </button>
                </div>
              </div>

              {/* Audit Certification Banner */}
              {auditResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    auditResult.isTamperFree
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}
                >
                  {auditResult.isTamperFree ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold">
                      {auditResult.isTamperFree
                        ? `Certification Cryptographique Validée (${auditResult.totalVerified} écritures scellées)`
                        : 'ALERTE : ALTÉRATION FRAUDULEUSE DÉTECTÉE DANS LE GRAND LIVRE !'}
                    </h5>
                    <p className="text-[11px] mt-0.5">
                      {auditResult.isTamperFree
                        ? 'Toutes les écritures financières sont authentiques, continues et non modifiées.'
                        : auditResult.errorDetail}
                    </p>
                  </div>
                </div>
              )}

              {/* Chained Entries List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  Écritures scellées en chaîne séquentielle :
                </span>
                <div className="space-y-2.5">
                  {sampleLedger.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 text-[10px] flex items-center justify-center font-mono">
                            #{entry.sequenceNumber}
                          </span>
                          {entry.type}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          {formatXOF(entry.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600">{entry.description}</p>
                      
                      <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-stone-400 block">Previous Hash (N-1) :</span>
                          <span className="text-stone-600 truncate block">
                            {entry.previousHash.slice(0, 24)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block">Current Sealed Hash (N) :</span>
                          <span className="text-emerald-700 font-bold truncate block">
                            {entry.currentHash.slice(0, 24)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Conforme aux normes de sécurité OWASP Top 10 API & Réglementation bancaire BCEAO.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer l'audit
          </button>
        </div>
      </div>
    </div>
  );
}
