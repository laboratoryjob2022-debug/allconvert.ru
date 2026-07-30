import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { useConverterStore } from '../store/useConverterStore';
import { ShieldCheck, FileText, Lock, X, Check } from 'lucide-react';

export const FooterAdZone: React.FC = () => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="mt-auto py-6 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        {/* Privacy badge / status */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-medium">{t.privacy100}</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-slate-400">{t.zeroServerUploads}</span>
        </div>

        {/* Legal links required for SEO & Yandex / Advertising moderation */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveModal('privacy')}
            className="hover:text-cyan-400 transition-colors flex items-center space-x-1.5 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400/80" />
            <span>{t.privacyPolicy}</span>
          </button>
          <button
            onClick={() => setActiveModal('terms')}
            className="hover:text-cyan-400 transition-colors flex items-center space-x-1.5 font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400/80" />
            <span>{t.termsOfService}</span>
          </button>
        </div>
      </div>

      {/* Legal Content Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2.5">
                {activeModal === 'privacy' ? (
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                ) : (
                  <FileText className="w-5 h-5 text-cyan-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {activeModal === 'privacy' ? t.privacyPolicy : t.termsOfService}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              {activeModal === 'privacy' ? (
                <>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalPrivacyContent1}</p>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalPrivacyContent2}</p>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalPrivacyContent3}</p>
                </>
              ) : (
                <>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalTermsContent1}</p>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalTermsContent2}</p>
                  <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">{t.legalTermsContent3}</p>
                </>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <Check className="w-4 h-4" />
                <span>{t.understoodBtn || 'ОК'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
