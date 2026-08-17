import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import {
  HelpCircle,
  X,
  ShieldCheck,
  Zap,
  Layers,
  FileCheck2,
  FileArchive,
  Lock,
} from 'lucide-react';

export const GuideModal: React.FC = () => {
  const { isGuideOpen, setGuideOpen, language } = useConverterStore();
  const t = getTranslation(language);

  if (!isGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-sm">
              <HelpCircle className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {t.guideTitle}
              </h2>
              <p className="text-xs font-medium text-slate-300">
                {t.guideSub}
              </p>
            </div>
          </div>
          <button
            onClick={() => setGuideOpen(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95 border border-slate-700"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-sm leading-relaxed">
          {/* Privacy & Security Banner */}
          <div className="p-4 rounded-2xl bg-slate-800 border border-emerald-500/50 flex items-start space-x-3.5 shadow-md">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-emerald-400 text-sm sm:text-base">
                {t.guidePrivacyTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                {t.guidePrivacyDesc}
              </p>
            </div>
          </div>

          {/* Section 1: Quick Start in 3 Steps */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t.guideStepsTitle}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex flex-col space-y-2">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-cyan-400 text-slate-950 font-black text-[11px] mb-2 shadow-sm">
                    1
                  </span>
                  <div className="font-extrabold text-slate-100 text-sm mb-1">{t.guideStep1Title}</div>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {t.guideStep1Desc}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex flex-col space-y-2">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-cyan-400 text-slate-950 font-black text-[11px] mb-2 shadow-sm">
                    2
                  </span>
                  <div className="font-extrabold text-slate-100 text-sm mb-1">{t.guideStep2Title}</div>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {t.guideStep2Desc}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex flex-col space-y-2">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-black text-[11px] mb-2 shadow-sm">
                    3
                  </span>
                  <div className="font-extrabold text-slate-100 text-sm mb-1">{t.guideStep3Title}</div>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {t.guideStep3Desc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Smart Sectors & Isolated Batch Management */}
          <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 shadow-md space-y-3">
            <h3 className="text-base font-extrabold text-cyan-400 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>{t.guideSectorsTitle}</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-300 font-medium leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                {t.guideSectorsItem1}
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                {t.guideSectorsItem2}
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                {t.guideSectorsItem3}
              </div>
            </div>
          </div>

          {/* Section 3: Single ZIP Download */}
          <div className="p-4.5 rounded-2xl bg-slate-800 border border-emerald-500/40 shadow-md space-y-2">
            <h3 className="text-base font-extrabold text-emerald-400 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-emerald-400" />
              <span>{t.guideZipTitle}</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {t.guideZipDesc}
            </p>
          </div>

          {/* Section 4: Supported Formats */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-400" />
              <span>{t.guideFormatsTitle}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="font-extrabold text-cyan-400 mb-1 text-xs">🖼 {t.sectorImage}:</div>
                <div className="text-slate-300 font-mono text-[11px]">PNG, JPG / JPEG, WEBP, GIF, BMP, ICO, AVIF, PDF</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="font-extrabold text-emerald-400 mb-1 text-xs">🎵 {t.sectorAudio}:</div>
                <div className="text-slate-300 font-mono text-[11px]">MP3, WAV, OGG, FLAC, AAC, M4A, OPUS</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="font-extrabold text-amber-400 mb-1 text-xs">🎬 {t.sectorVideo}:</div>
                <div className="text-slate-300 font-mono text-[11px]">MP4, WEBM, MOV, AVI, MKV, GIF, MP3</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="font-extrabold text-indigo-400 mb-1 text-xs">📄 {t.sectorDoc}:</div>
                <div className="text-slate-300 font-mono text-[11px]">PDF, TXT, MD, HTML, JSON, CSV, XLSX, XML</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.guideNoAuth}</span>
          </div>
          <button
            onClick={() => setGuideOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-cyan-400/20"
          >
            {t.understoodBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

