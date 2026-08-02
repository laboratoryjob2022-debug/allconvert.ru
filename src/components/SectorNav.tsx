import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { ConversionCategory } from '../types/converter';
import { getTranslation, formatDirectionLabel, getLocalizedPath } from '../lib/i18n';
import {
  Globe,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  Zap
} from 'lucide-react';

interface SectorTab {
  id: ConversionCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  badge: string;
}

interface PopularRoute {
  slug: string;
  from: string;
  to: string;
  suffix?: 'audio' | 'favicon';
}

export const SectorNav: React.FC = () => {
  const { activeSector, setActiveSector, queue, language } = useConverterStore();
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

  // Map of popular conversion routes grouped by activeSector category
  const popularRoutesByCategory: Record<ConversionCategory, PopularRoute[]> = {
    all: [
      { slug: 'heic-to-jpg', from: 'HEIC', to: 'JPG' },
      { slug: 'png-to-jpg', from: 'PNG', to: 'JPG' },
      { slug: 'webp-to-jpg', from: 'WEBP', to: 'JPG' },
      { slug: 'pdf-to-word', from: 'PDF', to: 'DOCX' },
      { slug: 'mp4-to-mp3', from: 'MP4', to: 'MP3' },
      { slug: 'mov-to-mp3', from: 'MOV', to: 'MP3' },
      { slug: 'wav-to-mp3', from: 'WAV', to: 'MP3' },
      { slug: 'xlsx-to-csv', from: 'XLSX', to: 'CSV' },
      { slug: 'pdf-to-txt', from: 'PDF', to: 'TXT' },
      { slug: 'avif-to-jpg', from: 'AVIF', to: 'JPG' },
      { slug: 'pdf-to-png', from: 'PDF', to: 'PNG' },
    ],
    image: [
      { slug: 'heic-to-jpg', from: 'HEIC', to: 'JPG' },
      { slug: 'png-to-jpg', from: 'PNG', to: 'JPG' },
      { slug: 'jpg-to-png', from: 'JPG', to: 'PNG' },
      { slug: 'webp-to-jpg', from: 'WEBP', to: 'JPG' },
      { slug: 'avif-to-jpg', from: 'AVIF', to: 'JPG' },
      { slug: 'webp-to-png', from: 'WEBP', to: 'PNG' },
      { slug: 'jpg-to-webp', from: 'JPG', to: 'WEBP' },
      { slug: 'png-to-ico', from: 'PNG', to: 'ICO', suffix: 'favicon' },
    ],
    audio: [
      { slug: 'mp4-to-mp3', from: 'MP4', to: 'MP3' },
      { slug: 'mov-to-mp3', from: 'MOV', to: 'MP3' },
      { slug: 'wav-to-mp3', from: 'WAV', to: 'MP3' },
      { slug: 'm4a-to-mp3', from: 'M4A', to: 'MP3' },
      { slug: 'flac-to-mp3', from: 'FLAC', to: 'MP3' },
      { slug: 'ogg-to-mp3', from: 'OGG', to: 'MP3' },
      { slug: 'aac-to-mp3', from: 'AAC', to: 'MP3' },
      { slug: 'avi-to-mp3', from: 'AVI', to: 'MP3' },
    ],
    video: [
      { slug: 'mov-to-mp4', from: 'MOV', to: 'MP4' },
      { slug: 'mov-to-mp3', from: 'MOV', to: 'MP3', suffix: 'audio' },
      { slug: 'avi-to-mp3', from: 'AVI', to: 'MP3', suffix: 'audio' },
      { slug: 'mkv-to-mp3', from: 'MKV', to: 'MP3', suffix: 'audio' },
      { slug: 'webm-to-mp3', from: 'WEBM', to: 'MP3', suffix: 'audio' },
      { slug: 'mp4-to-mp3', from: 'MP4', to: 'MP3' },
    ],
    document: [
      { slug: 'pdf-to-word', from: 'PDF', to: 'DOCX' },
      { slug: 'pdf-to-jpg', from: 'PDF', to: 'JPG' },
      { slug: 'pdf-to-png', from: 'PDF', to: 'PNG' },
      { slug: 'xlsx-to-csv', from: 'XLSX', to: 'CSV' },
      { slug: 'json-to-csv', from: 'JSON', to: 'CSV' },
      { slug: 'pdf-to-txt', from: 'PDF', to: 'TXT' },
    ],
  };

  const currentDirections = popularRoutesByCategory[activeSector] || popularRoutesByCategory.all;

  const handleDirectionClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    const localizedPath = getLocalizedPath(`/convert/${slug}`, language);
    window.history.pushState({}, '', localizedPath);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-5 space-y-4">
      {/* Expanded Full-Width Sector Tabs */}
      <div className="bg-slate-900/80 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
          {sectorTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSector === tab.id;
            const count = getCategoryCount(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSector(tab.id)}
                className={`flex items-center justify-center space-x-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 text-center ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-lg shadow-black/40 border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${tab.color} shrink-0`} />
                <span className="truncate">{tab.label}</span>
                {count > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Conversion Directions Buttons */}
      <div className="flex flex-col gap-2.5 py-1">
        <div className="flex items-center text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm shrink-0">
          <Zap className="w-4 h-4 text-cyan-400 mr-1.5 shrink-0" />
          <span>
            {t.popularDirectionsTitle}
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-2 min-h-[76px] sm:min-h-[92px]">
          {currentDirections.map((item) => (
            <a
              key={item.slug}
              href={getLocalizedPath(`/convert/${item.slug}`, language)}
              onClick={(e) => handleDirectionClick(e, item.slug)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 hover:text-cyan-500 dark:hover:text-cyan-400 text-slate-800 dark:text-slate-200 transition-all font-bold text-xs sm:text-sm shadow-xs cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              {formatDirectionLabel(item.from, item.to, item.suffix, language)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

