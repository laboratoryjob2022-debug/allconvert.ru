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

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      step: '01',
      icon: Upload,
      title: t.infoStep1Title,
      desc: t.infoStep1Desc,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      step: '02',
      icon: Settings2,
      title: t.infoStep2Title,
      desc: t.infoStep2Desc,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      step: '03',
      icon: Download,
      title: t.infoStep3Title,
      desc: t.infoStep3Desc,
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  const benefits = [
    {
      icon: Lock,
      title: t.infoBenefit1Title,
      desc: t.infoBenefit1Desc,
      badge: t.infoBenefit1Badge
    },
    {
      icon: Layers,
      title: t.infoBenefit2Title,
      desc: t.infoBenefit2Desc,
      badge: t.infoBenefit2Badge
    },
    {
      icon: FileCheck,
      title: t.infoBenefit3Title,
      desc: t.infoBenefit3Desc,
      badge: t.infoBenefit3Badge
    }
  ];

  const faqs = [
    {
      q: t.infoFaqQ1,
      a: t.infoFaqA1
    },
    {
      q: t.infoFaqQ2,
      a: t.infoFaqA2
    },
    {
      q: t.infoFaqQ3,
      a: t.infoFaqA3
    },
    {
      q: t.infoFaqQ4,
      a: t.infoFaqA4
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 mt-16 mb-12 space-y-16">
      {/* 1. Key Benefits Showcase */}
      <div className="p-8 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-xl backdrop-blur-md space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block mb-2">
              {t.infoWhyBadge}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              {t.infoWhyTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            {t.infoWhyDesc}
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
            {t.infoStepsBadge}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {t.infoStepsTitle}
          </h2>
          <p className="text-sm text-slate-400">
            {t.infoStepsDesc}
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
            {t.infoFaqBadge}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            {t.infoFaqTitle}
          </h2>
          <p className="text-sm text-slate-400">
            {t.infoFaqDesc}
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
