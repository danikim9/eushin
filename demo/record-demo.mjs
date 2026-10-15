// Records the demo: serve the repo root on :8765 (python3 -m http.server 8765), run this, then
// ffmpeg -i vid/*.webm -vf setpts=PTS/1.25 -r 30 -c:v libx264 -pix_fmt yuv420p -an eushin-demo.mp4
// Set CHROMIUM=/path/to/chromium to use a specific browser binary.
import { chromium } from 'playwright';
const W = 1180, H = 820;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, serviceWorkers: 'block', recordVideo: { dir: 'vid', size: { width: W, height: H } } });
await ctx.addInitScript(() => {
  // Headless Chromium has no voices: record what the app says and finish each utterance on a timer.
  window.__said = [];
  const fake = { speak(u) { window.__said.push(u.text); setTimeout(() => { u.onend && u.onend(); }, 400 + u.text.length * 60); }, cancel() {}, getVoices() { return []; }, addEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = `#__cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(30,32,52,.88);color:#fff;font:600 22px/1.35 -apple-system,"Noto Sans KR",sans-serif;padding:12px 26px;border-radius:999px;transition:opacity .35s;pointer-events:none;white-space:nowrap}
    .__tap{position:fixed;z-index:99998;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,140,148,.55);border:3px solid #fff;pointer-events:none;animation:__t .6s ease-out forwards}
    @keyframes __t{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}`;
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = '__cap'; c.style.opacity = 0; document.body.appendChild(c);
  });
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const cap = (t) => page.evaluate((t) => { const c = document.getElementById('__cap'); if (!t) { c.style.opacity = 0; return; } c.textContent = t; c.style.opacity = 1; }, t);
async function ripple(x, y) {
  await page.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = '__tap'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, [x, y]);
}
async function tap(loc, pause = 550) {
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y, { steps: 8 });
  await ripple(x, y);
  await page.mouse.click(x, y);
  await wait(pause);
}
// For moving targets (meteors, falling stars): show the tap where the element is, then click it directly.
async function tapMoving(loc, pause = 550) {
  const b = await loc.boundingBox();
  await ripple(b.x + b.width / 2, b.y + b.height / 2);
  await loc.dispatchEvent('click');
  await wait(pause);
}
const lastSaid = () => page.evaluate(() => window.__said[window.__said.length - 1]);
const week = () => page.evaluate(() => JSON.parse(localStorage.getItem('yushin-space-week')).words);
const home = () => tap(page.locator('[data-act="home"]').first(), 900);
const play = (id) => tap(page.locator(`[data-act="play"][data-game="${id}"]`), 900);
const next = () => tap(page.locator('[data-act="next"]'), 700);

const byKo = async () => { const ko = await page.locator('.prompt .ko').innerText(); return (await week()).find(w => w.ko === ko).en; };
async function spellTiles(word, pause = 330) { for (const ch of [...word].filter(c => /[a-z]/i.test(c))) await tap(page.locator(`#tiles .tile:not(.used)[data-ch="${ch}"]`).first(), pause); }

await page.goto('http://localhost:8765/index.html');
// Start a few stars short of a planet so a new one opens during the demo.
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('yushin-space-progress', JSON.stringify({ stars: 205, mastery: {} })); });
await page.reload();
await wait(800);
await cap('유신이의 Space Words — 우주 테마 영어 단어 학습 앱'); await wait(2200);
await tap(page.locator('[data-act="try-example"]'), 1000);
await cap('게임 16개 — 철자 · 단어 놀이 · 문장 쓰기'); await wait(3000);

// Vowel Hunt
await cap('Vowel Hunt — 빠진 모음 a e i o u 채우기');
await play('vowel'); await wait(700);
let word = await byKo();
for (const c of word) if ('aeiou'.includes(c)) await tap(page.locator(`.opt-star[data-ch="${c}"]`), 500);
await wait(1300); await home();

// Chunk Builder
await cap('Chunk Builder — 단어 조각 이어 붙이기');
await play('chunk'); await wait(800);
const parts = await page.evaluate(() => document.querySelector('.bubble small').textContent.split(' + '));
for (const t of parts) await tap(page.locator(`.blk.chunk:not(.used)[data-t="${t}"]`).first(), 700);
await wait(1300); await home();

// Peek & Spell
await cap('Peek & Spell — 단어를 보고, 숨긴 뒤 기억해서 쓰기');
await play('peek'); await wait(2600);
word = await page.evaluate(() => [...document.querySelectorAll('#lw .lt')].map(e => e.textContent).join(''));
await tap(page.locator('[data-act="peek-go"]'), 900);
await spellTiles(word);
await wait(1300); await home();

// Spelling Bee
await cap('Spelling Bee — 듣고 a~z 키보드로 직접 쓰기');
await play('bee'); await wait(800);
word = await byKo();
for (const ch of word) await tap(page.locator(`#tiles .key[data-ch="${ch}"]`), 380);
await wait(1300); await home();

// Sentence Maker
await cap('Sentence Maker — 문장 속 빈칸에 단어 철자 채우기');
await play('frame'); await wait(900);
await spellTiles(await byKo());
await wait(1800); await home();

// Sentence Writer
await cap('Sentence Writer — 문장을 단어 하나씩 써 나가기');
await play('swrite'); await wait(1000);
for (const tok of (await page.evaluate(() => JSON.parse(localStorage.getItem('yushin-space-week')).sentences[0].en)).split(' ')) { await spellTiles(tok, 280); await wait(650); }
await wait(1500); await home();

// Sentence Trace
await cap('Sentence Trace — Apple Pencil로 문장 따라 쓰기');
await play('strace'); await wait(1000);
const pad = await page.locator('#inkC').boundingBox();
await page.mouse.move(pad.x + pad.width * .05, pad.y + pad.height * .5); await page.mouse.down();
for (let i = 0; i <= 50; i++) await page.mouse.move(pad.x + pad.width * (.05 + .3 * i / 50), pad.y + pad.height * (.5 + .12 * Math.sin(i / 3)), { steps: 2 });
await page.mouse.up(); await wait(1200); await home();

// Star Catch (full mission, which lands on a new planet)
await cap('Star Catch — 소리 듣고 떨어지는 별 잡기');
await play('catch'); await wait(1300);
for (let i = 0; i < 5; i++) {
  word = await lastSaid();
  await tapMoving(page.locator(`.fall[data-en="${word}"]`), i ? 600 : 1100);
  await next();
  if (i === 1) await cap('실수 없이 끝내면 보너스 별 +2');
}
await cap('별이 모이면 새 행성 도착! 눌러서 방문해요'); await wait(2200);
await tap(page.locator('.modal [data-act="visit"]'), 3000);
await tap(page.locator('.modal [data-act="home"]'), 1000);
await cap('별에는 끝이 없어요 — 행성이 계속 새로 생겨요'); await wait(2600);
await cap('Eushin\'s Space Words ✨'); await wait(2000);
await ctx.close(); await browser.close();
