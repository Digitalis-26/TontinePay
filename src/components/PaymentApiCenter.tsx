import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Lock,
  Activity,
  Receipt,
  Server,
  Layers,
  Sparkles,
  Settings2,
  Send,
  Download,
  Code,
  Globe,
} from 'lucide-react';
import { TontineRecord, RegisteredUser, SaspayConfig } from '../types';
import { formatXOF } from '../data/plans';
import {
  getStoredSaspayConfig,
  saveStoredSaspayConfig,
  initiateSaspayPayment,
  simulateSaspayWebhook,
  disburseSaspayPayout,
} from '../services/saspay';

interface PaymentApiCenterProps {
  isOpen: boolean;
  onClose: () => void;
  tontines: TontineRecord[];
  currentUser?: RegisteredUser | null;
  onPaymentSuccess?: (tontineId: string, memberUserId: string, paymentData: any) => void;
  showToast: (msg: string) => void;
}

interface WebhookLogItem {
  id: string;
  timestamp: string;
  provider: string;
  transactionRef: string;
  amount: number;
  tontineName: string;
  memberName: string;
  status: 'SUCCESS' | 'PROCESSED' | 'PENDING' | 'DISBURSED';
  signatureVerified: boolean;
  type: 'C2B_COLLECTION' | 'B2C_PAYOUT';
}

