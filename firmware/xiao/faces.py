# C-kocka – az arc a kerek kijelzőn (GC9A01, 240×240), a XIAO rajzolja. Hardverfüggetlen: CircuitPythonon a code.py
# displayio/vectorio alakzatokra képezi le, PC-n a tesztek Pillow-val rajzolják ki (firmware/pi/tests/test_face_xiao.py).
#
# Memória: nincs képkocka-puffer. Az arc néhány vektoros alakzat (sokszög, kör, 2 felirat), és minden képkockán csak a
# megváltozott alakzatok rajzolódnak újra. A frame() mindig UGYANANNYI „helyet” (slot) ad vissza, a code.py ezeket
# egyszer hozza létre, utána csak a pontjaikat, színüket, láthatóságukat állítja.
#
# A Pi csak az állapotot küldi (protocol.py): {"cmd":"face","mode":…,"mouth":…,"persona":…,"look":[x,y],"peek":…,
# "text":…,"sub":…,"color":[r,g,b]|null,"caller":…,"live":…,"cat":false} és beszéd közben {"cmd":"talk","v":0..1} (a száj).
# Cat mode ("cat": true): macskaarc (fülek, réspupilla, orr, ω-száj, bajusz); "mode":"purr" = dorombol (lehunyt ^ ^ szem).
# Az animáció (pislogás, pontok, spirál, hangszínkép) itt fut. Az arcok: DESIGN.md, „Az arc”.
import math
import random

SIZE = 240
C = SIZE // 2
BG = (5, 6, 8)
EYE = {'sunny': (143, 232, 255), 'chill': (159, 217, 255), 'hype': (255, 155, 210), 'sarcastic': (179, 168, 255),
       'pro': (143, 232, 255)}
MODES = ('off', 'sleep', 'face', 'listen', 'think', 'dizzy', 'text', 'eq', 'privacy', 'dnd', 'call', 'purr')
CAT_MODES = ('face', 'listen', 'think', 'purr')       # ezekben cat mode-ban macskaarc; a többi (felirat, spirál…) ugyanaz
CAT_EYE, CAT_NOSE, CAT_EAR = (196, 240, 110), (255, 140, 170), (120, 60, 80)
MOUTHS = ('smile', 'grin', 'flat', 'worried', 'o')
N_POLY, N_BAR, N_DOT, N_TEXT = 14, 9, 20, 2      # helyek: sokszögek (lent), hangszínkép, pontok, feliratok
# Sokszög-helyek: 0–1 szemek, 2 száj, 3 szemöldök / orr, 4–5 pupillák, 6–9 bajusz, 10–11 fülek, 12–13 fülbelső.
# A rajzolási sorrend a helyek sorrendje: a pupilla a szem, a fülbelső a fül után rajzolódik, ezért látszik rajta.


def rrect(cx, cy, w, h, r, n=3):
    """Lekerekített téglalap sokszögként (sarkonként n+1 pont)."""
    r = max(0.0, min(r, w / 2, h / 2))
    pts = []
    for qx, qy, a0 in ((1, -1, -90), (1, 1, 0), (-1, 1, 90), (-1, -1, 180)):
        ox, oy = cx + qx * (w / 2 - r), cy + qy * (h / 2 - r)
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((round(ox + r * math.cos(a)), round(oy + r * math.sin(a))))
    return pts


def ellipse(cx, cy, rx, ry, n=16):
    return [(round(cx + rx * math.cos(2 * math.pi * k / n)), round(cy + ry * math.sin(2 * math.pi * k / n)))
            for k in range(n)]


def arc_band(cx, cy, r, a0, a1, w, n=10):
    """Vastag ív (a Pillow arc-jához hasonlóan: fok, 0 = jobbra, 90 = lefelé)."""
    outer = [(cx + (r + w / 2) * math.cos(math.radians(a0 + (a1 - a0) * k / n)),
              cy + (r + w / 2) * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]
    inner = [(cx + (r - w / 2) * math.cos(math.radians(a0 + (a1 - a0) * k / n)),
              cy + (r - w / 2) * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n, -1, -1)]
    return [(round(x), round(y)) for x, y in outer + inner]


def chord(cx, cy, r, a0, a1, n=10):
    return [(round(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / n))),
             round(cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / n)))) for k in range(n + 1)]


def text_scale(s, big=True):
    """A terminalio betűje 6×12 képpont: a felirat férjen el a kerek kijelző közepén (~200 px)."""
    n = max(1, len(s))
    if big:
        return 4 if n <= 4 else 3 if n <= 7 else 2 if n <= 13 else 1
    return 2 if n <= 15 else 1


