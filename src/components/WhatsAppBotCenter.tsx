import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  CheckCheck,
  Bell,
  Share2,
  Copy,
  ExternalLink,
  Users,
  CreditCard,
  FileText,
  Sparkles,
  Bot,
  RotateCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Layers,
  Settings,
} from 'lucide-react';
import {
  TontineRecord,
  TontineMemberParticipation,
  RegisteredUser,
  WhatsAppChatMessage,
} from '../types';
import {
  WHATSAPP_OFFICIAL_TEMPLATES,
  buildWhatsAppDirectLink,
  buildWhatsAppGroupShareLink,
  generateDueReminderMessage,
  generatePaymentReceiptMessage,
  generateBeneficiaryDisbursementAlert,
  generateWhatsAppCircleReport,
  processWhatsAppBotMessage,
} from '../utils/whatsappTemplates';
import { formatXOF, formatPercent } from '../data/plans';

interface WhatsAppBotCenterProps {
  tontines: TontineRecord[];
  currentUser: RegisteredUser | null;
  onPayContribution?: (tontineId: string, amount: number, method: string) => void;
  showToast: (msg: string) => void;
}

export function WhatsAppBotCenter({
  tontines,
  currentUser,
  onPayContribution,
  showToast,
}: WhatsAppBotCenterProps) {
  // Selected tontine
  const [selectedTontineId, setSelectedTontineId] = useState<string>(
    tontines[0]?.id || ''
  );
  const activeTontine =
    tontines.find((t) => t.id === selectedTontineId) || tontines[0];

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'bot' | 'reminders' | 'reports' | 'apiConfig'>('bot');

  // Interactive Bot Simulator State
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number>(0);
  const activeSimMember = activeTontine?.members[selectedMemberIndex] || activeTontine?.members[0];

  const [inputMessage, setInputMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<WhatsAppChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'BOT',
      text: `Bonjour *${activeSimMember?.name || 'Fatou'}* 👋\nBienvenue sur l'assistant officiel de la *"${activeTontine?.name}"*.\n\nComment puis-je vous aider aujourd'hui ?\n\n👉 *1* : Connaître mon tour et ma date de cotisation\n👉 *2* : Obtenir mon lien direct de paiement Wave / Orange Money\n👉 *3* : Voir le montant de la cagnotte et l'état du groupe\n👉 *4* : Recevoir le relevé complet du cercle certifié`,
      timestamp: '09:42',
      buttons: [
        { id: 'btn_1', title: '1. Mon Tour & Date', action: '1' },
        { id: 'btn_2', title: '2. Payer ma Cotisation', action: '2' },
        { id: 'btn_3', title: '3. Voir la Cagnotte', action: '3' },
      ],
    },
  ]);

  // Handle user sending message in Bot simulator
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeTontine) return;

    const userMsg: WhatsAppChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsBotTyping(true);

    // Simulate WhatsApp Cloud API instant response latency (350ms)
    setTimeout(() => {
      const result = processWhatsAppBotMessage(text, activeTontine, {
        id: activeSimMember?.userId || 'usr_demo',
        name: activeSimMember?.name || 'Membre',
        phone: activeSimMember?.phone || '+221 70 000 00 00',
      });

      const botReply: WhatsAppChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'BOT',
        text: result.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        paymentLink: result.paymentLink,
      };

      setChatHistory((prev) => [...prev, botReply]);
      setIsBotTyping(false);
    }, 400);
  };

  // Reset simulator
  const handleResetChat = () => {
    setChatHistory([
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'BOT',
        text: `Bonjour *${activeSimMember?.name || 'Fatou'}* 👋\nBienvenue sur l'assistant officiel de la *"${activeTontine?.name}"*.\n\n👉 *1* : Mon tour & date d'échéance\n👉 *2* : Payer via Wave / Orange Money\n👉 *3* : Montant de la cagnotte\n👉 *4* : Bilan complet du cercle`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: [
          { id: 'btn_1', title: '1. Mon Tour & Date', action: '1' },
          { id: 'btn_2', title: '2. Payer ma Cotisation', action: '2' },
          { id: 'btn_3', title: '3. Voir la Cagnotte', action: '3' },
        ],
      },
    ]);
  };

  // Copy text helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copié dans le presse-papier !`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-950 to-stone-900 text-white p-6 sm:p-8 border border-emerald-500/30 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Canal d'Acquisition & Engagement WhatsApp OS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              WhatsApp Commerce & Bot FinTech
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Transformez WhatsApp en guichet de tontine automatisé : consultation instantanée des tours, relances automatiques à J-2, encaissement direct Wave/Orange Money et diffusion des rapports de groupe.
            </p>
          </div>

          {/* Tontine Selector */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[260px] space-y-2">
            <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              Tontine Active :
            </label>
            <select
              value={selectedTontineId}
              onChange={(e) => {
                setSelectedTontineId(e.target.value);
                setSelectedMemberIndex(0);
                setTimeout(handleResetChat, 50);
              }}
              className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-emerald-500/40 text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              {tontines.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({formatXOF(t.contributionAmount)})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-[11px] text-emerald-200/90 pt-1">
              <span>Tour #{activeTontine?.currentRound} sur {activeTontine?.totalRounds}</span>
              <span className="font-bold">{activeTontine?.members.length} membres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-stone-200/80 shadow-xs">
        <button
          onClick={() => setActiveTab('bot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bot'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Simulateur Bot WhatsApp (En Direct)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Moteur de Relances & Quittances</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bilan & Relevé de Cercle</span>
        </button>

        <button
          onClick={() => setActiveTab('apiConfig')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'apiConfig'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Spécification WhatsApp Cloud API</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BOT SIMULATOR (SMARTPHONE VIEW)
          ========================================================================= */}
      {activeTab === 'bot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Scenarios (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Profil du Membre Simulé</h3>
                  <p className="text-[11px] text-stone-500">
                    Testez la réponse personnalisée selon la position et le statut du membre.
                  </p>
                </div>
                <button
                  onClick={handleResetChat}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="Réinitialiser la conversation"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Select simulated member */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Sélectionner un participant :</label>
                <select
                  value={selectedMemberIndex}
                  onChange={(e) => {
                    setSelectedMemberIndex(Number(e.target.value));
                    setTimeout(handleResetChat, 50);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {activeTontine?.members.map((m, idx) => (
                    <option key={m.id} value={idx}>
                      Tour #{m.turnNumber} • {m.name} ({m.hasPaidCurrentRound ? 'À jour' : 'En attente'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Member quick stats card */}
              {activeSimMember && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">{activeSimMember.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeSimMember.hasPaidCurrentRound
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {activeSimMember.hasPaidCurrentRound ? 'Cotisation Réglée' : 'Cotisation Due'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-800 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-stone-500 block">Téléphone :</span>
                      <span className="font-mono font-medium">{activeSimMember.phone}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Tour de passage :</span>
                      <span className="font-bold">Tour #{activeSimMember.turnNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Prompt Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700">Actions Rapides & Questions Fréquentes :</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('1')}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left text-xs font-semibold transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Taper 1</span>
                    <span className="text-stone-800 group-hover:text-emerald-950">Mon tour & ma date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('2')}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left text-xs font-semibold transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Taper 2</span>
                    <span className="text-stone-800 group-hover:text-emerald-950">Lien Wave / OM direct</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('3')}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left text-xs font-semibold transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Taper 3</span>
                    <span className="text-stone-800 group-hover:text-emerald-950">Cagnotte & Groupe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('4')}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left text-xs font-semibold transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Taper 4</span>
                    <span className="text-stone-800 group-hover:text-emerald-950">Bilan officiel certifié</span>
                  </button>
                </div>
              </div>

              {/* Natural Language Prompt Samples */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-500 uppercase block mb-1.5">
                  Ou testez en langage naturel :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Quand est mon tour ?',
                    'Je veux payer par Wave',
                    'Combien touche le bénéficiaire ?',
                    'Donne-moi le bilan du groupe',
                  ].map((phrase, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(phrase)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      "{phrase}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Smartphone Simulator (Right Column) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-stone-900 rounded-[42px] p-3 shadow-2xl border-4 border-stone-800 relative">
              {/* Phone Camera Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-stone-800 rounded-full z-20" />

              {/* Screen Container */}
              <div className="rounded-[32px] overflow-hidden bg-[#e5ddd5] flex flex-col h-[620px] relative border border-stone-700">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center font-bold text-white shadow-inner">
                      <Bot className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        <span>Tontine Assistant</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </h4>
                      <p className="text-[10px] text-emerald-200/80">
                        {isBotTyping ? 'En train d’écrire...' : 'Compte Officiel • WhatsApp Cloud API'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <button
                      onClick={handleResetChat}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Réinitialiser"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* WhatsApp Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Encryption Pill */}
                  <div className="flex justify-center">
                    <div className="bg-[#fcf8e3] text-stone-700 border border-[#faebcc] px-3 py-1 rounded-lg text-[10px] max-w-[85%] text-center shadow-2xs">
                      🔒 Les messages sont protégés par le chiffrement de bout en bout et les protocoles HMAC-SHA256.
                    </div>
                  </div>

                  {chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-xs space-y-2 ${
                          msg.sender === 'USER'
                            ? 'bg-[#dcf8c6] text-stone-900 rounded-tr-xs'
                            : 'bg-white text-stone-900 rounded-tl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed text-[11px]">
                          {msg.text}
                        </div>

                        {/* Interactive Buttons (if any) */}
                        {msg.buttons && (
                          <div className="pt-2 border-t border-stone-200/70 flex flex-col gap-1.5">
                            {msg.buttons.map((b) => (
                              <button
                                key={b.id}
                                onClick={() => handleSendMessage(b.action)}
                                className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-200 transition-colors text-center cursor-pointer"
                              >
                                {b.title}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Direct Payment Card (if provided by bot) */}
                        {msg.paymentLink && (
                          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300/80 space-y-1.5 text-center">
                            <div className="text-[10px] font-bold text-emerald-900 uppercase">
                              Lien Mobile Money Disponible
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onPayContribution && activeTontine) {
                                  onPayContribution(activeTontine.id, msg.paymentLink!.amount, 'WAVE');
                                }
                                handleSendMessage('Paiement effectué via Wave !');
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Payer {formatXOF(msg.paymentLink.amount)} via Wave</span>
                            </button>
                          </div>
                        )}

                        {/* Timestamp & double blue ticks */}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-stone-400">
                          <span>{msg.timestamp}</span>
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Bot Typing Bubble */}
                  {isBotTyping && (
                    <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl rounded-tl-xs shadow-xs w-20">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>

                {/* WhatsApp Chat Input Bar */}
                <div className="bg-[#f0f0f0] p-2.5 flex items-center gap-2 border-t border-stone-200">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="Tapez 1, 2, 3, 4 ou une question..."
                    className="flex-1 px-3.5 py-2 rounded-full bg-white border border-stone-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-stone-900"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    className="w-9 h-9 rounded-full bg-[#128c7e] hover:bg-[#075e54] text-white flex items-center justify-center shadow-md cursor-pointer transition-colors shrink-0"
                    title="Envoyer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUTOMATED REMINDERS & RECEIPT DISPATCHER
          ========================================================================= */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Centre de Relances WhatsApp • Tour #{activeTontine?.currentRound}
                </h3>
                <p className="text-xs text-stone-500">
                  Envoyez des relances personnalisées avec lien Mobile Money pré-rempli en 1 clic vers WhatsApp.
                </p>
              </div>

              {/* Group broadcast button */}
              <div className="flex items-center gap-2">
                <a
                  href={buildWhatsAppGroupShareLink(
                    `📢 *RAPPEL IMPORTANT - ${activeTontine?.name.toUpperCase()}*\n\nChers membres, le Tour #${activeTontine?.currentRound} arrive à échéance le *${activeTontine?.nextDueDate}*.\nMontant par membre : *${formatXOF(activeTontine?.contributionAmount)}*.\n\nMerci de régler sans tarder pour permettre au bénéficiaire de percevoir sa cagnotte ! 🙏`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Alerter le Groupe WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    <th className="pb-3">Membre & Tour</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Statut Paiement</th>
                    <th className="pb-3">Action Rapide WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeTontine?.members.map((member) => {
                    const reminderMsg = generateDueReminderMessage(activeTontine, member);
                    const receiptMsg = generatePaymentReceiptMessage(
                      activeTontine,
                      member,
                      `WAV-${Date.now().toString().slice(-6)}`,
                      member.paymentMethod || 'WAVE'
                    );

                    return (
                      <tr key={member.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 font-semibold text-stone-900">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-[11px] flex items-center justify-center font-mono">
                              #{member.turnNumber}
                            </span>
                            <span>{member.name}</span>
                            {member.turnNumber === activeTontine.currentRound && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                Bénéficiaire
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-stone-600">
                          {member.phone}
                        </td>
                        <td className="py-3">
                          {member.hasPaidCurrentRound ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> À jour
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {!member.hasPaidCurrentRound ? (
                              <a
                                href={buildWhatsAppDirectLink(member.phone, reminderMsg)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Relancer J-2</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            ) : (
                              <a
                                href={buildWhatsAppDirectLink(member.phone, receiptMsg)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold inline-flex items-center gap-1.5 border border-stone-200"
                              >
                                <FileText className="w-3 h-3 text-emerald-600" />
                                <span>Envoyer Reçu</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            )}

                            <button
                              onClick={() =>
                                handleCopy(
                                  !member.hasPaidCurrentRound ? reminderMsg : receiptMsg,
                                  'Message'
                                )
                              }
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Copier le texte"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Templates Showcase */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              Modèles de Messages Approuvés (WhatsApp Business Cloud API)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WHATSAPP_OFFICIAL_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{tmpl.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">{tmpl.description}</p>
                  <div className="p-3 rounded-xl bg-white border border-stone-200 font-mono text-[10px] text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {tmpl.sampleBody}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: REPORTS & CIRCLE STATEMENT FOR WHATSAPP
          ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Relevé Financier Officiel du Cercle</h3>
                <p className="text-xs text-stone-500">
                  Généré automatiquement avec récapitulatif des tours et certification SHA-256.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopy(generateWhatsAppCircleReport(activeTontine), 'Relevé officiel')
                  }
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </button>
                <a
                  href={buildWhatsAppGroupShareLink(generateWhatsAppCircleReport(activeTontine))}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Diffuser sur WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Formatted Report Preview */}
            <div className="p-4 rounded-2xl bg-stone-900 text-emerald-300 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner max-h-[460px] overflow-y-auto">
              {generateWhatsAppCircleReport(activeTontine)}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Beneficiary Pot Alert Generator */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Alerte Cagnotte Décaissée</h3>
              <p className="text-xs text-stone-500">
                Message solennel félicitant le bénéficiaire avec le détail transparent de la commission gestionnaire.
              </p>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                <span className="font-bold text-emerald-950 block">Aperçu pour le groupe :</span>
                <div className="text-[11px] text-emerald-900 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded-xl border border-emerald-200">
                  {generateBeneficiaryDisbursementAlert(
                    activeTontine,
                    activeTontine.members.find((m) => m.turnNumber === activeTontine.currentRound)?.name || 'Bénéficiaire',
                    activeTontine.contributionAmount * activeTontine.members.length * (1 - activeTontine.commissionRate),
                    activeTontine.contributionAmount * activeTontine.members.length * activeTontine.commissionRate
                  )}
                </div>
              </div>

              <a
                href={buildWhatsAppGroupShareLink(
                  generateBeneficiaryDisbursementAlert(
                    activeTontine,
                    activeTontine.members.find((m) => m.turnNumber === activeTontine.currentRound)?.name || 'Bénéficiaire',
                    activeTontine.contributionAmount * activeTontine.members.length * (1 - activeTontine.commissionRate),
                    activeTontine.contributionAmount * activeTontine.members.length * activeTontine.commissionRate
                  )
                )}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Envoyer dans le Groupe WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: WHATSAPP CLOUD API CONFIGURATION & WEBHOOK SPEC
          ========================================================================= */}
      {activeTab === 'apiConfig' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Architecture Backend WhatsApp Cloud API & Webhooks
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pour connecter un numéro WhatsApp Business officiel (Meta for Developers), l'infrastructure SaaS écoute les événements sur le point d'entrée `/api/whatsapp/webhook`.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase">1. Webhook URL</span>
                <span className="font-mono text-xs font-bold text-stone-800 block truncate">
                  https://api.tontine.africa/webhook
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block">Status : Prêt (200 OK)</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase">2. Verify Token</span>
                <span className="font-mono text-xs font-bold text-stone-800 block truncate">
                  tontine_saas_sec_token_9821
                </span>
                <span className="text-[10px] text-stone-500 block">Jeton pour hub.challenge</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase">3. Chiffrement Payload</span>
                <span className="font-mono text-xs font-bold text-stone-800 block">
                  X-Hub-Signature-256
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block">Vérification HMAC Active</span>
              </div>
            </div>

            {/* Code Snippet for Server Webhook Route */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-stone-800 block">
                Extrait d'Implémentation Serveur (Node.js / Express Webhook Handler) :
              </span>
              <pre className="p-4 rounded-2xl bg-stone-900 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Route de vérification Meta Webhook (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Traitement des messages entrants WhatsApp (POST)
app.post('/api/whatsapp/webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  const senderPhone = message.from;
  const userText = message.text?.body || '';

  // 1. Recherche du membre et de sa tontine active
  const member = await prisma.member.findFirst({ where: { user: { phone: senderPhone } } });
  
  // 2. Traitement conversationnel
  const botReply = processWhatsAppBotMessage(userText, member.tontine, member.user);

  // 3. Envoi de la réponse via WhatsApp Cloud API
  await sendWhatsAppMessage(senderPhone, botReply.replyText);
  return res.sendStatus(200);
});`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
