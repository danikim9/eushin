"""스펠리 릴스 E — 4가지 세계. 이전 릴스(D, '중독' 편)와 같은 틀: 블러 배경 + 노란 테두리 앱 화면,
알약 헤드라인, 흰 글씨+검은 테두리 자막, 컷마다 뽁 · 보상 컷 차임, music.py 120BPM, 남색 엔딩 카드.
    python3 music.py 24.0 0 30 31 out/music.wav 120 && (music_fx 변환) && python3 build_themes.py
"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

S = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(S, "footage.mp4")          # footage.mjs 녹화본(1024x768). README 참고
ICON = os.path.join(S, "mark.png")
FB = "/usr/share/fonts/truetype/nanum/NanumSquareEB.ttf"
FR = "/usr/share/fonts/truetype/nanum/NanumSquareRoundEB.ttf"
W, H = 1080, 1920
OUT = os.path.join(S, "out")
os.makedirs(OUT, exist_ok=True)
YEL, WHITE, BLACK, BERRY = (255, 214, 10), (255, 255, 255), (0, 0, 0), (255, 140, 148)
M = {"pick": 1.85, "home_space": 6.05, "win_space": 10.23, "home_princess": 14.32, "win_princess": 17.49,
     "home_robot": 21.45, "win_robot": 24.91, "home_unicorn": 28.88, "win_unicorn": 32.74, "switch": 35.91}


def run(cmd):
    subprocess.run(cmd, check=True)


FULL = ("1024:768:0:0", 1040)
CARD = ("700:660:310:50", 860)     # 게임 카드(정답 순간)
THEMES = [("space", "① 우주 탐험", "코코랑 행성 여행 · 별 모으기"),
          ("princess", "② 공주 왕국", "로지랑 성 여행 · 보석 모으기"),
          ("robot", "③ 로봇 시티", "볼트랑 도시 밝히기 · 에너지 모으기"),
          ("unicorn", "④ 유니콘 원더랜드", "루나랑 무지개 너머 · 크리스털 모으기")]
# (길이, 녹화본 시작, crop, 헤드라인, 아래 자막)
segs = [
    (1.6, M["home_space"] + 0.3, FULL, ["근데,", "우주 싫어하는 애는요?"], None),
    (2.2, M["pick"] - 0.1, FULL, ["공주 좋아하는 딸,", "로봇 좋아하는 아들…"], None),
    (2.0, M["pick"] + 2.1, FULL, ["그래서 엄마가", "세계를 4개 만들었어요"], None),
]
for tid, name, sub in THEMES:
    segs.append((0.8, M["home_" + tid] + 0.3, FULL, [name], [sub]))
    segs.append((1.2, M["win_" + tid] - 0.5, CARD, [name], [sub]))
segs += [
    (3.4, M["switch"], FULL, ["중간에 테마 바꿔도", "모은 별은 그대로"], ["별 41개 → 보석 41개 → 에너지 41개"]),
    (2.6, M["home_robot"] + 0.6, FULL, ["이번 주 학교 단어 넣으면", "게임이 16가지"], None),
    (4.0, M["home_unicorn"] + 0.5, FULL, None, None),
]

clips, times, t = [], [], 0.0
for i, (dur, ss, (crop, sw), hl, cap) in enumerate(segs):
    out = os.path.join(OUT, f"seg{i:02d}.mp4")
    clips.append(out)
    times.append((t, t + dur, hl, cap))
    t += dur
    fc = (f"[0:v]split[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.18[bg];"
          f"[b]crop={crop},scale={sw}:-2:flags=lanczos,pad=iw+14:ih+14:7:7:color=0xFFD23F[fg];"
          f"[bg][fg]overlay=(W-w)/2:490,fps=30")
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ss:.3f}", "-i", SRC, "-t", str(dur),
         "-filter_complex", fc, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
         "-pix_fmt", "yuv420p", "-r", "30", out])
END = t

with open(os.path.join(OUT, "list.txt"), "w") as f:
    for c in clips:
        f.write(f"file '{c}'\n")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "list.txt"),
     "-c", "copy", os.path.join(OUT, "base.mp4")])


# ---------- overlays ----------
def canvas():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def fit(d, s, path, size, maxw):
    f = ImageFont.truetype(path, size)
    while d.textlength(s, font=f) > maxw:
        size -= 4
        f = ImageFont.truetype(path, size)
    return f


def pill_lines(d, lines, y, size, colors):
    for n, ln in enumerate(lines):
        f = fit(d, ln, FR, size, W - 120)
        tw = d.textlength(ln, font=f)
        x = (W - tw) / 2
        d.rounded_rectangle([x - 28, y - 14, x + tw + 28, y + size + 14], 22, fill=colors[n % len(colors)])
        d.text((x, y), ln, font=f, fill=BLACK)
        y += size + 46
    return y


overlays = []
k = 0
while k < len(times):   # 헤드라인이 같은 연속 컷은 오버레이 하나로
    a, b, hl, cap = times[k]
    j = k
    while j + 1 < len(times) and times[j + 1][2] == hl and times[j + 1][3] == cap:
        j += 1
        b = times[j][1]
    if hl or cap:
        im, d = canvas()
        if hl:
            pill_lines(d, hl, 200, 104, [BERRY if k == 0 else YEL, WHITE])
        if cap:
            for n, ln in enumerate(cap):
                f = fit(d, ln, FB, 72, W - 100)
                tw = d.textlength(ln, font=f)
                d.text(((W - tw) / 2, 1360 + n * 100), ln, font=f, fill=WHITE, stroke_width=8, stroke_fill=BLACK)
        p = os.path.join(OUT, f"ov{k:02d}.png")
        im.save(p)
        overlays.append((p, a, b))
    k = j + 1

end_start = times[-1][0]


def endcard(cta):
    im, d = canvas()
    d.rectangle([0, 0, W, H], fill=(16, 18, 48, 150))
    icon = Image.open(ICON).convert("RGBA").resize((300, 300))
    mask = Image.new("L", (300, 300), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 300, 300], 70, fill=255)
    im.paste(icon, ((W - 300) // 2, 330), mask)
    f1 = ImageFont.truetype(FR, 190)
    d.text(((W - d.textlength("스펠리", font=f1)) / 2, 670), "스펠리", font=f1, fill=YEL, stroke_width=10, stroke_fill=BLACK)
    f2 = ImageFont.truetype(FB, 54)
    t2 = "우리 애 취향대로 고르는 영어 스펠링"
    d.text(((W - d.textlength(t2, font=f2)) / 2, 900), t2, font=f2, fill=WHITE, stroke_width=5, stroke_fill=BLACK)
    if cta:
        pill_lines(d, ["우리 애 세계 고르러 가기", "spelly.kr"], 1500, 80, [WHITE, YEL])
    p = os.path.join(OUT, f"end{int(cta)}.png")
    im.save(p)
    return p


overlays.append((endcard(False), end_start, end_start + 1.0))
overlays.append((endcard(True), end_start + 1.0, END + 1))

# ---------- sfx: 컷마다 뽁, 정답 컷엔 차임 ----------
cuts = [x[0] for x in times[1:]]
pop = os.path.join(OUT, "pop.wav")
run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
     "sine=f=1200:d=0.08", "-af", "afade=t=out:st=0:d=0.08,volume=0.25", "-ar", "44100", "-ac", "2", pop])
chime = os.path.join(OUT, "chime.wav")
run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=1568:d=0.5", "-f", "lavfi", "-i", "sine=f=2093:d=0.5",
     "-filter_complex", "[1]adelay=90|90[b];[0][b]amix=inputs=2,afade=t=out:st=0.05:d=0.45,volume=0.35",
     "-ar", "44100", "-ac", "2", chime])
# 정답 컷은 녹화 속 정답 순간(시작 +0.5초)에 차임
reward = [times[4 + 2 * i][0] + 0.5 for i in range(4)]

inputs = ["-i", os.path.join(OUT, "base.mp4")]
for p, _, _ in overlays:
    inputs += ["-i", p]
nO = len(overlays)
inputs += ["-i", pop, "-i", chime, "-i", os.path.join(OUT, "music_fx.wav")]
vo = os.path.join(S, "vo.wav")
if os.path.exists(vo):
    inputs += ["-i", vo]
fc, last = [], "0:v"
for k, (_, a, b) in enumerate(overlays):
    fc.append(f"[{last}][{k+1}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[v{k}]")
    last = f"v{k}"
ipop, ich, imus = nO + 1, nO + 2, nO + 3
fc.append(f"[{ipop}:a]asplit={len(cuts)}" + "".join(f"[p{i}]" for i in range(len(cuts))))
mix = []
for i, c in enumerate(cuts):
    ms = int(c * 1000)
    fc.append(f"[p{i}]adelay={ms}|{ms}[pd{i}]"); mix.append(f"[pd{i}]")
fc.append(f"[{ich}:a]asplit={len(reward)}" + "".join(f"[c{i}]" for i in range(len(reward))))
for i, c in enumerate(reward):
    ms = int(c * 1000)
    fc.append(f"[c{i}]adelay={ms}|{ms}[cd{i}]"); mix.append(f"[cd{i}]")
if os.path.exists(vo):   # 보이스오버가 있으면 음악을 눌러 줌(사이드체인 덕킹)
    fc.append(f"[{nO + 4}:a]aformat=channel_layouts=stereo,asplit=2[vo][sc]")
    fc.append(f"[{imus}:a]volume=0.75[m0];[m0][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[mus]")
    mix += ["[mus]", "[vo]"]
else:
    fc.append(f"[{imus}:a]volume=0.75[mus]"); mix.append("[mus]")
fc.append("".join(mix) + f"amix=inputs={len(mix)}:duration=longest:normalize=0,alimiter=limit=0.95[aout]")
final = os.path.join(S, "spelly_reels_E_themes.mp4")
run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
     "-map", f"[{last}]", "-map", "[aout]", "-t", f"{END:.3f}",
     "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
print("done", final, END)
