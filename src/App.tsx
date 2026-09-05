import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { SectorNav } from './components/SectorNav';
import { DropZone } from './components/DropZone';
import { BatchControls } from './components/BatchControls';
import { QueueTable } from './components/QueueTable';
import { FilePreviewModal } from './components/FilePreviewModal';
import { ShareModal } from './components/ShareModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { WebCodecsLabModal } from './experiments/WebCodecsLabModal';
import { ToastNotification } from './components/ToastNotification';
import { FooterAdZone } from './components/FooterAdZone';
import { InfoSection } from './components/InfoSection';
import { SeoConversionPage } from './components/SeoConversionPage';
import { LegalPages } from './components/LegalPages';
import { GuidePage } from './components/GuidePage';
import { useConverterStore } from './store/useConverterStore';
import { getTranslation, getLocalizedPath } from './lib/i18n';
import { getSeoPageDataBySlug, SeoConversionRoute, getLocalizedSeoRoute } from './lib/seoPages';
import { Lock, CheckCircle2 } from 'lucide-react';

export type RouteType = 'home' | 'convert' | 'privacy' | 'terms' | 'about' | 'guide';

export interface RouteState {
  type: RouteType;
  slug: string;
}

export function getLanguageFromURL(): string {
  const pathPrefixMatch = window.location.pathname.match(/^\/(ru|en|zh|es|de)(\/|$)/);
  if (pathPrefixMatch && pathPrefixMatch[1]) {
    return pathPrefixMatch[1];
  }
  const hashPrefixMatch = window.location.hash.match(/^#?\/(ru|en|zh|es|de)(\/|$)/);
  if (hashPrefixMatch && hashPrefixMatch[1]) {
    return hashPrefixMatch[1];
  }
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && ['ru', 'en', 'es', 'de', 'zh'].includes(langParam)) {
    return langParam;
  }
  // URL is the Single Source of Truth: if no prefix or param is present, default strictly to 'ru'
  return 'ru';
}

