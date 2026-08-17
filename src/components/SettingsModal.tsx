import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { X, Settings, Image as ImageIcon, Music, Check } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    defaultQuality,
    defaultAudioBitrate,
    setSettingsOpen,
    setDefaultAudioBitrate,
  } = useConverterStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Engine & Quality Settings</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Default Image Quality Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
              <span className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-1 text-emerald-400" />
                Default Image JPEG / WEBP Quality
              </span>
              <span className="font-mono text-cyan-400">{Math.round(defaultQuality * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="1.0"
              step="0.05"
              value={defaultQuality}
              onChange={(e) =>
                useConverterStore.setState({ defaultQuality: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50% (High Compression)</span>
              <span>100% (Lossless Quality)</span>
            </div>
          </div>

          {/* Audio Bitrate Default */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
              <Music className="w-4 h-4 text-purple-400" />
              <span>Audio Encoding Bitrate</span>
            </div>
            <select
              value={defaultAudioBitrate || '256k'}
              onChange={(e) => setDefaultAudioBitrate(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="128k">128 kbps (Standard)</option>
              <option value="192k">192 kbps (High Quality)</option>
              <option value="256k">256 kbps (Very High)</option>
              <option value="320k">320 kbps (Audiophile Extreme / Max)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
