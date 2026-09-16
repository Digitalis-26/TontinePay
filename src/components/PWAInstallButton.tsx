import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, ChevronDown } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { InstallAppModal } from './InstallAppModal.tsx';

export const PWAInstallButton: React.FC = () => {
  const { isInstalled, isIOS } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>(
    isIOS ? 'ios' : 'android'
  );
  const [showDropdown, setShowDropdown] = useState(false);

  // If already running directly inside standalone installed PWA
  if (isInstalled) {
    return (
      <div
        id="pwa-installed-badge"
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-300 text-xs border border-emerald-500/30"
        title="Application installée sur votre appareil"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">App installée</span>
      </div>
    );
  }

  const openForPlatform = (platform: 'android' | 'ios') => {
    setSelectedPlatform(platform);
    setShowDropdown(false);
    setModalOpen(true);
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        {/* Main Combined Button with Dropdown or direct modal */}
        <div className="inline-flex rounded-lg shadow-sm border border-emerald-500/40 bg-emerald-600 overflow-hidden">
          <button
            id="pwa-install-header-button"
            type="button"
            onClick={() => {
              setSelectedPlatform(isIOS ? 'ios' : 'android');
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            title="Installer la version mobile (Android ou iPhone iOS)"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Installer l'app mobile</span>
            <span className="sm:hidden">Installer</span>
          </button>

          <button
            type="button"
            id="pwa-install-platform-dropdown-toggle"
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-1.5 py-1.5 border-l border-emerald-500/50 hover:bg-emerald-500 active:bg-emerald-700 text-emerald-100 transition-colors"
            title="Choisir la version Android ou iOS"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Dropdown Menu for Explicit Android or iOS Selection */}
        {showDropdown && (
          <div
            id="pwa-platform-dropdown-menu"
            className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-stone-200 py-1.5 z-50 text-stone-800 animate-in fade-in zoom-in-95 duration-150"
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Choisir votre système
            </div>

            <button
              type="button"
              id="dropdown-opt-android"
              onClick={() => openForPlatform('android')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-emerald-50 hover:text-emerald-900 transition-colors text-left"
            >
              <svg className="w-4 h-4 fill-current text-emerald-600 shrink-0" viewBox="0 0 24 24">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1557-.2696.0633-.6135-.2063-.7692-.2691-.1557-.613-.0633-.7687.2063l-2.0231 3.5042c-1.4646-.6675-3.097-1.0423-4.8794-1.0423s-3.4148.3748-4.8794 1.0423l-2.0231-3.5042c-.1557-.2696-.4996-.362-7687-.2063-.2696.1557-.362.4996-.2063.7692l1.996 3.4572c-3.1979 1.7454-5.3853 4.966-5.7196 8.7845h22.7935c-.3343-3.8185-2.5217-7.0391-5.7196-8.7845" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold block">Version Android</span>
                <span className="text-[10px] text-stone-500">Samsung, Xiaomi, etc.</span>
              </div>
            </button>

            <button
              type="button"
              id="dropdown-opt-ios"
              onClick={() => openForPlatform('ios')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors text-left"
            >
              <svg className="w-4 h-4 fill-current text-stone-800 shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71.99.08 2-.45 2.59-1.2" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold block">Version iOS</span>
                <span className="text-[10px] text-stone-500">iPhone & iPad</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Comprehensive Modal for Android & iOS */}
      <InstallAppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultPlatform={selectedPlatform}
      />
    </>
  );
};

