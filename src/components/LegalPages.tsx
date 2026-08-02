import React from 'react';
import { ShieldCheck, Mail, ServerOff, ArrowLeft } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

interface LegalPagesProps {
  pageType: 'privacy' | 'terms' | 'about';
  onNavigateHome: () => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ pageType, onNavigateHome }) => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-cyan-400 mb-6 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>{t.homeBreadcrumb}</span>
      </button>

      {/* PRIVACY PAGE */}
      {pageType === 'privacy' && (
        <article className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
          <div className="border-b border-slate-800 pb-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t.privacyPolicy}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              {t.privacyPrinciple}
            </p>
          </div>

          <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec1Title}</h2>
              <p>{t.legalPrivacyContent1}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec2Title}</h2>
              <p>{t.legalPrivacyContent2}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec3Title}</h2>
              <p>{t.legalPrivacyContent3}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec4Title}</h2>
              <p>{t.legalPrivacyContent4}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec5Title}</h2>
              <p>{t.legalPrivacyContent5}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec6Title}</h2>
              <p>{t.legalPrivacyContent6}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t.privacySec7Title}</h2>
              <p>{t.legalPrivacyContent7}</p>
            </section>
          </div>
        </article>
      )}

      {/* TERMS PAGE */}
      {pageType === 'terms' && (
        <article className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
          <div className="border-b border-slate-800 pb-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t.termsOfService}
            </h1>
          </div>

          <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec1Title}</h2>
              <p>{t.legalTermsContent1}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec2Title}</h2>
              <p>{t.legalTermsContent2}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec3Title}</h2>
              <p>{t.legalTermsContent3}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec4Title}</h2>
              <p>{t.legalTermsContent4}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec5Title}</h2>
              <p>{t.legalTermsContent5}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec6Title}</h2>
              <p>{t.legalTermsContent6}</p>
            </section>

            <section className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <h2 className="text-lg font-bold text-white">{t.termsSec7Title}</h2>
              <p>{t.legalTermsContent7}</p>
            </section>
          </div>
        </article>
      )}

      {/* ABOUT & CONTACTS PAGE */}
      {pageType === 'about' && (
        <article className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
          <div className="border-b border-slate-800 pb-6 space-y-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t.aboutPageHeading}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {t.aboutPageDesc}
            </p>
          </div>

          {/* Goal section */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <h2 className="text-lg font-bold text-white">{t.aboutGoalTitle}</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{t.aboutGoalDesc}</p>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">{t.aboutAdv1Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.aboutAdv1Desc}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <ServerOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">{t.aboutAdv2Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.aboutAdv2Desc}
              </p>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-800/50 to-purple-900/30 border border-slate-700/60 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-400 font-bold text-lg">
              <Mail className="w-6 h-6 shrink-0" />
              <h2>{t.contactHeading}</h2>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {t.contactDesc}
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-sm sm:text-base font-bold shadow-md">
              <span className="text-slate-400 font-sans font-normal text-xs">{t.contactEmailLabel}</span>
              <a
                href="mailto:info@allconvert.ru"
                className="hover:underline hover:text-cyan-200 transition-colors"
              >
                info@allconvert.ru
              </a>
            </div>
          </div>
        </article>
      )}
    </div>
  );
};
