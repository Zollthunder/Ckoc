"""A kerek kijelző (GC9A01, 240×240) arca – Pillow-val rajzolva, a webes szimulátor arcával azonos üzemmódokkal.

Üzemmódok: off, face, listen, dizzy, text, eq, privacy, dnd, call.
A render() egy RGB képet ad; a kijelző-meghajtó (vagy a szimuláció) teszi ki.
"""
import math, random
from dataclasses import dataclass, field
from PIL import Image, ImageDraw, ImageFont

SIZE = 240
EYE = {'sunny': (143, 232, 255), 'chill': (159, 217, 255), 'hype': (255, 155, 210), 'sarcastic': (179, 168, 255), 'pro': (143, 232, 255)}


def _font(size):
    for name in ('DejaVuSans-Bold.ttf', 'arialbd.ttf', 'segoeuib.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


@dataclass
class FaceState:
    mode: str = 'off'
    mouth: str = 'smile'          # smile | grin | flat | worried | o
    talk_level: float = 0.0       # 0..1 – a hang hangereje (a Pi a lejátszott hangból méri)
    look: list = field(default_factory=lambda: [0.0, 0.0])   # -1..1 – hova néz (kamera / leskelődés)
    peeking: bool = False
    text: str = ''
    sub: str = ''
    text_color: tuple = None
    eq: list = field(default_factory=lambda: [0.0] * 9)
    hue: float = 28
    persona: str = 'sunny'
    caller: str = ''
    call_live: bool = False
    _blink: float = 0.0
    _next_blink: float = 2.0


class FaceRenderer:
    def __init__(self):
        self.f_big = _font(64)
        self.f_mid = _font(30)
        self.f_small = _font(17)

    def tick(self, fs: FaceState, dt):
        """Pislogás időzítése (a rajzolástól függetlenül, hogy teszthez determinisztikus maradjon a render)."""
        fs._next_blink -= dt
        if fs._next_blink < 0:
            fs._blink, fs._next_blink = 1.0, 2.5 + random.random() * 3.5
        fs._blink = max(0.0, fs._blink - dt * 7)

    def render(self, fs: FaceState, t=0.0):
        img = Image.new('RGB', (SIZE, SIZE), (5, 6, 8))
        if fs.mode == 'off':
            return img
        d = ImageDraw.Draw(img)
        eye = EYE.get(fs.persona, EYE['sunny'])
        c = SIZE / 2
        ex, ey = fs.look[0] * 16, fs.look[1] * 12
        getattr(self, '_' + fs.mode, self._face)(d, fs, c, ex, ey, eye, t)
        return img

    # ----------------------------------------------------------- üzemmódok
    def _face(self, d, fs, c, ex, ey, eye, t):
        openness = 1 - math.sin(min(1.0, fs._blink) * math.pi)
        lid = 0.55 if fs.peeking else 1.0
        for sx in (-1, 1):
            h = max(3, 34 * openness * lid)
            x, y = c + sx * 39 + ex, c - 26 + ey
            d.rounded_rectangle([x - 15, y - h / 2, x + 15, y + h / 2], radius=13, fill=eye)
        mx, my = c + ex * 0.4, c + 36 + ey * 0.4
        if fs.talk_level > 0.02:
            a = 5 + fs.talk_level * 24
            d.ellipse([mx - 19, my - a / 2, mx + 19, my + a / 2], fill=eye)
        elif fs.mouth == 'grin':
            d.chord([mx - 30, my - 40, mx + 30, my + 20], 25, 155, fill=eye)
        elif fs.mouth == 'flat':
            d.line([mx - 19, my, mx + 19, my], fill=eye, width=7)
        elif fs.mouth == 'worried':
            d.arc([mx - 21, my - 2, mx + 21, my + 38], 215, 325, fill=eye, width=7)
        elif fs.mouth == 'o':
            d.ellipse([mx - 9, my - 9, mx + 9, my + 9], outline=eye, width=6)
        else:
            d.arc([mx - 22, my - 34, mx + 22, my + 10], 35, 145, fill=eye, width=7)

    def _listen(self, d, fs, c, ex, ey, eye, t):
        self._face(d, fs, c, ex, ey, eye, t)
        for i in range(3):
            k = 0.3 + 0.7 * max(0.0, math.sin(t * 6 - i))
            col = tuple(int(v * k) for v in eye)
            d.ellipse([c - 23 + i * 18, c + 40, c - 13 + i * 18, c + 50], fill=col)

    def _dizzy(self, d, fs, c, ex, ey, eye, t):
        for sx in (-1, 1):
            pts = [(c + sx * 39 + math.cos(a / 5 + t * 8) * a * 0.33, c - 22 + math.sin(a / 5 + t * 8) * a * 0.33) for a in range(0, 70)]
            d.line(pts, fill=eye, width=4)
        d.line([(c - 22 + i * 7.5, c + 42 + (6 if i % 2 else -6)) for i in range(7)], fill=eye, width=5)

    def _text(self, d, fs, c, ex, ey, eye, t):
        col = fs.text_color or eye
        d.text((c, c - 14 if fs.sub else c), fs.text, font=self.f_big, fill=col, anchor='mm')
        if fs.sub:
            d.text((c, c + 40), fs.sub, font=self.f_small, fill=col, anchor='mm')

    def _eq(self, d, fs, c, ex, ey, eye, t):
        import colorsys
        for i, v in enumerate(fs.eq[:9]):
            h = 10 + v * 90 * (1 - abs(i - 4) / 9)
            r, g, b = colorsys.hsv_to_rgb(((fs.hue + i * 25) % 360) / 360, 0.85, 1.0)
            x = c - 82 + i * 19
            d.rounded_rectangle([x, c + 36 - h, x + 13, c + 36], radius=6, fill=(int(r * 255), int(g * 255), int(b * 255)))

    def _privacy(self, d, fs, c, ex, ey, eye, t):
        dim = tuple(v // 2 for v in eye)
        for sx in (-1, 1):
            d.arc([c + sx * 39 - 16, c - 46, c + sx * 39 + 16, c - 14], 30, 150, fill=dim, width=6)
        d.text((c, c + 38), 'mic & cam OFF', font=self.f_small, fill=dim, anchor='mm')

    def _dnd(self, d, fs, c, ex, ey, eye, t):
        dim = tuple(int(v * 0.55) for v in eye)
        for sx in (-1, 1):
            d.line([c + sx * 39 - 15, c - 22, c + sx * 39 + 15, c - 22], fill=dim, width=6)
        d.text((c, c + 38), 'Do not disturb', font=self.f_small, fill=dim, anchor='mm')

    def _call(self, d, fs, c, ex, ey, eye, t):
        d.text((c, c - 18), fs.caller, font=self.f_mid, fill=eye, anchor='mm')
        d.text((c, c + 26), 'speakerphone' if fs.call_live else 'tap to answer', font=self.f_small, fill=eye, anchor='mm')