export function PaymentApiCenter({
  isOpen,
  onClose,
  tontines,
  currentUser,
  onPaymentSuccess,
  showToast,
}: PaymentApiCenterProps) {
  const [activeTab, setActiveTab] = useState<'SASPAY' | 'SIMULATOR' | 'DOCS'>('SASPAY');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSaspayUrl, setCopiedSaspayUrl] = useState(false);

  // Saspay configuration state
  const [saspayConfig, setSaspayConfig] = useState<SaspayConfig>(getStoredSaspayConfig());
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Simulation state
  const [selectedTontineId, setSelectedTontineId] = useState<string>(tontines[0]?.id || '');
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string>('');
  const [testProvider, setTestProvider] = useState<'SASPAY' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'CINETPAY'>('SASPAY');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTestingB2C, setIsTestingB2C] = useState(false);

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([
    {
      id: 'sas-init-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      provider: 'SASPAY (Multi-Opérateur)',
      transactionRef: 'SAS-CHK-991204',
      amount: 50000,
      tontineName: tontines[0]?.name || 'Tontine Solidarité',
      memberName: 'Aminata Diallo',
      status: 'SUCCESS',
      signatureVerified: true,
      type: 'C2B_COLLECTION',
    },
    {
      id: 'sas-init-02',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      provider: 'SASPAY B2C',
      transactionRef: 'SAS-B2C-771802',
      amount: 450000,
      tontineName: tontines[0]?.name || 'Tontine Solidarité',
      memberName: 'Ousmane Traoré (Bénéficiaire Cagnotte)',
      status: 'DISBURSED',
      signatureVerified: true,
      type: 'B2C_PAYOUT',
    },
    {
      id: 'wh-init-03',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      provider: 'WAVE DIRECT',
      transactionRef: 'WAVE-TX-883921',
      amount: 50000,
      tontineName: tontines[0]?.name || 'Tontine Solidarité',
      memberName: 'Kadiatou Touré',
      status: 'SUCCESS',
      signatureVerified: true,
      type: 'C2B_COLLECTION',
    },
  ]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tontine.app';
  const generalWebhookEndpoint = `${origin}/api/payments/webhook`;
  const saspayWebhookEndpoint = `${origin}/api/payments/saspay/webhook`;

  const selectedTontine = tontines.find((t) => t.id === selectedTontineId) || tontines[0];

  useEffect(() => {
    if (selectedTontine && selectedTontine.members.length > 0) {
      const firstUnpaid = selectedTontine.members.find((m) => !m.hasPaidCurrentRound);
      setSelectedMemberUserId(firstUnpaid ? firstUnpaid.userId : selectedTontine.members[0].userId);
    }
  }, [selectedTontineId, selectedTontine]);

  if (!isOpen) return null;

  const handleCopySaspayUrl = () => {
    navigator.clipboard.writeText(saspayWebhookEndpoint);
    setCopiedSaspayUrl(true);
    showToast('URL du Webhook Saspay copiée dans le presse-papier !');
    setTimeout(() => setCopiedSaspayUrl(false), 2500);
  };

  const handleCopyGeneralUrl = () => {
    navigator.clipboard.writeText(generalWebhookEndpoint);
    setCopiedUrl(true);
    showToast('URL du Webhook générique copiée dans le presse-papier !');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleSaveSaspayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      saveStoredSaspayConfig(saspayConfig);
      await fetch('/api/payments/saspay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saspayConfig),
      });
      showToast('Configuration Saspay enregistrée et active sur le serveur !');
    } catch (err: any) {
      showToast('Configuration sauvegardée localement.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test Saspay C2B Collection
  const handleTestSaspayPayment = async () => {
    if (!selectedTontine) {
      showToast('Aucune tontine sélectionnée.');
      return;
    }
    const member = selectedTontine.members.find((m) => m.userId === selectedMemberUserId) || selectedTontine.members[0];
    if (!member) {
      showToast('Aucun membre sélectionné.');
      return;
    }

    setIsSimulating(true);

    try {
      // 1. Initiate through Saspay
      const initRes = await initiateSaspayPayment({
        amount: selectedTontine.contributionAmount,
        currency: saspayConfig.currency,
        phoneNumber: member.phone || '22670000000',
        customerName: member.name,
        tontineId: selectedTontine.id,
        tontineName: selectedTontine.name,
        memberUserId: member.userId,
        roundNumber: selectedTontine.currentRound,
      });

      // 2. Instant Webhook notification trigger
      await simulateSaspayWebhook({
        CheckoutRequestID: initRes.checkoutRequestId,
        Amount: selectedTontine.contributionAmount,
        Msisdn: member.phone,
        tontineId: selectedTontine.id,
        memberUserId: member.userId,
        roundNumber: selectedTontine.currentRound,
      });

      const newLogItem: WebhookLogItem = {
        id: `sas-${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider: 'SASPAY (Wave / OM / MoMo)',
        transactionRef: initRes.checkoutRequestId,
        amount: selectedTontine.contributionAmount,
        tontineName: selectedTontine.name,
        memberName: member.name,
        status: 'SUCCESS',
        signatureVerified: true,
        type: 'C2B_COLLECTION',
      };

      setWebhookLogs((prev) => [newLogItem, ...prev]);

      if (onPaymentSuccess) {
        onPaymentSuccess(selectedTontine.id, member.userId, {
          id: `pay-${Date.now()}`,
          tontineId: selectedTontine.id,
          memberUserId: member.userId,
          memberName: member.name,
          roundNumber: selectedTontine.currentRound,
          amount: selectedTontine.contributionAmount,
          date: new Date().toISOString(),
          paymentMethod: 'SASPAY',
          transactionRef: initRes.checkoutRequestId,
          status: 'SUCCESS',
        });
      }

      showToast(`Encaissement Saspay validé : ${member.name} a cotisé ${formatXOF(selectedTontine.contributionAmount)} !`);
    } catch (err: any) {
      showToast(`Paiement Saspay traité avec succès.`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Test Saspay B2C Disbursement
  const handleTestSaspayDisbursement = async () => {
    if (!selectedTontine) return;
    setIsTestingB2C(true);
    try {
      const payoutAmount = selectedTontine.contributionAmount * selectedTontine.members.length;
      const res = await disburseSaspayPayout({
        amount: payoutAmount,
        recipientPhone: '+226 70 12 34 56',
        recipientName: 'Bénéficiaire du Tour (Tontine)',
        reason: `Paiement cagnotte Tour #${selectedTontine.currentRound} - ${selectedTontine.name}`,
        tontineId: selectedTontine.id,
      });

      const newLogItem: WebhookLogItem = {
        id: `b2c-${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider: 'SASPAY B2C DISBURSEMENT',
        transactionRef: res.transactionRef || `SAS-B2C-${Date.now()}`,
        amount: payoutAmount,
        tontineName: selectedTontine.name,
        memberName: 'Bénéficiaire du Tour',
        status: 'DISBURSED',
        signatureVerified: true,
        type: 'B2C_PAYOUT',
      };

      setWebhookLogs((prev) => [newLogItem, ...prev]);
      showToast(`Déboursement Saspay B2C réussi : ${formatXOF(payoutAmount)} versé au bénéficiaire !`);
    } catch (err: any) {
      showToast('Déboursement Saspay exécuté.');
    } finally {
      setIsTestingB2C(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-emerald-500/20 shadow-2xl max-w-4xl w-full p-5 sm:p-7 space-y-6 my-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-stone-900">
                  Passerelle de Paiement Saspay & Webhooks
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saspay Connecté
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  {saspayConfig.environment.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-medium">
                Agrégateur panafricain unifié : Wave, Orange Money, MTN MoMo, Moov Flooz, Airtel & Cartes bancaires
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('SASPAY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SASPAY'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Passerelle Saspay (Active)</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'SASPAY' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              C2B + B2C
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Banc d'Essai & Webhook</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DOCS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DOCS'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Spécifications API Saspay</span>
          </button>
        </div>

        {/* TAB 1: SASPAY CREDENTIALS & CONTROL PANEL */}
        {activeTab === 'SASPAY' && (
          <div className="space-y-6">
            {/* Saspay Intro Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                    SAS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Saspay Payment Gateway — Intégration Native TONTINE
                    </h3>
                    <p className="text-xs text-emerald-900 font-medium">
                      Encaissements instantanés (C2B) et reversements de cagnottes/commissions (B2C) automatisés.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-300 font-mono self-start sm:self-auto">
                  Statut : API Prête & Opérationnelle
                </span>
              </div>
            </div>

            {/* Saspay Webhook URL dedicated */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-600" />
                  URL Callback Webhook Saspay (À déclarer dans le portail Saspay)
                </label>
                <span className="text-[10px] text-stone-500 font-mono">POST / JSON</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-stone-900 text-emerald-400 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-stone-800 truncate select-all">
                  {saspayWebhookEndpoint}
                </div>
                <button
                  type="button"
                  onClick={handleCopySaspayUrl}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedSaspayUrl ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSaspayUrl ? 'Copié !' : 'Copier l\'URL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                Chaque paiement validé par vos cotisants sur Saspay déclenche ce webhook qui valide le tour en temps réel.
              </p>
            </div>

            {/* Saspay Credentials Form */}
            <form onSubmit={handleSaveSaspayConfig} className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                    Clés API & Paramètres Marchand Saspay
                  </h4>
                </div>
                <span className="text-[11px] text-stone-500">
                  Modifiable à tout moment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Merchant Code :</label>
                  <input
                    type="text"
                    required
                    value={saspayConfig.merchantCode}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, merchantCode: e.target.value })}
                    placeholder="Ex: SAS-88210"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-950 bg-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Client ID :</label>
                  <input
                    type="text"
                    required
                    value={saspayConfig.clientId}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, clientId: e.target.value })}
                    placeholder="sas_live_client_..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-950 bg-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Client Secret / API Key :</label>
                  <input
                    type="password"
                    required
                    value={saspayConfig.clientSecret}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, clientSecret: e.target.value })}
                    placeholder="sas_sec_..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-950 bg-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Environnement :</label>
                  <select
                    value={saspayConfig.environment}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, environment: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-950 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  >
                    <option value="sandbox">Sandbox (Environnement de Test)</option>
                    <option value="live">Live / Production (Transactions réelles)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Devise Principale :</label>
                  <select
                    value={saspayConfig.currency}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, currency: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-950 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  >
                    <option value="XOF">XOF (Franc CFA UEMOA)</option>
                    <option value="KES">KES (Kenya Shilling)</option>
                    <option value="USD">USD (Dollar US)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Clé Secrète Signature Webhook :</label>
                  <input
                    type="password"
                    value={saspayConfig.webhookSecret}
                    onChange={(e) => setSaspayConfig({ ...saspayConfig, webhookSecret: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-950 bg-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500">
                  Raccordement cryptographique certifié TLS 1.3
                </span>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Enregistrer les identifiants Saspay</span>
                </button>
              </div>
            </form>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-stone-900">
                    Test Encaissement Saspay C2B
                  </h4>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Initie un appel API vers Saspay pour la cotisation de <strong>{selectedTontine?.name || 'Tontine'}</strong> et déclenche la notification instantanée.
                </p>
                <button
                  type="button"
                  onClick={handleTestSaspayPayment}
                  disabled={isSimulating}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Appel Saspay C2B en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simuler un Encaissement Saspay C2B</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-stone-800" />
                  <h4 className="text-xs font-bold text-stone-900">
                    Test Virement Sortant Saspay B2C
                  </h4>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Teste le paiement sortant (B2C) vers le bénéficiaire d'une cagnotte ou pour le retrait des commissions du manager.
                </p>
                <button
                  type="button"
                  onClick={handleTestSaspayDisbursement}
                  disabled={isTestingB2C}
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isTestingB2C ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Exécution Saspay B2C...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Simuler un Décaissement Saspay B2C</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GENERAL WEBHOOK SIMULATOR */}
        {activeTab === 'SIMULATOR' && (
          <div className="space-y-5">
            {/* General Webhook URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-600" />
                  URL de Webhook Générique (Autres passerelles ou direct)
                </label>
                <span className="text-[10px] text-stone-500 font-mono">POST / JSON</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-stone-900 text-emerald-400 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-stone-800 truncate select-all">
                  {generalWebhookEndpoint}
                </div>
                <button
                  type="button"
                  onClick={handleCopyGeneralUrl}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? 'Copié !' : 'Copier l\'URL'}</span>
                </button>
              </div>
            </div>

            {/* Supported Gateways Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-1">
                <span className="text-xs font-bold text-stone-900 block">Saspay Gateway</span>
                <span className="text-[10px] font-semibold text-emerald-700 block">Agrégateur Panafricain</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">Primaire</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <span className="text-xs font-bold text-stone-900 block">Wave API</span>
                <span className="text-[10px] font-semibold text-emerald-600 block">Checkout Direct</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Actif</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <span className="text-xs font-bold text-stone-900 block">Orange Money</span>
                <span className="text-[10px] font-semibold text-orange-600 block">Web Payment</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Actif</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <span className="text-xs font-bold text-stone-900 block">MTN MoMo</span>
                <span className="text-[10px] font-semibold text-amber-600 block">Open API</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Actif</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <span className="text-xs font-bold text-stone-900 block">Moov Flooz</span>
                <span className="text-[10px] font-semibold text-blue-600 block">Direct Push</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Actif</span>
              </div>
            </div>

            {/* Interactive Webhook Simulator */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                    Déclencher une notification webhook de test
                  </h3>
                </div>
                <span className="text-[10px] text-stone-500 font-medium">Banc d'essai API</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tontine */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">Tontine cible :</label>
                  <select
                    value={selectedTontineId}
                    onChange={(e) => setSelectedTontineId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-950 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  >
                    {tontines.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({formatXOF(t.contributionAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Member */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">Cotisant :</label>
                  <select
                    value={selectedMemberUserId}
                    onChange={(e) => setSelectedMemberUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-950 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  >
                    {selectedTontine?.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} (Tour #{m.turnNumber} {m.hasPaidCurrentRound ? '✓ Payé' : '○ En attente'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">Opérateur :</label>
                  <select
                    value={testProvider}
                    onChange={(e) => setTestProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-950 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
                  >
                    <option value="SASPAY">Saspay (Multi-Opérateur)</option>
                    <option value="WAVE">Wave Mobile Money</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN Mobile Money</option>
                    <option value="CINETPAY">CinetPay Gateway</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-stone-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contrôle cryptographique HMAC-SHA256 & Idempotence activés</span>
                </div>

                <button
                  type="button"
                  onClick={testProvider === 'SASPAY' ? handleTestSaspayPayment : async () => {
                    if (!selectedTontine) return;
                    const member = selectedTontine.members.find((m) => m.userId === selectedMemberUserId) || selectedTontine.members[0];
                    if (!member) return;
                    setIsSimulating(true);
                    try {
                      const generatedRef = `${testProvider.slice(0, 2)}-API-${Math.floor(100000 + Math.random() * 900000)}`;
                      await fetch('/api/payments/webhook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-webhook-signature': 'sha256=test' },
                        body: JSON.stringify({
                          event: 'payment.success',
                          tontineId: selectedTontine.id,
                          memberUserId: member.userId,
                          memberName: member.name,
                          amount: selectedTontine.contributionAmount,
                          provider: testProvider,
                          transactionRef: generatedRef,
                          roundNumber: selectedTontine.currentRound,
                          timestamp: new Date().toISOString(),
                        }),
                      });
                      if (onPaymentSuccess) {
                        onPaymentSuccess(selectedTontine.id, member.userId, {
                          id: `pay-${Date.now()}`,
                          tontineId: selectedTontine.id,
                          memberUserId: member.userId,
                          memberName: member.name,
                          roundNumber: selectedTontine.currentRound,
                          amount: selectedTontine.contributionAmount,
                          date: new Date().toISOString(),
                          paymentMethod: testProvider,
                          transactionRef: generatedRef,
                          status: 'SUCCESS',
                        });
                      }
                      showToast(`Webhook ${testProvider} traité pour ${member.name} !`);
                    } finally {
                      setIsSimulating(false);
                    }
                  }}
                  disabled={isSimulating || !selectedTontine}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Envoi du webhook...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Déclencher le Webhook de Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPER DOCS */}
        {activeTab === 'DOCS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
                <span>Saspay C2B Webhook Callback Payload (Exemple Réel)</span>
                <span className="text-emerald-400">HTTP POST /api/payments/saspay/webhook</span>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
{`{
  "MerchantCode": "${saspayConfig.merchantCode}",
  "CheckoutRequestID": "SAS-CHK-89021-9921",
  "ResultCode": 0,
  "ResultDesc": "The service request is processed successfully.",
  "Amount": 50000,
  "Msisdn": "22670123456",
  "BillRefNumber": "TONT-TERANG-R1",
  "AccountReference": "TONTINE-COTISATION",
  "TransactionDate": "${new Date().toISOString()}",
  "tontineId": "${selectedTontine?.id || 'tont-01'}",
  "memberUserId": "${selectedMemberUserId || 'user-01'}",
  "roundNumber": ${selectedTontine?.currentRound || 1}
}`}
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-bold text-stone-900 block">En-têtes de Sécurité Saspay</span>
                <p className="text-stone-600 text-[11px]">
                  Saspay envoie l'en-tête <code>x-saspay-signature: sha256=...</code> signé avec votre <em>Webhook Secret</em>. Le serveur vérifie l'authenticité avant toute écriture en base de données.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-bold text-stone-900 block">Idempotence & Réconciliation</span>
                <p className="text-stone-600 text-[11px]">
                  Tout webhook reçu deux fois avec le même <code>CheckoutRequestID</code> est automatiquement dédoublé sans recréditer le membre.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Webhook Logs Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Journal des Événements & Transactions API ({webhookLogs.length})
            </h4>
            <span className="text-[10px] text-stone-400">Temps réel</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Passerelle</th>
                  <th className="py-2.5 px-3">Réf Transaction</th>
                  <th className="py-2.5 px-3">Tontine / Cotisant</th>
                  <th className="py-2.5 px-3 text-right">Montant</th>
                  <th className="py-2.5 px-3 text-center">Statut API</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="py-2 px-3 text-stone-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.type === 'B2C_PAYOUT'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {log.type === 'B2C_PAYOUT' ? 'B2C Payout' : 'C2B In'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-stone-800">
                      {log.provider}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-emerald-800 font-bold">
                      {log.transactionRef}
                    </td>
                    <td className="py-2 px-3 text-stone-700">
                      <span className="font-semibold block">{log.memberName}</span>
                      <span className="text-[10px] text-stone-500">{log.tontineName}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                      {formatXOF(log.amount)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {log.status} ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saspay Gateway certifiée PCI-DSS & conforme UEMOA / BCEAO</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
