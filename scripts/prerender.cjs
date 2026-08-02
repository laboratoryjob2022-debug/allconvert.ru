const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

// Compile TypeScript helpers to temporary CommonJS directory
const tmpBundleDir = path.join(__dirname, '.tmp-bundle');
try {
  esbuild.buildSync({
    entryPoints: [
      path.join(__dirname, '..', 'src', 'lib', 'seoPages.ts'),
      path.join(__dirname, '..', 'src', 'lib', 'i18n.ts')
    ],
    bundle: true,
    outdir: tmpBundleDir,
    format: 'cjs',
    platform: 'node',
    outExtension: { '.js': '.cjs' }
  });
} catch (err) {
  console.error('Failed to bundle TypeScript modules for prerender:', err);
  process.exit(1);
}

const seoPagesModule = require(path.join(tmpBundleDir, 'seoPages.cjs'));
const i18nModule = require(path.join(tmpBundleDir, 'i18n.cjs'));

const { POPULAR_SEO_ROUTES, getSeoPageDataBySlug, getLocalizedSeoRoute } = seoPagesModule;
const { translations } = i18nModule;

const SUPPORTED_LANGS = ['ru', 'en', 'zh', 'es', 'de'];

const OG_LOCALE_MAP = {
  ru: 'ru_RU',
  en: 'en_US',
  zh: 'zh_CN',
  es: 'es_ES',
  de: 'de_DE'
};

const FEATURE_LIST_MAP = {
  ru: [
    "100% локальная обработка файлов в браузере без отправки на сервер",
    "Конвертация видео, аудио, графики и документов любых размеров в ОЗУ",
    "Технологии FFmpeg.wasm и WebCodecs для максимальной скорости",
    "Без регистрации, без Google / Yandex Auth и без слежки"
  ],
  en: [
    "100% local browser file processing without server uploads",
    "Convert video, audio, graphics, and documents of any size in RAM",
    "FFmpeg.wasm and WebCodecs technologies for maximum speed",
    "No registration, no Google/Yandex Auth, and no tracking"
  ],
  zh: [
    "100% 浏览器本地文件处理，无需上传至服务器",
    "在内存中转换任意大小的视频、音频、图像和文档",
    "采用 FFmpeg.wasm 和 WebCodecs 技术实现极速转换",
    "无需注册，无 Google / Yandex 登录，零追踪"
  ],
  es: [
    "Procesamiento de archivos 100% local en el navegador sin envíos al servidor",
    "Convierta video, audio, imágenes y documentos de cualquier tamaño en memoria RAM",
    "Tecnología FFmpeg.wasm y WebCodecs para máxima velocidad",
    "Sin registro, sin autenticación de Google/Yandex y sin seguimiento"
  ],
  de: [
    "100% lokale Dateiverarbeitung im Browser ohne Server-Uploads",
    "Konvertieren Sie Videos, Audio, Grafiken und Dokumente jeder Größe im Arbeitsspeicher",
    "FFmpeg.wasm- und WebCodecs-Technologien für maximale Geschwindigkeit",
    "Ohne Registrierung, ohne Google / Yandex Auth und ohne Tracking"
  ]
};

// Collect all normalized routes
const routes = new Set(['/', '/privacy', '/terms', '/about']);

// Add all routes from POPULAR_SEO_ROUTES
for (const slug of Object.keys(POPULAR_SEO_ROUTES)) {
  routes.add(`/convert/${slug}`);
}

// Add all routes from existing sitemap.xml
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = sitemapContent.match(/<loc>https?:\/\/[^\/]+(\/[^<]*)<\/loc>/g);
  if (matches) {
    for (const m of matches) {
      let route = m.replace(/<loc>https?:\/\/[^\/]+/, '').replace('</loc>', '').split('?')[0];
      route = route.replace(/^\/(en|zh|es|de)(\/|$)/, '$2');
      if (route) {
        routes.add(route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route);
      }
    }
  }
}

