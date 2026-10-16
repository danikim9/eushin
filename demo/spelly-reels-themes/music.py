"""Warm piano + pad bed, I-V-vi-IV in C, with a beat that enters at DROP seconds."""
import sys, wave
import numpy as np

SR = 44100
BPM = float(sys.argv[6]) if len(sys.argv) > 6 else 92
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 32.0
DROP = float(sys.argv[2]) if len(sys.argv) > 2 else 9.0
SOFT = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (None, None)
OUT = sys.argv[5] if len(sys.argv) > 5 else "music.wav"

beat = 60 / BPM
bar = beat * 4
n = int(SR * (DUR + 2))
L = np.zeros(n); R = np.zeros(n)
t_all = np.arange(n) / SR

def midi(m):
    return 440 * 2 ** ((m - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= n:
        return
    sig = sig[: n - i] * gain
    L[i:i + len(sig)] += sig * (1 - pan) / 2 * 2 ** 0.5
    R[i:i + len(sig)] += sig * (1 + pan) / 2 * 2 ** 0.5

def piano(m, dur=1.6, vel=0.5):
    t = np.arange(int(SR * dur)) / SR
    f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
         + 0.2 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5) + 0.08 * np.sin(2 * np.pi * 4.01 * f * t) * np.exp(-t * 7))
    env = np.exp(-t * 2.2) * np.minimum(1, t / 0.004)
    return s * env * vel

def pad(ms, dur):
    t = np.arange(int(SR * dur)) / SR
    s = np.zeros_like(t)
    for m in ms:
        for det in (-0.12, 0.0, 0.12):
            f = midi(m + det)
            s += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    att = np.minimum(1, t / 0.6)
    rel = np.minimum(1, (dur - t) / 0.6)
    return s * att * rel / (len(ms) * 3)

def kick():
    t = np.arange(int(SR * 0.35)) / SR
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def shaker():
    t = np.arange(int(SR * 0.06)) / SR
    return np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 70)

def snap():
    t = np.arange(int(SR * 0.18)) / SR
    noise = np.random.default_rng(2).standard_normal(len(t)) * np.exp(-t * 28)
    return noise * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5

# C  G  Am  F  (root, chord tones for arpeggio)
prog = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [60, 64, 69, 72]), (41, [60, 65, 69, 72])]
melody = {  # bar index in 4-bar cycle -> (beat offset, midi)
    0: [(0, 76), (1.5, 79), (3, 77)], 1: [(0, 74), (2, 71)], 2: [(0, 72), (1.5, 76), (3, 74)], 3: [(0, 72), (2, 69)],
}

nb = int(DUR / bar) + 2
for b in range(nb):
    t0 = b * bar
    root, tones = prog[b % 4]
    soft = SOFT[0] is not None and SOFT[0] <= t0 < SOFT[1]
    add(pad(tones[:3], bar + 0.4), t0, 0.0, 0.18)
    add(piano(root - 12 + 12, 2.5, 0.35), t0, -0.2)
    # arpeggio eighths
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    for e, idx in enumerate(pattern):
        add(piano(tones[idx], 1.2, 0.22 if e % 2 else 0.3), t0 + e * beat / 2, 0.35 if e % 2 else -0.1)
    if t0 >= DROP and not soft:
        for bt, m in melody[b % 4]:
            add(piano(m + 12, 1.4, 0.18), t0 + bt * beat, 0.1)
        for k in range(4):
            if k in (0, 2):
                add(kick(), t0 + k * beat, 0.0, 0.55)
            else:
                add(snap(), t0 + k * beat, 0.0, 0.18)
        for k in range(8):
            add(shaker(), t0 + k * beat / 2 + 0.01, 0.4, 0.07 if k % 2 else 0.04)
    if b * bar < DROP <= (b + 1) * bar and b > 0:
        pass

mix = np.stack([L, R], 1)[: int(SR * DUR)]
# fade in/out
fi, fo = int(SR * 0.3), int(SR * 1.5)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.8
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", OUT, DUR, "bar", bar)
