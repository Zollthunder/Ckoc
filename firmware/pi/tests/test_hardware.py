"""A 2026-11-17-i hardvercserék tesztjei – hardver nélkül, szimulált eszközökkel.
  XIAO: érintés touchio-val (rézfólia + 1 MΩ), rezgőmotor-modul PWM-mel   (firmware/xiao/reflex.py és code.py)
  Pi  : Seeed ReSpeaker 2-Mics Pi HAT v1 (WM8960) / v2.0 (TLV320AIC3104), mono   (hw_real.AlsaAudio, asound.conf, install.sh)
Futtatás (a firmware/pi mappából):  python -m unittest discover -s tests -v
"""
import contextlib, io, json, os, subprocess, sys, tempfile, types, unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
PI = os.path.normpath(os.path.join(HERE, '..'))
XIAO = os.path.normpath(os.path.join(HERE, '..', '..', 'xiao'))
sys.path.insert(0, PI)
sys.path.insert(0, XIAO)

import reflex                                                  # noqa: E402
from ckocka import hw_real                                     # noqa: E402


def read(*parts):
    with open(os.path.join(*parts), encoding='utf-8') as f:
        return f.read()


# ============================================================================ XIAO: hardverfüggetlen logika
class TouchDetectorTest(unittest.TestCase):
    def feed(self, det, values, t0=0.0, dt=0.01):
        hits, t = [], t0
        for v in values:
            if det.update(v, t):
                hits.append(round(t, 3))
            t += dt
        return hits, t

    def calibrated(self, base=1000, **kw):
        det = reflex.TouchDetector(**kw)
        _, t = self.feed(det, [base] * det.calib_n)
        self.assertEqual(det.baseline, base)
        return det, t

    def test_calibration_uses_median(self):
        det = reflex.TouchDetector(calib_n=5)
        self.feed(det, [1000, 1003, 5000, 998, 1001])          # egy kiugró minta (pl. zavar) nem számít
        self.assertEqual(det.baseline, 1001)

    def test_one_event_per_touch(self):
        det, t = self.calibrated()
        hits, t = self.feed(det, [1200] * 30 + [1000] * 10 + [1200] * 30, t0=t)
        self.assertEqual(len(hits), 2)                        # két érintés = két esemény, nem 60
        self.assertTrue(det.touched)

    def test_short_glitch_ignored(self):
        det, t = self.calibrated()
        hits, _ = self.feed(det, [1000, 1300, 1000, 1300, 1000] * 5, t0=t)   # 10 ms-os tüskék: nem érintés
        self.assertEqual(hits, [])

    def test_small_signal_under_metal_lid(self):
        # a fém tetőlap mellett kicsi a jel: ~7% növekedés még nem, 10% már érintés (alapvonal 1000, küszöb 1080)
        det, t = self.calibrated()
        self.assertEqual(self.feed(det, [1070] * 20, t0=t)[0], [])
        det, t = self.calibrated()
        self.assertEqual(len(self.feed(det, [1100] * 20, t0=t)[0]), 1)

    def test_release_hysteresis(self):
        det, t = self.calibrated()
        _, t = self.feed(det, [1200] * 10, t0=t)
        self.assertTrue(det.touched)
        _, t = self.feed(det, [1050] * 5, t0=t)                # a küszöb (1080) alatt, de a fél küszöb (1040) fölött
        self.assertTrue(det.touched, 'a küszöb körüli zajtól ne „pattogjon”')
        self.feed(det, [1020] * 5, t0=t)
        self.assertFalse(det.touched)

    def test_baseline_follows_slow_drift(self):
        det, t = self.calibrated()
        _, t = self.feed(det, [1000 + i * 0.1 for i in range(3000)], t0=t)   # lassú melegedés: +300
        self.assertGreater(det.baseline, 1200)
        hits, _ = self.feed(det, [1300] * 20, t0=t)
        self.assertEqual(hits, [], 'az elmászott alapvonal ne adjon hamis érintést')

    def test_stuck_recalibrates(self):
        det, t = self.calibrated(stuck=2.0)
        hits, t = self.feed(det, [1300] * 300, t0=t)           # 3 s-ig „érintve” (pl. fémtárgy fekszik rajta)
        self.assertEqual(len(hits), 1)
        self.assertFalse(det.touched)
        self.assertEqual(det.baseline, 1300)
        self.assertEqual(len(self.feed(det, [1500] * 20, t0=t)[0]), 1)   # utána a valódi érintés újra működik


