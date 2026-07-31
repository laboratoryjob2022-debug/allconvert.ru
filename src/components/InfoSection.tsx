import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Lock, 
  Upload, 
  Settings2, 
  Download, 
  HelpCircle, 
  ChevronDown, 
  CheckCircle2, 
  Layers, 
  FileCheck 
} from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { getTranslation } from '../lib/i18n';

export const InfoSection: React.FC = () => {
  const { language } = useConverterStore();
  const t = getTranslation(language || 'ru');
  const isRu = (language || 'ru') === 'ru';

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      step: '01',
      icon: Upload,
      title: isRu ? 'Загрузите файлы' : 'Upload Files',
      desc: isRu 
        ? 'Перетащите нужные файлы в область загрузки или нажмите «Выбрать файлы». Поддерживается пакетная обработка нескольких файлов одновременно.'
        : 'Drag & drop your files into the upload area or click "Choose Files". Batch processing of multiple files is supported.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      step: '02',
      icon: Settings2,
      title: isRu ? 'Выберите формат и настройки' : 'Select Format & Settings',
      desc: isRu 
        ? 'Укажите желаемый целевой формат для каждого файла или примените один формат ко всей очереди. Выберите пресет качества при необходимости.'
        : 'Select the target format for each file or apply one format to the entire queue. Choose quality presets if needed.',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      step: '03',
      icon: Download,
      title: isRu ? 'Конвертируйте и скачайте' : 'Convert & Download',
      desc: isRu 
        ? 'Нажмите «Конвертировать». Все вычисления выполняются прямо в памяти вашего браузера. Сохраните файлы по отдельности или единым ZIP-архивом.'
        : 'Click "Convert". All computations occur locally in your browser RAM. Save files individually or as a single ZIP archive.',
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  const benefits = [
    {
      icon: Lock,
      title: isRu ? '100% Абсолютная Приватность' : '100% Complete Privacy',
      desc: isRu 
        ? 'Ваши файлы никогда не покидают ваше устройство и не отправляются ни на какие внешние сервера. Вся обработка происходит локально в памяти браузера.'
        : 'Your files never leave your device or travel to external servers. All processing happens locally in browser memory.',
      badge: isRu ? 'Zero Server Upload' : 'Zero Server Upload'
    },
    {
      icon: Layers,
      title: isRu ? 'Пакетная Конвертация Файлов (Batch)' : 'Batch File Conversion',
      desc: isRu 
        ? 'Конвертируйте десятки и сотни файлов пачками в один клик. Мгновенная массовая обработка в браузере и скачивание готовых архивов ZIP.'
        : 'Convert dozens or hundreds of files at once in one click. Instant batch processing in browser and ZIP downloading.',
      badge: isRu ? 'Batch & ZIP' : 'Batch & ZIP'
    },
    {
      icon: FileCheck,
      title: isRu ? 'Без Регистрации и Лимитов' : 'No Registration & Limits',
      desc: isRu 
        ? 'Никаких подписок, ввода личных данных или скрытых платежей. Бесплатный доступ ко всем форматам для документов, видео, аудио и графики.'
        : 'No subscriptions, account sign-ups, or hidden fees. Free unlimited access to all document, video, audio, and image formats.',
      badge: isRu ? '100% Free' : '100% Free'
    }
  ];

  const faqs = [
    {
      q: isRu ? 'Безопасно ли конвертировать конфиденциальные документы и фото?' : 'Is it safe to convert sensitive documents and photos?',
      a: isRu 
        ? 'Да, абсолютно безопасно. В отличие от традиционных онлайн-конвертеров, AllConvert обрабатывает файлы исключительно в оперативной памяти вашего браузера через WebAssembly. Ни один байт ваших данных не передается в сеть.'
        : 'Yes, 100% safe. Unlike traditional online converters, AllConvert processes files strictly within your browser RAM using WebAssembly. Not a single byte of your data is sent over the network.'
    },
    {
      q: isRu ? 'Какие типы файлов и форматы поддерживаются?' : 'What file types and formats are supported?',
      a: isRu 
        ? 'AllConvert поддерживает более 50 медиа-форматов: Видео (MP4, WEBM, AVI, MOV, MKV, GIF), Аудио (MP3, WAV, AAC, OGG, FLAC), Изображения (JPG, PNG, WEBP, AVIF, HEIC, SVG) и Документы (PDF, TXT, HTML, XLSX, CSV).'
        : 'AllConvert supports over 50 formats: Video (MP4, WEBM, AVI, MOV, MKV, GIF), Audio (MP3, WAV, AAC, OGG, FLAC), Images (JPG, PNG, WEBP, AVIF, HEIC, SVG), and Documents (PDF, TXT, HTML, XLSX, CSV).'
    },
    {
      q: isRu ? 'Нужна ли регистрация или установка сторонних программ?' : 'Is registration or software installation required?',
      a: isRu 
        ? 'Нет. Сервис полностью готов к работе сразу при открытии страницы. Вам не нужно регистрироваться, входить через Google/Яндекс или скачивать программы. Все библиотеки загружаются один раз в ваш браузер.'
        : 'No. The service is ready immediately upon opening the page. No registration, login, or software installation is needed. All libraries load directly into your browser memory.'
    },
    {
      q: isRu ? 'Работает ли сервис без доступа к интернету?' : 'Does the service work without an internet connection?',
      a: isRu 
        ? 'Да! После первоначальной загрузки веб-страницы AllConvert может работать полностью автономно в оффлайн-режиме, так как все модули конвертации сохранены в кэше браузера.'
        : 'Yes! After the initial page load, AllConvert can work completely offline as all conversion modules are stored locally in your browser cache.'
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 mt-16 mb-12 space-y-16">
      {/* 1. Key Benefits Showcase */}
      <div className="p-8 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-xl backdrop-blur-md space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block mb-2">
              {isRu ? 'Надежность & Скорость' : 'Reliability & Speed'}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              {isRu ? 'Почему пользователи выбирают AllConvert' : 'Why Users Choose AllConvert'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            {isRu 
              ? 'Сочетание клиентских технологий WebAssembly и современного интерфейса без передачи данных сторонним сервисам.' 
              : 'Combining client-side WebAssembly technology and modern interface without sending data to third parties.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div key={idx} className="space-y-3 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {b.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{b.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Step-by-Step Instruction Guide */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 inline-block">
            {isRu ? 'Инструкция' : 'Quick Guide'}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {isRu ? 'Как конвертировать файлы за 3 простых шага' : 'How to Convert Files in 3 Easy Steps'}
          </h2>
          <p className="text-sm text-slate-400">
            {isRu ? 'Интуитивно понятный процесс без сложной настройки' : 'Intuitive process without complex configuration'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={idx} 
                className="relative p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 shadow-xl backdrop-blur-md flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} p-0.5 shadow-lg`}>
                      <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-cyan-400" />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-slate-500/50 select-none">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FAQ Section */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 inline-block">
            {isRu ? 'Вопросы и ответы' : 'FAQ'}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            {isRu ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-sm text-slate-400">
            {isRu ? 'Все, что вам нужно знать о работе нашего сервиса' : 'Everything you need to know about our service'}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm md:text-base font-bold text-slate-100 pr-4 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs md:text-sm text-slate-400 leading-relaxed border-t border-slate-800/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
