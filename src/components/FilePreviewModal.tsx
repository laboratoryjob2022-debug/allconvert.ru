import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { X, Download, Share2, FileCheck, FileVideo, AlertCircle } from 'lucide-react';

export const FilePreviewModal: React.FC = () => {
  const { isPreviewOpen, previewFileItem, setPreviewOpen, openShareModal, downloadItem } = useConverterStore();

  const [objectUrl, setObjectUrl] = React.useState<string>('');
  const [videoError, setVideoError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setVideoError(false);
    if (previewFileItem?.convertedBlob) {
      const url = URL.createObjectURL(previewFileItem.convertedBlob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl('');
    }
  }, [previewFileItem?.convertedBlob]);

  if (!isPreviewOpen || !previewFileItem || !previewFileItem.convertedBlob) return null;

  const isAviFormat = previewFileItem.targetFormat?.toUpperCase() === 'AVI';
  const showVideoFallback = isAviFormat || videoError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-cyan-400" />
              <span>Converted Preview: {previewFileItem.convertedName}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Original ({previewFileItem.detectedFormat}) → Converted ({previewFileItem.targetFormat})
            </p>
          </div>
          <button
            onClick={() => setPreviewOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Media Render */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/30">
          {previewFileItem.category === 'image' && objectUrl && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Converted Result</span>
                <img
                  src={objectUrl}
                  alt="Converted Result"
                  className="max-h-80 max-w-full rounded-2xl border border-slate-700 shadow-xl object-contain"
                />
              </div>
            </div>
          )}

          {previewFileItem.category === 'audio' && objectUrl && (
            <div className="w-full max-w-md p-6 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
              <div className="text-sm font-bold text-slate-200 mb-4">
                Play Converted Audio Track ({previewFileItem.targetFormat})
              </div>
              <audio controls src={objectUrl} className="w-full" />
            </div>
          )}

          {previewFileItem.category === 'video' && objectUrl && (
            <div className="w-full max-w-2xl flex flex-col items-center">
              {showVideoFallback ? (
                <div className="w-full p-8 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">
                    Готовый видеофайл ({previewFileItem.targetFormat})
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    Формат <span className="text-cyan-400 font-semibold">{previewFileItem.targetFormat}</span> не поддерживается для прямого встроенного воспроизведения стандартным браузерным HTML5 плеером. Файл успешно обработан и готов к скачиванию.
                  </p>
                  <button
                    onClick={() => downloadItem(previewFileItem.id)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать {previewFileItem.convertedName}</span>
                  </button>
                </div>
              ) : (
                <video
                  controls
                  src={objectUrl}
                  onError={() => setVideoError(true)}
                  className="max-h-96 w-full rounded-2xl border border-slate-700 shadow-xl"
                />
              )}
            </div>
          )}

          {previewFileItem.category === 'document' && (
            <div className="w-full max-w-2xl p-6 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-300 max-h-80 overflow-y-auto">
              <div className="text-slate-500 mb-2 font-sans font-bold uppercase tracking-wider">Document Output Preview</div>
              <p>Converted Blob size: {(previewFileItem.convertedBlob.size / 1024).toFixed(2)} KB</p>
              <p className="mt-2 text-slate-400">File ready for download or ephemeral link sharing.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={() => openShareModal(previewFileItem)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs flex items-center space-x-1.5 border border-slate-700"
          >
            <Share2 className="w-4 h-4" />
            <span>Generate Ephemeral Link</span>
          </button>

          <button
            onClick={() => downloadItem(previewFileItem.id)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

