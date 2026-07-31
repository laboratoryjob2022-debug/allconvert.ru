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
import { useConverterStore } from './store/useConverterStore';
import { getTranslation } from './lib/i18n';
import { getSeoPageDataBySlug, SeoConversionRoute } from './lib/seoPages';
import { ShieldCheck, Layers, HardDrive, Sparkles, CheckCircle2, Lock } from 'lucide-react';

function getSlugFromPath(): string {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path.startsWith('convert/')) {
    return path.replace('convert/', '');
  }
  if (path.includes('-to-')) {
    return path;
  }
  const hash = window.location.hash.replace(/^#+|\/+$/g, '');
  if (hash.startsWith('convert/')) {
    return hash.replace('convert/', '');
  }
  if (hash.includes('-to-')) {
    return hash;
  }
  return '';
}

export default function App() {
  const { queue, loadHistoryFromDB, theme, language, setPresetTargetFormat, setActiveSector } = useConverterStore();
  const t = getTranslation(language || 'ru');
  const [currentSlug, setCurrentSlug] = useState<string>(() => getSlugFromPath());
  const [seoData, setSeoData] = useState<SeoConversionRoute | null>(null);

  useEffect(() => {
    loadHistoryFromDB();
  }, [loadHistoryFromDB]);

  // Listen to popstate for URL routing
  useEffect(() => {
    const handleLocationChange = () => {
      const slug = getSlugFromPath();
      setCurrentSlug(slug);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Update meta tags and converter preset target format when route changes
  useEffect(() => {
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

    if (!currentSlug) {
      setSeoData(null);
      setPresetTargetFormat(null);
      document.title = 'AllConvert — 100% Приватный конвертер файлов в браузере';
      canonicalLink.setAttribute('href', 'https://allconvert.ru/');
      return;
    }

    const data = getSeoPageDataBySlug(currentSlug);
    setSeoData(data);
    setPresetTargetFormat(data.toFormat);
    setActiveSector(data.category);

    // Update document title & canonical & meta description for SEO
    document.title = data.title;
    canonicalLink.setAttribute('href', `https://allconvert.ru/convert/${data.slug}`);

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', data.metaDescription);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', data.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', data.metaDescription);
  }, [currentSlug, setPresetTargetFormat, setActiveSector]);

  const handleNavigateRoute = (slug: string) => {
    const newPath = slug ? `/convert/${slug}` : '/';
    window.history.pushState({}, '', newPath);
    setCurrentSlug(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      data-theme={theme || 'studio-light'}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300"
    >
      {/* 2. Main Navigation Bar */}
      <Navbar />

      {/* Top Breadcrumbs for SEO Landing Pages */}
      {seoData && (
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-1">
          <nav className="flex items-center text-sm font-medium text-slate-400 space-x-2">
            <button
              onClick={() => handleNavigateRoute('')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Главная
            </button>
            <span className="text-slate-600">/</span>
            <button
              onClick={() => handleNavigateRoute('')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Конвертер
            </button>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-slate-100 dark:text-white bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 shadow-xs">
              {seoData.fromFormat} в {seoData.toFormat}
            </span>
          </nav>
        </div>
      )}

      {/* 3. Main Content Container */}
      <main className="flex-1 pb-16">
        {/* Sector Navigation Tabs */}
        <SectorNav />

        {/* Drag and Drop Zone */}
        <DropZone />

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
      </main>

      <FooterAdZone />

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

