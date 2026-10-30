import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface YandexMobileTopAdProps {
  routeType: string;
  onVisibilityChange?: (visible: boolean) => void;
}

export const YandexMobileTopAd: React.FC<YandexMobileTopAdProps> = ({
  routeType,
  onVisibilityChange,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Exclude ads on legal / compliance pages per Yandex RTB policy
  const isExcluded =
    routeType === 'privacy' || routeType === 'terms' || routeType === 'about';

  const isVisible = !isDismissed && !isExcluded;

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  useEffect(() => {
    if (!isVisible) return;

    const renderBanner = () => {
      try {
        if (typeof window !== 'undefined') {
          window.yaContextCb = window.yaContextCb || [];
          window.yaContextCb.push(() => {
            try {
              window.Ya?.Context?.AdvManager?.render({
                blockId: 'R-A-20307665-2',
                renderTo: 'yandex_rtb_R-A-20307665-2',
              });
            } catch (err) {
              console.warn('Yandex RTB mobile top render error:', err);
            }
          });
        }
      } catch (err) {
        console.warn('Yandex RTB mobile top init error:', err);
      }
    };

    renderBanner();
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Реклама"
      className="fixed top-0 left-0 right-0 z-50 h-[60px] max-h-[60px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-center px-3 shadow-xs min-[1640px]:hidden pointer-events-auto"
    >
      <div className="relative w-full max-w-lg h-full flex items-center justify-center">
        {/* Ad container constrained to <= 60px */}
        <div
          id="yandex_rtb_R-A-20307665-2"
          className="w-full h-[58px] max-h-[58px] flex items-center justify-center overflow-hidden"
        />

        {/* Small dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Скрыть рекламу"
          aria-label="Скрыть рекламу"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
