// Records the app footage the promo cuts from: one continuous take of the app (1024x768 @1.5x), with named marks.
// Serve the repo root on :8765 first. Writes footage/NNNNN.jpg at 30fps and marks.json (seconds into the take).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DIR = new URL('.', import.meta.url).pathname;
const ORIGIN = 'http://localhost:8765';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1.5, serviceWorkers: 'block' });
await ctx.route('**/config.js', r => r.fulfill({ body: 'window.SPACE_WORDS_CONFIG={supabaseUrl:"",supabaseKey:""};', contentType: 'text/javascript' }));
await ctx.addInitScript(() => {
  window.__said = [];
  const fake = { speak(u) { window.__said.push(u.text); setTimeout(() => { u.onend && u.onend(); }, 400 + u.text.length * 60); }, cancel() {}, getVoices() { return []; }, addEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = `.__tap{position:fixed;z-index:99998;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.45);border:4px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,.15);pointer-events:none;animation:__t .55s ease-out forwards}
    @keyframes __t{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}`;
    document.head.appendChild(st);
  });
});

const page = await ctx.newPage();
page.on('pageerror', e => console.log('page error', e.message));
await page.goto(ORIGIN + '/index.html');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('yushin-space-onboarded', 'true'); localStorage.setItem('yushin-space-guest', 'true');
  localStorage.setItem('yushin-space-kids', JSON.stringify([{ id: 'k1', name: 'Eushin', stars: 37, mastery: {}, theme: 'space' }])); localStorage.setItem('yushin-space-kid', '"k1"'); });
await page.reload(); await page.waitForTimeout(900);
await page.click('[data-act="try-example"]'); await page.waitForTimeout(400);
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);

rmSync(DIR + 'raw', { recursive: true, force: true }); mkdirSync(DIR + 'raw');
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const f = `raw/${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(DIR + f, Buffer.from(data, 'base64'));
  frames.push({ f, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
await page.waitForTimeout(300);
const t0 = Date.now() / 1000;
const marks = {};
const mark = (k) => { marks[k] = +(Date.now() / 1000 - t0).toFixed(3); };
const wait = (ms) => page.waitForTimeout(ms);
async function tap(sel, { moving = false } = {}) {
  const loc = page.locator(sel).first();
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = '__tap'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 600); }, [x, y]);
  if (moving) await loc.dispatchEvent('click'); else await page.mouse.click(x, y);
}
const week = () => page.evaluate(() => JSON.parse(localStorage.getItem('yushin-space-week')).words);
const byKo = async () => { const ko = await page.locator('.prompt .ko').innerText(); return (await week()).find(w => w.ko === ko).en; };
const lastSaid = () => page.evaluate(() => window.__said[window.__said.length - 1]);

// The picker: the whole app re-themes as each card is tapped.
mark('home0'); await wait(800);
await tap('[data-act="theme-open"]'); await wait(700);
mark('pick');
for (const id of ['princess', 'robot', 'unicorn', 'space']) { await tap(`[data-act="theme-sel"][data-id="${id}"]`); await wait(750); }
await tap('[data-act="theme-cancel"]'); await wait(700);

const PLAY = {
  space: ['spell', async () => { for (const ch of [...await byKo()].filter(c => /[a-z]/i.test(c))) { await tap(`#tiles .tile:not(.used)[data-ch="${ch}"]`); await wait(260); } }],
  princess: ['missing', async () => { const w = await byKo(); const k = await page.locator('#mw > *').evaluateAll(els => els.findIndex(e => e.id === 'hole')); await wait(400); await tap(`.opt-star[data-ch="${w[k]}"]`); }],
  robot: ['meteor', async () => { await wait(700); await tap(`.meteor[data-v="${await byKo()}"]`); }],
  unicorn: ['catch', async () => { await wait(1100); await tap(`.fall[data-en="${await lastSaid()}"]`, { moving: true }); }],
};
for (const id of ['space', 'princess', 'robot', 'unicorn']) {
  if (id !== 'space') {
    await tap('[data-act="theme-open"]'); await wait(600);
    await tap(`[data-act="theme-sel"][data-id="${id}"]`); await wait(600);
    await tap('[data-act="theme-go"]'); await wait(150);
  }
  mark('home_' + id); await wait(1800);
  const [game, play] = PLAY[id];
  await tap(`[data-act="play"][data-game="${game}"]`); await wait(900);
  mark('game_' + id);
  await play(); mark('win_' + id); await wait(1800);
  await tap('[data-act="home"]'); await wait(700);
}

// Switching worlds: the count stays the same.
await tap('[data-act="theme-open"]'); await wait(600);
mark('switch');
for (const id of ['space', 'princess', 'robot', 'unicorn', 'space']) { await tap(`[data-act="theme-sel"][data-id="${id}"]`); await wait(850); }
mark('end');

await cdp.send('Page.stopScreencast'); await wait(200);
const end = frames[0].t + (Date.now() / 1000 - frames[0].t);
let list = '';
frames.forEach((fr, k) => { list += `file '${fr.f}'\nduration ${Math.max(((k + 1 < frames.length ? frames[k + 1].t : end) - fr.t), 0.001).toFixed(4)}\n`; });
list += `file '${frames.at(-1).f}'\n`;
writeFileSync(DIR + 'raw.txt', list);
// marks are relative to t0; shift them to the take's first frame.
const shift = t0 - frames[0].t;
for (const k in marks) marks[k] = +(marks[k] + shift).toFixed(3);
writeFileSync(DIR + 'marks.json', JSON.stringify(marks, null, 1));
await browser.close();
rmSync(DIR + 'footage', { recursive: true, force: true }); mkdirSync(DIR + 'footage');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'raw.txt', '-vf', 'fps=30', '-q:v', '3', 'footage/%05d.jpg'], { cwd: DIR });
console.log(marks);
