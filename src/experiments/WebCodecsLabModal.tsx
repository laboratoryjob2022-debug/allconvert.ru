import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FlaskConical,
  Upload,
  Play,
  Square,
  Download,
  Cpu,
  Gauge,
  Film,
  RotateCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Terminal,
} from 'lucide-react';
import { runWebCodecsConversion, LabTelemetry } from './webcodecsLabEngine';

interface WebCodecsLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebCodecsLabModal: React.FC<WebCodecsLabModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState<LabTelemetry | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [telemetry?.logs?.length]);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.mp4')) {
      alert('Пожалуйста, выберите файл в формате MP4 для данного эксперимента.');
      return;
    }
    setFile(selectedFile);
    setTelemetry(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleStartConversion = async () => {
    if (!file) return;

    setIsRunning(true);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const blob = await runWebCodecsConversion(
        file,
        (updatedTelemetry) => {
          setTelemetry(updatedTelemetry);
        },
        abortCtrl.signal
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: any) {
      if (err.message?.includes('отменена')) {
        setTelemetry((prev) => (prev ? { ...prev, statusMessage: 'Операция остановлена пользователем' } : null));
      } else {
        setTelemetry((prev) => (prev ? { ...prev, stage: 'error', error: err.message || String(err) } : null));
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' ГБ';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - High contrast, theme-neutral */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Лаборатория WebCodecs
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase tracking-wider">
                  Sandbox Эксперимент
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Потоковое декодирование MP4 → WebM VP9 без потери кадров и памяти
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isRunning) handleCancel();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* File Picker Card */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тестовый файл</span>
                {file ? (
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <Film className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-100 truncate max-w-xs sm:max-w-md">{file.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Выберите MP4 файл для тестирования (например, 20-секундный тест или большой 2.12 ГБ)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".mp4,video/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFileSelect(selected);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>{file ? 'Заменить' : 'Выбрать MP4'}</span>
                </button>

                {file && !isRunning && (
                  <button
                    onClick={handleStartConversion}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Запустить тест</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Остановить</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry Dashboard */}
          {telemetry && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Progress bar and status */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {isRunning && <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />}
                    <span>{telemetry.statusMessage}</span>
                  </span>
                  <span className="font-mono font-bold text-purple-400 ml-2">{telemetry.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${telemetry.progress}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Metric: Acceleration */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Ускорение</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {telemetry.hardwareAccelerated === true ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> GPU Hardware
                      </span>
                    ) : telemetry.hardwareAccelerated === 'software' ? (
                      <span className="text-amber-300">CPU Native Multi-core</span>
                    ) : (
                      'Определение...'
                    )}
                  </div>
                </div>

                {/* Metric: Processing FPS */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Скорость</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {telemetry.currentProcessingFps > 0 ? (
                      <span>{telemetry.currentProcessingFps} FPS</span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                {/* Metric: Frames Count */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Film className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Кадры</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {telemetry.processedFrames} / {telemetry.totalFrames || '—'}
                  </div>
                </div>

                {/* Metric: RAM usage */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Память RAM</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {telemetry.ramUsageMb ? `${telemetry.ramUsageMb} МБ` : '< 250 МБ (поток)'}
                  </div>
                </div>
              </div>

              {/* Resolution & Geometry comparison */}
              {telemetry.targetWidth > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RotateCw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-slate-400">Геометрия:</span>
                    <span className="text-slate-200 font-mono">
                      {telemetry.originalWidth}×{telemetry.originalHeight} {telemetry.rotation > 0 ? `(угол ${telemetry.rotation}°)` : ''}
                    </span>
                    <span className="text-purple-400">➔</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {telemetry.targetWidth}×{telemetry.targetHeight}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-xs">
                    Целевой битрейт: <span className="text-slate-200 font-bold">{telemetry.targetBitrateMbps} Mbps</span>
                  </div>
                </div>
              )}

              {/* Live Terminal Logs */}
              {telemetry.logs && telemetry.logs.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1 max-h-28 overflow-y-auto">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Логи конвейера WebCodecs</span>
                  </div>
                  {telemetry.logs.map((line, idx) => (
                    <div key={idx} className="text-slate-300 leading-tight">
                      {line}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* Error display if any */}
              {telemetry.error && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300">Ошибка при выполнении эксперимента</div>
                    <div className="mt-0.5 text-rose-200/90">{telemetry.error}</div>
                  </div>
                </div>
              )}

              {/* Result & Download Banner */}
              {downloadUrl && telemetry.stage === 'completed' && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">Экспериментальный WebM готов!</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Все {telemetry.processedFrames} кадров сохранены ({telemetry.targetWidth}×{telemetry.targetHeight}, {telemetry.outputSizeMb} МБ).
                      </p>
                    </div>
                  </div>
                  <a
                    href={downloadUrl}
                    download={`${file?.name.replace(/\.[^/.]+$/, '') || 'converted'}_webcodecs_test.webm`}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать результат ({telemetry.outputSizeMb} МБ)</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Informational Guidance Box */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Цель и условия данного эксперимента</span>
            </div>
            <p>
              1. <strong>Изоляция:</strong> Этот прототип работает автономно через связку{' '}
              <code className="text-purple-300 font-mono">MP4Box + WebCodecs + WebM-Muxer</code>. Основной конвертер и ветка MediaRecorder полностью защищены от изменений.
            </p>
            <p>
              2. <strong>Проверка в анализаторе:</strong> После конвертации скачайте полученный файл и загрузите его в тот же онлайн-анализатор медиа. Если анализатор подтвердит честное сохранение кадров, корректное разрешение и длительность — мы сможем безопасно перенести эту логику в основной конвертер.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
