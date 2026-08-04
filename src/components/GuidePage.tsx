import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation, getLocalizedPath } from '../lib/i18n';
import {
  HelpCircle,
  ShieldCheck,
  Zap,
  Layers,
  FileCheck2,
  FileArchive,
  Lock,
  ArrowRight,
  Filter,
  AlertTriangle,
  FileCode,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

interface GuidePageProps {
  onNavigateHome: () => void;
}

export const GuidePage: React.FC<GuidePageProps> = ({ onNavigateHome }) => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-slate-100 font-sans">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-700/80 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>{t.guideTitle}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {t.guideTitle}
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed">
              {t.guideSub}
            </p>
          </div>

          <a
            href={getLocalizedPath('/', language)}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <span>{t.startConvertingNow}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 1. Privacy & Local WebAssembly Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/50 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-emerald-400">
              {t.guidePrivacyTitle}
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {t.guideWasmBadge}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed pl-1 sm:pl-13 font-medium">
          {t.guidePrivacyDesc}
        </p>
      </div>

      {/* 2. Quick Start 3 Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>{t.guideStepsTitle}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-block px-3 py-1 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs mb-3 shadow-md">
                1
              </span>
              <h3 className="font-extrabold text-slate-100 text-base mb-1.5">{t.guideStep1Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {t.guideStep1Desc}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-cyan-400 font-mono">
              {t.guideStep1Sub}
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-block px-3 py-1 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs mb-3 shadow-md">
                2
              </span>
              <h3 className="font-extrabold text-slate-100 text-base mb-1.5">{t.guideStep2Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {t.guideStep2Desc}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-cyan-400 font-mono">
              {t.guideStep2Sub}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-block px-3 py-1 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs mb-3 shadow-md">
                3
              </span>
              <h3 className="font-extrabold text-slate-100 text-base mb-1.5">{t.guideStep3Title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {t.guideStep3Desc}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono">
              {t.guideStep3Sub}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Flexible Queue & Sector Tabs */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-lg font-extrabold text-cyan-400 flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>{t.guideSectorsTitle}</span>
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-slate-300 font-medium">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">{t.guideSectorsItem1Title}</span>
              <span>{t.guideSectorsItem1}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">{t.guideSectorsItem2Title}</span>
              <span>{t.guideSectorsItem2}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">{t.guideSectorsItem3Title}</span>
              <span>{t.guideSectorsItem3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Strict Batch Selection Compatibility Matrix */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/30 border border-cyan-500/40 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-cyan-300">
              {t.guideSmartBatchTitle}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {t.guideSmartBatchSub}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          {t.guideSmartBatchDesc}
        </p>

        {/* Category Matrix Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs mb-1">
              <ImageIcon className="w-4 h-4" />
              <span>{t.guideCategoryImages}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              .webp, .png, .jpg, .gif, .bmp, .ico, .avif, .heic
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs mb-1">
              <Video className="w-4 h-4" />
              <span>{t.guideCategoryVideo}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              .mp4, .webm, .mov, .avi, .mkv
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
              <Music className="w-4 h-4" />
              <span>{t.guideCategoryAudio}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              .mp3, .wav, .ogg, .flac, .m4a, .aac
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs mb-1">
              <FileText className="w-4 h-4" />
              <span>{t.guideCategoryDocs}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              .pdf, .txt, .md, .html, .json, .csv, .xlsx, .xml
            </p>
          </div>
        </div>
      </div>

      {/* 5. Batch Overwrite Warning */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-start space-x-3.5 shadow-md">
        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-extrabold text-amber-300 text-sm sm:text-base">
            {t.guideOverwriteWarningTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium leading-relaxed">
            {t.guideOverwriteWarningDesc}
          </p>
        </div>
      </div>

      {/* 6. ZIP Download Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
            <FileArchive className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-emerald-400">
            {t.guideZipTitle}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
          {t.guideZipDesc}
        </p>
      </div>

      {/* Recommended File Sizes Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-cyan-300">
            {t.guideRecommendedSizesTitle}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
          {t.guideRecommendedSizesDesc}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 font-medium">
              {t.guideSizeImagesDocs}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 font-medium">
              {t.guideSizeAudio}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 font-medium">
              {t.guideSizeVideo}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Supported Formats Showcase */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-purple-400" />
          <span>{t.guideFormatsTitle}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="font-black text-cyan-400 text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>{t.sectorImage}</span>
            </div>
            <p className="text-slate-300 font-mono text-xs leading-relaxed">
              PNG, JPG / JPEG, WEBP, GIF, BMP, ICO, AVIF, HEIC / HEIF, SVG, TIFF, PDF
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="font-black text-emerald-400 text-sm flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span>{t.sectorAudio}</span>
            </div>
            <p className="text-slate-300 font-mono text-xs leading-relaxed">
              MP3, WAV, OGG, FLAC, AAC, M4A, OPUS, AIFF
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="font-black text-amber-400 text-sm flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span>{t.sectorVideo}</span>
            </div>
            <p className="text-slate-300 font-mono text-xs leading-relaxed">
              MP4, WEBM, MOV, AVI, MKV, GIF (Video-to-GIF), MP3 (Audio Extraction)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="font-black text-indigo-400 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{t.sectorDoc}</span>
            </div>
            <p className="text-slate-300 font-mono text-xs leading-relaxed">
              PDF, TXT, MD, HTML, JSON, CSV, XLSX, XLS, XML, DOCX, EPUB
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400">
          <Lock className="w-4 h-4" />
          <span>{t.guideNoAuth}</span>
        </div>
        <h3 className="text-xl font-bold text-white">
          {t.guideCtaTitle}
        </h3>
        <div>
          <a
            href={getLocalizedPath('/', language)}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-cyan-400/20 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>{t.startConvertingNow}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
