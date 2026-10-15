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

await page.goto('http://localhost:8765/index.html');
// Start just short of the first planet after Star Land so a new planet opens during the demo.
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('yushin-space-progress', JSON.stringify({ stars: 172, mastery: {} })); });
await page.reload();
await wait(800);
await cap('유신이의 Space Words — 우주 테마 영어 단어 학습 앱'); await wait(2400);
await tap(page.locator('[data-act="try-example"]'), 1000);
await cap('게임 10개 · 별을 모아 끝없는 행성 여행'); await wait(2800);

// Letter Rocket (one word)
await cap('Letter Rocket — 글자를 순서대로 눌러 철자 완성');
await play('spell'); await wait(600);
let word = await lastSaid();
for (const ch of [...word].filter(c => /[a-z]/i.test(c))) await tap(page.locator(`#tiles .tile:not(.used)[data-ch="${ch}"]`).first(), 380);
await wait(1200);
await home();

// NEW: Memory Match (first board)
await cap('NEW · Memory Match — 그림과 단어 짝 맞추기');
await play('memory'); await wait(600);
const words = await week();
const faces = await page.evaluate(() => [...document.querySelectorAll('.mem-card')].map(c => c.querySelector('.mc-face').textContent.trim()));
const enOf = (f) => (words.find(w => w.emoji === f || w.ko === f) || { en: f }).en;
// one miss first, so viewers see cards flip back
const miss = faces.findIndex((f, k) => k > 0 && enOf(f) !== enOf(faces[0]));
await tap(page.locator('.mem-card[data-k="0"]'), 400); await tap(page.locator(`.mem-card[data-k="${miss}"]`), 1300);
const seen = new Set();
for (let k = 0; k < faces.length; k++) {
  if (seen.has(k)) continue;
  const j = faces.findIndex((f, m) => m !== k && enOf(f) === enOf(faces[k]));
  seen.add(k); seen.add(j);
  await tap(page.locator(`.mem-card[data-k="${k}"]`), 350); await tap(page.locator(`.mem-card[data-k="${j}"]`), 900);
}
await wait(600);
await home();

// NEW: Meteor Spell (one word)
await cap('NEW · Meteor Spell — 철자가 맞는 운석 고르기');
await play('meteor'); await wait(1500);
word = await lastSaid();
await tapMoving(page.locator(`.meteor[data-v="${word}"]`), 1800);
await home();

// NEW: Meaning Match (one word)
await cap('NEW · Meaning Match — 한글 뜻 보고 영어 단어 고르기');
await play('meaning'); await wait(1500);
const ko = await page.locator('.ko-big').innerText();
await tap(page.locator(`.pick[data-en="${words.find(w => w.ko === ko).en}"]`), 1800);
await home();

// NEW: Star Catch (full mission, which lands on a new planet)
await cap('NEW · Star Catch — 소리 듣고 떨어지는 별 잡기');
await play('catch'); await wait(1400);
for (let i = 0; i < 5; i++) {
  word = await lastSaid();
  await tapMoving(page.locator(`.fall[data-en="${word}"]`), i ? 700 : 1300);
  await next();
  if (i === 1) await cap('실수 없이 끝내면 보너스 별 +2');
}
await cap('별이 모이면 새 행성 도착! 눌러서 방문해요'); await wait(2200);
await tap(page.locator('.modal [data-act="visit"]'), 3000);
await cap('행성마다 이름 · 모습 · 사는 친구들이 달라요'); await wait(1500);
await tap(page.locator('.modal [data-act="visit"]').first(), 2600);
await tap(page.locator('.modal [data-act="home"]'), 1000);
await cap('별에는 끝이 없어요 — 행성이 계속 새로 생겨요'); await wait(2600);
await tap(page.locator('.stop').last(), 2400);
await cap('Eushin\'s Space Words ✨'); await wait(2200);
await ctx.close(); await browser.close();
