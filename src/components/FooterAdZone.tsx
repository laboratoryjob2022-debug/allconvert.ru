import React, { useState } from 'react';
import { ShieldCheck, FileText, X } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

export const FooterAdZone: React.FC = () => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');

  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="w-full bg-slate-900/40 border-t border-slate-800/80 text-slate-400 text-xs py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand info */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="AllConvert" className="w-7 h-7 shrink-0" />
            <span className="font-extrabold text-slate-100 text-base tracking-tight">
              All<span className="text-cyan-400">Convert</span>
            </span>
          </div>
          <span className="hidden md:inline text-slate-700">|</span>
          <p className="text-slate-400 text-xs max-w-md">
            {t.footerDesc}
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
          <button
            onClick={() => setActiveModal('privacy')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.privacyPolicy}</span>
          </button>
          <button
            onClick={() => setActiveModal('terms')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>{t.termsOfService}</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="text-slate-500 text-xs text-center md:text-right">
          © {new Date().getFullYear()} AllConvert.ru. {t.footerCopyright}
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center space-x-3">
                {activeModal === 'privacy' && <ShieldCheck className="w-6 h-6 text-emerald-400" />}
                {activeModal === 'terms' && <FileText className="w-6 h-6 text-purple-400" />}
                <h3 className="text-lg font-bold text-slate-100">
                  {activeModal === 'privacy' && t.privacyPolicy}
                  {activeModal === 'terms' && t.termsOfService}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300 text-xs md:text-sm leading-relaxed">
              {activeModal === 'privacy' && (
                <div className="space-y-4">
                  <p className="font-semibold text-emerald-400">
                    {t.privacyPrinciple}
                  </p>
                  
                  <h4 className="font-bold text-slate-100 text-base pt-2">{t.privacySec1Title}</h4>
                  <p>{t.privacySec1Text}</p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">{t.privacySec2Title}</h4>
                  <p>{t.privacySec2Text}</p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">{t.privacySec3Title}</h4>
                  <p>{t.privacySec3Text}</p>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-100 text-base">{t.termsSec1Title}</h4>
                  <p>{t.termsSec1Text}</p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">{t.termsSec2Title}</h4>
                  <p>{t.termsSec2Text}</p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">{t.termsSec3Title}</h4>
                  <p>{t.termsSec3Text}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
