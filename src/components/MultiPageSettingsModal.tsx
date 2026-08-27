import React, { useState, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { FileItem } from '../types/converter';
import { getXlsxSheetNames } from '../lib/documentModel';
import { getPdfJsLib } from '../lib/converterEngine';
import { X, Layers, Archive, FileText, CheckCircle2, Check, ChevronRight } from 'lucide-react';

interface MultiPageSettingsModalProps {
  item: FileItem | null;
  onClose: () => void;
}

export const MultiPageSettingsModal: React.FC<MultiPageSettingsModalProps> = ({ item, onClose }) => {
  const { updateSettings } = useConverterStore();
  const [mode, setMode] = useState<'single_merged' | 'zip_archive' | 'selected_page'>('single_merged');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);

  const isExcel = item?.detectedFormat === 'XLSX' || item?.detectedFormat === 'XLS';
  const isPdf = item?.detectedFormat === 'PDF';
  const isDoc = item?.detectedFormat === 'DOCX' || item?.detectedFormat === 'DOC' || item?.detectedFormat === 'HTML' || item?.detectedFormat === 'TXT';

  useEffect(() => {
    if (!item) return;

    setMode(item.settings.multiPageExportMode || 'single_merged');
    if (item.settings.selectedPageOrSheet) {
      if (typeof item.settings.selectedPageOrSheet === 'string') {
        setSelectedSheet(item.settings.selectedPageOrSheet);
      } else {
        setSelectedPageNum(Number(item.settings.selectedPageOrSheet));
      }
    }

    let isMounted = true;
    setIsLoadingMeta(true);

    const parseMetadata = async () => {
      try {
        if (isExcel) {
          const ab = await item.file.arrayBuffer();
          const sheets = getXlsxSheetNames(ab);
          if (isMounted) {
            setDetectedSheets(sheets);
            if (sheets.length > 0 && !selectedSheet) {
              setSelectedSheet(sheets[0]);
            }
          }
        } else if (isPdf) {
          const pdfjs = await getPdfJsLib();
          const ab = await item.file.arrayBuffer();
          const doc = await pdfjs.getDocument({ data: ab }).promise;
          if (isMounted) {
            setTotalPages(doc.numPages || 1);
          }
        }
      } catch (err) {
        console.warn('Could not inspect multi-page metadata:', err);
      } finally {
        if (isMounted) setIsLoadingMeta(false);
      }
    };

    parseMetadata();

    return () => {
      isMounted = false;
    };
  }, [item?.id]);

  if (!item) return null;

  const handleSave = () => {
    const chosenSelection = isExcel ? selectedSheet : selectedPageNum;
    updateSettings(item.id, {
      multiPageExportMode: mode,
      selectedPageOrSheet: mode === 'selected_page' ? chosenSelection : undefined,
    });
    onClose();
  };

  const getModeLabel = () => {
    if (mode === 'single_merged') return 'Все листы / страницы в 1 общий файл';
    if (mode === 'zip_archive') return 'Все листы / страницы раздельно в ZIP-архив';
    return isExcel ? `Выбран лист: ${selectedSheet || (detectedSheets[0] ?? 'Лист 1')}` : `Выбрана страница: ${selectedPageNum}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Параметры экспорта листов и страниц</span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5" title={item.name}>
                {item.name} ({item.detectedFormat} → {item.targetFormat})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <p className="text-xs text-slate-300">
            Выберите режим обработки многостраничного документа или книги Excel с несколькими листами:
          </p>

          <div className="space-y-3">
            {/* OPTION 1: Single Merged Output */}
            <div
              onClick={() => setMode('single_merged')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                mode === 'single_merged'
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                  mode === 'single_merged'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100">
                    Сплошной документ (Все листы / страницы в 1 файл)
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    1 файл
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Все листы книги или страницы документа объединяются в единый непрерывный выходной файл.
                </p>
              </div>
            </div>

            {/* OPTION 2: ZIP Archive of all sheets/pages */}
            <div
              onClick={() => setMode('zip_archive')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                mode === 'zip_archive'
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                  mode === 'zip_archive'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100">
                    ZIP-архив (Каждый лист / страница отдельным файлом)
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    .ZIP архив
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Каждый лист таблицы или каждая страница документа сохраняется отдельным независимым файлом в ZIP-архиве.
                </p>
              </div>
            </div>

            {/* OPTION 3: Select Specific Sheet or Page */}
            <div
              onClick={() => setMode('selected_page')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-3 ${
                mode === 'selected_page'
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                    mode === 'selected_page'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-100">
                      Точечный экспорт (Выбрать конкретный лист или страницу)
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      1 элемент
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Конвертировать строго выбранный лист книги Excel или конкретную страницу документа.
                  </p>
                </div>
              </div>

              {/* Sub-controls when Mode 3 is chosen */}
              {mode === 'selected_page' && (
                <div
                  className="pl-12 pt-2 border-t border-slate-800/80 mt-2 space-y-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isExcel ? (
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                        <span>Выберите лист книги Excel:</span>
                        {detectedSheets.length > 0 && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            Листов: {detectedSheets.length}
                          </span>
                        )}
                      </div>
                      {detectedSheets.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/80 custom-scrollbar">
                          {detectedSheets.map((sheet) => (
                            <button
                              key={sheet}
                              type="button"
                              onClick={() => setSelectedSheet(sheet)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                                selectedSheet === sheet
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-850'
                              }`}
                            >
                              {sheet}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={selectedSheet}
                          onChange={(e) => setSelectedSheet(e.target.value)}
                          placeholder="Название листа (например: Лист 1 или Sheet1)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-400"
                        />
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                        <span>Номер страницы:</span>
                        <span className="text-cyan-400 font-mono">
                          {selectedPageNum} из {totalPages}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="1"
                          max={Math.max(1, totalPages)}
                          value={selectedPageNum}
                          onChange={(e) => setSelectedPageNum(parseInt(e.target.value, 10) || 1)}
                          className="flex-1 accent-cyan-400 cursor-pointer"
                        />
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={selectedPageNum}
                          onChange={(e) =>
                            setSelectedPageNum(Math.max(1, Math.min(totalPages, parseInt(e.target.value, 10) || 1)))
                          }
                          className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-cyan-400 font-mono text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center space-x-1.5 truncate max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{getModeLabel()}</span>
          </span>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Применить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