// Generate updated multilingual sitemap.xml
function generateSitemap(routesSet, supportedLangs) {
  const today = new Date().toISOString().split('T')[0];
  const urlEntries = [];

  for (const routePath of routesSet) {
    let changefreq = 'daily';
    let priority = '0.8';

    if (routePath === '/' || routePath === '') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (routePath === '/privacy' || routePath === '/terms') {
      priority = '0.5';
      changefreq = 'monthly';
    } else if (routePath === '/about') {
      priority = '0.6';
      changefreq = 'monthly';
    }

    const cleanRoute = routePath === '/' ? '' : routePath;

    for (const lang of supportedLangs) {
      const loc = lang === 'ru' 
        ? `https://allconvert.ru${cleanRoute || '/'}`
        : `https://allconvert.ru/${lang}${cleanRoute}`;

      const alternates = [
        `<xhtml:link rel="alternate" hreflang="ru" href="https://allconvert.ru${cleanRoute || '/'}" />`,
        `<xhtml:link rel="alternate" hreflang="en" href="https://allconvert.ru/en${cleanRoute}" />`,
        `<xhtml:link rel="alternate" hreflang="zh" href="https://allconvert.ru/zh${cleanRoute}" />`,
        `<xhtml:link rel="alternate" hreflang="es" href="https://allconvert.ru/es${cleanRoute}" />`,
        `<xhtml:link rel="alternate" hreflang="de" href="https://allconvert.ru/de${cleanRoute}" />`,
        `<xhtml:link rel="alternate" hreflang="x-default" href="https://allconvert.ru${cleanRoute || '/'}" />`
      ].join('\n    ');

      urlEntries.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    ${alternates}
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;
}

const freshSitemapContent = generateSitemap(routes, SUPPORTED_LANGS);
fs.writeFileSync(sitemapPath, freshSitemapContent, 'utf-8');
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), freshSitemapContent, 'utf-8');
console.log(`[SITEMAP] Generated updated sitemap.xml with ${routes.size * SUPPORTED_LANGS.length} localized URLs and lastmod=${new Date().toISOString().split('T')[0]}`);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLocPath(rawPath, lang) {
  if (!rawPath) return lang === 'ru' ? '/' : `/${lang}`;
  if (lang === 'ru') return rawPath;
  if (rawPath === '/') return `/${lang}`;
  return `/${lang}${rawPath.startsWith('/') ? rawPath : '/' + rawPath}`;
}

function injectMetadata(html, { lang, title, description, keywords, canonicalUrl, bodyContent }) {
  let output = html;

  // Replace or inject <html lang="...">
  output = output.replace(/<html(\s+[^>]*)lang="[^"]*"/i, `<html$1lang="${lang}"`);
  if (!/<html[^>]*lang=/i.test(output)) {
    output = output.replace(/<html/i, `<html lang="${lang}"`);
  }

  // Replace Title tag
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Strip pre-existing meta tags that we will clean-generate
  output = output.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\n?/gi, '');

  // Strip legacy script tags if present
  output = output.replace(/<script>\s*window\.__PRERENDER_LANG_DATA__[\s\S]*?<\/script>\n?/gi, '');

  // Strip pre-existing JSON-LD script from base index.html
  output = output.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\n?/gi, '');

  const ogLocale = OG_LOCALE_MAP[lang] || 'ru_RU';
  const rawBasePath = canonicalUrl.split('?')[0].replace('https://allconvert.ru', '').replace(/^\/(en|zh|es|de)/, '');
  const basePath = rawBasePath === '' ? '' : rawBasePath;

  const hreflangTags = [
    `<link rel="alternate" hreflang="ru" href="https://allconvert.ru${basePath || '/'}">`,
    `<link rel="alternate" hreflang="en" href="https://allconvert.ru/en${basePath}">`,
    `<link rel="alternate" hreflang="zh" href="https://allconvert.ru/zh${basePath}">`,
    `<link rel="alternate" hreflang="es" href="https://allconvert.ru/es${basePath}">`,
    `<link rel="alternate" hreflang="de" href="https://allconvert.ru/de${basePath}">`,
    `<link rel="alternate" hreflang="x-default" href="https://allconvert.ru${basePath || '/'}">`
  ].join('\n  ');

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AllConvert",
    "url": canonicalUrl,
    "image": "https://allconvert.ru/og-image.png",
    "logo": "https://allconvert.ru/android-chrome-512x512.png",
    "description": description,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": FEATURE_LIST_MAP[lang] || FEATURE_LIST_MAP.ru
  };

  const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLdData, null, 2)}\n</script>`;

  const metaTags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : '',
    `<meta property="og:locale" content="${ogLocale}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:site_name" content="AllConvert">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    hreflangTags,
    jsonLdScript
  ].filter(Boolean).join('\n  ');

  output = output.replace('</head>', `  ${metaTags}\n</head>`);

  // Body content pre-rendering directly into #root
  if (bodyContent) {
    output = output.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }

  return output;
}

