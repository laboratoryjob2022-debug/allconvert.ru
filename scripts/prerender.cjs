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

const { POPULAR_SEO_ROUTES, getSeoPageDataBySlug } = seoPagesModule;
const { translations } = i18nModule;

const tRu = translations.ru;

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
      const route = m.replace(/<loc>https?:\/\/[^\/]+/, '').replace('</loc>', '');
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

function injectMetadata(html, { title, description, canonicalUrl, ogTitle, ogDescription, bodyContent }) {
  let output = html;

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
  const baseHreflangPath = canonicalUrl.replace('https://allconvert.ru', '');
  const hreflangTags = [
    `<link rel="alternate" hreflang="ru" href="https://allconvert.ru${baseHreflangPath}">`,
    `<link rel="alternate" hreflang="en" href="https://allconvert.ru${baseHreflangPath}?lang=en">`,
    `<link rel="alternate" hreflang="zh" href="https://allconvert.ru${baseHreflangPath}?lang=zh">`,
    `<link rel="alternate" hreflang="es" href="https://allconvert.ru${baseHreflangPath}?lang=es">`,
    `<link rel="alternate" hreflang="de" href="https://allconvert.ru${baseHreflangPath}?lang=de">`,
    `<link rel="alternate" hreflang="x-default" href="https://allconvert.ru${baseHreflangPath}">`,
  ].join('\n  ');

  // Remove old hreflang links if present and inject new ones
  output = output.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\n?/gi, '');
  output = output.replace('</head>', `  ${hreflangTags}\n</head>`);

  // Body content pre-rendering
  if (bodyContent) {
    output = output.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }

  return output;
}

