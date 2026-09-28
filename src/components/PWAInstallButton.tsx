import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="min-h-[44px] flex items-center gap-2 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Krono PWA for offline access"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="min-h-[44px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install as Mobile PWA"
      >
        <Smartphone className="w-4 h-4 text-sky-500 shrink-0" />
        <span>{isIOS ? 'Install on iOS' : 'Install PWA'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Install Krono on Home Screen
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Krono is a standalone offline-ready Progressive Web App.
              </p>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5 text-xs space-y-2 border border-slate-200/70 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  iPhone / iPad (Safari):
                </p>
                <p>
                  1. Tap the <strong>Share</strong> button in the Safari toolbar.<br />
                  2. Scroll down and select <strong>Add to Home Screen</strong>.
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 pt-1">
                  Android / Chrome:
                </p>
                <p>
                  Tap the browser menu (⋮) or address bar badge and select <strong>Install App</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
