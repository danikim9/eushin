// Records demo/themes-reel.mp4 (1080x1920, 9:16). Serve the repo root on :8765 (python3 -m http.server 8765), run this, then
// ffmpeg -f concat -safe 0 -i frames.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 -movflags +faststart themes-reel.mp4
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const DIR = new URL('.', import.meta.url).pathname;
const ORIGIN = 'http://localhost:8765';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
await ctx.route('**/config.js', r => r.fulfill({ body: 'window.SPACE_WORDS_CONFIG={supabaseUrl:"",supabaseKey:""};', contentType: 'text/javascript' }));
await ctx.route(ORIGIN + '/reel.html', r => r.fulfill({ body: readFileSync(DIR + 'themes-reel.html', 'utf8'), contentType: 'text/html' }));
await ctx.addInitScript(() => {
  // Headless Chromium has no voices: log what the app says and end each utterance on a timer.
  window.__said = [];
  const fake = { speak(u) { window.__said.push(u.text); setTimeout(() => { u.onend && u.onend(); }, 400 + u.text.length * 60); }, cancel() {}, getVoices() { return []; }, addEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
});

// Prep: get the app's example words, then start as a new child who has not picked a world yet.
const prep = await ctx.newPage();
await prep.goto(ORIGIN + '/index.html');
await prep.evaluate(() => { localStorage.clear(); localStorage.setItem('yushin-space-onboarded', 'true'); localStorage.setItem('yushin-space-guest', 'true');
  localStorage.setItem('yushin-space-kids', JSON.stringify([{ id: 'k1', name: 'Eushin', stars: 0, mastery: {}, theme: 'space' }])); localStorage.setItem('yushin-space-kid', '"k1"'); });
await prep.reload(); await prep.waitForTimeout(800);
await prep.click('[data-act="try-example"]'); await prep.waitForTimeout(300);
await prep.evaluate(() => localStorage.setItem('yushin-space-kids', JSON.stringify([{ id: 'k1', name: 'Eushin', stars: 0, mastery: {}, theme: null }])));
await prep.close();

const page = await ctx.newPage();
page.on('pageerror', e => console.log('page error', e.message));
await page.goto(ORIGIN + '/reel.html');
const app = page.frameLocator('#app');
const frame = () => page.frame({ url: /index\.html/ });
await page.waitForTimeout(2500);   // fonts + app boot

// Capture with the CDP screencast (sharper than recordVideo); frames keep their timestamps.
rmSync(DIR + 'frames', { recursive: true, force: true }); mkdirSync(DIR + 'frames');
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const f = `frames/${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(DIR + f, Buffer.from(data, 'base64'));
  frames.push({ f, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const t0 = Date.now();
const at = async (s) => { const ms = t0 + s * 1000 - Date.now(); if (ms > 0) await page.waitForTimeout(ms); else if (ms < -150) console.log(`late by ${-ms}ms at ${s}s`); };
const R = (fn, ...a) => page.evaluate(([fn, a]) => window.reel[fn](...a), [fn, a]);

async function tap(sel, { moving = false } = {}) {
  const loc = app.locator(sel).first();
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await R('tap', x, y);
  if (moving) await loc.dispatchEvent('click'); else await page.mouse.click(x, y);
}
const week = () => frame().evaluate(() => JSON.parse(localStorage.getItem('yushin-space-week')).words);
const byKo = async () => { const ko = await app.locator('.prompt .ko').innerText(); return (await week()).find(w => w.ko === ko).en; };
const lastSaid = () => frame().evaluate(() => window.__said[window.__said.length - 1]);
const pause = (ms) => page.waitForTimeout(ms);

// One theme block: pick it in the picker, land on its home, play one round of its own game, go home.
async function themeBlock(T, id, game, fromHome, play) {
  if (fromHome) { await at(T); await tap('[data-act="theme-open"]'); }
  await at(T + 0.8); await tap(`[data-act="theme-sel"][data-id="${id}"]`);
  await at(T + 2.6); await tap('[data-act="theme-go"]');
  await at(T + 4.6); await tap(`[data-act="play"][data-game="${game}"]`);
  await at(T + 5.6); await play();
  await at(T + 8.6); await tap('[data-act="home"]');
}

// 0 — hook: the first-visit picker
await at(0.3);
R('head', "Eushin's Space Words", '아이가 고르는<br><span class="em">4가지 세계</span>', ['🚀 우주', '👑 공주', '🤖 로봇', '🦄 유니콘']);
await at(0.6); R('cap', '영어 단어 공부, 아이가 좋아하는 세계에서 시작해요');

// 1 — Space (4.5s)
await at(4.5);
R('head', 'THEME 1', '🚀 우주 <span class="em">탐험</span>', ['가이드 코코 👽', '행성 여행 🪐', '보상 ⭐ 별']);
R('cap', '외계인 친구 코코와 행성을 여행하고');
setTimeout(() => R('cap', '정답마다 반짝이는 별을 모아요'), 4500);
await themeBlock(4.5, 'space', 'spell', false, async () => {
  const word = await byKo();
  for (const ch of [...word].filter(c => /[a-z]/i.test(c))) { await tap(`#tiles .tile:not(.used)[data-ch="${ch}"]`); await pause(380); }
});