// Helper to construct pre-rendered HTML structure for each route and language
function renderRouteContent(routePath, lang = 'ru') {
  const t = translations[lang] || translations.ru;
  const basePath = routePath === '/' ? '' : routePath;
  const canonicalUrl = lang === 'ru' 
    ? `https://allconvert.ru${basePath || '/'}`
    : `https://allconvert.ru/${lang}${basePath}`;

  const homeHref = getLocPath('/', lang);
  const privacyHref = getLocPath('/privacy', lang);
  const termsHref = getLocPath('/terms', lang);
  const aboutHref = getLocPath('/about', lang);

  if (routePath === '/' || routePath === '') {
    const title = `${t.appName} — ${t.appSub}`;
    const description = t.mainSubtitle;
    const keywordsDict = {
      ru: 'онлайн конвертер, конвертировать файлы, конвертер видео, конвертер аудио, конвертер изображений, бесплатно',
      en: 'free online file converter, video converter, audio converter, image converter, convert files online',
      zh: '在线文件转换器, 免费视频转换, 音频转换, 图像转换, 在线转换',
      es: 'convertidor de archivos en línea, convertidor de video, convertidor de audio, convertidor de imágenes',
      de: 'kostenloser online dateiumwandler, video konverter, audio konverter, bild konverter'
    };
    const keywords = keywordsDict[lang] || keywordsDict.ru;

    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <a href="${homeHref}" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
        <nav><a href="${privacyHref}" style="color:#94a3b8;margin-right:1rem;">${escapeHtml(t.privacyPolicy)}</a><a href="${termsHref}" style="color:#94a3b8;margin-right:1rem;">${escapeHtml(t.termsOfService)}</a><a href="${aboutHref}" style="color:#94a3b8;">${escapeHtml(t.aboutUsAndContacts)}</a></nav>
      </header>
      <main style="max-width:1200px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:0.5rem;">${escapeHtml(t.appName)} — ${escapeHtml(t.appSub)}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;margin-bottom:2rem;">${escapeHtml(t.mainSubtitle)}</p>
        <section style="background:#1e293b;padding:1.5rem;border-radius:1rem;margin-bottom:2rem;">
          <h2 style="font-size:1.25rem;font-weight:700;color:#38bdf8;margin-bottom:0.5rem;">${escapeHtml(t.noAuthTitle)}</h2>
          <p style="color:#94a3b8;">${escapeHtml(t.noAuthDesc)}</p>
        </section>
        <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-bottom:2rem;">
          <div style="background:#1e293b;padding:1.25rem;border-radius:1rem;">
            <h3 style="font-weight:bold;color:#f8fafc;margin-bottom:0.5rem;">${escapeHtml(t.aboutAdv1Title)}</h3>
            <p style="font-size:0.875rem;color:#94a3b8;">${escapeHtml(t.aboutAdv1Desc)}</p>
          </div>
          <div style="background:#1e293b;padding:1.25rem;border-radius:1rem;">
            <h3 style="font-weight:bold;color:#f8fafc;margin-bottom:0.5rem;">${escapeHtml(t.aboutAdv2Title)}</h3>
            <p style="font-size:0.875rem;color:#94a3b8;">${escapeHtml(t.aboutAdv2Desc)}</p>
          </div>
        </section>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${escapeHtml(t.footerCopyright)}</p>
      </footer>
    `;
    return { lang, title, description, keywords, canonicalUrl, bodyContent };
  }

  if (routePath === '/privacy') {
    const title = `${t.privacyPolicy} — AllConvert`;
    const description = `${t.privacyPrinciple} ${t.privacySec1Text}`;
    const keywords = `privacy policy AllConvert, ${t.privacyPolicy}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="${homeHref}" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${escapeHtml(t.privacyPolicy)}</h1>
        <p style="font-size:1.125rem;color:#34d399;font-weight:600;margin-bottom:1.5rem;">${escapeHtml(t.privacyPrinciple)}</p>
        <div style="display:flex;flex-direction:column;gap:1.5rem;line-height:1.6;color:#cbd5e1;">
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.privacySec1Title)}</h2><p>${escapeHtml(t.legalPrivacyContent1)}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.privacySec2Title)}</h2><p>${escapeHtml(t.legalPrivacyContent2)}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.privacySec3Title)}</h2><p>${escapeHtml(t.legalPrivacyContent3)}</p><p style="margin-top:0.5rem;">${escapeHtml(t.legalPrivacyContent4)}</p></section>
        </div>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${escapeHtml(t.footerCopyright)}</p>
      </footer>
    `;
    return { lang, title, description, keywords, canonicalUrl, bodyContent };
  }

  if (routePath === '/terms') {
    const title = `${t.termsOfService} — AllConvert`;
    const description = `${t.termsSec1Text} ${t.termsSec2Text}`;
    const keywords = `terms of service AllConvert, ${t.termsOfService}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="${homeHref}" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${escapeHtml(t.termsOfService)}</h1>
        <div style="display:flex;flex-direction:column;gap:1.5rem;line-height:1.6;color:#cbd5e1;">
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.termsSec1Title)}</h2><p>${escapeHtml(t.legalTermsContent1)}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.termsSec2Title)}</h2><p>${escapeHtml(t.legalTermsContent2)}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${escapeHtml(t.termsSec3Title)}</h2><p>${escapeHtml(t.legalTermsContent3)}</p></section>
        </div>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${escapeHtml(t.footerCopyright)}</p>
      </footer>
    `;
    return { lang, title, description, keywords, canonicalUrl, bodyContent };
  }

  if (routePath === '/about') {
    const title = t.aboutPageTitle;
    const description = t.aboutPageDesc;
    const keywords = `about AllConvert, ${t.aboutPageHeading}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="${homeHref}" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${escapeHtml(t.aboutPageHeading)}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;line-height:1.6;margin-bottom:2rem;">${escapeHtml(t.aboutPageDesc)}</p>
        <section style="background:#1e293b;padding:1.5rem;border-radius:1rem;margin-bottom:2rem;">
          <h2 style="font-size:1.25rem;font-weight:bold;color:#fff;margin-bottom:0.5rem;">${escapeHtml(t.contactHeader)}</h2>
          <p style="color:#cbd5e1;">${escapeHtml(t.contactDesc)} <a href="mailto:support@allconvert.ru" style="color:#38bdf8;font-weight:bold;">support@allconvert.ru</a></p>
        </section>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${escapeHtml(t.footerCopyright)}</p>
      </footer>
    `;
    return { lang, title, description, keywords, canonicalUrl, bodyContent };
  }

  if (routePath.startsWith('/convert/')) {
    const slug = routePath.replace('/convert/', '');
    const rawData = getSeoPageDataBySlug(slug);
    const seoData = getLocalizedSeoRoute(rawData, lang);

    const title = seoData.title;
    const description = seoData.metaDescription;

    const keywordsDict = {
      ru: `${seoData.fromFormat} в ${seoData.toFormat}, конвертер ${seoData.fromFormat} в ${seoData.toFormat}, перевести ${seoData.fromFormat} в ${seoData.toFormat} онлайн бесплатно`,
      en: `convert ${seoData.fromFormat} to ${seoData.toFormat}, ${seoData.fromFormat} to ${seoData.toFormat} converter, free online ${seoData.fromFormat} to ${seoData.toFormat}`,
      zh: `${seoData.fromFormat} 转 ${seoData.toFormat}, ${seoData.fromFormat} 转 ${seoData.toFormat} 转换器, 在线免费 ${seoData.fromFormat} 转 ${seoData.toFormat}`,
      es: `convertir ${seoData.fromFormat} a ${seoData.toFormat}, convertidor ${seoData.fromFormat} a ${seoData.toFormat} gratis en línea`,
      de: `${seoData.fromFormat} in ${seoData.toFormat} umwandeln, ${seoData.fromFormat} in ${seoData.toFormat} konverter kostenlos`
    };
    const keywords = keywordsDict[lang] || keywordsDict.ru;

    const stepsHtml = seoData.steps
      ? seoData.steps.map(s => `<li style="margin-bottom:0.5rem;"><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.text)}</li>`).join('')
      : '';

    const featuresHtml = seoData.features
      ? seoData.features.map(f => `<div style="background:#1e293b;padding:1rem;border-radius:0.75rem;"><h3 style="font-weight:bold;color:#f8fafc;margin-bottom:0.25rem;">${escapeHtml(f.title)}</h3><p style="font-size:0.875rem;color:#94a3b8;">${escapeHtml(f.text)}</p></div>`).join('')
      : '';

    const faqsHtml = seoData.faqs
      ? seoData.faqs.map(faq => `<details style="background:#1e293b;padding:1rem;border-radius:0.75rem;margin-bottom:0.5rem;"><summary style="font-weight:bold;color:#f8fafc;cursor:pointer;">${escapeHtml(faq.q)}</summary><p style="margin-top:0.5rem;color:#cbd5e1;font-size:0.875rem;">${escapeHtml(faq.a)}</p></details>`).join('')
      : '';

    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="${homeHref}" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:1000px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <nav style="font-size:0.875rem;color:#94a3b8;margin-bottom:1.5rem;"><a href="${homeHref}" style="color:#38bdf8;">AllConvert</a> / <span>${escapeHtml(seoData.fromFormat)} → ${escapeHtml(seoData.toFormat)}</span></nav>
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:0.75rem;">${escapeHtml(seoData.h1)}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;margin-bottom:2rem;line-height:1.6;">${escapeHtml(seoData.subtitle)}</p>
        
        ${seoData.descriptionParagraphs ? seoData.descriptionParagraphs.map(p => `<p style="margin-bottom:1rem;color:#94a3b8;line-height:1.6;">${escapeHtml(p)}</p>`).join('') : ''}

        ${stepsHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">${escapeHtml(seoData.fromFormat)} → ${escapeHtml(seoData.toFormat)}</h2><ol style="padding-left:1.25rem;color:#cbd5e1;">${stepsHtml}</ol></section>` : ''}

        ${featuresHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">AllConvert</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;">${featuresHtml}</div></section>` : ''}

        ${faqsHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">FAQ</h2><div>${faqsHtml}</div></section>` : ''}
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${escapeHtml(t.footerCopyright)}</p>
      </footer>
    `;
    return { lang, title, description, keywords, canonicalUrl, bodyContent };
  }

  return {
    lang,
    title: `${t.appName} — ${t.appSub}`,
    description: t.mainSubtitle,
    keywords: '',
    canonicalUrl,
    bodyContent: ''
  };
}

console.log(`[PRERENDER] Found ${routes.size} static routes to prerender in ${SUPPORTED_LANGS.length} languages.`);

let count = 0;
for (const routePath of routes) {
  for (const lang of SUPPORTED_LANGS) {
    const pageMeta = renderRouteContent(routePath, lang);
    const renderedHtml = injectMetadata(baseHtml, pageMeta);

    if (lang === 'ru') {
      if (routePath === '/' || routePath === '') {
        fs.writeFileSync(indexHtmlPath, renderedHtml, 'utf-8');
      } else {
        const segments = routePath.split('/').filter(Boolean);
        const targetDir = path.join(distDir, ...segments);
        fs.mkdirSync(targetDir, { recursive: true });

        const targetFile = path.join(targetDir, 'index.html');
        fs.writeFileSync(targetFile, renderedHtml, 'utf-8');
      }
    } else {
      if (routePath === '/' || routePath === '') {
        const targetDir = path.join(distDir, lang);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.html'), renderedHtml, 'utf-8');
      } else {
        const segments = routePath.split('/').filter(Boolean);
        const targetDir = path.join(distDir, lang, ...segments);
        fs.mkdirSync(targetDir, { recursive: true });

        const targetFile = path.join(targetDir, 'index.html');
        fs.writeFileSync(targetFile, renderedHtml, 'utf-8');
      }
    }
    count++;
  }
}

// Clean up temporary bundle directory
try {
  fs.rmSync(tmpBundleDir, { recursive: true, force: true });
} catch (e) {}

console.log(`[PRERENDER] Successfully prerendered ${count} clean localized static HTML files into dist!`);
