import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { X, Settings, Image as ImageIcon, Music, Check, Layers, Info } from 'lucide-react';
import { LanguageCode } from '../lib/i18n';

const settingsTranslations: Record<LanguageCode, {
  title: string;
  qualityLabel: string;
  qualityMin: string;
  qualityMax: string;
  qualityTipTitle: string;
  qualityTipText: string;
  audioBitrateLabel: string;
  audio128: string;
  audio192: string;
  audio256: string;
  audio320: string;
  multiSheetTitle: string;
  multiSheetDesc: string;
  saveBtn: string;
}> = {
  ru: {
    title: 'Параметры движка и качество',
    qualityLabel: 'Качество сжатия изображений (JPEG / WEBP / AVIF)',
    qualityMin: '50% (Высокое сжатие)',
    qualityMax: '100% (Максимальное качество)',
    qualityTipTitle: 'Подсказка по качеству:',
    qualityTipText: 'При 100% сохраняется первоначальная чёткость и детализация без артефактов. Для уменьшения веса файла (до 2–3 раз) выберите 85–90% — сжатие остаётся визуально незаметным для человеческого глаза.',
    audioBitrateLabel: 'Битрейт кодирования аудио',
    audio128: '128 kbps (Стандарт)',
    audio192: '192 kbps (Высокое качество)',
    audio256: '256 kbps (Очень высокое качество)',
    audio320: '320 kbps (Максимум / Студийный битрейт)',
    multiSheetTitle: 'Многостраничные документы и Excel',
    multiSheetDesc: 'Вы можете настроить индивидуальный режим экспорта для каждого файла прямо в таблице очереди: сплошная склейка всех листов (инфографика), ZIP-архив с отдельными файлами или выбор конкретного года/листа.',
    saveBtn: 'Сохранить настройки',
  },
  en: {
    title: 'Engine Settings & Quality',
    qualityLabel: 'Image Compression Quality (JPEG / WEBP / AVIF)',
    qualityMin: '50% (High compression)',
    qualityMax: '100% (Maximum quality)',
    qualityTipTitle: 'Quality Tip:',
    qualityTipText: 'Setting 100% preserves original sharpness and detail with zero visual artifacts. To reduce file size by 2–3x, choose 85–90% — compression remains virtually imperceptible to the human eye.',
    audioBitrateLabel: 'Audio Encoding Bitrate',
    audio128: '128 kbps (Standard)',
    audio192: '192 kbps (High Quality)',
    audio256: '256 kbps (Very High Quality)',
    audio320: '320 kbps (Maximum / Studio Bitrate)',
    multiSheetTitle: 'Multi-page Documents & Excel',
    multiSheetDesc: 'You can configure custom export modes for each file directly in the queue table: merged continuous document, separate files in a ZIP archive, or a specific sheet/page.',
    saveBtn: 'Save Settings',
  },
  es: {
    title: 'Parámetros del motor y calidad',
    qualityLabel: 'Calidad de compresión de imagen (JPEG / WEBP / AVIF)',
    qualityMin: '50% (Alta compresión)',
    qualityMax: '100% (Calidad máxima)',
    qualityTipTitle: 'Consejo de calidad:',
    qualityTipText: 'El 100% conserva la máxima nitidez y detalle original sin artefactos visibles. Para reducir el tamaño del archivo de 2 a 3 veces, elija 85–90%: la compresión resulta imperceptible a la vista.',
    audioBitrateLabel: 'Tasa de bits de audio',
    audio128: '128 kbps (Estándar)',
    audio192: '192 kbps (Alta calidad)',
    audio256: '256 kbps (Muy alta calidad)',
    audio320: '320 kbps (Máximo / Calidad de estudio)',
    multiSheetTitle: 'Documentos multipágina y Excel',
    multiSheetDesc: 'Puede configurar el modo de exportación para cada archivo en la tabla de cola: documento continuo combinado, archivos independientes en ZIP o una hoja/página específica.',
    saveBtn: 'Guardar ajustes',
  },
  de: {
    title: 'Engine-Einstellungen & Qualität',
    qualityLabel: 'Bildkompressionsqualität (JPEG / WEBP / AVIF)',
    qualityMin: '50% (Hohe Kompression)',
    qualityMax: '100% (Maximale Qualität)',
    qualityTipTitle: 'Qualitätshinweis:',
    qualityTipText: '100% erhält die maximale Originalschärfe und Details ohne sichtbare Verluste. Um die Dateigröße um das 2–3-fache zu verringern, wählen Sie 85–90% – die Kompression bleibt für das Auge unsichtbar.',
    audioBitrateLabel: 'Audio-Encoding-Bitrate',
    audio128: '128 kbps (Standard)',
    audio192: '192 kbps (Hohe Qualität)',
    audio256: '256 kbps (Sehr hohe Qualität)',
    audio320: '320 kbps (Maximum / Studio-Bitrate)',
    multiSheetTitle: 'Mehrseitige Dokumente und Excel',
    multiSheetDesc: 'Sie können den Exportmodus für jede Datei direkt in der Warteschlangentabelle festlegen: zusammenhängendes Dokument, separate Dateien im ZIP-Archiv oder bestimmtes Blatt/Seite.',
    saveBtn: 'Einstellungen speichern',
  },
  zh: {
    title: '引擎参数与质量设置',
    qualityLabel: '图像压缩质量 (JPEG / WEBP / AVIF)',
    qualityMin: '50% (高压缩率)',
    qualityMax: '100% (最高质量)',
    qualityTipTitle: '画质提示：',
    qualityTipText: '设置为 100% 时保留原图的最佳清晰度与细节，无任何伪影。如需减小文件体积（缩小 2–3 倍），建议选择 85–90%，肉眼几乎无法察觉画质差异。',
    audioBitrateLabel: '音频编码码率',
    audio128: '128 kbps (标准)',
    audio192: '192 kbps (高质量)',
    audio256: '256 kbps (极高品质)',
    audio320: '320 kbps (最高 / 录音室码率)',
    multiSheetTitle: '多页文档与 Excel 表格',
    multiSheetDesc: '您可以在队列列表中针对每个文件单独设置导出模式：合并为一个完整文件、独立文件打包为 ZIP 压缩包，或指定特定工作表/页面。',
    saveBtn: '保存设置',
  },
};

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    defaultQuality,
    defaultAudioBitrate,
    language,
    setSettingsOpen,
    setDefaultAudioBitrate,
  } = useConverterStore();

  if (!isSettingsOpen) return null;

  const t = settingsTranslations[language] || settingsTranslations.ru;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">{t.title}</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Default Image Quality Slider */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-200">
              <span className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-1.5 text-emerald-400" />
                {t.qualityLabel}
              </span>
              <span className="font-mono text-sm font-bold text-blue-400">{Math.round(defaultQuality * 100)}%</span>
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
              className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>{t.qualityMin}</span>
              <span>{t.qualityMax}</span>
            </div>

            {/* Clear, High-Contrast Quality Tip */}
            <div className="mt-3 p-3.5 bg-slate-950/80 rounded-2xl border border-blue-500/30 text-xs text-slate-200 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-sky-300">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{t.qualityTipTitle}</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-normal">
                {t.qualityTipText}
              </p>
            </div>
          </div>

          {/* Audio Bitrate Default */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
              <Music className="w-4 h-4 text-purple-400" />
              <span>{t.audioBitrateLabel}</span>
            </div>
            <select
              value={defaultAudioBitrate || '256k'}
              onChange={(e) => setDefaultAudioBitrate(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="128k">{t.audio128}</option>
              <option value="192k">{t.audio192}</option>
              <option value="256k">{t.audio256}</option>
              <option value="320k">{t.audio320}</option>
            </select>
          </div>

          {/* Multi-sheet Excel and PDF Note */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-200 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-blue-400">
              <Layers className="w-4 h-4" />
              <span>{t.multiSheetTitle}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed font-normal">
              {t.multiSheetDesc}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-md shadow-blue-500/25 border border-blue-400/50 transition-all flex items-center space-x-1.5 btn-primary-action cursor-pointer"
          >
            <Check className="w-4 h-4 text-white" />
            <span className="font-bold text-white">{t.saveBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