class BuzzerTest(unittest.TestCase):
    def test_tick_and_buzz(self):
        bz = reflex.Buzzer()
        self.assertEqual(bz.duty(0.0), 0.0)
        bz.play('tick', 10.0)
        self.assertEqual(bz.duty(10.0), 1.0)
        self.assertEqual(bz.duty(10.05), 0.0)
        self.assertFalse(bz.busy)
        bz.play('buzz', 20.0)
        total = sum(length for _, length in reflex.PATTERNS['buzz'])
        samples = [bz.duty(20.0 + i * 0.01) for i in range(int(total * 100) + 5)]
        self.assertEqual(samples[0], 1.0)                      # rúgással indul (az ERM motor lassan pörög fel)
        self.assertIn(0.0, samples[:-5])                       # két zümmögés, köztük szünet
        self.assertEqual(samples[-1], 0.0)
        self.assertTrue(0.3 < total < 0.8)

    def test_unknown_pattern_is_tick(self):
        bz = reflex.Buzzer()
        bz.play('nincs-ilyen', 0.0)
        self.assertEqual(bz.duty(0.0), 1.0)
        self.assertEqual(bz.duty(0.1), 0.0)

    def test_duty_u16(self):
        self.assertEqual([reflex.duty_u16(d) for d in (0.0, 0.5, 1.0, 1.5, -1)], [0, 32768, 65535, 65535, 0])


# ============================================================================ XIAO: a code.py szimulált CircuitPythonon
class _Stop(Exception):
    pass


