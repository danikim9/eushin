import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.goto('file://' + process.cwd() + '/' + (process.argv[2] || 'slides.html'), { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const els = await p.$$('.s');
for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${process.argv[3] || 'post1'}-${i + 1}.png` });
await b.close();