// Helper to construct pre-rendered HTML structure for each route type
function renderRouteContent(routePath) {
  const canonicalUrl = `https://allconvert.ru${routePath === '/' ? '/' : routePath}`;

  if (routePath === '/' || routePath === '') {
    const title = `${tRu.appName} — ${tRu.appSub}`;
    const description = tRu.mainSubtitle;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-weight:bold;font-size:1.25rem;">All<span style="color:#38bdf8;">Convert</span></div>
        <nav><a href="/privacy" style="color:#94a3b8;margin-right:1rem;">${tRu.privacyPolicy}</a><a href="/terms" style="color:#94a3b8;margin-right:1rem;">${tRu.termsOfService}</a><a href="/about" style="color:#94a3b8;">${tRu.aboutUsAndContacts}</a></nav>
      </header>
      <main style="max-width:1200px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:0.5rem;">${tRu.appName} — ${tRu.appSub}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;margin-bottom:2rem;">${tRu.mainSubtitle}</p>
        <section style="background:#1e293b;padding:1.5rem;border-radius:1rem;margin-bottom:2rem;">
          <h2 style="font-size:1.25rem;font-weight:700;color:#38bdf8;margin-bottom:0.5rem;">${tRu.noAuthTitle}</h2>
          <p style="color:#94a3b8;">${tRu.noAuthDesc}</p>
        </section>
        <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-bottom:2rem;">
          <div style="background:#1e293b;padding:1.25rem;border-radius:1rem;">
            <h3 style="font-weight:bold;color:#f8fafc;margin-bottom:0.5rem;">${tRu.aboutAdv1Title}</h3>
            <p style="font-size:0.875rem;color:#94a3b8;">${tRu.aboutAdv1Desc}</p>
          </div>
          <div style="background:#1e293b;padding:1.25rem;border-radius:1rem;">
            <h3 style="font-weight:bold;color:#f8fafc;margin-bottom:0.5rem;">${tRu.aboutAdv2Title}</h3>
            <p style="font-size:0.875rem;color:#94a3b8;">${tRu.aboutAdv2Desc}</p>
          </div>
        </section>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${tRu.footerCopyright}</p>
      </footer>
    `;
    return { title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/privacy') {
    const title = `${tRu.privacyPolicy} — AllConvert`;
    const description = `${tRu.privacyPrinciple} ${tRu.privacySec1Text}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${tRu.privacyPolicy}</h1>
        <p style="font-size:1.125rem;color:#34d399;font-weight:600;margin-bottom:1.5rem;">${tRu.privacyPrinciple}</p>
        <div style="display:flex;flex-direction:column;gap:1.5rem;line-height:1.6;color:#cbd5e1;">
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.privacySec1Title}</h2><p>${tRu.legalPrivacyContent1}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.privacySec2Title}</h2><p>${tRu.legalPrivacyContent2}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.privacySec3Title}</h2><p>${tRu.legalPrivacyContent3}</p><p style="margin-top:0.5rem;">${tRu.legalPrivacyContent4}</p></section>
        </div>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${tRu.footerCopyright}</p>
      </footer>
    `;
    return { title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/terms') {
    const title = `${tRu.termsOfService} — AllConvert`;
    const description = `${tRu.termsSec1Text} ${tRu.termsSec2Text}`;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${tRu.termsOfService}</h1>
        <div style="display:flex;flex-direction:column;gap:1.5rem;line-height:1.6;color:#cbd5e1;">
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.termsSec1Title}</h2><p>${tRu.legalTermsContent1}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.termsSec2Title}</h2><p>${tRu.legalTermsContent2}</p></section>
          <section><h2 style="font-size:1.25rem;font-weight:bold;color:#fff;">${tRu.termsSec3Title}</h2><p>${tRu.legalTermsContent3}</p></section>
        </div>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${tRu.footerCopyright}</p>
      </footer>
    `;
    return { title, description, canonicalUrl, bodyContent };
  }

  if (routePath === '/about') {
    const title = tRu.aboutPageTitle;
    const description = tRu.aboutPageDesc;
    const bodyContent = `
      <header style="padding:1rem;background:#0f172a;color:#fff;">
        <a href="/" style="font-weight:bold;font-size:1.25rem;color:#fff;text-decoration:none;">All<span style="color:#38bdf8;">Convert</span></a>
      </header>
      <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:sans-serif;color:#f8fafc;">
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;">${tRu.aboutPageHeading}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;line-height:1.6;margin-bottom:2rem;">${tRu.aboutPageDesc}</p>
        <section style="background:#1e293b;padding:1.5rem;border-radius:1rem;margin-bottom:2rem;">
          <h2 style="font-size:1.25rem;font-weight:bold;color:#fff;margin-bottom:0.5rem;">${tRu.contactHeader}</h2>
          <p style="color:#cbd5e1;">${tRu.contactDesc} <a href="mailto:support@allconvert.ru" style="color:#38bdf8;font-weight:bold;">support@allconvert.ru</a></p>
        </section>
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${tRu.footerCopyright}</p>
      </footer>
    `;
    return { title, description, canonicalUrl, bodyContent };
  }

  if (routePath.startsWith('/convert/')) {
    const slug = routePath.replace('/convert/', '');
    const seoData = getSeoPageDataBySlug(slug);
    const title = seoData.title;
    const description = seoData.metaDescription;

    const stepsHtml = seoData.steps
      ? seoData.steps.map(s => `<li style="margin-bottom:0.5rem;"><strong>Шаг ${s.step}: ${escapeHtml(s.title)}</strong> — ${escapeHtml(s.text)}</li>`).join('')
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
        <nav style="font-size:0.875rem;color:#94a3b8;margin-bottom:1.5rem;"><a href="/" style="color:#38bdf8;">Главная</a> / <span>${escapeHtml(seoData.fromFormat)} в ${escapeHtml(seoData.toFormat)}</span></nav>
        <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:0.75rem;">${escapeHtml(seoData.h1)}</h1>
        <p style="font-size:1.125rem;color:#cbd5e1;margin-bottom:2rem;line-height:1.6;">${escapeHtml(seoData.subtitle)}</p>
        
        ${seoData.descriptionParagraphs ? seoData.descriptionParagraphs.map(p => `<p style="margin-bottom:1rem;color:#94a3b8;line-height:1.6;">${escapeHtml(p)}</p>`).join('') : ''}

        ${stepsHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Как сконвертировать ${escapeHtml(seoData.fromFormat)} в ${escapeHtml(seoData.toFormat)}</h2><ol style="padding-left:1.25rem;color:#cbd5e1;">${stepsHtml}</ol></section>` : ''}

        ${featuresHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Преимущества конвертации на AllConvert</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;">${featuresHtml}</div></section>` : ''}

        ${faqsHtml ? `<section style="margin:2rem 0;"><h2 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Часто задаваемые вопросы (FAQ)</h2><div>${faqsHtml}</div></section>` : ''}
      </main>
      <footer style="border-top:1px solid #334155;padding:2rem 1rem;color:#64748b;font-size:0.875rem;text-align:center;margin-top:3rem;">
        <p>© ${new Date().getFullYear()} AllConvert.ru. ${tRu.footerCopyright}</p>
      </footer>
    `;
    return { title, description, canonicalUrl, bodyContent };
  }

  return {
    title: `${tRu.appName} — ${tRu.appSub}`,
    description: tRu.mainSubtitle,
    canonicalUrl,
    bodyContent: ''
  };
}

console.log(`[PRERENDER] Found ${routes.size} static routes to prerender.`);

let count = 0;
for (const routePath of routes) {
  const meta = renderRouteContent(routePath);
  const renderedHtml = injectMetadata(baseHtml, meta);

  if (routePath === '/' || routePath === '') {
    fs.writeFileSync(indexHtmlPath, renderedHtml, 'utf-8');
    console.log(`  ✓ Updated dist/index.html (Home)`);
  } else {
    const segments = routePath.split('/').filter(Boolean);
    const targetDir = path.join(distDir, ...segments);
    fs.mkdirSync(targetDir, { recursive: true });

    const targetFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(targetFile, renderedHtml, 'utf-8');
    console.log(`  ✓ Created ${path.relative(distDir, targetFile)}`);
  }
  count++;
}

// Clean up temporary bundle directory
try {
  fs.rmSync(tmpBundleDir, { recursive: true, force: true });
} catch (e) {}

console.log(`[PRERENDER] Successfully prerendered ${count} static routes into dist!`);
