import React, { useState } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { THEMES } from '../lib/themes';
import { getTranslation, LanguageCode } from '../lib/i18n';
import {
  Layers,
  Settings,
  ShieldCheck,
  Zap,
  Palette,
  Check,
  ChevronDown,
  Share2,
  HelpCircle,
  Bookmark,
} from 'lucide-react';

const LANGUAGES: { code: LanguageCode; label: string; flag: string; short: string }[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
  { code: 'en', label: 'English', flag: '🇺🇸', short: 'ENG' },
  { code: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', short: 'DE' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
];

export const Navbar: React.FC = () => {
  const {
    totalConvertedCount,
    setSettingsOpen,
    setGuideOpen,
    theme,
    setTheme,
    language,
    setLanguage,
    showToast,
  } = useConverterStore();

  const [isThemeMenuOpen, setThemeMenuOpen] = useState(false);
  const [isLangMenuOpen, setLangMenuOpen] = useState(false);

  const t = getTranslation(language || 'ru');
  const currentTheme = THEMES.find((item) => item.id === theme) || THEMES[0];
  const currentLang = LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];

  const renderThemeDropdown = (isMobile: boolean = false) => (
    <div className="relative">
      <button
        onClick={() => {
          setThemeMenuOpen(!isThemeMenuOpen);
          setLangMenuOpen(false);
        }}
        className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center justify-center sm:justify-start space-x-1.5 ${isMobile ? 'text-xs' : ''}`}
        title="Change UI Theme"
      >
        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
        <span
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: currentTheme.accentHex }}
        />
        <span className="text-xs font-medium hidden md:inline truncate max-w-[100px]">
          {language === 'ru' ? currentTheme.nameRu.split(' ')[0] : currentTheme.nameEn.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
      </button>

      {isThemeMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setThemeMenuOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in max-h-96 overflow-y-auto`}>
            <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider border-b border-slate-800 mb-1">
              {t.theme} (10 Тем)
            </div>
            <div className="space-y-1">
              {THEMES.map((item) => {
                const isSelected = item.id === theme;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTheme(item.id);
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                        style={{ backgroundColor: item.accentHex }}
                      />
                      <span>{language === 'ru' ? item.nameRu : item.nameEn}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLangDropdown = (isMobile: boolean = false) => (
    <div className="relative">
      <button
        onClick={() => {
          setLangMenuOpen(!isLangMenuOpen);
          setThemeMenuOpen(false);
        }}
        className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center justify-center sm:justify-start space-x-1.5 ${isMobile ? 'text-xs' : ''}`}
        title="Language / Язык"
      >
        <span className="text-sm shrink-0">{currentLang.flag}</span>
        <span className="text-xs font-bold uppercase">{currentLang.short}</span>
        <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
      </button>

      {isLangMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLangMenuOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in`}>
            <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider border-b border-slate-800 mb-1">
              {t.language}
            </div>
            <div className="space-y-1">
              {LANGUAGES.map((item) => {
                const isSelected = item.code === language;
                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{item.flag}</span>
                      <span>{item.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <nav className="w-full bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-[37px] z-30 px-3 sm:px-4 py-2.5 sm:py-3 shadow-md">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Layout (< sm) */}
        <div className="flex flex-col gap-2 sm:hidden">
          {/* Row 1: Brand Title + Share & Settings */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center space-x-2 truncate">
              <img src="/favicon.svg" alt="AllConvert" className="w-7 h-7 shrink-0" />
              <h1 className="text-base font-bold text-white tracking-tight truncate">
                All<span className="text-cyan-400 font-extrabold">Convert</span>
              </h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setGuideOpen(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-cyan-400 hover:text-cyan-300 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                title="Гайд и Правила использования"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast(t.linkCopied, 'success');
                }}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                title="Share / Copy Link"
              >
                <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                title={t.settings}
              >
                <Settings className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            </div>
          </div>

          {/* Row 2: Badge + Theme & Language */}
          <div className="flex items-center justify-between gap-2 w-full pt-1 border-t border-slate-800/60">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shrink-0 truncate max-w-[55%]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-400" />
              <span className="truncate">{t.noAuthBadge}</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {renderThemeDropdown(true)}
              {renderLangDropdown(true)}
            </div>
          </div>
        </div>

        {/* Desktop Layout (>= sm) */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700/80 p-1 shadow-lg shadow-cyan-500/10 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/favicon.svg" alt="AllConvert Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  All<span className="text-cyan-400 font-extrabold">Convert</span>
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {t.noAuthBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                {t.appSub}
              </p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* Total Converted Badge */}
            {totalConvertedCount > 0 && (
              <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Converted: <strong>{totalConvertedCount}</strong></span>
              </div>
            )}

            {renderThemeDropdown(false)}
            {renderLangDropdown(false)}

            {/* Guide & Rules Button */}
            <button
              onClick={() => setGuideOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-cyan-300 hover:text-white transition-all flex items-center space-x-1.5 shadow-sm text-xs font-bold cursor-pointer hover:scale-105 active:scale-95"
              title={t.guideTitle}
            >
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="hidden md:inline">{t.guideBtn}</span>
            </button>

            {/* Bookmark / В закладки Button */}
            <button
              onClick={() => {
                showToast(t.bookmarkToast, 'info');
              }}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 transition-all flex items-center space-x-1.5 shadow-sm text-xs font-bold cursor-pointer hover:scale-105 active:scale-95"
              title={t.bookmarkBtn}
            >
              <Bookmark className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline text-amber-600 dark:text-amber-300">{t.bookmarkBtn}</span>
            </button>

            {/* Share / Copy Link Button */}
            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: t.appName,
                      text: t.appSub,
                      url: window.location.href,
                    });
                    showToast(t.linkCopied, 'success');
                    return;
                  } catch (e) {
                    // User cancelled or unsupported, fallback to clipboard
                  }
                }
                navigator.clipboard.writeText(window.location.href);
                showToast(t.linkCopied, 'success');
              }}
              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1 cursor-pointer hover:scale-105 active:scale-95"
              title={t.shareSiteBtn}
            >
              <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1 cursor-pointer hover:scale-105 active:scale-95"
              title={t.settings}
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

