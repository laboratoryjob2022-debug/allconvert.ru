import React, { useState } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { getAvailableTargets, getGroupedAvailableTargets } from '../lib/formatSpecs';
import { FileItem } from '../types/converter';
import { MultiPageSettingsModal } from './MultiPageSettingsModal';
import {
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Play,
  Download,
  Share2,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
  Search,
  ArrowUpDown,
  X,
  Filter,
  Layers,
  Archive
} from 'lucide-react';

export const QueueTable: React.FC = () => {
  const [multiPageModalItem, setMultiPageModalItem] = useState<FileItem | null>(null);

  const {
    queue,
    activeSector,
    selectedIds,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSelectItem,
    setTargetFormat,
    removeFile,
    startConversion,
    reconvertItem,
    downloadItem,
    openShareModal,
    openPreviewModal,
    language,
  } = useConverterStore();

  const t = getTranslation(language || 'ru');

  const isMultiPageEligible = (item: FileItem) => {
    const src = (item.detectedFormat || '').toUpperCase();
    const tgt = (item.targetFormat || '').toUpperCase();
    const isDocSrc = ['XLSX', 'XLS', 'PDF', 'DOCX', 'DOC', 'HTML', 'CSV', 'TXT'].includes(src);
    const isImageTgt = ['PNG', 'JPG', 'JPEG', 'WEBP', 'BMP', 'ICO'].includes(tgt);
    return (src === 'XLSX' || src === 'XLS' || src === 'PDF') || (isDocSrc && isImageTgt);
  };

  // If no files in total queue, render nothing
  if (queue.length === 0) return null;

  // 1. Sector Auto-Filtering
  let processedQueue = activeSector === 'all'
    ? queue
    : queue.filter((item) => item.category === activeSector);

  // 2. Real-time Search Filtering
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    processedQueue = processedQueue.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.detectedFormat.toLowerCase().includes(q) ||
        item.targetFormat.toLowerCase().includes(q)
    );
  }

  // 3. Sorting logic
  processedQueue = [...processedQueue].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      comparison = a.size - b.size;
    } else if (sortBy === 'status') {
      const statusOrder: Record<string, number> = {
        idle: 1,
        converting: 2,
        completed: 3,
        error: 4,
      };
      comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    } else if (sortBy === 'format') {
      comparison = a.detectedFormat.localeCompare(b.detectedFormat);
    } else if (sortBy === 'createdAt') {
      comparison = a.createdAt - b.createdAt;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'audio':
        return <Music className="w-4 h-4 text-indigo-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-sky-400" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasDocumentInQueue = processedQueue.some(
    (item) =>
      item.category === 'document' ||
      ['PDF', 'DOCX', 'XLSX', 'XLS', 'CSV', 'HTML', 'TXT', 'JSON', 'XML', 'MD'].includes((item.targetFormat || '').toUpperCase())
  );
  const showDocBetaNotice = activeSector === 'document' || hasDocumentInQueue;

  const getDocBetaNotice = (lang: string) => {
    switch (lang) {
      case 'en':
        return 'Documents — Beta: some complex documents and tables may convert with layout variations.';
      case 'zh':
        return '文档 — Beta: 某些复杂的文档和表格转换后排版可能会有细微变化。';
      case 'es':
        return 'Documentos — Beta: algunos documentos y tablas complejos pueden convertirse con variaciones en el formato.';
      case 'de':
        return 'Dokumente — Beta: einige komplexe Dokumente und Tabellen können mit Formatierungsänderungen konvertiert werden.';
      case 'ru':
      default:
        return 'Документы — Beta: некоторые сложные документы и таблицы могут конвертироваться с изменениями в оформлении.';
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Search & Sort Controls Bar (Screenshot Row 3) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.queueSearchPlaceholder}
            className="w-full bg-white text-slate-800 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Filter Options */}
        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 font-bold px-1 text-[11px] uppercase tracking-wider flex items-center">
              <Filter className="w-3 h-3 mr-1 text-slate-400" /> {t.queueSortLabel}:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs cursor-pointer"
            >
              <option value="createdAt">{t.queueSortDate}</option>
              <option value="name">{t.queueSortName}</option>
              <option value="size">{t.queueSortSize}</option>
              <option value="status">{t.queueSortStatus}</option>
              <option value="format">{t.queueSortFormat}</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors flex items-center space-x-1"
              title={`Sort Direction: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono font-bold">{sortOrder}</span>
            </button>
          </div>

          <div className="text-slate-600 text-xs font-medium pl-1 shrink-0">
            {t.queueFilesCount(processedQueue.length)}
          </div>
        </div>
      </div>

      {/* Beta Notice for Documents (Screenshot Row 4) */}
      {showDocBetaNotice && processedQueue.length > 0 && (
        <div className="px-4 py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl shadow-xs flex items-center space-x-3 text-xs text-[#92400e] relative isolate">
          <span className="px-2 py-0.5 rounded-md bg-[#fef3c7] border border-[#fcd34d] text-[10px] font-black text-[#b45309] font-mono shrink-0 uppercase tracking-wider">
            BETA
          </span>
          <p className="text-[#92400e] text-xs font-medium leading-relaxed">
            {getDocBetaNotice(language || 'ru')}
          </p>
        </div>
      )}

      {/* Main Queue Table or Mobile Cards / Empty Search Result */}
      {processedQueue.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs relative isolate">
          <p className="text-sm text-slate-600 mb-3">{t.queueNoFilesFound(searchQuery)}</p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition-colors"
          >
            {t.queueClearSearch}
          </button>
        </div>
      ) : (
        <div className="w-full">
          {/* MOBILE VIEW: Card List (< md / <768px) */}
          <div className="md:hidden space-y-3">
            {processedQueue.map((item: FileItem) => {
              const isSelected = selectedIds.includes(item.id);
              const groupedTargets = getGroupedAvailableTargets(item.category, item.detectedFormat, item.category, language || 'ru');

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {/* Step 1: File Header (Checkbox, Icon, Name, Size & Quick Delete) */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0 p-1"
                        aria-label="Select file"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-bold text-sm text-slate-900 truncate hover:text-emerald-700 transition-colors"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 font-mono">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            {item.detectedFormat}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(item.size)}</span>
                          {item.convertedSize && (
                            <span className="text-emerald-600 font-semibold font-mono">
                              → {formatFileSize(item.convertedSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Delete */}
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={t.queueDeleteTooltip}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step 2 & 3: Target Format & Mode Pipeline */}
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200 space-y-2.5 mb-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 font-medium shrink-0 text-xs">
                        {t.queueTableHeaderTarget}:
                      </span>
                      <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
                        <span className="text-slate-400 font-bold shrink-0">—</span>
                        <select
                          value={item.targetFormat}
                          onChange={(e) => setTargetFormat(item.id, e.target.value)}
                          disabled={item.status === 'converting'}
                          className="bg-white text-slate-800 text-xs font-semibold font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 shadow-xs transition-all disabled:opacity-50 min-w-0 flex-1 max-w-[160px] truncate"
                        >
                          {groupedTargets.map((group) => (
                            <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                              {group.options.map((t) => (
                                <option key={t.id} value={t.id} className="text-slate-800 font-normal font-mono">
                                  {t.name} (.{t.extension})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Multi-page / Sheet Settings Button for Mobile */}
                    {isMultiPageEligible(item) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setMultiPageModalItem(item)}
                          disabled={item.status === 'converting'}
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all disabled:opacity-50 shadow-xs"
                        >
                          <span className="flex items-center space-x-2 truncate">
                            {item.settings.multiPageExportMode === 'zip_archive' ? (
                              <Archive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">
                              {item.settings.multiPageExportMode === 'zip_archive'
                                ? 'ZIP (Все листы/стр.)'
                                : item.settings.multiPageExportMode === 'selected_page'
                                ? `${(item.detectedFormat === 'XLSX' || item.detectedFormat === 'XLS') ? 'Лист' : 'Стр.'}: ${item.settings.selectedPageOrSheet || 1}`
                                : 'Сплошной (Все)'}
                            </span>
                          </span>
                          <span className="text-xs text-slate-400">⚙️</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Primary Action / Status Row */}
                  <div className="space-y-2">
                    {item.status === 'idle' && (
                      <button
                        onClick={() => startConversion(item.id)}
                        className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-medium text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                      >
                        <Play className="w-4 h-4 fill-white text-white shrink-0" />
                        <span className="font-bold text-white">{t.queueConvertAction}</span>
                      </button>
                    )}

                    {item.status === 'converting' && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-emerald-600 font-medium flex items-center">
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin shrink-0" />
                            <span className="truncate">{item.statusText || t.queueConverting}</span>
                          </span>
                          <span className="font-mono text-slate-700 font-bold shrink-0">
                            {item.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => downloadItem(item.id)}
                          className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-medium text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                        >
                          <Download className="w-4 h-4 text-white shrink-0" />
                          <span>{t.queueDownloadAction}</span>
                          {item.convertedSize && (
                            <span className="text-[11px] font-normal opacity-90 font-mono">
                              ({formatFileSize(item.convertedSize)})
                            </span>
                          )}
                        </button>

                        {/* Secondary Actions for Completed Item */}
                        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200">
                          <button
                            onClick={() => reconvertItem(item.id, item.targetFormat)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs active:scale-95 transition-all"
                            title={t.queueReconvertTooltip}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openPreviewModal(item)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs active:scale-95 transition-all"
                            title={t.queuePreviewTooltip}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openShareModal(item)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs active:scale-95 transition-all"
                            title={t.queueShareTooltip}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.error || t.queueFailed}</span>
                        </div>
                        <button
                          onClick={() => startConversion(item.id)}
                          className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-amber-600 border border-slate-200 shadow-xs active:scale-98 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t.queueRetryAction}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Streamlined Fixed Table Matching Screenshot Row 5 */}
          <div className="hidden md:block overflow-x-auto relative isolate table-container-safe bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed relative">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[34%]" />
                  <col className="w-[26%]" />
                  <col className="w-[24%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="p-4 text-center">#</th>
                    <th className="p-4">{t.queueTableHeaderInfo}</th>
                    <th className="p-4">{t.queueTableHeaderTarget}</th>
                    <th className="p-4">{t.queueTableHeaderStatus}</th>
                    <th className="p-4 text-right">{t.queueTableHeaderActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                  {processedQueue.map((item: FileItem) => {
                    const isSelected = selectedIds.includes(item.id);
                    const groupedTargets = getGroupedAvailableTargets(item.category, item.detectedFormat, item.category, language || 'ru');

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-colors ${
                          isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleSelectItem(item.id)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Step 1: Uploaded File Info (Icon, Name, Source Format & Size) */}
                        <td className="p-4 overflow-hidden">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors"
                                title={item.name}
                              >
                                {item.name}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 font-mono truncate">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.detectedFormat}
                                </span>
                                <span>•</span>
                                <span>{formatFileSize(item.size)}</span>
                                {item.convertedSize && (
                                  <span className="text-emerald-600 font-mono font-semibold">
                                    → {formatFileSize(item.convertedSize)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Step 2 & 3: Target Format & Mode Pipeline */}
                        <td className="p-4">
                          <div className="space-y-1.5 max-w-[220px]">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-400 font-bold text-xs shrink-0">—</span>
                              <select
                                value={item.targetFormat}
                                onChange={(e) => setTargetFormat(item.id, e.target.value)}
                                disabled={item.status === 'converting'}
                                className="w-full bg-white text-slate-800 text-xs font-semibold font-mono px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs transition-all disabled:opacity-50 truncate cursor-pointer"
                              >
                                {groupedTargets.map((group) => (
                                  <optgroup key={group.category} label={group.label} className="text-slate-500 font-semibold font-sans">
                                    {group.options.map((t) => (
                                      <option key={t.id} value={t.id} className="text-slate-800 font-normal font-mono">
                                        {t.name} (.{t.extension})
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>

                            {/* Multi-page / Sheet Settings Button for Desktop */}
                            {isMultiPageEligible(item) && (
                              <button
                                type="button"
                                onClick={() => setMultiPageModalItem(item)}
                                disabled={item.status === 'converting'}
                                className="w-full px-2.5 py-1 rounded-lg text-[10.5px] font-semibold flex items-center justify-between border border-slate-200 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 transition-all disabled:opacity-50"
                                title={t.queuePageSettingsTooltip}
                              >
                                <span className="flex items-center space-x-1.5 truncate">
                                  {item.settings.multiPageExportMode === 'zip_archive' ? (
                                    <Archive className="w-3 h-3 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
                                  )}
                                  <span className="truncate font-sans font-medium">
                                    {item.settings.multiPageExportMode === 'zip_archive'
                                      ? 'ZIP (Все листы/стр.)'
                                      : item.settings.multiPageExportMode === 'selected_page'
                                      ? `${(item.detectedFormat === 'XLSX' || item.detectedFormat === 'XLS') ? 'Лист' : 'Стр.'}: ${item.settings.selectedPageOrSheet || 1}`
                                      : 'Сплошной (Все)'}
                                  </span>
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1">⚙️</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Step 4: Status & Primary Action Button */}
                        <td className="p-4 overflow-hidden">
                          {item.status === 'idle' && (
                            <button
                              onClick={() => startConversion(item.id)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                              <span>{t.queueConvertAction}</span>
                            </button>
                          )}

                          {item.status === 'converting' && (
                            <div className="max-w-[190px]">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-emerald-600 font-medium flex items-center truncate mr-2">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin shrink-0" />
                                  <span className="truncate">{item.statusText || t.queueConverting}</span>
                                </span>
                                <span className="font-mono text-slate-700 font-bold shrink-0">
                                  {item.progress}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {item.status === 'completed' && (
                            <button
                              onClick={() => downloadItem(item.id)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                            >
                              <Download className="w-3.5 h-3.5 text-white shrink-0" />
                              <span>{t.queueDownloadAction}</span>
                            </button>
                          )}

                          {item.status === 'error' && (
                            <div className="space-y-1 max-w-[190px]">
                              <div className="flex items-center space-x-1 text-xs text-rose-500 truncate">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate" title={item.error || t.queueFailed}>
                                  {item.error || t.queueFailed}
                                </span>
                              </div>
                              <button
                                onClick={() => startConversion(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-amber-600 border border-slate-200 shadow-xs transition-colors text-xs flex items-center space-x-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{t.queueRetryAction}</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Secondary Actions (Options) Matching Screenshot */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Re-convert */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => reconvertItem(item.id, item.targetFormat)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors"
                                title={t.queueReconvertTooltip}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Preview Side-by-Side */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => openPreviewModal(item)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors"
                                title={t.queuePreviewTooltip}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Ephemeral Share Button */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => openShareModal(item)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors"
                                title={t.queueShareTooltip}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete File */}
                            <button
                              onClick={() => removeFile(item.id)}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors"
                              title={t.queueDeleteTooltip}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Multi-page / Sheet Settings Modal */}
      {multiPageModalItem && (
        <MultiPageSettingsModal
          item={multiPageModalItem}
          onClose={() => setMultiPageModalItem(null)}
        />
      )}
    </div>
  );
};
