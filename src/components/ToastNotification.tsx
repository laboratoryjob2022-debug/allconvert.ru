import React, { useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { Info, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toastMessage, toastType, clearToast } = useConverterStore();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
      <div className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-slate-100 shadow-2xl backdrop-blur-xl">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 text-xs sm:text-sm font-medium pr-2">
          {toastMessage}
        </div>
        <button
          onClick={clearToast}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
