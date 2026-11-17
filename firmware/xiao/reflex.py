# C-kocka – a XIAO hardverfüggetlen „reflexei”: érintésfelismerés és rezgésminták.
# CircuitPythonon (a code.py importálja) és PC-n (tesztek: firmware/pi/tests/test_xiao.py) is fut,
# ezért itt nincs board/touchio/pwmio – csak számok jönnek be és mennek ki.


class TouchDetector:
    """Kapacitív érintés a touchio nyers értékéből (TouchIn.raw_value).

    A RP2040-en a touchio egy töltési időt mér: a rézfólia-elektróda + az 1 MΩ-os lehúzó ellenállás mellett az ujj
    megnöveli a kapacitást, így a nyers érték. A beépített TouchIn.value az induláskori értékhez rögzít egy
    küszöböt, ami a hőmérséklettel és a páratartalommal elmászik, és a fém tetőlap közelsége miatt kicsi a jel.
    Ezért itt:
      * alapvonal (baseline) induláskor több mintából, utána lassan követi a nyers értéket, ha nincs érintés;
      * küszöb = alapvonal + max(min_delta, rel × alapvonal), elengedés hiszterézissel (a küszöb fele);
      * az érintésnek `hold` másodpercig tartania kell (pergésmentesítés), egy érintés = egy esemény;
      * ha nagyon sokáig „érintettnek” látszik (pl. egy fémtárgy fekszik rajta), újrakalibrál, ne ragadjon be.
    """

    def __init__(self, min_delta=60, rel=0.08, hold=0.04, drift=0.002, stuck=20.0, calib_n=16):
        self.min_delta, self.rel, self.hold, self.drift, self.stuck, self.calib_n = min_delta, rel, hold, drift, stuck, calib_n
        self.baseline = None
        self._calib = []
        self.touched = False
        self._cand_since = None          # mióta van a küszöb fölött (még nem érintés)
        self._touch_since = None

    def threshold(self):
        return self.baseline + max(self.min_delta, self.rel * self.baseline)

    def update(self, raw, now):
        """Egy nyers minta. Visszaad: True, ha éppen most kezdődött egy érintés (a Pi felé 'touch' esemény)."""
        if self.baseline is None:                     # kalibrálás: induláskor ne érjen hozzá senki
            self._calib.append(raw)
            if len(self._calib) >= self.calib_n:
                s = sorted(self._calib)
                self.baseline = float(s[len(s) // 2])  # medián: egy-egy kiugró minta nem rontja el
                self._calib = []
            return False
        thr = self.threshold()
        if not self.touched:
            if raw > thr:
                self._cand_since = self._cand_since if self._cand_since is not None else now
                if now - self._cand_since >= self.hold:
                    self.touched, self._touch_since, self._cand_since = True, now, None
                    return True
            else:
                self._cand_since = None
                self.baseline += (raw - self.baseline) * self.drift   # lassú követés (hő, pára)
            return False
        if raw < self.baseline + (thr - self.baseline) / 2:          # elengedés (hiszterézis)
            self.touched, self._touch_since = False, None
        elif now - self._touch_since > self.stuck:                   # beragadt: ez az új alapvonal
            self.baseline, self.touched, self._touch_since = float(raw), False, None
        return False


# ------------------------------------------------------------------ az IMU tengelyei -> a kocka tengelyei
# A kocka koordinátái: +X jobbra, +Y fel, +Z előre (a kijelző felé). Nyugalomban a gyorsulásmérő a felfelé mutató
# tengelyen +1 g-t mér, tehát álló kockánál a kocka Y-ja ≈ +1 g, fejjel lefelé ≈ -1 g.
#
# Az LSM6DS3TR-C panel (2026-11-17 óta) FÜGGŐLEGESEN áll a szán jobb sínjének külső oldalán, alkatrész-oldallal kifelé
# (ELEKTRONIKA.md):  panel X -> hátra (-Z),  panel Y -> fel (+Y),  panel Z -> jobbra (+X).
#
# AZ EGYETLEN HELY, ahol ez szerepel: ha a valódi panel szitanyomata mást mutat, csak ezt a táblázatot kell átírni.
# Soronként: a kocka tengelye = előjel × a panel melyik tengelye (0: X, 1: Y, 2: Z).
# Ellenőrzés a valódi kockán: álló helyzetben a 'hello' után a konzolra írt cube_g ≈ (0, +1, 0) legyen.
IMU_AXES = (
    (+1, 2),        # kocka X (jobbra) = +panel Z
    (+1, 1),        # kocka Y (fel)    = +panel Y
    (-1, 0),        # kocka Z (előre)  = -panel X
)


def to_cube(panel, axes=IMU_AXES):
    """(ax, ay, az) a panel tengelyein -> ugyanaz a vektor a kocka tengelyein."""
    return tuple(sign * panel[i] for sign, i in axes)


def to_panel(cube, axes=IMU_AXES):
    """A fordítottja (a tesztekhez): a kocka tengelyein adott vektor -> amit a panel mérne."""
    out = [0.0, 0.0, 0.0]
    for (sign, i), v in zip(axes, cube):
        out[i] = sign * v
    return tuple(out)


# ------------------------------------------------------------------ fényerőkorlát a WS2812 LED-ekre
# A 31 LED (24-es gyűrű + 7 a C mögött) tápja közvetlenül a UPS 5 V-járól jön (74AHCT125 szintillesztőn át). Egy LED
# teljes fehéren ~60 mA, 31 × 60 mA ≈ 1,86 A – ez a UPS 2,5 A-jéből a Pi, a hang és a kamera mellett nem fér ki.
# Ezért ÖSSZESEN legfeljebb a teljes fényerő 30 %-a mehet ki (≈ 0,56 A), bármit kér a Pi.
LED_COUNT = 31
LED_BUDGET = 0.30


SLEEP_BUDGET = 0.08                                 # alvás töltés közben (HOKEZELES.md 7.5): ≤ 8 %


def led_scale(pixels, budget=LED_BUDGET, count=LED_COUNT):
    """pixels: (r, g, b) hármasok (0..255). Visszaad: a szorzó (0..1), amellyel a teljes áram a keret alatt marad."""
    total = 0
    for p in pixels:
        total += p[0] + p[1] + p[2]
    limit = budget * count * 3 * 255
    return 1.0 if total <= limit else limit / total


# Rezgésminták a kész rezgőmotor-modulhoz (ERM motor + tranzisztor, PWM-mel hajtva): (kitöltés 0..1, időtartam s).
# Az ERM motor lassan indul, ezért minden minta egy rövid, teljes erejű „rúgással” kezdődik.
PATTERNS = {
    'tick': ((1.0, 0.035),),                                       # hallgat: egy rövid koppintás
    'buzz': ((1.0, 0.05), (0.7, 0.18), (0.0, 0.08), (1.0, 0.05), (0.7, 0.18)),   # „Ne zavarj”: két zümmögés
}


class Buzzer:
    """Nem blokkoló mintalejátszó: a főciklus minden körben megkérdezi, mekkora legyen a PWM kitöltése."""

    def __init__(self, patterns=PATTERNS):
        self.patterns = patterns
        self._steps, self._t0 = (), 0.0

    def play(self, name, now):
        self._steps = self.patterns.get(name, self.patterns['tick'])   # ismeretlen minta: koppintás
        self._t0 = now

    def duty(self, now):
        t = now - self._t0
        for d, length in self._steps:
            if t < length:
                return d
            t -= length
        self._steps = ()
        return 0.0

    @property
    def busy(self):
        return bool(self._steps)


def duty_u16(d):
    """0..1 -> a pwmio.PWMOut duty_cycle értéke (0..65535)."""
    return max(0, min(65535, int(d * 65535 + 0.5)))
