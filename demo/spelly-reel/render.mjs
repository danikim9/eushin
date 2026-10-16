// promo.html 을 프레임별로 캡처해 spelly_reel.mp4 로. audio.wav 가 있으면 함께 넣음.
//   node render.mjs                 전체 렌더
//   node render.mjs --stills 1,8.5  해당 시각 스틸만 frames/still_<t>.png 로
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const DIR = new URL('.', import.meta.url).pathname;
const marks = JSON.parse(readFileSync(DIR + 'marks.json', 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((m) => { window.MARKS = m; }, marks);
await page.goto('file://' + DIR + 'promo.html');
await page.evaluate(() => document.fonts.ready);
const si = process.argv.indexOf('--stills');
if (si > 0) {
  mkdirSync(DIR + 'frames', { recursive: true });
  for (const s of process.argv[si + 1].split(',')) { await page.evaluate(t => window.render(t), +s); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.screenshot({ path: `${DIR}frames/still_${s}.png` }); }
  await browser.close(); process.exit(0);
}
const dur = await page.evaluate(() => window.DURATION), FPS = 30, N = Math.round(dur * FPS);
const hasA = existsSync(DIR + 'audio.wav');
const args = ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(hasA ? ['-i', 'audio.wav', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'spelly_reel.mp4'];
const ff = spawn('ffmpeg', args, { cwd: DIR, stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < N; i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${N}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('done', hasA ? '(with audio)' : '(no audio)');
