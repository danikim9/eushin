"""promo.html 사운드트랙: numpy 로 효과음·비트를 합성하고, vo.wav(보이스오버)가 있으면 얹어서 audio.wav 로 저장.
보이스오버가 나오는 동안 음악을 낮춤(덕킹). 타이밍은 promo.html 의 장면 시간과 맞춤.
    python3 audio.py
"""
import os
import wave
import numpy as np

SR = 44100
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
music = np.zeros(N)  # 덕킹 대상(비트·화음)만 따로 모음


def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * (1 + min(0, pan))


def addm(sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    music[i:i + len(sig)] += sig


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')


def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16) * 1.2


def snare():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.6 + np.sin(2 * np.pi * 190 * t) * 0.5) * env(n, 0.001, 0.07)


def hat():
    n = int(0.06 * SR)
    x = rng.standard_normal(n)
    return (x - lowpass(x, 3)) * env(n, 0.001, 0.015) * 0.8


def impact(dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 9)) / SR) * env(n, 0.002, dur * 0.35)
    crack = lowpass(rng.standard_normal(n), 4) * env(n, 0.001, 0.05)
    return boom * 1.1 + crack * 0.7


def whoosh(dur=0.5, rev=False):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    out = np.zeros(n); seg = 512
    for s in range(0, n, seg):  # 필터가 점점 열림
        k = max(1, int(40 * (1 - t[s]) + 1))
        out[s:s + seg] = lowpass(x[s:s + seg + 64], k)[:len(out[s:s + seg])]
    e = np.sin(np.pi * t) ** 2
    out = out * e * 0.9
    return out[::-1] if rev else out


def glitch(dur=0.35):
    n = int(dur * SR)
    out = np.zeros(n)
    s = 0
    while s < n:
        ln = int(rng.uniform(0.01, 0.05) * SR)
        f = rng.uniform(200, 2400)
        t = np.arange(min(ln, n - s)) / SR
        out[s:s + len(t)] = np.sign(np.sin(2 * np.pi * f * t)) * rng.uniform(0.2, 0.6) if rng.random() > 0.3 else np.round(rng.standard_normal(len(t)) * 3) / 6
        s += ln
    return out * 0.7


def tone(freqs, dur, a=0.02, d=0.4, bright=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) + bright * 6 * np.sin(4 * np.pi * f * t) * 0.3 for f in freqs) / len(freqs)
    return x * env(n, a, d)


def blip(f, dur=0.1):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, 0.001, dur / 3)


def click():
    n = int(0.02 * SR)
    return rng.standard_normal(n) * env(n, 0.0005, 0.004)


def chime(f=1568):
    return sum(blip(f * r, 0.5) * g for r, g in ((1, 1), (2, .4), (3, .2))) * 0.6


T4, TD = 7.4, 2.0

# ---------- S1 (0~2.8) 쾅·쾅·쾅 + 깜지 연필 소리
for i in range(30):
    add(lowpass(rng.standard_normal(int(0.12 * SR)), 2) * env(int(0.12 * SR), 0.01, 0.05), i * 0.07, 0.12, pan=(i % 3 - 1) * 0.4)
add(impact(0.6), 0.15, 0.6)
add(impact(0.7), 0.6, 0.7)
add(impact(1.3), 1.25, 1.0)
add(glitch(0.35), 2.45, 0.5)
add(whoosh(0.3, rev=True), 2.5, 0.6)

# ---------- S2 (2.8~5.2) 빨간 X
add(impact(0.8), 2.9, 0.8)
add(blip(180, 0.3), 2.9, 0.5)
add(impact(0.7), 3.0, 0.5)
add(impact(0.8), 3.6, 0.7)
add(snare(), 4.3, 1.0)
add(impact(1.4), 4.3, 1.0)
add(whoosh(0.7), 4.6, 0.6)

