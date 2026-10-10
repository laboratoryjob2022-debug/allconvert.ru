import React, { useState } from 'react';
import { SeoConversionRoute, getLocalizedSeoRoute } from '../lib/seoPages';
import { getDetailedConversionDossier } from '../lib/formatDossier';
import {
  FileCode,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

interface SeoConversionPageProps {
  seoData: SeoConversionRoute;
  onNavigateRoute: (slug: string) => void;
}

export const SeoConversionPage: React.FC<SeoConversionPageProps> = ({ seoData }) => {
  const language = useConverterStore((state) => state.language);
  const t = getTranslation(language);
  const localizedSeo = getLocalizedSeoRoute(seoData, language);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeProfileTab, setActiveProfileTab] = useState<'source' | 'target'>('source');

  const dossier = getDetailedConversionDossier(
    localizedSeo.fromFormat,
    localizedSeo.toFormat,
    localizedSeo.category,
    language || 'ru'
  );

  // Combine customized SEO faqs with detailed dossier FAQs without duplicates
  const allFaqs = React.useMemo(() => {
    const list = [...dossier.faqs];
    if (localizedSeo.faqs && localizedSeo.faqs.length > 0) {
      localizedSeo.faqs.forEach((customFaq) => {
        if (!list.some((item) => item.q.toLowerCase() === customFaq.q.toLowerCase())) {
          list.push(customFaq);
        }
      });
    }
    return list;
  }, [dossier.faqs, localizedSeo.faqs]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://allconvert.ru';

  const breadcrumbLdJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t.homeBreadcrumb || 'Главная',
        item: `${origin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t.toDirection(localizedSeo.fromFormat, localizedSeo.toFormat),
        item: `${origin}/convert/${localizedSeo.slug}/`,
      },
    ],
  };

  const faqLdJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  // Localized section headers
  const getUiLabels = () => {
    switch (language) {
      case 'en':
        return {
          aboutTitle: `In-depth format analysis: ${localizedSeo.fromFormat} & ${localizedSeo.toFormat}`,
          sourceTab: `Source: ${localizedSeo.fromFormat}`,
          targetTab: `Target: ${localizedSeo.toFormat}`,
          sec1Title: '1. What is this format (Definition & History)',
          sec2Title: '2. Areas of Application',
          sec3Title: '3. Technical Specifications',
          sec4Title: '4. Advantages and Limitations',
          developerLabel: 'Developer / Organization',
          yearLabel: 'Release year',
          compressionLabel: 'Compression mode',
          bitDepthLabel: 'Bit depth / Color space',
          sampleRateLabel: 'Sample rate / Max resolution',
          channelsLabel: 'Channels / Transparency',
          standardLabel: 'Technical standard',
          prosLabel: 'Key Advantages',
          consLabel: 'Known Limitations',
          faqHeading: 'Frequently Asked Questions (FAQ)',
          faqSubtitle: 'Essential technical insights regarding this conversion route',
        };
      case 'zh':
        return {
          aboutTitle: `深度格式解析：${localizedSeo.fromFormat} 与 ${localizedSeo.toFormat}`,
          sourceTab: `源格式：${localizedSeo.fromFormat}`,
          targetTab: `目标格式：${localizedSeo.toFormat}`,
          sec1Title: '1. 格式定义与历史背景',
          sec2Title: '2. 实际应用领域',
          sec3Title: '3. 核心技术规格与参数',
          sec4Title: '4. 核心优势与局限性对比',
          developerLabel: '开发机构 / 标准组织',
          yearLabel: '发布年份',
          compressionLabel: '压缩编码模式',
          bitDepthLabel: '位深度 / 色彩深度',
          sampleRateLabel: '采样率 / 最高分辨率',
          channelsLabel: '通道数 / 透明通道',
          standardLabel: '国际工业技术规范',
          prosLabel: '主要优势',
          consLabel: '主要局限',
          faqHeading: '常见问题解答 (FAQ)',
          faqSubtitle: '针对该转换方向的核心技术疑问解答',
        };
      case 'es':
        return {
          aboutTitle: `Análisis exhaustivo de formato: ${localizedSeo.fromFormat} y ${localizedSeo.toFormat}`,
          sourceTab: `Origen: ${localizedSeo.fromFormat}`,
          targetTab: `Destino: ${localizedSeo.toFormat}`,
          sec1Title: '1. Definición del formato y contexto histórico',
          sec2Title: '2. Áreas de aplicación práctica',
          sec3Title: '3. Especificaciones técnicas y parámetros',
          sec4Title: '4. Ventajas y limitaciones principales',
          developerLabel: 'Desarrollador / Organización',
          yearLabel: 'Año de lanzamiento',
          compressionLabel: 'Tipo de compresión',
          bitDepthLabel: 'Profundidad de bits / Color',
          sampleRateLabel: 'Frecuencia / Resolución máxima',
          channelsLabel: 'Canales / Transparencia',
          standardLabel: 'Estándar técnico',
          prosLabel: 'Principales Ventajas',
          consLabel: 'Limitaciones Conocidas',
          faqHeading: 'Preguntas Frecuentes (FAQ)',
          faqSubtitle: 'Respuestas técnicas clave sobre esta conversión',
        };
      case 'de':
        return {
          aboutTitle: `Ausführliche Formatanalyse: ${localizedSeo.fromFormat} & ${localizedSeo.toFormat}`,
          sourceTab: `Ausgangsformat: ${localizedSeo.fromFormat}`,
          targetTab: `Zielformat: ${localizedSeo.toFormat}`,
          sec1Title: '1. Formatdefinition und geschichtlicher Hintergrund',
          sec2Title: '2. Praktische Einsatzbereiche',
          sec3Title: '3. Technische Spezifikationen und Parameter',
          sec4Title: '4. Vor- und Nachteile im Vergleich',
          developerLabel: 'Entwickler / Gremium',
          yearLabel: 'Erscheinungsjahr',
          compressionLabel: 'Kompressionsverfahren',
          bitDepthLabel: 'Bittiefe / Farbraum',
          sampleRateLabel: 'Abtastrate / Maximale Auflösung',
          channelsLabel: 'Kanäle / Alphakanal',
          standardLabel: 'Technischer Industriestandard',
          prosLabel: 'Wesentliche Vorteile',
          consLabel: 'Bekannte Einschränkungen',
          faqHeading: 'Häufig gestellte Fragen (FAQ)',
          faqSubtitle: 'Wichtige technische Antworten zu dieser Konvertierungsrichtung',
        };
      default:
        return {
          aboutTitle: `Подробное описание форматов: ${localizedSeo.fromFormat} и ${localizedSeo.toFormat}`,
          sourceTab: `Исходный: ${localizedSeo.fromFormat}`,
          targetTab: `Конечный: ${localizedSeo.toFormat}`,
          sec1Title: '1. Что это за формат (Определение и история)',
          sec2Title: '2. Область практического применения',
          sec3Title: '3. Технические особенности и параметры',
          sec4Title: '4. Преимущества и недостатки формата',
          developerLabel: 'Разработчик / Организация',
          yearLabel: 'Год создания',
          compressionLabel: 'Алгоритм сжатия',
          bitDepthLabel: 'Битность / Цветовой охват',
          sampleRateLabel: 'Частота / Макс. разрешение',
          channelsLabel: 'Канальность / Прозрачность',
          standardLabel: 'Отраслевой стандарт',
          prosLabel: 'Ключевые преимущества',
          consLabel: 'Характерные недостатки',
          faqHeading: 'Часто задаваемые вопросы (FAQ)',
          faqSubtitle: 'Развернутые ответы экспертов по данному направлению конвертации',
        };
    }
  };

  const ui = getUiLabels();
  const currentProfile = activeProfileTab === 'source' ? dossier.fromProfile : dossier.toProfile;

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Schema.org BreadcrumbList Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLdJson) }}
      />
      {/* Schema.org FAQPage Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLdJson) }}
      />

      {/* ----------------------------------------------------
          1. HOW TO CONVERT (STEP-BY-STEP INSTRUCTIONS)
      ----------------------------------------------------- */}
      <div className="mb-10">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white text-center mb-6 tracking-tight">
          {t.howToConvertStepsTitle(localizedSeo.fromFormat, localizedSeo.toFormat)}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {localizedSeo.steps.map((step) => (
            <div
              key={step.step}
              className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col items-start hover:border-blue-400 dark:hover:border-blue-500/50 transition-all"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm sm:text-base mb-3.5 shadow-xs">
                {step.step}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 text-sm sm:text-base tracking-tight">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------
          2. BLOCK «ABOUT FORMAT» (1000–1500+ CHARS EXPERT CONTENT)
      ----------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-8 mb-12 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50 uppercase tracking-wider">
              <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{ui.aboutTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.aboutFormatTitle(localizedSeo.fromFormat, localizedSeo.toFormat)}
            </h2>
          </div>

          {/* Toggle between Source and Target Profiles */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveProfileTab('source')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeProfileTab === 'source'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {ui.sourceTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveProfileTab('target')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeProfileTab === 'target'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {ui.targetTab}
            </button>
          </div>
        </div>

        {/* Section 1: Definition and Background */}
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {ui.sec1Title}: <span className="text-blue-600 dark:text-blue-400">{currentProfile.fullName} ({currentProfile.name})</span>
          </h3>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
            {currentProfile.definition}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{ui.developerLabel}:</strong> {currentProfile.developer}
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{ui.yearLabel}:</strong> {currentProfile.year}
            </span>
          </div>
        </div>

        {/* Section 2: Application Areas */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            {ui.sec2Title}
          </h3>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
            {currentProfile.applications}
          </p>
        </div>

        {/* Section 3: Technical Specifications (Responsive Table with Overflow-x) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {ui.sec3Title}
          </h3>
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="bg-slate-50/70 dark:bg-slate-800/50">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 w-1/3">
                    {ui.compressionLabel}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                    {currentProfile.technicalSpecs.compression}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                    {ui.bitDepthLabel}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                    {currentProfile.technicalSpecs.bitDepthOrColor}
                  </td>
                </tr>
                <tr className="bg-slate-50/70 dark:bg-slate-800/50">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                    {ui.sampleRateLabel}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                    {currentProfile.technicalSpecs.sampleRateOrResolution}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                    {ui.channelsLabel}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                    {currentProfile.technicalSpecs.channelsOrAlpha}
                  </td>
                </tr>
                <tr className="bg-slate-50/70 dark:bg-slate-800/50">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                    {ui.standardLabel}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                    {currentProfile.technicalSpecs.standards}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Pros & Cons Lists */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {ui.sec4Title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{ui.prosLabel}</span>
              </h4>
              <ul className="space-y-2">
                {currentProfile.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 space-y-3">
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{ui.consLabel}</span>
              </h4>
              <ul className="space-y-2">
                {currentProfile.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. INTERACTIVE ACCORDION FAQ (4-5 EXPANDED QUESTIONS)
      ----------------------------------------------------- */}
      <div className="mb-12 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xs">
        <div className="mb-6 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{ui.faqHeading}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.faqTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {ui.faqSubtitle}
          </p>
        </div>

        <div className="space-y-3">
          {allFaqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-blue-300 dark:border-blue-700/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-2xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full py-4 px-4 sm:px-5 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                >
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center shrink-0">
                      Q
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pl-11 sm:pl-13.5">
                    <p className="font-normal">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