class FakeXiao:
    """Hamis CircuitPython-modulok (board, touchio, pwmio, usb_cdc, seesaw, displayio, …); a code.py végtelen ciklusát a hamis
    time.sleep állítja meg, és minden körben lefuttat egy „forgatókönyv”-lépést."""

    def __init__(self, touch_raw, script, pulldown=True, steps=400, imu_g=None):
        self.t, self.steps, self.step = 0.0, steps, 0
        self.imu_g = imu_g                                     # t -> gyorsulás g-ben, a KOCKA tengelyein (None: nincs IMU)
        self.console = ''
        self.touch_raw, self.script, self.pulldown = touch_raw, script, pulldown
        self.out, self.inbox, self.duty_log, self.pwm = [], b'', [], None
        self.strip, self.led_out, self.led_max, self.led_shows = None, {}, 0, 0   # NeoDriver-lánc; kimenő Σ(r+g+b), csúcs
        self.wire, self.i2c_hz, self.neodriver_missing = b'', None, False
        self.display, self.lcd, self.lcd_cmds, self.display_fail = None, None, [], None   # szimulált GC9A01 (displayio)
        self.shapes_made, self.snapshots, self.snap_at = 0, {}, ()   # snap_at: ezekben a lépésekben „fénykép” a kijelzőről
        self.i2c_error, self.i2c_args, self.pins = None, None, {}

    def modules(self):
        fx = self
        m = {}
        m['board'] = types.SimpleNamespace(**{n: n for n in ('D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10')})

        class DIO:
            def __init__(self, pin):
                self.pin, self.direction, self.pull = pin, None, None
                fx.pins[pin] = self
                self.value = pin != 'D7' or bool(fx.touch_raw(fx.t) > 1500)    # gombok felhúzva; D7: AT42QT1010-tartalék
        m['digitalio'] = types.SimpleNamespace(DigitalInOut=DIO, Direction=types.SimpleNamespace(INPUT=0, OUTPUT=1),
                                               Pull=types.SimpleNamespace(UP=1, DOWN=2))

        class Debouncer:
            def __init__(self, io):
                self.io, self.state, self.rose, self.fell = io, None, False, False

            def update(self):
                v = fx.touch_raw(fx.t) > 1500 if self.io.pin == 'D7' else True
                self.rose, self.fell = (self.state is False and v), (self.state is True and not v)
                self.state = v
        m['adafruit_debouncer'] = types.SimpleNamespace(Debouncer=Debouncer)

        class TouchIn:
            def __init__(self, pin):
                if not fx.pulldown:
                    raise ValueError('No pulldown on pin; 1Mohm recommended')
                self.pin = pin

            @property
            def raw_value(self):
                return fx.touch_raw(fx.t)
        m['touchio'] = types.SimpleNamespace(TouchIn=TouchIn)

        class PWMOut:
            def __init__(self, pin, frequency=500, duty_cycle=0):
                self.pin, self.frequency, self._d = pin, frequency, duty_cycle
                fx.pwm = self

            @property
            def duty_cycle(self):
                return self._d

            @duty_cycle.setter
            def duty_cycle(self, v):
                assert 0 <= v <= 65535
                self._d = v
                fx.duty_log.append((round(fx.t, 3), v))
        m['pwmio'] = types.SimpleNamespace(PWMOut=PWMOut)

        class Port:
            @property
            def in_waiting(self):
                return len(fx.inbox)

            def read(self, n):
                b, fx.inbox = fx.inbox[:n], fx.inbox[n:]
                return b

            def write(self, b):
                fx.wire += b                                   # a soros vonalon a Pi felé kimenő bájtok
                fx.out.append(json.loads(b.decode()))

        m['usb_cdc'] = types.SimpleNamespace(data=Port(), console=None)

        class Seesaw:
            def __init__(self, i2c, addr=0x49):
                if fx.neodriver_missing:
                    raise ValueError('No I2C device at address: 0x%x' % addr)
                self.i2c, self.addr = i2c, addr

        class Pixels(list):                                    # mint a pixelbuf: a getitem a fényerő ELŐTTI értéket adja
            def __init__(self, ss, pin, n, brightness=1.0, auto_write=True, **kw):
                super().__init__([(0, 0, 0)] * n)
                self.ss, self.pin, self.brightness, self.auto_write = ss, pin, brightness, auto_write
                fx.strip = self

            def show(self):
                fx.led_out['neodriver'] = sum(int(v * self.brightness) for p in self for v in p)
                fx.led_shows += 1
        ss_mod = types.SimpleNamespace(Seesaw=Seesaw)
        np_mod = types.SimpleNamespace(NeoPixel=Pixels)
        m['adafruit_seesaw'] = types.SimpleNamespace(seesaw=ss_mod, neopixel=np_mod)
        m['adafruit_seesaw.seesaw'], m['adafruit_seesaw.neopixel'] = ss_mod, np_mod

        def I2C(scl, sda, frequency=100000):
            fx.i2c_args = (scl, sda)
            fx.i2c_hz = frequency
            if fx.i2c_error:
                raise RuntimeError(fx.i2c_error)
            return (scl, sda)
        def SPI(clock, MOSI=None, MISO=None):
            fx.lcd = {'clock': clock, 'MOSI': MOSI, 'MISO': MISO}
            if fx.display_fail:
                raise ValueError(fx.display_fail)
            return 'spi'
        m['busio'] = types.SimpleNamespace(I2C=I2C, SPI=SPI)

        # ---- kijelző: displayio + vectorio + adafruit_gc9a01a (a rajzolt alakzatok a tesztben Pillow-val kirajzolhatók)
        class Group(list):
            def __init__(self, **kw):
                super().__init__()
                self.hidden = False

        class Palette(list):
            def __init__(self, n):
                super().__init__([0] * n)

        class Shape:
            def __init__(self, kind, pixel_shader, **kw):
                self.kind, self.pixel_shader, self.x, self.y = kind, pixel_shader, 0, 0
                self.__dict__.update(kw)
                fx.shapes_made += 1

        class FourWire:
            def __init__(self, spi, command=None, chip_select=None, reset=None, baudrate=24000000, **kw):
                fx.lcd.update(command=command, chip_select=chip_select, reset=reset, baudrate=baudrate)

            def send(self, cmd, data):
                fx.lcd_cmds.append((cmd, bytes(data)))

        class GC9A01A:
            def __init__(self, bus, width=240, height=240, **kw):
                self.bus, self.width, self.height, self.root_group, self.kw = bus, width, height, None, kw
                fx.display = self

        class Label:
            def __init__(self, font, text='', color=0, scale=1, anchor_point=(0, 0), anchored_position=(0, 0)):
                self.text, self.color, self.scale = text, color, scale
                self.anchor_point, self.anchored_position, self.hidden, self.kind = anchor_point, anchored_position, False, 'label'
        m['displayio'] = types.SimpleNamespace(Group=Group, Palette=Palette, release_displays=lambda: None)
        m['vectorio'] = types.SimpleNamespace(Polygon=lambda **kw: Shape('poly', **kw),
                                              Circle=lambda **kw: Shape('circle', **kw),
                                              Rectangle=lambda **kw: Shape('rect', **kw))
        m['terminalio'] = types.SimpleNamespace(FONT='terminalio.FONT')
        m['fourwire'] = types.SimpleNamespace(FourWire=FourWire)
        m['adafruit_gc9a01a'] = types.SimpleNamespace(GC9A01A=GC9A01A)
        m['adafruit_display_text'] = types.SimpleNamespace()
        m['adafruit_display_text.label'] = types.SimpleNamespace(Label=Label)
        if fx.imu_g is None:
            m['adafruit_lsm6ds'] = m['adafruit_lsm6ds.lsm6ds3trc'] = None   # nincs IMU: így is el kell indulnia
        else:
            class LSM6DS3TRC:                                  # a panel a SAJÁT tengelyein mér (m/s²)
                def __init__(self, i2c):
                    pass

                @property
                def acceleration(self):
                    return tuple(v * 9.81 for v in reflex.to_panel(fx.imu_g(fx.t)))
            m['adafruit_lsm6ds'] = types.SimpleNamespace()
            m['adafruit_lsm6ds.lsm6ds3trc'] = types.SimpleNamespace(LSM6DS3TRC=LSM6DS3TRC)

        def sleep(dt):
            fx.t += dt + 0.002                                 # a kör maga is ~2 ms
            fx.step += 1
            fx.led_max = max(fx.led_max, sum(fx.led_out.values()))
            if fx.step in fx.snap_at:
                fx.snapshots[fx.step] = fx.screen()
            fx.script(fx)
            if fx.step >= fx.steps:
                raise _Stop
        m['time'] = types.SimpleNamespace(monotonic=lambda: fx.t, sleep=sleep)
        return m

    def run(self):
        src = read(XIAO, 'code.py')
        out = io.StringIO()
        with mock.patch.dict(sys.modules, self.modules()), contextlib.redirect_stdout(out):
            try:
                exec(compile(src, 'code.py', 'exec'), {'__name__': '__main__'})
            except _Stop:
                pass
        self.console = out.getvalue()
        return self

    def send(self, obj):
        self.inbox += (json.dumps(obj) + '\n').encode()

    def screen(self):
        """A szimulált kijelző tartalma Pillow-képként (a látható alakzatokból), és a látható feliratok."""
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (240, 240))
        d, texts = ImageDraw.Draw(img), []
        if not self.display or self.display.root_group is None:
            return img, texts

        def col(v):
            return ((v >> 16) & 255, (v >> 8) & 255, v & 255)

        def draw(item):
            if getattr(item, 'hidden', False):
                return
            if isinstance(item, list) and not hasattr(item, 'kind'):
                for it in item:
                    draw(it)
                return
            k = item.kind
            if k == 'label':
                texts.append(item.text)
                return
            c = col(item.pixel_shader[0])
            if k == 'rect':
                d.rectangle([item.x, item.y, item.x + item.width - 1, item.y + item.height - 1], fill=c)
            elif k == 'circle':
                d.ellipse([item.x - item.radius, item.y - item.radius, item.x + item.radius, item.y + item.radius], fill=c)
            else:
                d.polygon([(item.x + x, item.y + y) for x, y in item.points], fill=c)
        draw(self.display.root_group)
        return img, texts


