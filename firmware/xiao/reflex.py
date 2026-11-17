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
