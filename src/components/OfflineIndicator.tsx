import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl ring-1 ring-amber-400/40 animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-amber-100 shrink-0" />
      <div className="flex flex-col">
        <span>Mode Hors-Ligne activé</span>
        <span className="text-[10px] font-normal text-amber-100">
          Les consultations restent accessibles depuis le cache de votre smartphone.
        </span>
      </div>
    </div>
  );
};