class XiaoFirmwareTest(unittest.TestCase):
    def test_touchio_touch_and_pwm_haptic(self):
        touch = lambda t: 2400 if 1.0 <= t < 1.4 or 2.5 <= t < 2.8 else 1000   # két érintés

        def script(fx):
            if fx.step == 150:
                fx.send({'cmd': 'haptic', 'pattern': 'buzz'})
        fx = FakeXiao(touch, script, steps=330).run()
        hello = fx.out[0]
        self.assertEqual((hello['ev'], hello['fw'], hello['touch'], hello['haptic'], hello['imu']),
                         ('hello', '1.4', 'touchio', True, False))
        self.assertEqual([e for e in fx.out if e['ev'] == 'touch'], [{'ev': 'touch'}] * 2)
        self.assertEqual((fx.pwm.pin, fx.pwm.frequency), ('D0', 20000))     # D0: rezgés (lábtábla: code.py PINS)
        on = [t for t, d in fx.duty_log if d > 0]
        self.assertTrue(on, 'a rezgőmotor nem kapott PWM-et')
        self.assertTrue(on[-1] - on[0] < 0.8)                  # a minta véget ér, nem zümmög tovább
        self.assertEqual(fx.duty_log[-1][1], 0)
        self.assertIn(65535, [d for _, d in fx.duty_log])      # rúgás teljes erővel
        self.assertTrue(any(0 < d < 65535 for _, d in fx.duty_log))   # utána kisebb kitöltés

    def test_no_pulldown_falls_back_to_digital(self):
        touch = lambda t: 2400 if 1.0 <= t < 1.4 else 1000
        fx = FakeXiao(touch, lambda fx: None, pulldown=False, steps=200).run()
        self.assertEqual(fx.out[0]['touch'], 'digital')
        self.assertEqual(sum(e['ev'] == 'touch' for e in fx.out), 1)

    def test_no_drv2605_left(self):
        src = read(XIAO, 'code.py')
        self.assertNotIn('adafruit_drv2605', src)
        self.assertNotIn('AT42QT1010 OUT', src)


