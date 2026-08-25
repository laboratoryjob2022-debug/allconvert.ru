import React from 'react';
import { SeoConversionRoute, getLocalizedSeoRoute } from '../lib/seoPages';
import { ArrowRight, CheckCircle2, FileCode, HelpCircle, ShieldCheck, Zap } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

interface SeoConversionPageProps {
  seoData: SeoConversionRoute;
  onNavigateRoute: (slug: string) => void;
}

export const SeoConversionPage: React.FC<SeoConversionPageProps> = ({ seoData, onNavigateRoute }) => {
  const language = useConverterStore((state) => state.language);
  const t = getTranslation(language);
  const localizedSeo = getLocalizedSeoRoute(seoData, language);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://allconvert.ru';

  const breadcrumbLdJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': t.homeBreadcrumb || 'Главная',
        'item': `${origin}/`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': t.toDirection(localizedSeo.fromFormat, localizedSeo.toFormat),
        'item': `${origin}/convert/${localizedSeo.slug}/`
      }
    ]
  };

  const faqLdJson = localizedSeo.faqs && localizedSeo.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': localizedSeo.faqs.map((faq) => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.a
      }
    }))
  } : null;

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Schema.org BreadcrumbList Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLdJson) }}
      />
      {/* Schema.org FAQPage Microdata */}
      {faqLdJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLdJson) }}
        />
      )}

      {/* Description Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 mb-10 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-500" />
          {t.aboutFormatTitle(localizedSeo.fromFormat, localizedSeo.toFormat)}
        </h2>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {localizedSeo.descriptionParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* How To Convert Steps */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-8">
          {t.howToConvertStepsTitle(localizedSeo.fromFormat, localizedSeo.toFormat)}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {localizedSeo.steps.map((step) => (
            <div
              key={step.step}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-start hover:border-blue-500/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg mb-4 shadow-sm shadow-blue-500/30">
                {step.step}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-base">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {localizedSeo.features.map((feat, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-start space-x-3"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                {feat.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {feat.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section with JSON-LD format */}
      {localizedSeo.faqs.length > 0 && (
        <div className="mb-12 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            {t.faqTitle}
          </h2>
          <div className="space-y-4">
            {localizedSeo.faqs.map((faq, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50"
              >
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-500 font-bold">Q:</span> {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
