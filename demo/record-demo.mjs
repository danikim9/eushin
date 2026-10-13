// Records the demo: serve the repo root on :8765 (python3 -m http.server 8765), run this, then
// ffmpeg -i vid/*.webm -vf setpts=PTS/1.25 -r 30 -c:v libx264 -pix_fmt yuv420p -an eushin-demo.mp4
import { chromium } from 'playwright';
const W = 1180, H = 820;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: 'vid', size: { width: W, height: H } } });
await ctx.addInitScript(() => {
  window.__said = [];
  const fake = { speak(u) { window.__said.push(u.text); const t = setTimeout(() => { u.onend && u.onend(); }, 400 + u.text.length * 60); }, cancel() {}, getVoices() { return []; }, addEventListener() {} };
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
async function tap(loc, pause = 550) {
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y, { steps: 8 });
  await page.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = '__tap'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, [x, y]);
  await page.mouse.click(x, y);
  await wait(pause);
}
const lastSaid = () => page.evaluate(() => window.__said[window.__said.length - 1]);
const home = () => tap(page.locator('[data-act="home"]').first(), 900);
const play = (id) => tap(page.locator(`[data-act="play"][data-game="${id}"]`), 900);

await page.goto('http://localhost:8765/index.html');
await page.evaluate(() => localStorage.clear()); await page.reload();
await wait(800);
await cap('유신이의 Space Words — 우주 테마 영어 단어 학습 앱'); await wait(2600);
await cap('예시 단어로 바로 시작해 볼게요'); await wait(900);
await tap(page.locator('[data-act="try-example"]'), 1200);
await cap('이번 주 단어 · 별을 모아 행성 여행'); await wait(2600);

// Word Cards
await cap('① Word Cards — 단어를 보고, 듣고, 철자를 익혀요');
await play('learn'); await wait(1800);
const nx = page.locator('[data-act="next"]');
if (await nx.count()) { await tap(nx.first(), 1500); }
await home();

// Letter Rocket
await cap('② Letter Rocket — 글자를 순서대로 눌러 철자 완성');
await play('spell'); await wait(700);
let word = await lastSaid();
for (const ch of [...word].filter(c => /[a-z]/i.test(c))) await tap(page.locator(`#tiles .tile:not(.used)[data-ch="${ch}"]`).first(), 420);
await cap('정답이면 별 ⭐ 획득!'); await wait(2000);
await home();

// Missing Star
await cap('③ Missing Star — 빠진 글자 찾기');
await play('missing'); await wait(900);
word = await lastSaid();
const hole = await page.evaluate(() => [...document.getElementById('mw').children].findIndex(e => e.id === 'hole'));
await tap(page.locator(`.opt-star[data-ch="${word[hole]}"]`), 2000);
await home();

// Sound Hunt
await cap('④ Sound Hunt — 소리를 듣고 알맞은 그림 고르기');
await play('listen'); await wait(1400);
word = await lastSaid();
await tap(page.locator(`.pick[data-en="${word}"]`), 2000);
await home();

// Sentence Ship
await cap('⑤ Sentence Ship — 문장 듣고 단어 블록으로 만들기');
await play('sentence'); await wait(1600);
const sent = await page.evaluate(() => [...document.querySelectorAll('#sent .tk')].map(e => e.textContent).join(' '));
await tap(page.locator('[data-act="phase"][data-to="build"]'), 900);
for (const t of sent.split(' ')) {
  await tap(page.locator('#blocks .blk:not(.used)').filter({ hasText: new RegExp('^' + t.replace(/[.?!]/g, '\\$&') + '$') }).first(), 450);
}
await wait(1200);
await home();

// Trace & parent menu teaser
await cap('⑥ Trace & Write — Apple Pencil로 따라 쓰기');
await play('trace'); await wait(900);
const pad = await page.locator('#inkC').boundingBox();
await page.mouse.move(pad.x + pad.width * .2, pad.y + pad.height * .5); await page.mouse.down();
for (let i = 0; i <= 40; i++) await page.mouse.move(pad.x + pad.width * (.2 + .6 * i / 40), pad.y + pad.height * (.5 + .15 * Math.sin(i / 4)), { steps: 2 });
await page.mouse.up(); await wait(1500);
await home();
await cap('보호자는 🔒 메뉴에서 매주 단어 10개와 문장 2개를 추가해요'); await wait(3000);
await cap('Eushin\'s Space Words ✨'); await wait(2200);
await ctx.close(); await browser.close();
