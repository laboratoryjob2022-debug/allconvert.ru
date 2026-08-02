import React from 'react';
import { ShieldCheck, FileText, Info } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

interface FooterAdZoneProps {
  onNavigateRoute?: (path: string) => void;
}

export const FooterAdZone: React.FC<FooterAdZoneProps> = ({ onNavigateRoute }) => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (onNavigateRoute) {
      onNavigateRoute(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-slate-900/40 border-t border-slate-800/80 text-slate-400 text-xs py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand info */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src="/favicon.svg" alt="AllConvert" className="w-7 h-7 shrink-0" />
            <span className="font-extrabold text-slate-100 text-base tracking-tight">
              All<span className="text-cyan-400">Convert</span>
            </span>
          </a>
          <span className="hidden md:inline text-slate-700">|</span>
          <p className="text-slate-400 text-xs max-w-md">
            {t.footerDesc}
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
          <a
            href="/privacy"
            onClick={(e) => handleLinkClick(e, '/privacy')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.privacyPolicy}</span>
          </a>
          <a
            href="/terms"
            onClick={(e) => handleLinkClick(e, '/terms')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>{t.termsOfService}</span>
          </a>
          <a
            href="/about"
            onClick={(e) => handleLinkClick(e, '/about')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>{t.aboutUsAndContacts}</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-slate-500 text-xs text-center md:text-right">
          © {new Date().getFullYear()} AllConvert.ru. {t.footerCopyright}
        </div>
      </div>
    </footer>
  );
};

