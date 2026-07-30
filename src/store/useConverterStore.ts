import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import JSZip from 'jszip';
import {
  ConversionCategory,
  ConversionSettings,
  FileItem,
  HistoryItem,
  UserProfile,
} from '../types/converter';
import { detectMagicBytes } from '../lib/magicBytes';
import { getDefaultTargetForCategory } from '../lib/formatSpecs';
import { convertFileClientSide } from '../lib/converterEngine';
import { addHistoryRecord, getAllHistoryRecords, clearAllHistoryRecords, deleteHistoryRecord } from '../lib/db';

interface ConverterState {
  // Queue & Selection
  queue: FileItem[];
  activeSector: ConversionCategory;
  globalTargetFormat: string;
  selectedIds: string[];
  
  // Sorting & Search
  searchQuery: string;
  sortBy: 'name' | 'size' | 'status' | 'format' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  
  // Toast Notification
  toastMessage: string | null;
  toastType: 'info' | 'success' | 'warning';
  
  // History & User
  historyRecords: HistoryItem[];
  user: UserProfile | null;
  
  // Modals & Triggers
  isAuthModalOpen: boolean;
  isHistoryOpen: boolean;
  isSettingsOpen: boolean;
  isShareOpen: boolean;
  isPreviewOpen: boolean;
  isGuideOpen: boolean;
  shareFileItem: FileItem | null;
  previewFileItem: FileItem | null;
  
  // App Stats
  totalConvertedCount: number;
  totalBytesProcessed: number;
  
  // Global Settings
  defaultQuality: number;
  defaultAudioBitrate: '64k' | '128k' | '192k' | '256k' | '320k';
  ffmpegAcceleration: boolean;
  theme: string;
  language: string;

  // Actions
  setTheme: (theme: string) => void;
  setLanguage: (language: string) => void;
  setDefaultAudioBitrate: (bitrate: '64k' | '128k' | '192k' | '256k' | '320k') => void;
  setActiveSector: (category: ConversionCategory) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'name' | 'size' | 'status' | 'format' | 'createdAt') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  clearToast: () => void;
  
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  removeSelected: (sector?: ConversionCategory) => void;
  clearQueue: () => void;
  clearCompleted: () => void;
  
  setTargetFormat: (id: string, format: string) => void;
  setGlobalTargetFormat: (format: string) => void;
  updateSettings: (id: string, settings: Partial<ConversionSettings>) => void;
  
  toggleSelectItem: (id: string) => void;
  selectAllItems: (select: boolean, sector?: ConversionCategory) => void;
  clearSelection: (sector?: ConversionCategory) => void;
  applyFormatToSelected: (format: string, sector?: ConversionCategory) => void;
  
  startConversion: (id?: string, forceSelectedOnly?: boolean, sector?: ConversionCategory) => Promise<void>;
  reconvertItem: (id: string, newTargetFormat: string) => Promise<void>;
  
  downloadItem: (id: string) => void;
  downloadSelected: (sector?: ConversionCategory) => Promise<void>;
  downloadAllZip: () => Promise<void>;
  
  openShareModal: (item: FileItem) => void;
  openPreviewModal: (item: FileItem) => void;
  
  setAuthModalOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  
  loginWithOAuth: (provider: 'google' | 'yandex') => void;
  logout: () => void;
  
  loadHistoryFromDB: () => Promise<void>;
  clearHistoryDB: () => Promise<void>;
  deleteHistoryItemDB: (id: string) => Promise<void>;
}

