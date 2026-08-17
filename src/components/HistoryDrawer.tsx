import React, { useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import {
  X,
  History,
  Trash2,
  Clock,
  ArrowRight,
  Database,
  FileCheck2,
  Zap
} from 'lucide-react';

export const HistoryDrawer: React.FC = () => {
  const {
    isHistoryOpen,
    historyRecords,
    setHistoryOpen,
    loadHistoryFromDB,
    clearHistoryDB,
    deleteHistoryItemDB,
  } = useConverterStore();

  useEffect(() => {
    if (isHistoryOpen) {
      loadHistoryFromDB();
    }
  }, [isHistoryOpen, loadHistoryFromDB]);

  if (!isHistoryOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Conversion Task Log</h3>
          </div>
          <button
            onClick={() => setHistoryOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database notice */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center space-x-2 text-xs text-slate-400">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Text metadata stored in local IndexedDB / Supabase. Zero binary storage.</span>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {historyRecords.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <FileCheck2 className="w-12 h-12 mx-auto text-slate-700" />
              <p className="text-sm">No conversion history recorded yet.</p>
            </div>
          ) : (
            historyRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white truncate max-w-[220px]">
                    {rec.fileName}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-cyan-400">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {rec.originalFormat}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                      {rec.targetFormat}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {formatDate(rec.timestamp)}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">{formatSize(rec.convertedSize)}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-mono">{rec.durationMs}ms</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteHistoryItemDB(rec.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete Log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {historyRecords.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
            <button
              onClick={clearHistoryDB}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-rose-400 font-semibold text-xs border border-slate-700 hover:border-rose-500/40 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Entire History Log</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
