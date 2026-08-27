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
        return <Music className="w-4 h-4 text-purple-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-rose-400" />;
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 mb-12">
      {/* Search & Sort Controls Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-4 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.queueSearchPlaceholder}
            className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2.5 border border-slate-800 focus:border-cyan-500/60 focus:outline-none transition-all placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Filter Options */}
        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 font-medium px-2 text-[11px] uppercase tracking-wider flex items-center">
              <Filter className="w-3 h-3 mr-1 text-slate-400" /> {t.queueSortLabel}
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-900 text-cyan-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none hover:border-slate-700 cursor-pointer"
            >
              <option value="createdAt">{t.queueSortDate}</option>
              <option value="name">{t.queueSortName}</option>
              <option value="size">{t.queueSortSize}</option>
              <option value="status">{t.queueSortStatus}</option>
              <option value="format">{t.queueSortFormat}</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-colors flex items-center space-x-1"
              title={`Sort Direction: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono font-bold">{sortOrder}</span>
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 shrink-0">
            {t.queueFilesCount(processedQueue.length)}
          </div>
        </div>
      </div>

      {/* Main Queue Table or Mobile Cards / Empty Search Result */}
      {processedQueue.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <p className="text-sm text-slate-400 mb-3">{t.queueNoFilesFound(searchQuery)}</p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-colors"
          >
            {t.queueClearSearch}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
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
                      ? 'bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80'
                  }`}
                >
                  {/* Card Header: Checkbox, Icon, Name & Size */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0 p-1"
                        aria-label="Select file"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
                        {getCategoryIcon(item.category)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-bold text-sm text-slate-100 truncate hover:text-cyan-300 transition-colors"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-mono">
                          <span>{formatFileSize(item.size)}</span>
                          {item.convertedSize && (
                            <span className="text-emerald-400 font-semibold">
                              → {formatFileSize(item.convertedSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Formats & Status */}
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/90 space-y-2.5 mb-3 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <span className="text-slate-200 font-semibold text-xs shrink-0">Формат:</span>
                      <div className="flex items-center space-x-1.5 min-w-0 max-w-[75%]">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                          {item.detectedFormat}
                        </span>
                        <span className="text-slate-400 font-bold shrink-0">→</span>
                        <select
                          value={item.targetFormat}
                          onChange={(e) => setTargetFormat(item.id, e.target.value)}
                          disabled={item.status === 'converting'}
                          className="bg-slate-900 text-cyan-400 text-xs font-bold font-mono px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-400 transition-all disabled:opacity-50 min-w-0 flex-1 truncate max-w-[140px] xs:max-w-[170px]"
                        >
                          {groupedTargets.map((group) => (
                            <optgroup key={group.category} label={group.label} className="bg-slate-950 text-cyan-400 font-bold font-sans">
                              {group.options.map((t) => (
                                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100 font-normal font-mono">
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
                          className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between border transition-all disabled:opacity-50 ${
                            item.settings.multiPageExportMode === 'zip_archive'
                              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                              : item.settings.multiPageExportMode === 'selected_page'
                              ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                              : 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'
                          }`}
                        >
                          <span className="flex items-center space-x-2 truncate">
                            {item.settings.multiPageExportMode === 'zip_archive' ? (
                              <Archive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {item.settings.multiPageExportMode === 'zip_archive'
                                ? 'Экспорт: ZIP (Все листы отдельно)'
                                : item.settings.multiPageExportMode === 'selected_page'
                                ? `Экспорт: Лист ${item.settings.selectedPageOrSheet || 1}`
                                : 'Экспорт: Сплошная инфографика (Все листы)'}
                            </span>
                          </span>
                          <span className="text-xs opacity-80">⚙️</span>
                        </button>
                      </div>
                    )}

                    {/* Status Display */}
                    <div className="pt-1.5 border-t border-slate-800/80">
                      {item.status === 'idle' && (
                        <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                          <span>{t.queueReady}</span>
                        </div>
                      )}

                      {item.status === 'converting' && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-cyan-400 font-medium flex items-center">
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              {item.statusText || t.queueConverting}
                            </span>
                            <span className="font-mono text-slate-300 font-bold">
                              {item.progress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300 rounded-full"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {item.status === 'completed' && (
                        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {item.statusText && item.statusText !== 'Converted'
                              ? item.statusText
                              : t.statusConverted}
                          </span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.error || t.queueFailed}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Touch-Friendly Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {item.status === 'idle' && (
                      <button
                        onClick={() => startConversion(item.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-semibold text-xs border border-cyan-500/40 flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <Play className="w-4 h-4 fill-cyan-400" />
                        <span>Конвертировать</span>
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={() => startConversion(item.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-400 font-semibold text-xs border border-amber-500/40 flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Повторить</span>
                      </button>
                    )}

                    {item.status === 'completed' && (
                      <>
                        <button
                          onClick={() => reconvertItem(item.id, item.targetFormat)}
                          className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40 active:scale-95 transition-all"
                          title="Переконвертировать"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openPreviewModal(item)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
                          title="Предпросмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openShareModal(item)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 active:scale-95 transition-all"
                          title="Поделиться"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => downloadItem(item.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-xs border border-emerald-500/40 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          <span>Скачать</span>
                        </button>
                      </>
                    )}

                    {/* Delete File */}
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 border border-slate-700/60 active:scale-95 transition-all"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Fixed Table (>= md / >=768px) */}
          <div className="hidden md:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[32%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[20%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 text-center">#</th>
                    <th className="p-4">{t.queueTableHeaderInfo}</th>
                    <th className="p-4">{t.queueTableHeaderOrig}</th>
                    <th className="p-4">{t.queueTableHeaderTarget}</th>
                    <th className="p-4">{t.queueTableHeaderStatus}</th>
                    <th className="p-4 text-right">{t.queueTableHeaderActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {processedQueue.map((item: FileItem) => {
                    const isSelected = selectedIds.includes(item.id);
                    const groupedTargets = getGroupedAvailableTargets(item.category, item.detectedFormat, item.category, language || 'ru');

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-colors ${
                          isSelected ? 'bg-cyan-950/20' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleSelectItem(item.id)}
                            className="text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* File Info */}
                        <td className="p-4 overflow-hidden">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors"
                                title={item.name}
                              >
                                {item.name}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-mono truncate">
                                <span>{formatFileSize(item.size)}</span>
                                {item.convertedSize && (
                                  <span className="text-emerald-400 font-mono">
                                    → {formatFileSize(item.convertedSize)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sniffed Original Format Badge */}
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                            {item.detectedFormat}
                          </span>
                        </td>

                        {/* Target Format Dropdown & Multi-page Mode Button */}
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <select
                              value={item.targetFormat}
                              onChange={(e) => setTargetFormat(item.id, e.target.value)}
                              disabled={item.status === 'converting'}
                              className="w-full max-w-[170px] bg-slate-950 text-cyan-400 text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-800 hover:border-cyan-500/50 focus:outline-none focus:border-cyan-400 transition-all disabled:opacity-50 truncate"
                            >
                              {groupedTargets.map((group) => (
                                <optgroup key={group.category} label={group.label} className="bg-slate-950 text-cyan-400 font-bold font-sans">
                                  {group.options.map((t) => (
                                    <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100 font-normal font-mono">
                                      {t.name} (.{t.extension})
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>

                            {/* Multi-page / Sheet Settings Button for Desktop */}
                            {isMultiPageEligible(item) && (
                              <button
                                type="button"
                                onClick={() => setMultiPageModalItem(item)}
                                disabled={item.status === 'converting'}
                                className={`w-full max-w-[170px] px-2.5 py-1 rounded-lg text-[10.5px] font-medium flex items-center justify-between border transition-all disabled:opacity-50 ${
                                  item.settings.multiPageExportMode === 'zip_archive'
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40'
                                    : item.settings.multiPageExportMode === 'selected_page'
                                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40'
                                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40'
                                }`}
                                title="Настройка экспорта листов и страниц (склейка в 1 файл / ZIP / выбор листа)"
                              >
                                <span className="flex items-center space-x-1 truncate">
                                  {item.settings.multiPageExportMode === 'zip_archive' ? (
                                    <Archive className="w-3 h-3 text-emerald-400 shrink-0" />
                                  ) : (
                                    <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                                  )}
                                  <span className="truncate font-sans">
                                    {item.settings.multiPageExportMode === 'zip_archive'
                                      ? 'ZIP (Все листы/стр.)'
                                      : item.settings.multiPageExportMode === 'selected_page'
                                      ? `${(item.detectedFormat === 'XLSX' || item.detectedFormat === 'XLS') ? 'Лист' : 'Стр.'}: ${item.settings.selectedPageOrSheet || 1}`
                                      : 'Сплошной (Все)'}
                                  </span>
                                </span>
                                <span className="text-[9px] opacity-70 ml-1">⚙️</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status & Progress Bar */}
                        <td className="p-4 overflow-hidden">
                          {item.status === 'idle' && (
                            <div className="flex items-center space-x-2 text-xs text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                              <span>{t.queueReady}</span>
                            </div>
                          )}

                          {item.status === 'converting' && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-cyan-400 font-medium flex items-center truncate mr-2">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin shrink-0" />
                                  <span className="truncate">{item.statusText || t.queueConverting}</span>
                                </span>
                                <span className="font-mono text-slate-300 font-bold shrink-0">
                                  {item.progress}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {item.status === 'completed' && (
                            <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium truncate">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              <span className="truncate">
                                {item.statusText && item.statusText !== 'Converted'
                                  ? item.statusText
                                  : t.statusConverted}
                              </span>
                            </div>
                          )}

                          {item.status === 'error' && (
                            <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span className="truncate" title={item.error || t.queueFailed}>
                                {item.error || t.queueFailed}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Convert Individual Item */}
                            {item.status === 'idle' && (
                              <button
                                onClick={() => startConversion(item.id)}
                                className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 transition-colors"
                                title="Конвертировать файл"
                              >
                                <Play className="w-3.5 h-3.5 fill-cyan-400" />
                              </button>
                            )}

                            {/* Retry button for Error state */}
                            {item.status === 'error' && (
                              <button
                                onClick={() => startConversion(item.id)}
                                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition-colors"
                                title="Попробовать конвертировать снова"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Unlimited Re-convert Button */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => reconvertItem(item.id, item.targetFormat)}
                                className="p-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40 transition-colors"
                                title="Переконвертировать в новый формат"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Download Item */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => downloadItem(item.id)}
                                className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors"
                                title="Скачать конвертированный файл"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Preview Side-by-Side */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => openPreviewModal(item)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                                title="Предпросмотр файла"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Ephemeral Share Button */}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => openShareModal(item)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors border border-slate-700"
                                title="Поделиться файлом"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete File */}
                            <button
                              onClick={() => removeFile(item.id)}
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/60"
                              title="Удалить файл"
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
