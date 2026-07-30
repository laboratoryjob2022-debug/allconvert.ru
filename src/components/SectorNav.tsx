import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { ConversionCategory } from '../types/converter';
import { getTranslation } from '../lib/i18n';
import {
  Globe,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles
} from 'lucide-react';

interface SectorTab {
  id: ConversionCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  badge: string;
}

export const SectorNav: React.FC = () => {
  const { activeSector, setActiveSector, queue, setGlobalTargetFormat, language } = useConverterStore();
  const t = getTranslation(language);

  const sectorTabs: SectorTab[] = [
    { id: 'all', label: t.sectorAll, icon: Globe, color: 'text-cyan-400', badge: t.badgeAllInOne },
    { id: 'audio', label: t.sectorAudio, icon: Music, color: 'text-purple-400', badge: 'MP3 / WAV / OGG' },
    { id: 'video', label: t.sectorVideo, icon: Video, color: 'text-rose-400', badge: 'MP4 / WEBM / GIF' },
    { id: 'image', label: t.sectorImage, icon: ImageIcon, color: 'text-emerald-400', badge: 'PNG / WEBP / JPG' },
    { id: 'document', label: t.sectorDoc, icon: FileText, color: 'text-amber-400', badge: 'PDF / TXT / DOCX' },
  ];

  const getCategoryCount = (category: ConversionCategory) => {
    if (category === 'all') return queue.length;
    return queue.filter((item) => item.category === category).length;
  };

  const quickShortcuts = [
    { label: 'To PNG', format: 'PNG' },
    { label: 'To WEBP', format: 'WEBP' },
    { label: 'To MP3', format: 'MP3' },
    { label: 'To WAV', format: 'WAV' },
    { label: 'To MP4', format: 'MP4' },
    { label: 'To PDF', format: 'PDF' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 p-2.5 sm:p-2 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        {/* Sector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto pb-1 lg:pb-0">
          {sectorTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSector === tab.id;
            const count = getCategoryCount(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSector(tab.id)}
                className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap grow sm:grow-0 cursor-pointer hover:scale-105 active:scale-95 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-lg shadow-black/40 border border-slate-700/60 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color} shrink-0`} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Format Setters */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto text-xs text-slate-400 shrink-0 pt-2 lg:pt-0 border-t border-slate-800/60 lg:border-t-0">
          <span className="flex items-center text-slate-300 font-bold text-[11px] sm:text-xs uppercase tracking-wider shrink-0 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" /> {t.quickTarget}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {quickShortcuts.map((sc) => (
              <button
                key={sc.format}
                onClick={() => setGlobalTargetFormat(sc.format)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/60 hover:border-cyan-500/40 transition-all font-mono font-medium text-[11px] grow sm:grow-0 text-center cursor-pointer hover:scale-105 active:scale-95"
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