export const useConverterStore = create<ConverterState>()(
  persist(
    (set, get) => ({
      queue: [],
  activeSector: 'all',
  globalTargetFormat: 'PNG',
  selectedIds: [],
  
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  
  toastMessage: null,
  toastType: 'info',
  
  historyRecords: [],
  user: null,
  
  isAuthModalOpen: false,
  isHistoryOpen: false,
  isSettingsOpen: false,
  isShareOpen: false,
  isPreviewOpen: false,
  isGuideOpen: false,
  shareFileItem: null,
  previewFileItem: null,
  
  totalConvertedCount: 0,
  totalBytesProcessed: 0,
  defaultQuality: 1.0,
  defaultAudioBitrate: '256k',
  ffmpegAcceleration: true,
  theme: 'studio-light',
  language: 'ru',

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setDefaultAudioBitrate: (defaultAudioBitrate) => set({ defaultAudioBitrate }),
  setActiveSector: (category) => set({ activeSector: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  
  showToast: (message, type = 'info') => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),

  addFiles: async (files: File[]) => {
    const newItems: FileItem[] = [];
    const currentSector = get().activeSector;
    const nonMatchingCategoriesCount: Record<string, number> = {};

    for (const file of files) {
      const magicResult = await detectMagicBytes(file);
      const defaultTarget = getDefaultTargetForCategory(magicResult.category, magicResult.format);
      
      const item: FileItem = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        file,
        name: file.name,
        size: file.size,
        detectedFormat: magicResult.format,
        detectedMime: magicResult.mime,
        category: magicResult.category,
        magicBytesHex: magicResult.hex,
        targetFormat: defaultTarget,
        status: 'idle',
        progress: 0,
        settings: {
          imageQuality: get().defaultQuality,
          preserveAspectRatio: true,
          audioBitrate: get().defaultAudioBitrate || '256k',
          videoResolution: 'original',
        },
        createdAt: Date.now(),
      };
      newItems.push(item);

      // Sector Protection check
      if (currentSector !== 'all' && magicResult.category !== currentSector) {
        nonMatchingCategoriesCount[magicResult.category] =
          (nonMatchingCategoriesCount[magicResult.category] || 0) + 1;
      }
    }

    set((state) => ({
      queue: [...state.queue, ...newItems],
    }));

    // Toast notification for routed non-matching files
    const nonMatchingTotal = Object.values(nonMatchingCategoriesCount).reduce((a, b) => a + b, 0);
    if (nonMatchingTotal > 0) {
      const categoryNames = Object.keys(nonMatchingCategoriesCount)
        .map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1))
        .join(', ');

      const notification =
        nonMatchingTotal === 1
          ? `1 file routed to ${categoryNames} sector`
          : `${nonMatchingTotal} files routed to ${categoryNames} sector${
              Object.keys(nonMatchingCategoriesCount).length > 1 ? 's' : ''
            }`;

      get().showToast(notification, 'info');
    }
  },

  removeFile: (id) => {
    set((state) => ({
      queue: state.queue.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
  },

  removeSelected: (sector) => {
    const { queue, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const itemsToRemove = queue.filter(
      (f) => selectedIds.includes(f.id) && (!sector || sector === 'all' || f.category === sector)
    );
    if (itemsToRemove.length === 0) return;
    const removeIds = new Set(itemsToRemove.map((i) => i.id));
    set((state) => ({
      queue: state.queue.filter((f) => !removeIds.has(f.id)),
      selectedIds: state.selectedIds.filter((id) => !removeIds.has(id)),
    }));
    get().showToast(`Удалено файлов: ${itemsToRemove.length}`, 'info');
  },

  clearQueue: () => set({ queue: [], selectedIds: [] }),

  clearCompleted: () =>
    set((state) => ({
      queue: state.queue.filter((f) => f.status !== 'completed'),
    })),

  setTargetFormat: (id, format) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              targetFormat: format,
              status: item.status === 'error' ? 'idle' : item.status,
              error: item.status === 'error' ? undefined : item.error,
            }
          : item
      ),
    }));
  },

  setGlobalTargetFormat: (format) => {
    const { selectedIds } = get();
    if (selectedIds.length > 0) {
      set((state) => ({
        globalTargetFormat: format,
        queue: state.queue.map((item) =>
          state.selectedIds.includes(item.id)
            ? { ...item, targetFormat: format }
            : item
        ),
      }));
      get().showToast(`Applied ${format} format to ${selectedIds.length} selected items`, 'success');
    } else {
      set((state) => ({
        globalTargetFormat: format,
        queue: state.queue.map((item) => ({
          ...item,
          targetFormat: format,
        })),
      }));
      get().showToast(`Set global target format to ${format}`, 'info');
    }
  },

  applyFormatToSelected: (format, sector) => {
    const { queue, selectedIds } = get();
    const targetItems = queue.filter(
      (q) => selectedIds.includes(q.id) && (!sector || sector === 'all' || q.category === sector)
    );
    if (targetItems.length === 0) return;
    const targetSet = new Set(targetItems.map((i) => i.id));
    set((state) => ({
      globalTargetFormat: format,
      queue: state.queue.map((item) =>
        targetSet.has(item.id)
          ? { ...item, targetFormat: format }
          : item
      ),
    }));
    get().showToast(`Применен формат ${format} для ${targetItems.length} выбранных файлов`, 'success');
  },

  updateSettings: (id, newSettings) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? { ...item, settings: { ...item.settings, ...newSettings } }
          : item
      ),
    }));
  },

  toggleSelectItem: (id) => {
    set((state) => {
      const exists = state.selectedIds.includes(id);
      return {
        selectedIds: exists
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  selectAllItems: (select, sector) => {
    set((state) => {
      const sectorItems = (!sector || sector === 'all')
        ? state.queue
        : state.queue.filter((q) => q.category === sector);
      const sectorIds = sectorItems.map((q) => q.id);

      if (select) {
        const combined = new Set([...state.selectedIds, ...sectorIds]);
        return { selectedIds: Array.from(combined) };
      } else {
        const removeSet = new Set(sectorIds);
        return { selectedIds: state.selectedIds.filter((id) => !removeSet.has(id)) };
      }
    });
  },

  clearSelection: (sector) => {
    if (!sector || sector === 'all') {
      set({ selectedIds: [] });
    } else {
      set((state) => ({
        selectedIds: state.selectedIds.filter((id) => {
          const item = state.queue.find((q) => q.id === id);
          return item ? item.category !== sector : false;
        }),
      }));
    }
  },

  startConversion: async (targetId?: string, forceSelectedOnly?: boolean, sector?: ConversionCategory) => {
    const { queue, selectedIds } = get();
    let itemsToConvert: FileItem[] = [];

    if (targetId) {
      itemsToConvert = queue.filter((item) => item.id === targetId);
    } else if (forceSelectedOnly || selectedIds.length > 0) {
      itemsToConvert = queue.filter(
        (item) =>
          selectedIds.includes(item.id) &&
          (!sector || sector === 'all' || item.category === sector) &&
          (item.status === 'idle' || item.status === 'error')
      );
    } else {
      itemsToConvert = queue.filter(
        (item) =>
          (!sector || sector === 'all' || item.category === sector) &&
          (item.status === 'idle' || item.status === 'error')
      );
    }

    if (itemsToConvert.length === 0) {
      if (selectedIds.length > 0 && !targetId) {
        get().showToast('No pending/idle files in selection to convert', 'warning');
      }
      return;
    }

    for (const item of itemsToConvert) {
      const startTime = Date.now();
      
      // Update item status to converting
      set((state) => ({
        queue: state.queue.map((q) =>
          q.id === item.id ? { ...q, status: 'converting', progress: 5, statusText: 'Starting...' } : q
        ),
      }));

      try {
        const { blob, fileName } = await convertFileClientSide(
          item,
          (percent, text) => {
            set((state) => ({
              queue: state.queue.map((q) =>
                q.id === item.id ? { ...q, progress: percent, statusText: text } : q
              ),
            }));
          }
        );

        const durationMs = Date.now() - startTime;

        // Add history log in IndexedDB
        const historyRecord = {
          fileName: item.name,
          originalFormat: item.detectedFormat,
          targetFormat: item.targetFormat,
          originalSize: item.size,
          convertedSize: blob.size,
          category: item.category,
          durationMs,
          timestamp: Date.now(),
          status: 'success' as const,
        };

        await addHistoryRecord(historyRecord);

        // Update state
        set((state) => ({
          totalConvertedCount: state.totalConvertedCount + 1,
          totalBytesProcessed: state.totalBytesProcessed + item.size,
          queue: state.queue.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'completed',
                  progress: 100,
                  statusText: 'Converted',
                  convertedBlob: blob,
                  convertedName: fileName,
                  convertedSize: blob.size,
                  convertedAt: Date.now(),
                }
              : q
          ),
        }));

        await get().loadHistoryFromDB();
      } catch (err: any) {
        console.error('Conversion error:', err);
        set((state) => ({
          queue: state.queue.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'error',
                  progress: 0,
                  statusText: 'Error',
                  error: err?.message || 'Conversion failed',
                }
              : q
          ),
        }));
      }
    }
  },

  reconvertItem: async (id, newTargetFormat) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              targetFormat: newTargetFormat,
              status: 'idle',
              progress: 0,
              statusText: undefined,
              convertedBlob: undefined,
              convertedName: undefined,
              convertedSize: undefined,
              error: undefined,
            }
          : item
      ),
    }));

    await get().startConversion(id);
  },

  downloadItem: (id) => {
    const item = get().queue.find((f) => f.id === id);
    if (!item || !item.convertedBlob || !item.convertedName) return;

    const url = URL.createObjectURL(item.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadSelected: async (sector) => {
    const { queue, selectedIds } = get();
    const selectedItems = queue.filter(
      (q) => selectedIds.includes(q.id) && (!sector || sector === 'all' || q.category === sector) && q.convertedBlob
    );

    if (selectedItems.length === 0) return;

    if (selectedItems.length === 1) {
      get().downloadItem(selectedItems[0].id);
      return;
    }

    const zip = new JSZip();
    selectedItems.forEach((item) => {
      if (item.convertedBlob && item.convertedName) {
        zip.file(item.convertedName, item.convertedBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_files_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadAllZip: async () => {
    const { queue } = get();
    const completed = queue.filter((q) => q.status === 'completed' && q.convertedBlob);

    if (completed.length === 0) return;

    const zip = new JSZip();
    completed.forEach((item) => {
      if (item.convertedBlob && item.convertedName) {
        zip.file(item.convertedName, item.convertedBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allconvert_converted_all_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  openShareModal: (item) => set({ isShareOpen: true, shareFileItem: item }),
  openPreviewModal: (item) => set({ isPreviewOpen: true, previewFileItem: item }),

  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setShareOpen: (open) => set({ isShareOpen: open, shareFileItem: open ? get().shareFileItem : null }),
  setPreviewOpen: (open) => set({ isPreviewOpen: open, previewFileItem: open ? get().previewFileItem : null }),
  setGuideOpen: (open) => set({ isGuideOpen: open }),

  loginWithOAuth: (provider) => {
    const fakeProfile: UserProfile = {
      id: 'user_' + provider + '_' + Math.random().toString(36).substring(2, 7),
      email: provider === 'google' ? 'developer.google@gmail.com' : 'developer.yandex@yandex.ru',
      name: provider === 'google' ? 'Google Developer' : 'Yandex User',
      provider,
      createdAt: Date.now(),
    };
    set({ user: fakeProfile, isAuthModalOpen: false });
  },

  logout: () => set({ user: null }),

  loadHistoryFromDB: async () => {
    const records = await getAllHistoryRecords();
    set({ historyRecords: records });
  },

  clearHistoryDB: async () => {
    await clearAllHistoryRecords();
    set({ historyRecords: [] });
  },

  deleteHistoryItemDB: async (id) => {
    await deleteHistoryRecord(id);
    await get().loadHistoryFromDB();
  },
    }),
    {
      name: 'allconvert-settings-storage-v2',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        defaultQuality: state.defaultQuality,
        defaultAudioBitrate: state.defaultAudioBitrate,
        ffmpegAcceleration: state.ffmpegAcceleration,
      }),
    }
  )
);
