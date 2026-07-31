import React from 'react';
import { SeoConversionRoute, POPULAR_SEO_ROUTES } from '../lib/seoPages';
import { ArrowRight, CheckCircle2, FileCode, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

interface SeoConversionPageProps {
  seoData: SeoConversionRoute;
  onNavigateRoute: (slug: string) => void;
}

export const SeoConversionPage: React.FC<SeoConversionPageProps> = ({ seoData, onNavigateRoute }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://allconvert.app';

  const breadcrumbLdJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Главная',
        'item': `${origin}/`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Конвертер',
        'item': `${origin}/`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': `${seoData.fromFormat} в ${seoData.toFormat}`,
        'item': `${origin}/convert/${seoData.slug}`
      }
    ]
  };

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Schema.org BreadcrumbList Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLdJson) }}
      />

      {/* SEO Title Banner */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-4 border border-blue-200/60 dark:border-blue-800/50">
          <Zap className="w-3.5 h-3.5" />
          <span>Онлайн Конвертер {seoData.fromFormat} ➔ {seoData.toFormat}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          {seoData.h1}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {seoData.subtitle}
        </p>
      </div>

      {/* Description Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 mb-10 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-500" />
          О формате {seoData.fromFormat} и конвертации в {seoData.toFormat}
        </h2>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {seoData.descriptionParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* How To Convert Steps */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-8">
          Как сконвертировать {seoData.fromFormat} в {seoData.toFormat} за 3 простых шага
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {seoData.steps.map((step) => (
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
        {seoData.features.map((feat, idx) => (
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
      {seoData.faqs.length > 0 && (
        <div className="mb-12 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            Часто задаваемые вопросы (FAQ)
          </h2>
          <div className="space-y-4">
            {seoData.faqs.map((faq, index) => (
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
