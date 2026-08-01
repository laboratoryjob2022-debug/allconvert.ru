const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const seoPagesPath = path.join(__dirname, '..', 'src', 'lib', 'seoPages.ts');
const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

const routeSet = new Set();

// 1. Extract slugs directly from src/lib/seoPages.ts
if (fs.existsSync(seoPagesPath)) {
  const seoContent = fs.readFileSync(seoPagesPath, 'utf-8');
  // Match key patterns like 'pdf-to-word': {
  const keyMatches = seoContent.matchAll(/'([a-z0-9-]+)':\s*\{/g);
  for (const match of keyMatches) {
    if (match[1]) {
      routeSet.add(`/convert/${match[1]}`);
    }
  }
}

// 2. Extract routes from sitemap.xml
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = sitemapContent.match(/<loc>https?:\/\/[^\/]+(\/convert\/[^<]+)<\/loc>/g);
  if (matches) {
    for (const m of matches) {
      const route = m.replace(/<loc>https?:\/\/[^\/]+/, '').replace('</loc>', '');
      routeSet.add(route);
    }
  }
}

const routes = Array.from(routeSet);

console.log(`[PRERENDER] Found ${routes.length} SEO routes to generate.`);

let count = 0;
for (const routePath of routes) {
  // routePath e.g. "/convert/pdf-to-word"
  const segments = routePath.split('/').filter(Boolean);
  const targetDir = path.join(distDir, ...segments);
  fs.mkdirSync(targetDir, { recursive: true });

  const targetFile = path.join(targetDir, 'index.html');
  fs.writeFileSync(targetFile, baseHtml, 'utf-8');
  console.log(`  ✓ Created ${path.relative(distDir, targetFile)}`);
  count++;
}

console.log(`[PRERENDER] Successfully prerendered ${count} static route files in dist!`);