// 2 — Princess (13.5s)
await at(13.5);
R('head', 'THEME 2', '👑 공주 <span class="em">왕국</span>', ['가이드 로지 🐱', '성과 왕국 🏰', '보상 💎 보석']);
R('cap', '아기 고양이 로지와 성을 여행하며');
setTimeout(() => R('cap', '반짝이는 보석을 받아요'), 4500);
await themeBlock(13.5, 'princess', 'missing', true, async () => {
  const word = await byKo();
  const k = await app.locator('#mw > *').evaluateAll(els => els.findIndex(e => e.id === 'hole'));
  await tap(`.opt-star[data-ch="${word[k]}"]`);
});

// 3 — Robot (22.5s)
await at(22.5);
R('head', 'THEME 3', '🤖 로봇 <span class="em">시티</span>', ['가이드 볼트 🤖', '미래 도시 🏙️', '보상 ⚡ 에너지']);
R('cap', '로봇 볼트와 미래 도시를 탐험하고');
setTimeout(() => R('cap', '도시에 불을 밝히며 에너지를 모아요'), 4500);
await themeBlock(22.5, 'robot', 'meteor', true, async () => {
  await pause(700);
  const word = await byKo();
  await tap(`.meteor[data-v="${word}"]`);
});

// 4 — Unicorn (31.5s)
await at(31.5);
R('head', 'THEME 4', '🦄 유니콘<br><span class="em">원더랜드</span>', ['가이드 루나 🦄', '마법의 땅 🌈', '보상 🔮 크리스털']);
R('cap', '유니콘 루나와 무지개 너머 마법의 땅으로!');
setTimeout(() => R('cap', '보상은 반짝반짝 크리스털'), 4500);
await themeBlock(31.5, 'unicorn', 'catch', true, async () => {
  await pause(900);
  const word = await lastSaid();
  await tap(`.fall[data-en="${word}"]`, { moving: true });
});

// 5 — Outro: switch anytime, stars stay
await at(40.5);
R('head', '언제든 바꾸기', '테마를 바꿔도<br><span class="em">별은 그대로</span>', ['16가지 게임 공통', '진도 유지']);
R('cap', '테마는 언제든 바꿀 수 있고');
await tap('[data-act="theme-open"]');
setTimeout(() => R('cap', '모은 별과 단어 진도는 그대로 이어져요'), 3200);
for (const [s, id] of [[41.4, 'space'], [42.5, 'princess'], [43.6, 'robot'], [44.7, 'unicorn'], [45.8, 'space']]) { await at(s); await tap(`[data-act="theme-sel"][data-id="${id}"]`); }

// 6 — End card
await at(47.2); R('end'); R('cap', '');
await at(47.5); await page.evaluate(() => { const c = document.getElementById('cap'); c.style.zIndex = 60; window.reel.cap('오늘, 우리 아이의 세계를 골라 주세요!'); });
await at(51.5);

await cdp.send('Page.stopScreencast');
await page.waitForTimeout(300);
// ffmpeg concat list: each frame lasts until the next one; the last one holds to the end.
const end = frames[0].t + (Date.now() - t0) / 1000;
let list = '';
frames.forEach((fr, k) => { const d = (k + 1 < frames.length ? frames[k + 1].t : end) - fr.t; list += `file '${fr.f}'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`; });
list += `file '${frames[frames.length - 1].f}'\n`;
writeFileSync(DIR + 'frames.txt', list);
console.log(`${frames.length} frames over ${(end - frames[0].t).toFixed(2)}s`);
await browser.close();
