import React, { useEffect } from 'react';

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (params: { blockId: string; renderTo: string }) => void;
        };
      };
    };
  }
}

interface YandexDesktopAdProps {
  routeType: string;
}

export const YandexDesktopAd: React.FC<YandexDesktopAdProps> = ({ routeType }) => {
  // Do not render ads on legal / compliance pages per Yandex RTB policy
  const isExcluded = routeType === 'privacy' || routeType === 'terms' || routeType === 'about';

  useEffect(() => {
    if (isExcluded) return;

    const renderBanner = () => {
      try {
        if (typeof window !== 'undefined') {
          window.yaContextCb = window.yaContextCb || [];
          window.yaContextCb.push(() => {
            try {
              window.Ya?.Context?.AdvManager?.render({
                blockId: 'R-A-20307665-1',
                renderTo: 'yandex_rtb_R-A-20307665-1',
              });
            } catch (err) {
              console.warn('Yandex RTB render error:', err);
            }
          });
        }
      } catch (err) {
        console.warn('Yandex RTB init error:', err);
      }
    };

    renderBanner();
  }, [isExcluded]);

  if (isExcluded) {
    return null;
  }

  return (
    <aside
      aria-label="Реклама"
      className="hidden min-[1640px]:block absolute left-[calc(100%+16px)] top-2 bottom-12 w-[160px] min-[1720px]:w-[200px] min-[1860px]:w-[240px] z-20 pointer-events-auto"
    >
      <div className="sticky top-24 flex flex-col items-center">
        <span className="text-[10px] uppercase tracking-wider text-slate-400/60 dark:text-slate-500/60 mb-1 select-none font-sans">
          Реклама
        </span>
        <div
          id="yandex_rtb_R-A-20307665-1"
          className="w-full min-h-[300px] flex items-center justify-center overflow-hidden rounded-xl"
        />
      </div>
    </aside>
  );
};
