import React, { useState } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import {
  X,
  Share2,
  Download,
  ShieldCheck,
  Check,
  Copy
} from 'lucide-react';

export const ShareModal: React.FC = () => {
  const { isShareOpen, shareFileItem, setShareOpen, language, downloadItem, showToast } = useConverterStore();
  const [copied, setCopied] = useState(false);
  const t = getTranslation(language);

  if (!isShareOpen || !shareFileItem) return null;

  const fileName = shareFileItem.convertedName || shareFileItem.name;
  const fileSizeStr = shareFileItem.convertedSize
    ? (shareFileItem.convertedSize / 1024).toFixed(1) + ' KB'
    : (shareFileItem.size / 1024).toFixed(1) + ' KB';

  const handleNativeShare = async () => {
    try {
      if (shareFileItem.convertedBlob && navigator.canShare) {
        const file = new File([shareFileItem.convertedBlob], fileName, {
          type: shareFileItem.convertedBlob.type || 'application/octet-stream',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          showToast(t.linkCopied, 'success');
          return;
        }
      }
    } catch (e) {
      console.warn('Native share error or cancelled:', e);
    }

    // Fallback if native share fails or unsupported: trigger download
    downloadItem(shareFileItem.id);
  };

  const copySiteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast(t.linkCopied, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">{t.shareFileTitle}</h3>
          </div>
          <button
            onClick={() => setShareOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected File Box */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">{t.sectorAll}:</div>
            <div className="text-sm font-bold text-white truncate mt-1">
              {fileName}
            </div>
            <div className="text-xs text-cyan-400 font-mono mt-1">
              {fileSizeStr}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {t.shareFileDesc}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleNativeShare}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.shareFileNativeBtn}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => downloadItem(shareFileItem.id)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{t.downloadSelected(1)}</span>
              </button>

              <button
                onClick={copySiteLink}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 border border-slate-700 transition-colors"
                title={t.shareSiteBtn}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copied ? 'Copied' : t.shareSiteBtn}</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-xs text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="leading-relaxed">
              {t.shareFileLocalNote}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
