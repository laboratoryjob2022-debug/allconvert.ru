import React, { useRef, useState, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { SeoConversionRoute, getLocalizedSeoRoute } from '../lib/seoPages';
import {
  UploadCloud,
  FileCheck2,
  FolderPlus,
  Clipboard,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react';

interface DropZoneProps {
  seoData?: SeoConversionRoute | null;
}

export const DropZone: React.FC<DropZoneProps> = ({ seoData }) => {
  const { addFiles, language } = useConverterStore();
  const t = getTranslation(language);
  const localizedSeo = seoData ? getLocalizedSeoRoute(seoData, language) : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsDetecting(true);
      await addFiles(Array.from(e.dataTransfer.files));
      setIsDetecting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsDetecting(true);
      await addFiles(Array.from(e.target.files));
      setIsDetecting(false);
      e.target.value = ''; // reset input
    }
  };

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        setIsDetecting(true);
        await addFiles(Array.from(e.clipboardData.files));
        setIsDetecting(false);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-1">
      {/* Central Hero Header for Main Page or Tool Page */}
      <div className="text-center max-w-3xl mx-auto mb-6 flex flex-col items-center justify-start pt-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-3 border border-blue-200/60 dark:border-blue-800/50">
          <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {localizedSeo
              ? `${t.onlineConverterBadge} ${localizedSeo.fromFormat} ➔ ${localizedSeo.toFormat}`
              : t.privacy100
            }
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-snug pb-1.5 mb-2">
          {localizedSeo ? localizedSeo.h1 : t.mainH1}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          {localizedSeo ? localizedSeo.subtitle : t.mainSubtitle}
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 border-2 border-dashed overflow-hidden shadow-2xl ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/20 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        {/* Glowing Background Radial Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.heic,.heif,application/pdf,text/*"
          multiple
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl mx-auto">
          {/* Animated Icon Container */}
          <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-300">
            {isDetecting ? (
              <FileCheck2 className="w-10 h-10 text-cyan-400 animate-bounce" />
            ) : (
              <UploadCloud className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
            {t.dropzoneHint}
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
            {t.dropSubtitlePrefix}<kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-mono">ctrl + v</kbd>{t.dropSubtitleSuffix}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center space-x-2 cursor-pointer group-hover:scale-105 active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{t.chooseFilesBtn}</span>
            </button>
            <div className="flex items-center space-x-1.5 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 font-mono">
              <Clipboard className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.clipboardActive}</span>
            </div>
          </div>

          {/* Privacy & Engine Badges */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.privacy100}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t.magicByte}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>{t.unlimitedSize}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
