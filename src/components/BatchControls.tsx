import React, { useState, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { getAvailableTargets, getGroupedAvailableTargets } from '../lib/formatSpecs';
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

  const firstFileCategory = queue[0]?.category;
  const priorityCategory = activeSector !== 'all' ? activeSector : firstFileCategory;
  const groupedFormats = getGroupedAvailableTargets(activeSector, undefined, priorityCategory, language || 'ru');

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

  return (
    <div className="w-full space-y-3.5">
      {/* 0. Overall Batch Progress Indicator (Always visible to avoid layout jumps) */}
      <div className={`p-4 sm:px-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs relative isolate transition-all duration-300 ${
        isConvertingAny ? 'bg-blue-50/40 border-blue-200' : ''
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              isConvertingAny
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : completedInBatch > 0 && completedInBatch === totalQueueCount
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              {isConvertingAny ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : completedInBatch > 0 && completedInBatch === totalQueueCount ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Layers className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                <span>{t.queueOverallProgress}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                  isConvertingAny
                    ? 'bg-blue-100/70 text-blue-800 border-blue-200'
                    : completedInBatch === totalQueueCount && totalQueueCount > 0
                    ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200/60'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {t.queueFilesProcessed(processedCount, totalQueueCount, completedInBatch)}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5 h-4">
                {isConvertingAny && activeConvertingItem ? (
                  <span>
                    {t.queueConvertingFile(activeConvertingItem.name, activeConvertingItem.progress, activeConvertingItem.statusText || '')}
                  </span>
                ) : completedInBatch === totalQueueCount && totalQueueCount > 0 ? (
                  <span className="text-emerald-700 font-medium">{t.queueAllProcessed}</span>
                ) : (
                  <span className="text-slate-500">{t.queueReadyStatus}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-2xl font-black font-mono transition-colors ${
              isConvertingAny
                ? 'text-blue-600'
                : completedInBatch === totalQueueCount && totalQueueCount > 0
                ? 'text-emerald-600'
                : 'text-slate-600'
            }`}>
              {overallProgressPercentage}%
            </span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full border border-slate-200/60 overflow-hidden shadow-xs">
          <div
            className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
              isConvertingAny
                ? 'bg-blue-600'
                : completedInBatch > 0
                ? 'bg-emerald-500'
                : 'bg-slate-300'
            }`}
            style={{ width: `${overallProgressPercentage}%` }}
          >
            {isConvertingAny && <div className="absolute inset-0 bg-white/30 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* 1. Contextual Bar when 1 or more items are selected in active sector */}
      {selectedCountInSector > 0 ? (
        <div className="p-1 relative isolate animate-in fade-in duration-200">
          {/* Mobile Layout (< md) */}
          <div className="md:hidden space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            {/* Header: Selected Count Badge & Clear Selection Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
                onClick={() => clearSelection(activeSector)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-xs font-semibold text-slate-700 hover:text-rose-600 border border-slate-200 transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearSelection}</span>
              </button>
            </div>

            {/* Target Format Dropdown (w-full) */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] text-slate-600 font-bold uppercase tracking-wider px-1">
                {t.quickTarget}
              </label>
              <select
                value={selectedBatchFormat}
                onChange={(e) => {
                  const newFmt = e.target.value;
                  setSelectedBatchFormat(newFmt);
                  applyFormatToSelected(newFmt, activeSector);
                }}
                className="w-full bg-white text-slate-800 text-xs font-semibold font-mono px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                {groupedFormats.map((group) => (
                  <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                    {group.options.map((fmt) => (
                      <option key={fmt.id} value={fmt.id} className="text-slate-800 font-normal font-mono">
                        {fmt.name} (.{fmt.extension})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Main Primary Action Button (w-full, py-3) */}
            <button
              onClick={() => startConversion(undefined, true, activeSector)}
              disabled={isConvertingAny || selectedIdleInSector === 0}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98"
            >
              <Play className="w-4 h-4 fill-white text-white shrink-0" />
              <span className="text-white font-bold">{t.convertSelected(selectedIdleInSector)}</span>
            </button>

            {/* Secondary Buttons Row: 50/50 Grid */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => downloadSelected(activeSector)}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all border border-emerald-500/40 shadow-xs flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="truncate">{t.downloadSelected(selectedCountInSector)}</span>
              </button>

              <button
                onClick={() => removeSelected(activeSector)}
                className="w-full py-2 px-3 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-medium text-xs transition-all border border-slate-200 shadow-xs flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{t.deleteSelected(selectedCountInSector)}</span>
              </button>
            </div>
          </div>

          {/* Desktop Layout (>= md) */}
          <div className="hidden md:flex flex-row items-center justify-between gap-4">
            {/* Left: Selected Counter & Selection Controls */}
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 shrink-0 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
                onClick={() => clearSelection(activeSector)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.clearSelection}</span>
              </button>
            </div>

            {/* Middle & Right: Selected Batch Format Dropdown & Actions */}
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-700 font-bold">{t.quickTarget}</span>
                <select
                  value={selectedBatchFormat}
                  onChange={(e) => {
                    const newFmt = e.target.value;
                    setSelectedBatchFormat(newFmt);
                    applyFormatToSelected(newFmt, activeSector);
                  }}
                  className="bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 shadow-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {groupedFormats.map((group) => (
                    <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                      {group.options.map((fmt) => (
                        <option key={fmt.id} value={fmt.id} className="text-slate-800 font-normal font-mono">
                          {fmt.name} (.{fmt.extension})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button
                onClick={() => startConversion(undefined, true, activeSector)}
                disabled={isConvertingAny || selectedIdleInSector === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span className="text-white font-bold">{t.convertSelected(selectedIdleInSector)}</span>
              </button>

              <button
                onClick={() => downloadSelected(activeSector)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>{t.downloadSelected(selectedCountInSector)}</span>
              </button>

              <button
                onClick={() => removeSelected(activeSector)}
                className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-medium text-xs transition-all border border-slate-200 shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title={t.deleteSelected(selectedCountInSector)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Global Batch Controls when NO items are selected in active sector */
        <div className="p-1 relative isolate">
          {/* Mobile Layout (< md) */}
          <div className="md:hidden space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            {/* Select All Checkbox Button */}
            <button
              onClick={() => selectAllItems(true, activeSector)}
              className="w-full flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-all border border-slate-200 shadow-xs active:scale-98"
            >
              <Square className="w-4 h-4 text-slate-500" />
              <span>{t.selectAll} ({filteredQueue.length})</span>
            </button>

            {/* Global Target Format Selector (w-full) */}
            <div className="flex flex-col space-y-1">
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider px-1">
                {t.quickTarget}
              </span>
              <select
                value={globalTargetFormat}
                onChange={(e) => setGlobalTargetFormat(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-semibold font-mono px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                {groupedFormats.map((group) => (
                  <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                    {group.options.map((fmt) => (
                      <option key={fmt.id} value={fmt.id} className="text-slate-800 font-normal font-mono">
                        {fmt.name} (.{fmt.extension})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Convert All Button (w-full, py-3) */}
            {totalIdleCount > 0 && (
              <button
                onClick={() => startConversion(undefined, false, activeSector)}
                disabled={isConvertingAny}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98"
              >
                <Play className="w-4 h-4 fill-white text-white shrink-0" />
                <span className="text-white font-bold">{t.convertAll(totalIdleCount)}</span>
              </button>
            )}

            {/* Secondary Actions Row: 50/50 Grid */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {completedCount > 1 ? (
                <button
                  onClick={downloadAllZip}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  <FileArchive className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="truncate">{t.downloadAllZip(completedCount)}</span>
                </button>
              ) : completedCount > 0 ? (
                <button
                  onClick={clearCompleted}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all border border-slate-200 shadow-xs flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{t.queueClearCompleted}</span>
                </button>
              ) : null}

              <button
                onClick={clearQueue}
                className={`py-2 px-3 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-semibold transition-all border border-slate-200 shadow-xs flex items-center justify-center space-x-1.5 active:scale-95 ${
                  completedCount <= 0 ? 'col-span-2' : ''
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t.queueClearAll}</span>
              </button>
            </div>
          </div>

          {/* Desktop Layout (>= md) Matching Screenshot Row 2 */}
          <div className="hidden md:flex flex-row items-center justify-between gap-4">
            {/* Left: Select All & Target Format */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => selectAllItems(true, activeSector)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 transition-all border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer active:scale-98"
              >
                <Square className="w-4 h-4 text-slate-400" />
                <span>{t.selectAll} ({filteredQueue.length})</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-700 font-bold">{t.quickTarget}</span>
                <select
                  value={globalTargetFormat}
                  onChange={(e) => setGlobalTargetFormat(e.target.value)}
                  className="bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 shadow-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {groupedFormats.map((group) => (
                    <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                      {group.options.map((fmt) => (
                        <option key={fmt.id} value={fmt.id} className="text-slate-800 font-normal font-mono">
                          {fmt.name} (.{fmt.extension})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Global Actions Matching Screenshot */}
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {totalIdleCount > 0 && (
                <button
                  onClick={() => startConversion(undefined, false, activeSector)}
                  disabled={isConvertingAny}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>{t.convertAll(totalIdleCount)}</span>
                </button>
              )}

              {completedCount > 1 && (
                <button
                  onClick={downloadAllZip}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>{t.downloadAllZip(completedCount)}</span>
                </button>
              )}

              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-600 transition-all border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer active:scale-98"
                  title={t.queueClearCompleted}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={clearQueue}
                className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer active:scale-98"
                title={t.queueClearAll}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
