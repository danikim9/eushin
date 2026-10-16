// Builds index.html (the installable web app) from src/app.html.
// src/app.html is the page body used for the Claude artifact; this wraps it
// in a full document with the home-screen app metadata and service worker.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');
const split = src.indexOf('<div class="sky"');
if (split < 0) throw new Error('src/app.html: could not find <div class="sky"> to split head from body');
const head = src.slice(0, split).trim();
const body = src.slice(split).trim();
const version = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#4B4E6D">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Space Words">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>
html { background: #4B4E6D; }
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font: 14px/1.4 system-ui, -apple-system, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
<script src="config.js"></script>
${head}
</head>
<body>
${body}
<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
</script>
</body>
</html>
`;
writeFileSync(new URL('./index.html', import.meta.url), html);

const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
writeFileSync(new URL('./sw.js', import.meta.url), sw);
console.log(`index.html built, service worker version ${version}`);
