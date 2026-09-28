import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Local storage active; changes sync automatically when back online.</span>
    </div>
  );
};
