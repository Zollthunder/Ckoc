"""Hangeffektek és a party-zene kódból (numpy) – ugyanazok a hangok, mint a webes szimulátorban. Nincs jogdíj, nincs fájl."""
import io, wave
import numpy as np

SR = 24000
BPM = 110


def _env(n, attack=0.01, sr=SR):
    a = max(1, int(attack * sr))
    e = np.exp(-np.linspace(0, 6, n))
    e[:a] *= np.linspace(0, 1, a)
    return e


def tone(freq, dur, kind='sine', vol=0.3, slide=None):
    n = int(dur * SR)
    f = np.full(n, float(freq)) if slide is None else np.geomspace(freq, slide, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = {'sine': np.sin(ph), 'square': np.sign(np.sin(ph)), 'triangle': 2 / np.pi * np.arcsin(np.sin(ph)),
         'saw': 2 * (ph / (2 * np.pi) % 1) - 1}[kind]
    return w * _env(n) * vol


def noise(dur, vol=0.3, bright=True):
    n = int(dur * SR)
    x = np.random.uniform(-1, 1, n)
    if bright:
        x = np.diff(x, prepend=0)          # egyszerű felüláteresztő
    return x * _env(n, 0.002) * vol


def mix(parts, total):
    out = np.zeros(int(total * SR))
    for t0, sig in parts:
        i = int(t0 * SR)
        out[i:i + len(sig)] += sig[:max(0, len(out) - i)]
    return out


SFX = {
    'boot': lambda: mix([(i * 0.12, tone(f, 0.35, 'triangle', 0.18)) for i, f in enumerate((523, 659, 784, 1047))], 0.9),
    'horn': lambda: mix([(0, tone(233, 0.5, 'saw', 0.18)), (0.05, tone(311, 0.45, 'square', 0.08))], 0.6),
    'drum': lambda: mix([(0, tone(160, 0.12, 'sine', 0.4, 60)), (0.18, noise(0.12, 0.25)), (0.18, tone(140, 0.1, 'sine', 0.3, 70)),
                         (0.42, noise(0.5, 0.18))], 1.0),
    'whoosh': lambda: mix([(0, noise(0.4, 0.2, False)), (0.45, tone(300, 0.25, 'sine', 0.3, 90))], 0.8),
    'ding': lambda: mix([(0, tone(880, 0.5, 'sine', 0.2)), (0.08, tone(1320, 0.5, 'sine', 0.12))], 0.7),
    'ring': lambda: mix([(i * 0.5 + d, tone(f, 0.18, 'square', 0.06)) for i in range(4) for d, f in ((0, 988), (0.2, 784))], 2.1),
}


PURR_LEN = 3.2


def purr(dur=PURR_LEN, rate=26.0, breath=1.6):
    """Dorombolás: mély, ~26 Hz-es „berregés” (szűrt zaj, lüktetve), belégzés-kilégzés ütemre, a belégzés halkabb."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.random.uniform(-1, 1, n)
    k = 60                                                   # háromszoros mozgóátlag: aluláteresztő, ~400 Hz alatt marad a zaj
    for _ in range(3):
        x = np.convolve(x, np.ones(k) / k, mode='same')
    x *= 0.5 / (np.abs(x).max() + 1e-9)
    body = np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 110 * t) * 0.2
    am = (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 3     # a gége rezgése: rövid lökések
    ph = (t % breath) / breath                               # egy légzés: 0..1 – belégzés, rövid szünet, kilégzés
    br = np.where(ph < 0.42, 0.55 * np.sqrt(np.abs(np.sin(np.pi * ph / 0.42))),
                  np.where(ph >= 0.5, np.sqrt(np.abs(np.sin(np.pi * (ph - 0.5) / 0.5))), 0.0))
    fade = np.clip(np.minimum(t, dur - t) * 4, 0, 1)
    return (x + body) * am * br * fade * 0.6


def meow():
    """Rövid „miaú”: felfelé, majd lefelé hajló, kicsit orrhangú hang."""
    a = tone(560, 0.16, 'saw', 0.22, 820)
    b = tone(820, 0.42, 'saw', 0.22, 430)
    c = tone(1120, 0.42, 'sine', 0.1, 640)
    return mix([(0, a), (0.14, b), (0.14, c)], 0.65)


SFX['purr'] = purr
SFX['meow'] = meow


def party_loop(bars=8):
    """C–G–Am–F, 110 BPM, nyolcadokban: lábdob, lábcin, pergő, akkordok, basszus. Visszaad: (minták, ütemidőpontok)."""
    spb = 60 / BPM / 2
    chords = [(261.6, 329.6, 392), (196, 246.9, 293.7), (220, 261.6, 329.6), (174.6, 220, 261.6)]
    steps = bars * 8
    parts, beats = [], []
    for s in range(steps):
        t, ch = s * spb, chords[(s // 8) % 4]
        if s % 4 == 0:
            parts.append((t, tone(110, 0.18, 'sine', 0.5, 45))); beats.append(t)
            parts += [(t, tone(f, spb * 3.5, 'triangle', 0.05)) for f in ch]
        if s % 2 == 1:
            parts.append((t, noise(0.05, 0.08)))
        if s % 8 == 4:
            parts.append((t, noise(0.12, 0.15)))
        parts.append((t, tone(ch[0] / 2, spb * 0.9, 'saw', 0.05)))
    return mix(parts, steps * spb), beats


def to_wav_bytes(x, sr=SR):
    x = np.clip(x, -1, 1)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32000).astype('<i2').tobytes())
    return buf.getvalue()
