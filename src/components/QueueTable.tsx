import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';
import { getAvailableTargets } from '../lib/formatSpecs';
import { FileItem } from '../types/converter';
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
  Filter
} from 'lucide-react';

export const QueueTable: React.FC = () => {
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

      {/* Main Queue Table or Empty Search Result */}
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 w-10 text-center">#</th>
                  <th className="p-4">{t.queueTableHeaderInfo}</th>
                  <th className="p-4">{t.queueTableHeaderOrig}</th>
                  <th className="p-4">{t.queueTableHeaderTarget}</th>
                  <th className="p-4 min-w-[180px]">{t.queueTableHeaderStatus}</th>
                  <th className="p-4 text-right">{t.queueTableHeaderActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {processedQueue.map((item: FileItem) => {
                  const isSelected = selectedIds.includes(item.id);
                  const availableTargets = getAvailableTargets(item.category, item.detectedFormat);

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
                    <td className="p-4">
                      <div className="flex items-center space-x-3 max-w-md">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                            {item.name}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                            <span>{formatFileSize(item.size)}</span>
                            {item.convertedSize && (
                              <span className="text-emerald-400 font-mono">
                                → {formatFileSize(item.convertedSize)}
                              </span>
                            )}
                            {item.magicBytesHex && (
                              <span
                                className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                                title={`Hex Header: ${item.magicBytesHex}`}
                              >
                                Hex: {item.magicBytesHex.substring(0, 11)}...
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

                    {/* Target Format Dropdown */}
                    <td className="p-4">
                      <select
                        value={item.targetFormat}
                        onChange={(e) => setTargetFormat(item.id, e.target.value)}
                        disabled={item.status === 'converting'}
                        className="bg-slate-950 text-cyan-400 text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-800 hover:border-cyan-500/50 focus:outline-none focus:border-cyan-400 transition-all disabled:opacity-50"
                      >
                        {availableTargets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (.{t.extension})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status & Progress Bar */}
                    <td className="p-4">
                      {item.status === 'idle' && (
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          <span>{t.queueReady}</span>
                        </div>
                      )}

                      {item.status === 'converting' && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-cyan-400 font-medium flex items-center">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              {item.statusText || t.queueConverting}
                            </span>
                            <span className="font-mono text-slate-300 font-bold">
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
                        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>{item.statusText && item.statusText !== 'Converted' ? item.statusText : t.statusConverted}</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[150px]">{item.error || t.queueFailed}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Convert Individual Item */}
                        {item.status === 'idle' && (
                          <button
                            onClick={() => startConversion(item.id)}
                            className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 transition-colors"
                            title="Convert File"
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
                            title="Re-convert to New Format"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Download Item */}
                        {item.status === 'completed' && (
                          <button
                            onClick={() => downloadItem(item.id)}
                            className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors"
                            title="Download Converted File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Preview Side-by-Side */}
                        {item.status === 'completed' && (
                          <button
                            onClick={() => openPreviewModal(item)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                            title="Preview Converted File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Ephemeral Share Button */}
                        {item.status === 'completed' && (
                          <button
                            onClick={() => openShareModal(item)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors border border-slate-700"
                            title="Share File (Ephemeral 24h Link)"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete File */}
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/60"
                          title="Remove File"
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
      )}
    </div>
  );
};