def dim(c, k):
    return (int(c[0] * k), int(c[1] * k), int(c[2] * k))


def hsv(h, s=0.85, v=1.0):
    h = (h % 360) / 60
    i, f = int(h), h - int(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i % 6]
    return (int(r * 255), int(g * 255), int(b * 255))


class Face:
    def __init__(self, rnd=None):
        self.rnd = rnd or random.Random()
        self.mode, self.mouth, self.persona = 'off', 'smile', 'sunny'
        self.look, self.peek = (0.0, 0.0), False
        self.text, self.sub, self.color, self.caller, self.live = '', '', None, '', False
        self.cat = False
        self.hue = 28
        self.level, self._level_t = 0.0, -1.0
        self.eq = [0.1] * N_BAR
        self._blink, self._next_blink, self._t = 0.0, 2.0, None

    # ------------------------------------------------------------ a Pi üzenetei
    def set(self, m):
        mode = m.get('mode', self.mode)
        self.mode = mode if mode in MODES else 'face'
        mouth = m.get('mouth', self.mouth)
        self.mouth = mouth if mouth in MOUTHS else 'smile'
        self.persona = m.get('persona', self.persona) if m.get('persona', self.persona) in EYE else 'sunny'
        lk = m.get('look', self.look)
        self.look = (max(-1.0, min(1.0, float(lk[0]))), max(-1.0, min(1.0, float(lk[1]))))
        self.peek = bool(m.get('peek', self.peek))
        self.text, self.sub = str(m.get('text', self.text))[:24], str(m.get('sub', self.sub))[:32]
        col = m.get('color', self.color)
        self.color = tuple(int(v) for v in col[:3]) if col else None
        self.caller, self.live = str(m.get('caller', self.caller))[:16], bool(m.get('live', self.live))
        self.cat = bool(m.get('cat', self.cat))
        if 'hue' in m:
            self.hue = m['hue']

    def talk(self, v, now):
        self.level, self._level_t = max(0.0, min(1.0, float(v))), now

    def beat(self):
        self.hue = (self.hue + 47) % 360
        self.eq = [self.rnd.random() ** 0.7 for _ in range(N_BAR)]

    # ------------------------------------------------------------ képkocka
    def frame(self, now):
        """Visszaad: {'polys': [(pontok, szín) | None] × N_POLY, 'bars': … × N_BAR, 'dots': [(x, y, r, szín) | None]
        × N_DOT, 'texts': [(szöveg, y, méret, szín) | None] × N_TEXT}"""
        dt = 0.0 if self._t is None else max(0.0, min(0.2, now - self._t))
        self._t = now
        self._next_blink -= dt
        if self._next_blink < 0:
            self._blink, self._next_blink = 1.0, 2.5 + self.rnd.random() * 3.5
        self._blink = max(0.0, self._blink - dt * 7)
        if now - self._level_t > 0.4:              # elmaradt "talk" üzenet: a száj ne maradjon nyitva
            self.level = 0.0
        self.eq = [max(0.1, v - dt * 1.5) for v in self.eq]
        f = {'polys': [None] * N_POLY, 'bars': [None] * N_BAR, 'dots': [None] * N_DOT, 'texts': [None] * N_TEXT}
        if self.mode in ('off', 'sleep'):
            return f
        if self.mode == 'purr' or (self.cat and self.mode in CAT_MODES):
            self._cat(f, now)
            return f
        eye = EYE.get(self.persona, EYE['sunny'])
        getattr(self, '_' + self.mode)(f, eye, now)
        return f

    # ------------------------------------------------------------ üzemmódok (DESIGN.md)
    def _face(self, f, eye, now, look=None, mouth=None, big=1.0):
        ex, ey = look if look else (self.look[0] * 16, self.look[1] * 12)
        openness = 1 - math.sin(min(1.0, self._blink) * math.pi)
        lid = 0.55 if self.peek else 1.0
        p = self.persona
        w = 34 if p == 'hype' else 30                                  # Hype: tágra nyílt szemek
        hk = {'chill': 0.5, 'hype': 1.2}.get(p, 1.0) * big             # Chill: félig lehunyt szemek
        for i, sx in enumerate((-1, 1)):
            k = 0.6 if (p == 'sarcastic' and sx == 1) else 1.0         # Sarcastic: egyik szem hunyorít…
            h = max(3, 34 * openness * lid * hk * k)
            f['polys'][i] = (rrect(C + sx * 39 + ex, C - 26 + ey, w, h, 13), eye)
        if p == 'sarcastic':                                           # …a másik fölött felhúzott szemöldök
            bx, by = C - 39 + ex, C - 58 + ey
            f['polys'][3] = ([(bx - 17, by + 4), (bx + 15, by - 6), (bx + 17, by - 1), (bx - 15, by + 9)], eye)
        mx, my = C + ex * 0.4, C + 36 + ey * 0.4
        m = mouth or self.mouth
        if self.level > 0.02:                                          # beszél: a száj a hanggal együtt nyílik
            f['polys'][2] = (ellipse(mx, my, 19, (5 + self.level * 24) / 2), eye)
        elif m == 'grin':
            f['polys'][2] = (chord(mx, my - 10, 30, 25, 155), eye)
            for i, sx in enumerate((-1, 1)):                           # felragyog: csillogás a szemekben
                f['dots'][N_DOT - 1 - i] = (round(C + sx * 39 + ex + 6), round(C - 34 + ey), 4, (255, 255, 255))
        elif m == 'flat' or (m == 'smile' and p == 'pro'):            # Pro: visszafogott arc
            f['polys'][2] = (rrect(mx, my, 38 if m == 'flat' else 30, 7, 3), eye)
        elif m == 'worried':
            f['polys'][2] = (arc_band(mx, my + 18, 21, 215, 325, 7), eye)
        elif m == 'o':
            f['polys'][2] = (arc_band(mx, my, 9, 0, 359, 6, 12), eye)
        else:
            f['polys'][2] = (arc_band(mx, my - 12, 22, 35, 145, 7), eye)

    def _listen(self, f, eye, now):                                    # nagy, figyelő szemek + lüktető pontok
        self._face(f, eye, now, big=1.15)
        for i in range(3):
            k = 0.3 + 0.7 * max(0.0, math.sin(now * 6 - i))
            f['dots'][i] = (C - 18 + i * 18, C + 64, 5, dim(eye, k))

    def _think(self, f, eye, now):                                     # felfelé néző szemek, „hmm”: keringő pontok
        self._face(f, eye, now, look=(10, -9), mouth='flat')
        for i in range(3):
            a = now * 4 + i * 2.1
            f['dots'][i] = (round(C + 58 + math.cos(a) * 12), round(C - 72 + math.sin(a) * 7), 5,
                            dim(eye, 0.35 + 0.65 * (i + 1) / 3))

    def _dizzy(self, f, eye, now):                                     # szédült, spirál alakú szemek
        n = (N_DOT - 2) // 2
        for j, sx in enumerate((-1, 1)):
            for k in range(n):
                a = 6 + k * 7
                x = C + sx * 39 + math.cos(a / 5 + now * 8) * a * 0.33
                y = C - 22 + math.sin(a / 5 + now * 8) * a * 0.33
                f['dots'][j * n + k] = (round(x), round(y), 3, eye)
        top = [(C - 22 + i * 7.5, C + 42 + (6 if i % 2 else -6) - 2.5) for i in range(7)]
        bot = [(x, y + 5) for x, y in reversed(top)]
        f['polys'][2] = ([(round(x), round(y)) for x, y in top + bot], eye)

    def _cat(self, f, now):
        """Macskaarc. listen: hegyezett fül + lüktető pontok, think: felfelé néz + keringő pontok,
        purr: elégedetten lehunyt szem (^ ^), remegő bajusz és fül."""
        m = self.mode
        purr = m == 'purr'
        ex, ey = (10, -9) if m == 'think' else (self.look[0] * 16, self.look[1] * 12)
        buzz = math.sin(now * 40) * 1.2 if purr else 0.0            # dorombolás: finom remegés
        perk = 6 if m == 'listen' else 0
        for i, sx in enumerate((-1, 1)):                            # fülek: háromszög + rózsaszín belső
            tw = math.sin(now * 3 + sx) * 2 if purr else 0.0
            bx = C + sx * 52
            f['polys'][10 + i] = ([(round(bx - 30), C - 66), (round(bx + 30), C - 66),
                                   (round(bx + sx * 10 + tw), C - 96 - perk)], CAT_EYE)
            f['polys'][12 + i] = ([(round(bx - 17), C - 70), (round(bx + 17), C - 70),
                                   (round(bx + sx * 7 + tw), C - 88 - perk)], CAT_EAR)
        openness = 1 - math.sin(min(1.0, self._blink) * math.pi)
        lid = 0.55 if self.peek else 1.0
        for i, sx in enumerate((-1, 1)):
            cx, cy = C + sx * 40 + ex, C - 24 + ey
            if purr:
                f['polys'][i] = (arc_band(cx, cy + 8, 15, 200, 340, 6, 8), CAT_EYE)
                continue
            h = max(3, 36 * openness * lid * (1.1 if m == 'listen' else 1.0))
            f['polys'][i] = (ellipse(cx, cy, 18, h / 2, 16), CAT_EYE)
            if h > 10:                                              # réspupilla: a tekintettel együtt mozdul
                f['polys'][4 + i] = (ellipse(cx + ex * 0.15, cy, 3.5 if m != 'listen' else 6, h / 2 - 3, 10), BG)
        nx, ny = C + ex * 0.4, C + 10 + ey * 0.4
        f['polys'][3] = ([(round(nx - 8), round(ny - 4)), (round(nx + 8), round(ny - 4)), (round(nx), round(ny + 5))], CAT_NOSE)
        my = ny + 14
        if self.level > 0.02 and not purr:                          # beszél / nyávog: kinyílik a száj
            f['polys'][2] = (ellipse(nx, my + 2, 9, (4 + self.level * 16) / 2, 12), CAT_EYE)
        else:                                                       # ω-száj
            top = [(nx + 16 * t / 6, my + 6 * abs(math.sin(math.pi * t / 6)) - 2.5) for t in range(-6, 7)]
            bot = [(x, y + 5) for x, y in reversed(top)]
            f['polys'][2] = ([(round(x), round(y)) for x, y in top + bot], CAT_EYE)
        for i, (sx, dy) in enumerate(((-1, -6), (-1, 8), (1, -6), (1, 8))):   # bajusz: két-két vékony szál
            x0, y0 = nx + sx * 26, ny + 6 + dy * 0.3
            x1, y1 = nx + sx * 88, ny + 6 + dy + buzz * (1 if i % 2 else -1)
            f['polys'][6 + i] = ([(round(x0), round(y0 - 1)), (round(x1), round(y1 - 1)),
                                  (round(x1), round(y1 + 1)), (round(x0), round(y0 + 2))], dim(CAT_EYE, 0.8))
        if m == 'listen':
            for i in range(3):
                k = 0.3 + 0.7 * max(0.0, math.sin(now * 6 - i))
                f['dots'][i] = (C - 18 + i * 18, C + 64, 5, dim(CAT_EYE, k))
        elif m == 'think':
            for i in range(3):
                a = now * 4 + i * 2.1
                f['dots'][i] = (round(C + math.cos(a) * 14), round(C - 70 + math.sin(a) * 6), 5,
                                dim(CAT_EYE, 0.35 + 0.65 * (i + 1) / 3))
        elif purr:                                                  # a dorombolás „hulláma” a száj alatt
            for i in range(5):
                k = 0.25 + 0.75 * max(0.0, math.sin(now * 5 - i * 0.9))
                f['dots'][i] = (C - 28 + i * 14, C + 66, 4, dim(CAT_EYE, k))

    def _text(self, f, eye, now):
        col = self.color or eye
        f['texts'][0] = (self.text, C - 14 if self.sub else C, text_scale(self.text), col)
        if self.sub:
            f['texts'][1] = (self.sub, C + 40, text_scale(self.sub, big=False), col)

    def _eq(self, f, eye, now):                                        # party: hangszínkép a beatre
        for i, v in enumerate(self.eq):
            h = 10 + v * 90 * (1 - abs(i - 4) / 9)
            x = C - 82 + i * 19
            f['bars'][i] = (rrect(x + 6.5, C + 36 - h / 2, 13, h, 6, 2), hsv(self.hue + i * 25))

    def _privacy(self, f, eye, now):                                   # fejjel lefelé: lehunyt szemek
        d = dim(eye, 0.5)
        for i, sx in enumerate((-1, 1)):
            f['polys'][i] = (arc_band(C + sx * 39, C - 30, 16, 30, 150, 6, 8), d)
        f['texts'][1] = ('mic & cam OFF', C + 38, 2, d)

    def _dnd(self, f, eye, now):
        d = dim(eye, 0.55)
        for i, sx in enumerate((-1, 1)):
            f['polys'][i] = (rrect(C + sx * 39, C - 22, 30, 6, 3), d)
        f['texts'][1] = ('Do not disturb', C + 38, 2, d)

    def _call(self, f, eye, now):
        f['texts'][0] = (self.caller, C - 18, text_scale(self.caller), eye)
        f['texts'][1] = ('speakerphone' if self.live else 'tap to answer', C + 26, 2, eye)
