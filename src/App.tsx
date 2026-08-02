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
import { ToastNotification } from './components/ToastNotification';
import { FooterAdZone } from './components/FooterAdZone';
import { InfoSection } from './components/InfoSection';
import { SeoConversionPage } from './components/SeoConversionPage';
import { LegalPages } from './components/LegalPages';
import { useConverterStore } from './store/useConverterStore';
import { getTranslation } from './lib/i18n';
import { getSeoPageDataBySlug, SeoConversionRoute, getLocalizedSeoRoute } from './lib/seoPages';
import { Lock, CheckCircle2 } from 'lucide-react';

export type RouteType = 'home' | 'convert' | 'privacy' | 'terms' | 'about';

export interface RouteState {
  type: RouteType;
  slug: string;
}

function getRouteStateFromPath(): RouteState {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path === 'privacy') return { type: 'privacy', slug: 'privacy' };
  if (path === 'terms') return { type: 'terms', slug: 'terms' };
  if (path === 'about') return { type: 'about', slug: 'about' };

  if (path.startsWith('convert/')) {
    return { type: 'convert', slug: path.replace('convert/', '') };
  }
  if (path.includes('-to-')) {
    return { type: 'convert', slug: path };
  }

  const hash = window.location.hash.replace(/^#+|\/+$/g, '');
  if (hash === 'privacy') return { type: 'privacy', slug: 'privacy' };
  if (hash === 'terms') return { type: 'terms', slug: 'terms' };
  if (hash === 'about') return { type: 'about', slug: 'about' };
  if (hash.startsWith('convert/')) {
    return { type: 'convert', slug: hash.replace('convert/', '') };
  }
  if (hash.includes('-to-')) {
    return { type: 'convert', slug: hash };
  }

  return { type: 'home', slug: '' };
}

export default function App() {
  const { queue, loadHistoryFromDB, theme, language, setLanguage, setPresetTargetFormat, setActiveSector } = useConverterStore();
  const t = getTranslation(language || 'ru');
  const [routeState, setRouteState] = useState<RouteState>(() => getRouteStateFromPath());
  const [seoData, setSeoData] = useState<SeoConversionRoute | null>(null);

  // Sync language from URL search param if present (e.g. ?lang=zh)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && ['ru', 'en', 'es', 'de', 'zh', 'fr'].includes(langParam)) {
      if (language !== langParam) {
        setLanguage(langParam);
      }
    }
  }, [setLanguage, language]);

  useEffect(() => {
    loadHistoryFromDB();
  }, [loadHistoryFromDB]);

  // Listen to popstate for URL routing
  useEffect(() => {
    const handleLocationChange = () => {
      const state = getRouteStateFromPath();
      setRouteState(state);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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
    let canonicalPath = 'https://allconvert.ru/';
    if (routeState.type === 'convert' && routeState.slug) {
      canonicalPath = `https://allconvert.ru/convert/${routeState.slug}`;
    } else if (routeState.type === 'privacy') {
      canonicalPath = 'https://allconvert.ru/privacy';
    } else if (routeState.type === 'terms') {
      canonicalPath = 'https://allconvert.ru/terms';
    } else if (routeState.type === 'about') {
      canonicalPath = 'https://allconvert.ru/about';
    }

    // Set canonical link URL dynamically
    canonicalLink.setAttribute('href', canonicalPath);

    // Manage hreflang links dynamically
    const baseHreflangPath = canonicalPath.replace('https://allconvert.ru', '');
    const hreflangs = [
      { code: 'ru', href: `https://allconvert.ru${baseHreflangPath}` },
      { code: 'en', href: `https://allconvert.ru${baseHreflangPath}?lang=en` },
      { code: 'zh', href: `https://allconvert.ru${baseHreflangPath}?lang=zh` },
      { code: 'es', href: `https://allconvert.ru${baseHreflangPath}?lang=es` },
      { code: 'de', href: `https://allconvert.ru${baseHreflangPath}?lang=de` },
      { code: 'x-default', href: `https://allconvert.ru${baseHreflangPath}` },
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
    else if (target === 'about' || target === '/about') newPath = '/about';
    else if (target) newPath = target.startsWith('/') ? target : `/convert/${target}`;

    window.history.pushState({}, '', newPath);
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
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 pb-16">
        {routeState.type === 'privacy' || routeState.type === 'terms' || routeState.type === 'about' ? (
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
    </div>
  );
}