# ============================================================================ XIAO: az IMU tengelyei
# A kocka 6 alaphelyzete: melyik lapja néz felfelé -> a nyugalmi gyorsulás a kocka tengelyein (+1 g a felfelé mutatón)
FACE_UP = {
    'teteje': (0, 1, 0), 'alja': (0, -1, 0),
    'eleje': (0, 0, 1), 'hata': (0, 0, -1),
    'jobb': (1, 0, 0), 'bal': (-1, 0, 0),
}


class ImuAxesTest(unittest.TestCase):
    def test_board_axes_as_documented(self):
        # ELEKTRONIKA.md: panel X -> hátra (-Z), panel Y -> fel (+Y), panel Z -> jobbra (+X)
        self.assertEqual(reflex.to_cube((1, 0, 0)), (0, 0, -1))
        self.assertEqual(reflex.to_cube((0, 1, 0)), (0, 1, 0))
        self.assertEqual(reflex.to_cube((0, 0, 1)), (1, 0, 0))

    def test_table_is_a_rotation(self):
        # minden panel-tengely pontosan egyszer szerepel, és a determináns +1 (forgatás, nem tükrözés) – ha a valódi
        # panel miatt átírják a táblázatot, ez fogja meg az elírást
        axes = reflex.IMU_AXES
        self.assertEqual(sorted(i for _, i in axes), [0, 1, 2])
        m = [[sign if col == i else 0 for col in range(3)] for sign, i in axes]
        det = (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
               + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
        self.assertEqual(det, 1)

    def test_roundtrip(self):
        for v in list(FACE_UP.values()) + [(0.25, -0.5, 0.75)]:
            self.assertEqual(reflex.to_cube(reflex.to_panel(v)), tuple(float(x) for x in v))

    def test_upright_reads_plus_y_on_board(self):
        # álló kockánál a függőleges panel Y tengelye mér +1 g-t (a régi, fekvő panelnél a Z mérte)
        self.assertEqual(reflex.to_panel(FACE_UP['teteje']), (0.0, 1.0, 0.0))


def flips(fx):
    return [e['up'] for e in fx.out if e.get('ev') == 'imu' and e.get('kind') == 'flip']


class XiaoImuTest(unittest.TestCase):
    """A code.py a szimulált, függőlegesen álló panellel: minden helyzetben a kocka szerinti eseményeknek kell jönniük."""

    def run_seq(self, seq):
        """seq: [(helyzet neve, másodperc), …] – egymás után ezekbe fordítjuk a kockát."""
        def g(t):
            for name, dur in seq:
                if t < dur:
                    return FACE_UP[name]
                t -= dur
            return FACE_UP[seq[-1][0]]
        total = sum(d for _, d in seq)
        return FakeXiao(lambda t: 1000, lambda fx: None, steps=int(total / 0.012) + 1, imu_g=g).run()

    def test_six_positions_from_upright(self):
        for name in FACE_UP:
            with self.subTest(fel=name):
                fx = self.run_seq([('teteje', 1.0), (name, 1.5)])
                self.assertTrue(fx.out[0]['imu'])
                self.assertEqual(flips(fx), [True] if name == 'alja' else [],
                                 'csak az alja-felül helyzet „fejjel lefelé”; oldalra fektetve nem némít')

    def test_six_positions_from_upside_down(self):
        for name in FACE_UP:
            with self.subTest(fel=name):
                fx = self.run_seq([('alja', 1.5), (name, 1.5)])
                self.assertEqual(flips(fx), [True, False] if name == 'teteje' else [True],
                                 'fejjel lefelé oldalra döntve némítva marad, csak talpra állítva oldódik')

    def test_full_turn_round(self):
        fx = self.run_seq([('teteje', 1), ('jobb', 1), ('alja', 1), ('bal', 1), ('eleje', 1), ('teteje', 1)])
        self.assertEqual(flips(fx), [True, False])

    def test_short_tilt_ignored(self):
        fx = self.run_seq([('teteje', 1), ('alja', 0.3), ('teteje', 1)])   # 0,5 s-nál rövidebb: nem fordítás
        self.assertEqual(flips(fx), [])

    def test_console_shows_cube_g(self):
        fx = self.run_seq([('teteje', 0.1)])
        self.assertIn('cube_g (0.0, 1.0, 0.0)', fx.console)    # ezzel ellenőrizhető a valódi panel tengelyezése

    def test_throw_and_shake_any_direction(self):
        # a dobás és a rázás a gyorsulás nagyságát nézi: a panel tengelyezésétől és a kocka helyzetétől független
        for axis in ((3, 0, 0), (0, 0, -3), (0, 3, 0)):
            with self.subTest(becsapodas=axis):
                def throw(t, axis=axis):
                    if t < 0.5:
                        return FACE_UP['jobb']
                    if t < 0.7:
                        return (0, 0, 0)                       # szabadesés
                    if t < 0.73:
                        return axis                            # becsapódás
                    return FACE_UP['jobb']
                fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=100, imu_g=throw).run()
                self.assertEqual([e['kind'] for e in fx.out if e.get('ev') == 'imu'], ['throw'])

                def shake(t, axis=axis):
                    if 0.5 < t < 1.3 and int(t * 25) % 2:
                        return tuple(2.2 * v / 3 for v in axis)   # gyors, erős lökések
                    return FACE_UP['teteje']
                fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=120, imu_g=shake).run()
                self.assertIn('shake', [e['kind'] for e in fx.out if e.get('ev') == 'imu'])


