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

// Collect all routes
const routes = new Set(['/', '/privacy', '/terms', '/about']);

// Add all routes from POPULAR_SEO_ROUTES
for (const slug of Object.keys(POPULAR_SEO_ROUTES)) {
  routes.add(`/convert/${slug}`);
}

// Add all routes from sitemap.xml
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = sitemapContent.match(/<loc>https?:\/\/[^\/]+(\/[^<]*)<\/loc>/g);
  if (matches) {
    for (const m of matches) {
      const rawRoute = m.replace(/<loc>https?:\/\/[^\/]+/, '').replace('</loc>', '');
      const route = rawRoute.split('?')[0];
      if (route) {
        routes.add(route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route);
      }
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceTag(html, regex, newTag) {
  if (regex.test(html)) {
    return html.replace(regex, newTag);
  } else {
    return html.replace('</head>', `  ${newTag}\n</head>`);
  }
}

function injectMetadata(html, { lang, title, description, canonicalUrl, ogTitle, ogDescription, bodyContent }, allLangsMap) {
  let output = html;

  // Replace or inject <html lang="...">
  output = output.replace(/<html(\s+[^>]*)lang="[^"]*"/i, `<html$1lang="${lang}"`);
  if (!/<html[^>]*lang=/i.test(output)) {
    output = output.replace(/<html/i, `<html lang="${lang}"`);
  }

  // Title
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Meta description
  const metaDescTag = `<meta name="description" content="${escapeHtml(description)}">`;
  output = replaceTag(output, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, metaDescTag);

  // OG Title
  const ogTitleTag = `<meta property="og:title" content="${escapeHtml(ogTitle || title)}">`;
  output = replaceTag(output, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, ogTitleTag);

  // OG Description
  const ogDescTag = `<meta property="og:description" content="${escapeHtml(ogDescription || description)}">`;
  output = replaceTag(output, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, ogDescTag);

  // Canonical link
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`;
  output = replaceTag(output, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonicalTag);

  // Hreflang alternate links
  const basePath = canonicalUrl.split('?')[0].replace('https://allconvert.ru', '');
  const hreflangTags = [
    `<link rel="alternate" hreflang="ru" href="https://allconvert.ru${basePath}">`,
    `<link rel="alternate" hreflang="en" href="https://allconvert.ru${basePath}?lang=en">`,
    `<link rel="alternate" hreflang="zh" href="https://allconvert.ru${basePath}?lang=zh">`,
    `<link rel="alternate" hreflang="es" href="https://allconvert.ru${basePath}?lang=es">`,
    `<link rel="alternate" hreflang="de" href="https://allconvert.ru${basePath}?lang=de">`,
    `<link rel="alternate" hreflang="x-default" href="https://allconvert.ru${basePath}">`,
  ].join('\n  ');

  output = output.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace('</head>', `  ${hreflangTags}\n</head>`);

  // Inject inline language switcher script if allLangsMap is provided
  if (allLangsMap) {
    const jsonMap = JSON.stringify(allLangsMap);
    const inlineScript = `
  <script>
    window.__PRERENDER_LANG_DATA__ = ${jsonMap};
    (function(){
      try {
        var params = new URLSearchParams(window.location.search);
        var langParam = params.get('lang');
        var pathMatch = window.location.pathname.match(/^\\/(en|zh|es|de)\\//);
        var targetLang = pathMatch ? pathMatch[1] : langParam;
        var data = window.__PRERENDER_LANG_DATA__;
        if (targetLang && data && data[targetLang]) {
          var item = data[targetLang];
          document.documentElement.lang = targetLang;
          if (item.title) document.title = item.title;
          var metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && item.description) metaDesc.setAttribute('content', item.description);
          var ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle && item.title) ogTitle.setAttribute('content', item.title);
          var ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc && item.description) ogDesc.setAttribute('content', item.description);
          var rootEl = document.getElementById('root');
          if (rootEl && item.bodyContent) rootEl.innerHTML = item.bodyContent;
        }
      } catch(e) {}
    })();
  </script>`;
    output = output.replace('</head>', `${inlineScript}\n</head>`);
  }

  // Body content pre-rendering
  if (bodyContent) {
    output = output.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }

  return output;
}

// Helper to construct pre-rendered HTML structure for each route and language
function renderRouteContent(routePath, lang = 'ru') {
  const t = translations[lang] || translations.ru;
  const basePath = routePath === '/' ? '/' : routePath;
  const canonicalUrl = `https://allconvert.ru${basePath}${lang !== 'ru' ? `?lang=${lang}` : ''}`;

  if (routePath === '/' || routePath === '') {
    const title = `${t.appName} — ${t.appSub}`;
    const description = t.mainSubtitle;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-weight:bold;font-size:1.25rem;">All<span style="color:#38bdf8;">Convert</span></div>
        <nav><a href="/privacy" style="color:#94a3b8;margin-right:1rem;">${escapeHtml(t.privacyPolicy)}</a><a href="/terms" style="color:#94a3b8;margin-right:1rem;">${escapeHtml(t.termsOfService)}</a><a href="/about" style="color:#94a3b8;">${escapeHtml(t.aboutUsAndContacts)}</a></nav>
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
    return { lang, title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/privacy') {
    const title = `${t.privacyPolicy} — AllConvert`;
    const description = `${t.privacyPrinciple} ${t.privacySec1Text}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
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
    return { lang, title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/terms') {
    const title = `${t.termsOfService} — AllConvert`;
    const description = `${t.termsSec1Text} ${t.termsSec2Text}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
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
    return { lang, title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/about') {
    const title = t.aboutPageTitle;
    const description = t.aboutPageDesc;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
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
    return { lang, title, description, canonicalUrl, bodyContent };
  }

  if (routePath.startsWith('/convert/')) {
    const slug = routePath.replace('/convert/', '');
    const rawData = getSeoPageDataBySlug(slug);
    const seoData = getLocalizedSeoRoute(rawData, lang);

    const title = seoData.title;
    const description = seoData.metaDescription;

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
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:1000px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <nav style="font-size:0.875rem;color:#94a3b8;margin-bottom:1.5rem;"><a href="/" style="color:#38bdf8;">AllConvert</a> / <span>${escapeHtml(seoData.fromFormat)} → ${escapeHtml(seoData.toFormat)}</span></nav>
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
    return { lang, title, description, canonicalUrl, bodyContent };
  }

  return {
    lang,
    title: `${t.appName} — ${t.appSub}`,
    description: t.mainSubtitle,
    canonicalUrl,
    bodyContent: ''
  };
}

console.log(`[PRERENDER] Found ${routes.size} static routes to prerender in ${SUPPORTED_LANGS.length} languages (${SUPPORTED_LANGS.join(', ')}).`);

let count = 0;
for (const routePath of routes) {
  // Pre-calculate translations for all languages for this route
  const allLangsMap = {};
  for (const lang of SUPPORTED_LANGS) {
    allLangsMap[lang] = renderRouteContent(routePath, lang);
  }

  for (const lang of SUPPORTED_LANGS) {
    const meta = allLangsMap[lang];
    const renderedHtml = injectMetadata(baseHtml, meta, allLangsMap);

    if (lang === 'ru') {
      // Default Russian files at primary path
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
      // Localized files under /<lang>/ subdirectories
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

console.log(`[PRERENDER] Successfully prerendered ${count} localized HTML files into dist!`);
