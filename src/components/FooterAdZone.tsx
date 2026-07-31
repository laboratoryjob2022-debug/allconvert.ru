import React, { useState } from 'react';
import { ShieldCheck, FileText, X } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

export const FooterAdZone: React.FC = () => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');
  const isRu = (language || 'ru') === 'ru';

  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="w-full bg-slate-900/40 border-t border-slate-800/80 text-slate-400 text-xs py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand info */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="flex items-center space-x-2">
            <img src="/favicon-32x32.png" alt="AllConvert" className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30" />
            <span className="font-extrabold text-slate-100 text-base tracking-tight">
              All<span className="text-cyan-400">Convert</span>
            </span>
          </div>
          <span className="hidden md:inline text-slate-700">|</span>
          <p className="text-slate-400 text-xs max-w-md">
            {isRu 
              ? '100% клиентская конвертация файлов в браузере. Данные не передаются на сервер.' 
              : '100% client-side file converter. Data is processed locally in your browser.'}
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
          <button
            onClick={() => setActiveModal('privacy')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}</span>
          </button>
          <button
            onClick={() => setActiveModal('terms')}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>{isRu ? 'Условия использования' : 'Terms of Use'}</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="text-slate-500 text-xs text-center md:text-right">
          © {new Date().getFullYear()} AllConvert.ru. {isRu ? 'Все права защищены' : 'All rights reserved.'}
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center space-x-3">
                {activeModal === 'privacy' && <ShieldCheck className="w-6 h-6 text-emerald-400" />}
                {activeModal === 'terms' && <FileText className="w-6 h-6 text-purple-400" />}
                <h3 className="text-lg font-bold text-slate-100">
                  {activeModal === 'privacy' && (isRu ? 'Политика конфиденциальности' : 'Privacy Policy')}
                  {activeModal === 'terms' && (isRu ? 'Условия использования' : 'Terms of Use')}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300 text-xs md:text-sm leading-relaxed">
              {activeModal === 'privacy' && (
                <div className="space-y-4">
                  <p className="font-semibold text-emerald-400">
                    {isRu 
                      ? 'Главный принцип AllConvert — 100% локальная обработка данных без загрузки на сервер.' 
                      : 'The core principle of AllConvert is 100% local data processing with zero server uploads.'}
                  </p>
                  
                  <h4 className="font-bold text-slate-100 text-base pt-2">1. Сбор и обработка файлов</h4>
                  <p>
                    Все загружаемые вами файлы (изображения, видео, документы, аудио) обрабатываются исключительно в оперативной памяти вашего браузера (RAM) с использованием технологий WebAssembly и JavaScript. Файлы не передаются на наш сервер или сторонним сервисам.
                  </p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">2. Локальное хранение данных</h4>
                  <p>
                    Настройки интерфейса и история проведенных конвертаций сохраняются локально на вашем устройстве в базу данных IndexedDB браузера. Вы можете в любой момент очистить историю или кэш.
                  </p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">3. Файлы куки (Cookies) и Аналитика</h4>
                  <p>
                    Для анализа посещаемости и оценки работы сервиса используется веб-аналитика Yandex.Metrika. Аналитика не получает доступ к содержимому конвертируемых файлов.
                  </p>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-100 text-base">1. Принятие условий</h4>
                  <p>
                    Используя веб-сайт AllConvert, вы соглашаетесь с настоящими условиями использования. Сервис предоставляется на бесплатной основе «как есть» (As Is) без гарантий любого рода.
                  </p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">2. Использование сервиса</h4>
                  <p>
                    Вы обязуетесь не использовать сервис в противоправных целях. Пользователь самостоятельно несет ответственность за законность конвертируемого содержимого и соблюдение авторских прав.
                  </p>

                  <h4 className="font-bold text-slate-100 text-base pt-2">3. Ограничение ответственности</h4>
                  <p>
                    Разработчики AllConvert не несут ответственности за возможные потери данных или сбои браузера, возникшие в процессе конвертации файлов большого объема.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
