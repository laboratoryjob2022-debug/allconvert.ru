import React, { useEffect } from 'react';
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
import { useConverterStore } from './store/useConverterStore';
import { getTranslation } from './lib/i18n';
import { ShieldCheck, Layers, HardDrive, Sparkles, CheckCircle2, Lock } from 'lucide-react';

export default function App() {
  const { queue, loadHistoryFromDB, theme, language } = useConverterStore();
  const t = getTranslation(language || 'ru');

  useEffect(() => {
    loadHistoryFromDB();
  }, [loadHistoryFromDB]);

  return (
    <div
      data-theme={theme || 'studio-light'}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300"
    >
      {/* 2. Main Navigation Bar */}
      <Navbar />

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

        {/* Empty State Features / Hero Showcase when queue is empty */}
        {queue.length === 0 && (
          <div className="w-full max-w-7xl mx-auto px-4 mt-12 mb-12">
            {/* Top Highlight Badge Banner */}
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/30 transition-all backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.localProcessTitle}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.localProcessDesc}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-purple-500/30 transition-all backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.magicTitle}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.magicDesc}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/30 transition-all backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.unlimitedTitle}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.unlimitedDesc}
                </p>
              </div>
            </div>
          </div>
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