# ============================================================================ Pi: ReSpeaker 2-Mics Pi HAT
CARDS_V2 = """ 0 [vc4hdmi        ]: vc4-hdmi - vc4-hdmi
                      vc4-hdmi
 2 [seeed2micvoicec]: simple-card - seeed2micvoicec
                      seeed2micvoicec
"""
PCM_V2 = """00-00: MAI PCM i2s-hifi-0 : MAI PCM i2s-hifi-0 : playback 1
02-00: 1f000a4000.i2s-tlv320aic3x-hifi tlv320aic3x-hifi-0 : 1f000a4000.i2s-tlv320aic3x-hifi tlv320aic3x-hifi-0 : playback 1 : capture 1
"""
CARDS_V1 = """ 0 [vc4hdmi        ]: vc4-hdmi - vc4-hdmi
 3 [seeed2micvoicec]: simple-card - seeed-2mic-voicecard
                      seeed-2mic-voicecard
"""
PCM_V1 = """00-00: MAI PCM i2s-hifi-0 : MAI PCM i2s-hifi-0 : playback 1
03-00: bcm2835-i2s-wm8960-hifi wm8960-hifi-0 : bcm2835-i2s-wm8960-hifi wm8960-hifi-0 : playback 1 : capture 1
"""


def proc(cards, pcm):
    d = tempfile.mkdtemp()
    for name, text in (('cards', cards), ('pcm', pcm)):
        with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
            f.write(text)
    return d


