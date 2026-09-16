import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  PlusSquare,
  Sparkles,
  WifiOff,
  Zap,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlatform?: 'android' | 'ios';
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  defaultPlatform,
}) => {
  const { isInstallable, install, isIOS } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(
    defaultPlatform || (isIOS ? 'ios' : 'android')
  );
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  // Compute the current web app URL for the QR code and sharing
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tontine.africa';
  const whatsappShareText = encodeURIComponent(
    `Installe l'application TONTINE sur ton smartphone pour suivre tes cotisations et cagnottes : ${appUrl}`
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${whatsappShareText}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      id="install-app-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="install-app-modal-card"
        className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden text-stone-900 border border-stone-200 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Branding */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shrink-0">
          <button
            type="button"
            id="close-install-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-1 border border-white/20 shadow-inner flex items-center justify-center">
              <img
                src="/pwa-192x192.png"
                alt="Logo Tontine"
                className="w-10 h-10 rounded-xl object-contain shadow-sm"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-700/80 text-[10px] font-semibold tracking-wide uppercase text-emerald-200 border border-emerald-500/40 mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Application Smartphone
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Installer TONTINE sur Mobile
              </h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Accédez à vos cagnottes en plein écran, recevez des rappels et consultez vos soldes hors-ligne.
              </p>
            </div>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="mt-5 grid grid-cols-2 p-1 rounded-xl bg-black/25 border border-white/10">
            <button
              type="button"
              id="tab-select-android"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-950 shadow-md scale-[1.01]'
                  : 'text-emerald-100/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4 fill-current text-emerald-600" viewBox="0 0 24 24">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1557-.2696.0633-.6135-.2063-.7692-.2691-.1557-.613-.0633-.7687.2063l-2.0231 3.5042c-1.4646-.6675-3.097-1.0423-4.8794-1.0423s-3.4148.3748-4.8794 1.0423l-2.0231-3.5042c-.1557-.2696-.4996-.362-7687-.2063-.2696.1557-.362.4996-.2063.7692l1.996 3.4572c-3.1979 1.7454-5.3853 4.966-5.7196 8.7845h22.7935c-.3343-3.8185-2.5217-7.0391-5.7196-8.7845" />
              </svg>
              <span>Version Android</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                APK / PWA
              </span>
            </button>

            <button
              type="button"
              id="tab-select-ios"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-stone-900 shadow-md scale-[1.01]'
                  : 'text-emerald-100/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4 fill-current text-stone-800" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71.99.08 2-.45 2.59-1.2" />
              </svg>
              <span>Version iOS (iPhone)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded font-semibold">
                Apple PWA
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* QR Code & Share Section (Best for Desktop-to-Mobile) */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
            {/* Real Scannable QR Code */}
            <div className="shrink-0 p-3 bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center">
              <QRCodeSVG
                value={appUrl}
                size={140}
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: '/pwa-192x192.png',
                  x: undefined,
                  y: undefined,
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
              <span className="text-[10px] font-bold text-stone-500 mt-2 uppercase tracking-wider">
                Scanner avec l'appareil photo
              </span>
            </div>

            {/* Explanatory and Direct Sharing Buttons */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  {activeTab === 'android'
                    ? 'Ouvrez sur votre smartphone Android'
                    : 'Ouvrez sur votre iPhone ou iPad'}
                </h4>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Pointez l'appareil photo de votre téléphone vers ce QR code pour ouvrir
                  l'application instantanément sur votre mobile.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Envoyer sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-300 shadow-2xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Lien copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500" />
                      <span>Copier le lien</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Android Tab Content */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {/* If browser supports native install prompt right now */}
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Votre navigateur est compatible !
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Cliquez ci-contre pour lancer l'installation immédiate sur cet appareil.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={installing}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
                  >
                    {installing ? 'Installation en cours...' : "Installer l'appli Android"}
                  </button>
                </div>
              )}

              {/* Step-by-step Guide for Android */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Guide d'installation pas-à-pas (Chrome / Brave / Samsung Internet) :
                </h4>
                <div className="grid gap-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900">
                        Ouvrez le lien sur votre smartphone
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Scannez le QR code ci-dessus ou ouvrez le lien dans le navigateur <strong>Google Chrome</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900">
                        Accédez au menu du navigateur
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Appuyez sur les <strong>trois petits points verticaux (⋮)</strong> situés en haut à droite de Chrome.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900">
                        Sélectionnez « Installer l'application »
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Appuyez sur <strong>« Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »). L'icône TONTINE s'installe directement avec vos autres applications.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS (iPhone / iPad) Tab Content */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Installation sur iPhone & iPad (navigateur Safari d'Apple) :
                </h4>
                <div className="grid gap-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900">
                        Ouvrez la page dans Safari
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Scannez le QR code avec l'appareil photo de l'iPhone, ou copiez l'adresse dans <strong>Safari</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span>Appuyez sur le bouton Partager</span>
                        <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Appuyez sur l'icône de partage (le carré avec une flèche vers le haut) située en bas au centre de votre écran.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                    <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span>Sélectionnez « Sur l'écran d'accueil »</span>
                        <PlusSquare className="w-3.5 h-3.5 text-stone-700 inline" />
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Faites défiler le menu vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong>, puis validez en appuyant sur <strong>« Ajouter »</strong> en haut à droite.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/60">
            <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5">
              Pourquoi installer l'application mobile ?
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <WifiOff className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px]">Accessible sans connexion (Mode Hors-Ligne)</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px]">Ouverture rapide & plein écran natif</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px]">Rappels de tours et suivi des cagnottes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-stone-500 text-[11px]">
            Compatible Android 8+ et iOS 14+ • Aucun téléchargement lourd requis
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
