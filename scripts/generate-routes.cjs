const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

// Extract all /convert/* routes from sitemap.xml
let routes = [];

if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = sitemapContent.match(/<loc>https?:\/\/[^\/]+(\/convert\/[^<]+)<\/loc>/g);
  if (matches) {
    routes = matches.map(m => m.replace(/<loc>https?:\/\/[^\/]+/, '').replace('</loc>', ''));
  }
}

// Fallback / default routes if sitemap parsing fails
if (routes.length === 0) {
  routes = [
    '/convert/heic-to-jpg',
    '/convert/png-to-jpg',
    '/convert/jpg-to-png',
    '/convert/webp-to-jpg',
    '/convert/pdf-to-jpg',
    '/convert/mp4-to-mp3',
    '/convert/mov-to-mp4',
    '/convert/mov-to-mp3',
    '/convert/avi-to-mp3',
    '/convert/mkv-to-mp3',
    '/convert/webm-to-mp3',
    '/convert/wav-to-mp3',
    '/convert/m4a-to-mp3',
    '/convert/flac-to-mp3',
    '/convert/ogg-to-mp3',
    '/convert/aac-to-mp3',
    '/convert/avif-to-jpg',
    '/convert/png-to-ico',
    '/convert/pdf-to-png',
    '/convert/webp-to-png',
    '/convert/jpg-to-webp',
    '/convert/xlsx-to-csv',
    '/convert/json-to-csv',
    '/convert/pdf-to-txt'
  ];
}

console.log(`Generating static route directories for ${routes.length} SEO routes...`);

let count = 0;
for (const routePath of routes) {
  // routePath is e.g. "/convert/xlsx-to-csv"
  const targetDir = path.join(distDir, ...routePath.split('/'));
  fs.mkdirSync(targetDir, { recursive: true });

  const targetFile = path.join(targetDir, 'index.html');
  fs.writeFileSync(targetFile, baseHtml, 'utf-8');
  count++;
}

console.log(`Successfully generated static HTML for ${count} routes in dist/!`);