class FakeAmixer:
    def __init__(self, missing=()):
        self.calls, self.missing = [], set(missing)

    def __call__(self, cmd, **kw):
        self.calls.append(cmd)
        name = cmd[cmd.index('cset') + 1][len('name='):]
        rc = 1 if name in self.missing else 0
        return subprocess.CompletedProcess(cmd, rc, '', 'amixer: Cannot find the given element' if rc else '')

    def settings(self):
        return {c[c.index('cset') + 1][len('name='):]: c[-1] for c in self.calls}


class ReSpeakerTest(unittest.TestCase):
    def test_detect_codec(self):
        self.assertEqual(hw_real.detect_codec(proc(CARDS_V2, PCM_V2)), 'tlv320aic3x')
        self.assertEqual(hw_real.detect_codec(proc(CARDS_V1, PCM_V1)), 'wm8960')
        self.assertIsNone(hw_real.detect_codec(proc(' 0 [vc4hdmi        ]: vc4-hdmi\n', PCM_V2)))   # nincs ReSpeaker
        self.assertIsNone(hw_real.detect_codec(os.path.join(tempfile.mkdtemp(), 'nincs')))      # nincs /proc/asound
        # a HDMI-kártya pcm-sora ne számítson, akkor se, ha a ReSpeaker sora hiányzik
        self.assertIsNone(hw_real.detect_codec(proc(CARDS_V2, PCM_V2.splitlines()[0])))

    def make(self, cards, pcm, missing=()):
        amixer = FakeAmixer(missing)
        with mock.patch.object(hw_real.subprocess, 'run', amixer):
            audio = hw_real.AlsaAudio(proc_dir=proc(cards, pcm))
        return audio, amixer

    def test_v2_mixer_init_and_mic_mute(self):
        audio, amixer = self.make(CARDS_V2, PCM_V2)
        self.assertEqual((audio.codec, audio.card, audio.device), ('tlv320aic3x', 'seeed2micvoicec', 'default'))
        self.assertTrue(all(c[:5] == ['amixer', '-q', '-c', 'seeed2micvoicec', 'cset'] for c in amixer.calls))
        s = amixer.settings()
        self.assertEqual((s['HP Playback Switch'], s['PGA Capture Switch']), ('on', 'on'))
        # a hangszóró erősítője a két VONALKIMENET összegét kapja (v2.0 rajz): mindkét vonalkeverő be, a hangerő nem 0
        self.assertEqual((s['Left Line Mixer DACL1 Switch'], s['Right Line Mixer DACR1 Switch'], s['Line Playback Switch']),
                         ('on', 'on', 'on'))
        self.assertNotEqual(s['Line DAC Playback Volume'], '0%')
        self.assertEqual((s['Left HP Mixer DACL1 Switch'], s['Right HP Mixer DACR1 Switch']), ('on', 'on'))   # 3,5 mm-es aljzat
        amixer.calls.clear()
        with mock.patch.object(hw_real.subprocess, 'run', amixer):
            self.assertTrue(audio.set_capture(False))          # fejjel lefelé
            self.assertTrue(audio.set_capture(True))
        self.assertEqual([c[-2:] for c in amixer.calls], [['name=PGA Capture Switch', 'off'], ['name=PGA Capture Switch', 'on']])

    def test_v1_mixer_init_and_mic_mute(self):
        audio, amixer = self.make(CARDS_V1, PCM_V1)
        self.assertEqual(audio.codec, 'wm8960')
        s = amixer.settings()
        self.assertEqual((s['Left Output Mixer PCM Playback Switch'], s['Right Output Mixer PCM Playback Switch']), ('on', 'on'))
        self.assertIn('Speaker Playback Volume', s)            # a JST hangszórókimenet a WM8960 erősítőjén
        amixer.calls.clear()
        with mock.patch.object(hw_real.subprocess, 'run', amixer):
            audio.set_capture(False)
        self.assertEqual(amixer.calls[0][-2:], ['name=Capture Switch', 'off'])

    def test_missing_control_only_warns(self):
        with self.assertLogs('ckocka.hw', 'WARNING') as logs:
            audio, amixer = self.make(CARDS_V2, PCM_V2, missing={'PGA Capture Switch'})
        self.assertTrue(any('PGA Capture Switch' in m for m in logs.output))
        with mock.patch.object(hw_real.subprocess, 'run', amixer), self.assertLogs('ckocka.hw', 'WARNING'):
            self.assertFalse(audio.set_capture(False))         # jelzi, hogy a kodekben nem sikerült

    def test_no_card(self):
        with self.assertLogs('ckocka.hw', 'WARNING'):
            audio, amixer = self.make(' 0 [vc4hdmi        ]: vc4-hdmi\n', '')
        self.assertIsNone(audio.codec)
        self.assertEqual(amixer.calls, [])
        self.assertFalse(audio.set_capture(False))

    def test_playback_is_mono_on_default_device(self):
        audio, _ = self.make(CARDS_V2, PCM_V2)
        popen = mock.MagicMock()
        popen.return_value.poll.return_value = None
        wav = os.path.join(tempfile.mkdtemp(), 'a.wav')
        import wave
        with wave.open(wav, 'wb') as w:                         # sztereó bemenet is monóként megy ki
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(22050); w.writeframes(b'\x10\x00\x30\x00' * 2205)
        with mock.patch.object(hw_real.subprocess, 'Popen', popen):
            audio._play_pcm(wav, 1.0, audio._gen)
        cmd = popen.call_args[0][0]
        self.assertEqual(cmd[cmd.index('-D') + 1], 'default')
        self.assertEqual(cmd[cmd.index('-c') + 1], '1')
        written = b''.join(c.args[0] for c in popen.return_value.stdin.write.call_args_list)
        self.assertEqual(written[:4], b'\x20\x00\x20\x00')      # (0x10 + 0x30) / 2


class InstallFilesTest(unittest.TestCase):
    def test_asound_conf(self):
        conf = read(PI, 'asound.conf')
        self.assertIn('hw:CARD=seeed2micvoicec,DEV=0', conf)  # a kártya NEVE, nem a sorszáma
        self.assertIn('type dmix', conf)
        self.assertIn('type dsnoop', conf)
        for t in ('ttable.0.0 0.5', 'ttable.1.0 0.5', 'ttable.0.1 0.5', 'ttable.1.1 0.5'):
            self.assertIn(t, conf)                             # mono: L+R keverék mindkét kimenetre
        self.assertEqual(conf.count('{'), conf.count('}'))

    def test_install_sh(self):
        sh = read(PI, 'install.sh')
        for s in ('respeaker-2mic-v1_0', 'respeaker-2mic-v2_0', 'seeed-linux-dtoverlays', 'device-tree-compiler',
                  '/etc/asound.conf', 'firmware/pi/asound.conf'):
            self.assertIn(s, sh)
        self.assertNotIn('Voice Bonnet', sh)


if __name__ == '__main__':
    unittest.main()
