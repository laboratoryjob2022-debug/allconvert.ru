import React, { useRef, useState, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { SeoConversionRoute, getLocalizedSeoRoute } from '../lib/seoPages';
import {
  UploadCloud,
  FileCheck2,
  FolderPlus,
  Clipboard,
  Zap
} from 'lucide-react';

interface DropZoneProps {
  seoData?: SeoConversionRoute | null;
}

export const DropZone: React.FC<DropZoneProps> = ({ seoData }) => {
  const { addFiles, language, queue } = useConverterStore();
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
    <div className="w-full max-w-7xl mx-auto px-4 mt-2">
      {/* Central Hero Header for Main Page or Tool Page */}
      <div className="text-center max-w-3xl mx-auto mb-4 flex flex-col items-center justify-start pt-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-2.5 border border-blue-200/60 dark:border-blue-800/50">
          <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span>
            {localizedSeo
              ? `${t.onlineConverterBadge} ${localizedSeo.fromFormat} ➔ ${localizedSeo.toFormat}`
              : t.privacy100
            }
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug pb-1 mb-1.5">
          {localizedSeo ? localizedSeo.h1 : t.mainH1}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
          {localizedSeo ? localizedSeo.subtitle : t.mainSubtitle}
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-3xl p-6 sm:p-8 text-center transition-all duration-300 border-2 border-dashed overflow-hidden shadow-xs bg-white ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10'
            : 'border-blue-200/90 hover:border-blue-400'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-xl mx-auto">
          {/* Top Cloud Icon in clean rounded container matching image.png */}
          <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center mb-3.5 shadow-xs group-hover:scale-105 group-hover:border-blue-300 transition-all duration-300 text-slate-700">
            {isDetecting ? (
              <FileCheck2 className="w-5 h-5 text-blue-600 animate-bounce" />
            ) : (
              <UploadCloud className="w-5 h-5 text-slate-700 group-hover:text-blue-600 transition-colors" />
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 tracking-tight">
            {t.dropzoneHint}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-4 leading-relaxed">
            {t.dropSubtitlePrefix}<kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium">ctrl + v</kbd>{t.dropSubtitleSuffix}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95 btn-primary-action"
            >
              <FolderPlus className="w-4 h-4 text-white" />
              <span className="text-white font-semibold">{t.chooseFilesBtn}</span>
            </button>
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 font-medium shadow-xs transition-colors">
              <Clipboard className="w-4 h-4 text-slate-500" />
              <span>{t.clipboardActive}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