function getRouteStateFromPath(): RouteState {
  let rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
  // Strip language prefix if present (e.g. zh/convert/ -> convert/ or zh -> '')
  rawPath = rawPath.replace(/^(ru|en|zh|es|de)(\/|$)/, '');

  if (rawPath === 'privacy') return { type: 'privacy', slug: 'privacy' };
  if (rawPath === 'terms') return { type: 'terms', slug: 'terms' };
  if (rawPath === 'about' || rawPath === 'contact' || rawPath === 'contacts') return { type: 'about', slug: 'about' };
  if (rawPath === 'guide') return { type: 'guide', slug: 'guide' };

  if (rawPath.startsWith('convert/')) {
    return { type: 'convert', slug: rawPath.replace(/^convert\//, '') };
  }
  if (rawPath.includes('-to-')) {
    return { type: 'convert', slug: rawPath };
  }

  let rawHash = window.location.hash.replace(/^#+|\/+$/g, '');
  rawHash = rawHash.replace(/^(ru|en|zh|es|de)(\/|$)/, '');
  if (rawHash === 'privacy') return { type: 'privacy', slug: 'privacy' };
  if (rawHash === 'terms') return { type: 'terms', slug: 'terms' };
  if (rawHash === 'about' || rawHash === 'contact' || rawHash === 'contacts') return { type: 'about', slug: 'about' };
  if (rawHash === 'guide') return { type: 'guide', slug: 'guide' };
  if (rawHash.startsWith('convert/')) {
    return { type: 'convert', slug: rawHash.replace(/^convert\//, '') };
  }
  if (rawHash.includes('-to-')) {
    return { type: 'convert', slug: rawHash };
  }

  return { type: 'home', slug: '' };
}

export default function App() {
  const {
    queue,
    loadHistoryFromDB,
    theme,
    language,
    setLanguage,
    setPresetTargetFormat,
    setActiveSector,
    isWebCodecsLabOpen,
    setWebCodecsLabOpen,
  } = useConverterStore();
  const [routeState, setRouteState] = useState<RouteState>(() => getRouteStateFromPath());
  const [seoData, setSeoData] = useState<SeoConversionRoute | null>(null);

  // Sync language from URL path prefix on mount and whenever URL changes
  useEffect(() => {
    const targetLang = getLanguageFromURL();
    if (language !== targetLang) {
      setLanguage(targetLang);
    }
  }, [setLanguage, language]);

  useEffect(() => {
    loadHistoryFromDB();
  }, [loadHistoryFromDB]);

  // Listen to popstate for URL routing & language sync
  useEffect(() => {
    const handleLocationChange = () => {
      const state = getRouteStateFromPath();
      setRouteState(state);

      const targetLang = getLanguageFromURL();
      if (language !== targetLang) {
        setLanguage(targetLang);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [language, setLanguage]);

  const effectiveLang = language || getLanguageFromURL();
  const t = getTranslation(effectiveLang);

  // Update meta tags and converter preset target format when route or language changes
  useEffect(() => {
    document.documentElement.lang = language || 'ru';

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }

    // Determine current canonical URL path
    const rawBasePath = (routeState.type === 'convert' && routeState.slug)
      ? `/convert/${routeState.slug}/`
      : (routeState.type === 'privacy' ? '/privacy/' : (routeState.type === 'terms' ? '/terms/' : (routeState.type === 'about' ? '/about/' : (routeState.type === 'guide' ? '/guide/' : '/'))));

    const canonicalPath = (language === 'ru' || !language)
      ? (rawBasePath === '/' ? 'https://allconvert.ru/' : `https://allconvert.ru${rawBasePath}`)
      : (rawBasePath === '/' ? `https://allconvert.ru/${language}/` : `https://allconvert.ru/${language}${rawBasePath}`);

    // Set canonical link URL dynamically
    canonicalLink.setAttribute('href', canonicalPath);

    // Manage hreflang links dynamically
    const hreflangs = [
      { code: 'ru', href: rawBasePath === '/' ? 'https://allconvert.ru/' : `https://allconvert.ru${rawBasePath}` },
      { code: 'en', href: rawBasePath === '/' ? 'https://allconvert.ru/en/' : `https://allconvert.ru/en${rawBasePath}` },
      { code: 'zh', href: rawBasePath === '/' ? 'https://allconvert.ru/zh/' : `https://allconvert.ru/zh${rawBasePath}` },
      { code: 'es', href: rawBasePath === '/' ? 'https://allconvert.ru/es/' : `https://allconvert.ru/es${rawBasePath}` },
      { code: 'de', href: rawBasePath === '/' ? 'https://allconvert.ru/de/' : `https://allconvert.ru/de${rawBasePath}` },
      { code: 'x-default', href: rawBasePath === '/' ? 'https://allconvert.ru/' : `https://allconvert.ru${rawBasePath}` },
    ];

    hreflangs.forEach(({ code, href }) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', code);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    });

    if (routeState.type === 'home') {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = `${t.appName} — ${t.appSub}`;
      metaDesc.setAttribute('content', t.mainSubtitle);
      ogTitle.setAttribute('content', `${t.appName} — ${t.appSub}`);
      ogDesc.setAttribute('content', t.mainSubtitle);
      return;
    }

    if (routeState.type === 'privacy') {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = `${t.privacyPolicy} — AllConvert`;
      const desc = `${t.privacyPrinciple} ${t.privacySec1Text}`;
      metaDesc.setAttribute('content', desc);
      ogTitle.setAttribute('content', `${t.privacyPolicy} — AllConvert`);
      ogDesc.setAttribute('content', desc);
      return;
    }

    if (routeState.type === 'terms') {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = `${t.termsOfService} — AllConvert`;
      const desc = `${t.termsSec1Text} ${t.termsSec2Text}`;
      metaDesc.setAttribute('content', desc);
      ogTitle.setAttribute('content', `${t.termsOfService} — AllConvert`);
      ogDesc.setAttribute('content', desc);
      return;
    }

    if (routeState.type === 'about') {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = t.aboutPageTitle;
      metaDesc.setAttribute('content', t.aboutPageDesc);
      ogTitle.setAttribute('content', t.aboutPageTitle);
      ogDesc.setAttribute('content', t.aboutPageDesc);
      return;
    }

    if (routeState.type === 'guide') {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = `${t.guideTitle} — AllConvert`;
      const desc = `${t.guidePrivacyDesc} ${t.guideStepsTitle}`;
      metaDesc.setAttribute('content', desc);
      ogTitle.setAttribute('content', `${t.guideTitle} — AllConvert`);
      ogDesc.setAttribute('content', desc);
      return;
    }

    if (routeState.type === 'convert') {
      const rawData = getSeoPageDataBySlug(routeState.slug);
      const localizedData = getLocalizedSeoRoute(rawData, language);

      setSeoData(localizedData);
      setPresetTargetFormat(localizedData.toFormat);
      setActiveSector(localizedData.category);

      document.title = localizedData.title;
      metaDesc.setAttribute('content', localizedData.metaDescription);
      ogTitle.setAttribute('content', localizedData.title);
      ogDesc.setAttribute('content', localizedData.metaDescription);
    }
  }, [routeState, language, setPresetTargetFormat, setActiveSector, t]);

  const handleNavigateRoute = (target: string) => {
    let newPath = '/';
    if (target === 'privacy' || target === '/privacy') newPath = '/privacy';
    else if (target === 'terms' || target === '/terms') newPath = '/terms';
    else if (target === 'about' || target === '/about' || target === 'contact' || target === '/contact' || target === 'contacts' || target === '/contacts') newPath = '/about';
    else if (target === 'guide' || target === '/guide') newPath = '/guide';
    else if (target) newPath = target.startsWith('/') ? target : `/convert/${target}`;

    const localizedPath = getLocalizedPath(newPath, language);
    window.history.pushState({}, '', localizedPath);
    setRouteState(getRouteStateFromPath());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div
      data-theme={theme || 'studio-light'}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300"
    >
      {/* Main Navigation Bar */}
      <Navbar />

      {/* Top Breadcrumbs - Unified across all pages to prevent CLS */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-1 min-h-[40px] flex items-center">
        <nav className="flex items-center text-sm font-medium text-slate-400 space-x-2">
          {routeState.type === 'home' ? (
            <span className="font-semibold text-slate-100 dark:text-white bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 shadow-xs">
              {t.homeBreadcrumb}
            </span>
          ) : (
            <>
              <button
                onClick={() => handleNavigateRoute('')}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                {t.homeBreadcrumb}
              </button>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-slate-100 dark:text-white bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 shadow-xs">
                {seoData && t.toDirection(seoData.fromFormat, seoData.toFormat)}
                {routeState.type === 'privacy' && t.privacyPolicy}
                {routeState.type === 'terms' && t.termsOfService}
                {routeState.type === 'about' && t.aboutUsAndContacts}
                {routeState.type === 'guide' && t.guideTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 pb-16">
        {routeState.type === 'guide' ? (
          <GuidePage onNavigateHome={() => handleNavigateRoute('')} />
        ) : routeState.type === 'privacy' || routeState.type === 'terms' || routeState.type === 'about' ? (
          <LegalPages
            pageType={routeState.type}
            onNavigateHome={() => handleNavigateRoute('')}
          />
        ) : (
          <>
            {/* Sector Navigation Tabs */}
            <SectorNav />

            {/* Drag and Drop Zone */}
            <DropZone seoData={seoData} />

            {/* Batch Queue Controls (Visible when files exist) */}
            <BatchControls />

            {/* Interactive Queue Table */}
            <QueueTable />

            {/* Dynamic SEO Landing Page Section if route is active */}
            {seoData ? (
              <div className="w-full max-w-7xl mx-auto px-4">
                <SeoConversionPage seoData={seoData} onNavigateRoute={handleNavigateRoute} />
              </div>
            ) : (
              <>
                {/* Empty State Features / Hero Showcase when queue is empty */}
                {queue.length === 0 && (
                  <div className="w-full max-w-7xl mx-auto px-4 mt-8">
                    {/* Top Highlight Badge Banner */}
                    <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 font-bold shadow-md shadow-emerald-500/10">
                          <Lock className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                            <span>{t.noAuthTitle}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black uppercase tracking-wider">
                              100% FREE
                            </span>
                          </h2>
                          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            {t.noAuthDesc}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {t.noGoogleAuth}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          {t.zeroTelemetry}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Info Section: Step-by-Step Guide, Benefits Showcase, and FAQ */}
                <InfoSection />
              </>
            )}
          </>
        )}
      </main>

      <FooterAdZone onNavigateRoute={handleNavigateRoute} />

      {/* Modals, Drawers & Notifications */}
      <ToastNotification />
      <FilePreviewModal />
      <ShareModal />
      <HistoryDrawer />
      <SettingsModal />
      <GuideModal />
      <WebCodecsLabModal isOpen={isWebCodecsLabOpen} onClose={() => setWebCodecsLabOpen(false)} />
    </div>
  );
}