# ---------- S3~S7 (5.2~26.2) 비트 128BPM
BEAT = 60 / 128
chords = [[64, 67, 71, 74], [60, 64, 67, 71], [62, 65, 69, 72], [67, 71, 74, 77]]
roots = [40, 36, 38, 43]
bar, t = 0, 5.2
while t < 26.1:
    c = bar % 4
    addm(tone([note(m) for m in chords[c]], 4 * BEAT, a=0.02, d=0.35, bright=0.06), t, 0.17)
    for b in range(4):
        tb = t + b * BEAT
        if tb >= 26.1 or 15.05 <= tb < 15.4 or 23.25 <= tb < 23.6:
            continue
        addm(kick(), tb, 0.85)
        addm(hat(), tb + BEAT / 2, 0.35)
        if b in (1, 3):
            addm(snare(), tb, 0.45)
        for e in (0, BEAT / 2):
            addm(tone([note(roots[c])], 0.2, a=0.005, d=0.1, bright=0.05), tb + e, 0.35)
    bar += 1
    t += 4 * BEAT

# S3: 카드 탭마다 '뾱'
add(whoosh(0.4), 5.2, 0.5)
for i in range(4):
    add(blip(880 + i * 220, 0.12), 5.35 + (0.2 + i * 0.75) / 1.6, 0.35)
# S4: 테마 4번 쾅 + 보상 차임
for i in range(4):
    ts = T4 + i * TD
    add(impact(0.9), ts, 0.9)
    add(whoosh(0.35, rev=True), ts - 0.35, 0.5)
    add(chime(1318 + i * 98), ts + 1.25, 0.35)
    for k in range(5):
        add(blip(2093 + k * 260, 0.06), ts + 1.25 + k * 0.03, 0.12, pan=(k - 2) * 0.3)
add(glitch(0.35), 15.05, 0.45)
# S5: 숫자 틱 + 게임 칩 팝 + 별비
for i in range(16):
    add(click(), 15.6 + 1.3 * (i / 16) ** 0.7, 0.7, pan=(i % 3 - 1) * 0.3)
    add(blip(900 + (i % 4) * 160, 0.06), 15.6 + i * 0.08, 0.14)
add(impact(1.0), 16.9, 0.8)
add(impact(0.7), 17.6, 0.6)
for i in range(20):
    add(blip(1600 + (i % 6) * 210, 0.08), 17.7 + i * 0.05, 0.1, pan=(i % 5 - 2) * 0.3)
add(impact(1.2), 18.4, 0.9)
# S6: 테마 바뀔 때마다 탭
add(whoosh(0.4), 19.8, 0.5)
for i in range(5):
    add(blip(1046 + i * 130, 0.1), 19.95 + 0.2 / 1.25 + i * 0.918 / 1.25, 0.3)
add(impact(0.9), 21.6, 0.8)
add(glitch(0.35), 23.25, 0.45)
add(impact(0.8), 23.7, 0.7)
add(impact(1.2), 24.5, 0.9)
add(whoosh(0.6), 25.6, 0.8)

# ---------- S8 (26.2~)
add(impact(1.3), 26.2, 1.0)
add(tone([note(m) for m in [40, 52, 59, 64, 67, 71, 76]], 3.8, a=0.01, d=2.4, bright=0.07), 26.2, 0.35)
add(chime(1568), 26.7, 0.4)
add(chime(2093), 27.5, 0.3)

# ---------- 보이스오버 + 덕킹
vo = np.zeros(N)
if os.path.exists('vo.wav'):
    with wave.open('vo.wav') as w:
        assert w.getframerate() == SR, 'vo.wav 는 44.1kHz 로 (ffmpeg -ar 44100 -ac 1)'
        raw = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
        if w.getnchannels() == 2:
            raw = raw.reshape(-1, 2).mean(1)
    vo[: min(N, len(raw))] = raw[:N]
    win = int(0.15 * SR)
    env_ = np.convolve(np.abs(vo), np.ones(win) / win, 'same')
    music *= 1 - 0.6 * np.clip(env_ / (env_.max() * 0.15 + 1e-9), 0, 1)
    print('vo.wav 사용')
L += music + vo * 1.6
R += music + vo * 1.6

# ---------- 마스터: 소프트 리미터 + 끝 페이드
mx = np.stack([L, R], 1)
mx = np.tanh(mx / (np.abs(mx).max() * 0.5 + 1e-9) * 1.2) * 0.89
fade = int(0.8 * SR)
mx[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open('audio.wav', 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mx * 32767).astype('<i2').tobytes())
print('audio.wav', DUR, 's')
