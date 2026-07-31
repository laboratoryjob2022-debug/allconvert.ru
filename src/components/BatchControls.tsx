import React, { useState, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { getAvailableTargets } from '../lib/formatSpecs';
import {
  Play,
  Download,
  FileArchive,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';

export const BatchControls: React.FC = () => {
  const {
    queue,
    selectedIds,
    activeSector,
    globalTargetFormat,
    setGlobalTargetFormat,
    applyFormatToSelected,
    selectAllItems,
    clearSelection,
    startConversion,
    downloadSelected,
    removeSelected,
    downloadAllZip,
    clearCompleted,
    clearQueue,
    language,
  } = useConverterStore();

  const t = getTranslation(language || 'ru');

  const [selectedBatchFormat, setSelectedBatchFormat] = useState<string>(globalTargetFormat);

  useEffect(() => {
    setSelectedBatchFormat(globalTargetFormat);
  }, [globalTargetFormat]);

  const filteredQueue = activeSector === 'all'
    ? queue
    : queue.filter((item) => item.category === activeSector);

  if (filteredQueue.length === 0) return null;

  // Sector-filtered selection calculations
  const selectedItemsInSector = filteredQueue.filter((q) => selectedIds.includes(q.id));
  const selectedCountInSector = selectedItemsInSector.length;
  const allSelectedInSector = filteredQueue.length > 0 && filteredQueue.every((q) => selectedIds.includes(q.id));
  
  const isConvertingAny = queue.some((q) => q.status === 'converting');
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  
  // Total selected across all sectors
  const totalSelectedCount = selectedIds.length;

  const selectedIdleInSector = selectedItemsInSector.filter(
    (q) => q.status === 'idle' || q.status === 'error'
  ).length;
  const totalIdleCount = filteredQueue.filter((q) => q.status === 'idle' || q.status === 'error').length;

  const availableFormats = getAvailableTargets(activeSector);

  // Overall Batch Conversion Progress Calculations
  const activeConvertingItem = queue.find((q) => q.status === 'converting');
  const totalQueueCount = queue.length;
  const completedInBatch = queue.filter((q) => q.status === 'completed').length;
  const errorInBatch = queue.filter((q) => q.status === 'error').length;
  const processedCount = completedInBatch + errorInBatch;

  const totalBatchProgressSum = queue.reduce((sum, item) => {
    if (item.status === 'completed') return sum + 100;
    if (item.status === 'converting') return sum + (item.progress || 0);
    return sum;
  }, 0);

  const overallProgressPercentage = totalQueueCount > 0
    ? Math.min(100, Math.round(totalBatchProgressSum / totalQueueCount))
    : 0;

  const handleApplyToSelected = () => {
    if (selectedCountInSector > 0) {
      applyFormatToSelected(selectedBatchFormat, activeSector);
    } else {
      setGlobalTargetFormat(selectedBatchFormat);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 space-y-4">
      {/* 0. Overall Batch Progress Indicator (Always visible to avoid layout jumps) */}
      <div className={`bg-slate-900/95 rounded-2xl p-4 shadow-xl backdrop-blur-xl transition-all duration-300 border ${
        isConvertingAny ? 'border-cyan-500/50 shadow-cyan-950/30 ring-1 ring-cyan-500/20' : 'border-slate-800/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              isConvertingAny
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : completedInBatch > 0 && completedInBatch === totalQueueCount
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-800 border-slate-700'
            }`}>
              {isConvertingAny ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : completedInBatch > 0 && completedInBatch === totalQueueCount ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Layers className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-100 flex flex-wrap items-center gap-2">
                <span>{t.queueOverallProgress}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                  isConvertingAny
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : completedInBatch === totalQueueCount && totalQueueCount > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {t.queueFilesProcessed(processedCount, totalQueueCount, completedInBatch)}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5 h-4">
                {isConvertingAny && activeConvertingItem ? (
                  <span>
                    {t.queueConvertingFile(activeConvertingItem.name, activeConvertingItem.progress, activeConvertingItem.statusText || '')}
                  </span>
                ) : completedInBatch === totalQueueCount && totalQueueCount > 0 ? (
                  <span className="text-emerald-400 font-medium">{t.queueAllProcessed}</span>
                ) : (
                  <span className="text-slate-500">{t.queueReadyStatus}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-2xl font-black font-mono transition-colors ${
              isConvertingAny
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400'
                : completedInBatch === totalQueueCount && totalQueueCount > 0
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}>
              {overallProgressPercentage}%
            </span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full p-0.5 border border-slate-800/80 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
              isConvertingAny
                ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-sm shadow-cyan-500/50'
                : completedInBatch > 0
                ? 'bg-emerald-500'
                : 'bg-slate-800'
            }`}
            style={{ width: `${overallProgressPercentage}%` }}
          >
            {isConvertingAny && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* 1. Contextual Bar when 1 or more items are selected in active sector */}
      {selectedCountInSector > 0 ? (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-purple-950/90 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Left: Selected Counter & Selection Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* High Contrast Selection Badge */}
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow-md border border-cyan-300 shrink-0">
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>
                  {t.selectedCount(selectedCountInSector)}
                  {activeSector !== 'all' && ` (${activeSector})`}
                </span>
                {totalSelectedCount > selectedCountInSector && (
                  <span className="text-[10px] opacity-80 font-normal">
                    ({totalSelectedCount})
                  </span>
                )}
              </div>

              <button
                onClick={() => selectAllItems(!allSelectedInSector, activeSector)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 transition-all border border-slate-600 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                {allSelectedInSector ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{allSelectedInSector ? t.deselectAll : t.selectAll}</span>
              </button>

              <button
                onClick={() => clearSelection(activeSector)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-xs font-bold text-slate-200 hover:text-rose-300 border border-slate-600 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearSelection} ({activeSector})</span>
              </button>
            </div>

            {/* Middle & Right: Selected Batch Format Dropdown & Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
              {/* Target Format Dropdown */}
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-sm">
                <span className="text-xs text-slate-300 font-bold hidden sm:inline">{t.quickTarget}</span>
                <select
                  value={selectedBatchFormat}
                  onChange={(e) => {
                    setSelectedBatchFormat(e.target.value);
                    applyFormatToSelected(e.target.value, activeSector);
                  }}
                  className="bg-slate-900 text-cyan-300 text-xs font-bold font-mono px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {availableFormats.map((fmt) => (
                    <option key={fmt.id} value={fmt.id}>
                      {fmt.name} (.{fmt.extension})
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Format to Selected Button */}
              <button
                onClick={handleApplyToSelected}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/50 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.applyFormat}</span>
              </button>

              {/* Convert Selected Button */}
              <button
                onClick={() => startConversion(undefined, true, activeSector)}
                disabled={isConvertingAny || selectedIdleInSector === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>{t.convertSelected(selectedIdleInSector)}</span>
              </button>

              {/* Download Selected */}
              <button
                onClick={() => downloadSelected(activeSector)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all border border-emerald-400/50 shadow-md flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>{t.downloadSelected(selectedCountInSector)}</span>
              </button>

              {/* Delete Selected */}
              <button
                onClick={() => removeSelected(activeSector)}
                className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs transition-all border border-rose-400/60 shadow-md flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>{t.deleteSelected(selectedCountInSector)}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Global Batch Controls when NO items are selected in active sector */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Select All & Global Format Selector */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Select All Checkbox */}
            <button
              onClick={() => selectAllItems(true, activeSector)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 transition-all border border-slate-600 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
            >
              <Square className="w-4 h-4 text-slate-300" />
              <span>{t.selectAll} ({filteredQueue.length})</span>
            </button>

            {/* Global Target Format Selector */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">{t.quickTarget}</span>
              <select
                value={globalTargetFormat}
                onChange={(e) => setGlobalTargetFormat(e.target.value)}
                className="bg-slate-900 text-cyan-400 text-xs font-bold font-mono px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {availableFormats.map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>
                    {fmt.name} (.{fmt.extension})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Global Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Convert All Button */}
            {totalIdleCount > 0 && (
              <button
                onClick={() => startConversion(undefined, false, activeSector)}
                disabled={isConvertingAny}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t.convertAll(totalIdleCount)}</span>
              </button>
            )}

            {/* Download All ZIP */}
            {completedCount > 1 && (
              <button
                onClick={downloadAllZip}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all border border-emerald-400/50 flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:brightness-110 shadow-md"
              >
                <FileArchive className="w-3.5 h-3.5" />
                <span>{t.downloadAllZip(completedCount)}</span>
              </button>
            )}

            {/* Clear Completed */}
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-600 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Удалить завершенные файлы"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {/* Clear Queue */}
            <button
              onClick={clearQueue}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-xs transition-all border border-slate-600 hover:border-rose-500/50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Очистить очередь"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
