"""A kompatibilitás-ellenőrzés (KOMPATIBILITAS.md, 2026-11-17) firmware-teendőinek tesztjei – hardver nélkül.
  1. kijelző: mipi-dbi-spi (CE0, DC 25, RST 27, BL 22), APA102-diagnosztika     (ckocka/panel.py, hw_real, diag.py)
  2. ReSpeaker v2.0 overlay fordítása és beírása                                  (install.sh)
  3. Pi-Ener-lite: GPIO4, CW2015, biztonságos leállás, takarékmód töltés közben  (ckocka/power.py, brain.py)
  4. XIAO: IMU a D4 (SDA) / D5 (SCL) lábon, touchio-hiba barátságosan             (firmware/xiao/code.py)
  5. WS2812: összesen ≤ 30 % fényerő                                              (firmware/xiao/reflex.py, code.py)
Futtatás (a firmware/pi mappából):  python -m unittest discover -s tests -v
"""
import asyncio, os, shutil, subprocess, sys, tempfile, unittest
import unittest.mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('CKOCKA_HOME', tempfile.mkdtemp())

from test_hardware import FakeXiao, read, reflex, PI           # noqa: E402
from ckocka import diag, hw_real, hw_sim, panel, power         # noqa: E402
from ckocka.brain import Cube                                  # noqa: E402

VOICE = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'web', 'voice'))
LED_LIMIT = reflex.LED_BUDGET * reflex.LED_COUNT * 3 * 255


# ============================================================================ 5. WS2812 fényerőkorlát
class LedBudgetTest(unittest.TestCase):
    def test_scale(self):
        self.assertEqual(reflex.led_scale([(0, 0, 0)] * 31), 1.0)
        self.assertEqual(reflex.led_scale([(40, 40, 40)] * 31), 1.0)            # 16 %: nem kell korlátozni
        self.assertAlmostEqual(reflex.led_scale([(255, 255, 255)] * 31), 0.30)  # teljes fehér -> 30 %

    def test_current_estimate(self):
        # 31 LED × 60 mA × 30 % ≈ 0,56 A – ennyi a keret (a UPS 2,5 A-jéből a többi a Pi-é, a hangé, a kameráé)
        self.assertLessEqual(reflex.LED_COUNT * 0.060 * reflex.LED_BUDGET, 0.6)
        self.assertEqual(reflex.LED_COUNT, 24 + 7)

    def run_leds(self, bright, mode='solid', hue=60, camled=False):
        def script(fx):
            if fx.step == 2:
                fx.send({'cmd': 'leds', 'hue': hue, 'bright': bright, 'mode': mode})
                if camled:
                    fx.send({'cmd': 'camled', 'on': True})
        return FakeXiao(lambda t: 1000, script, steps=150).run()

    def test_firmware_never_exceeds_budget(self):
        for mode in ('solid', 'party', 'listen', 'think'):
            for hue in (0, 60, 180, 300):
                with self.subTest(mode=mode, hue=hue):
                    fx = self.run_leds(1.0, mode, hue, camled=True)
                    self.assertGreater(fx.led_max, 0)
                    self.assertLessEqual(fx.led_max, LED_LIMIT * 1.01)

    def test_full_request_is_capped_not_blacked_out(self):
        fx = self.run_leds(1.0, 'solid', 60)                    # sárga, teljes fényerő: a keret közelében marad
        self.assertGreater(fx.led_max, LED_LIMIT * 0.9)
        self.assertLess(fx.strips['D0'].brightness, 1.0)

    def test_dim_request_untouched(self):
        fx = self.run_leds(0.2, 'solid', 60)
        self.assertEqual(fx.strips['D0'].brightness, 1.0)       # a kis fényerőt nem csökkenti tovább


# ============================================================================ 4. XIAO: lábak, barátságos hibák
class XiaoRobustnessTest(unittest.TestCase):
    def test_imu_pins_sda_d4_scl_d5(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=5).run()
        self.assertEqual(fx.i2c_args, ('D5', 'D4'))             # busio.I2C(SCL, SDA)

    def test_missing_imu_or_pullups_does_not_stop_firmware(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=50)
        fx.i2c_error = 'No pull up found on SDA or SCL; check your wiring'
        fx.run()
        self.assertEqual(fx.out[0]['ev'], 'hello')
        self.assertFalse(fx.out[0]['imu'])
        self.assertEqual(fx.step, 50)                           # a főciklus végigfutott
        self.assertIn('nincs IMU', fx.console)

    def test_touchio_without_pulldown_friendly_message(self):
        touch = lambda t: 2400 if 1.0 <= t < 1.4 else 1000
        fx = FakeXiao(touch, lambda fx: None, pulldown=False, steps=200).run()
        self.assertIn('1 MΩ', fx.console)
        self.assertIn('D10', fx.console)
        self.assertEqual(fx.out[0]['touch'], 'digital')
        self.assertEqual(fx.step, 200)
        self.assertEqual(fx.pins['D10'].pull, 2, 'belső lehúzás: lebegő bemenet ne adjon hamis érintést')

    def test_touchio_ok_no_warning(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=20).run()
        self.assertNotIn('FIGYELEM: az érintés', fx.console)


# ============================================================================ 1. kijelző: mipi-dbi-spi
class PanelTest(unittest.TestCase):
    def test_firmware_roundtrip(self):
        blob = panel.firmware_bin()
        self.assertEqual(blob[:16], b'MIPI DBI' + bytes(7) + b'\x01')
        cmds = panel.parse_firmware(blob)
        self.assertEqual(cmds[:len(panel.GC9A01_INIT)], [(c, list(d)) for c, d in panel.GC9A01_INIT])
        self.assertIn((0x3A, [0x05]), cmds)                     # 16 bit/pixel (RGB565)
        self.assertEqual(cmds[-4:], [(0x11, []), ('delay', 120), (0x29, []), ('delay', 20)])

    def test_firmware_rejects_garbage(self):
        with self.assertRaises(ValueError):
            panel.parse_firmware(b'not a firmware')
        with self.assertRaises(ValueError):
            panel.firmware_bin([(0x100, [])], [])

    def test_config_pins(self):
        lines = panel.config_lines()
        text = '\n'.join(lines)
        self.assertIn('dtoverlay=mipi-dbi-spi,spi0-0,', text)     # SPI0 CE0 = GPIO8
        self.assertIn('dc-gpio=25', text)
        self.assertIn('reset-gpio=27', text)
        self.assertIn('backlight-gpio=22', text)
        self.assertIn('compatible=gc9a01\\0panel-mipi-dbi-spi', text)
        self.assertNotIn('18', text.replace('width', '').replace('height', ''))   # GPIO18 = I2S BCLK: tilos
        self.assertNotIn('dtoverlay=gc9a01', text)
        self.assertNotIn('backlight', '\n'.join(panel.config_lines(backlight=False)))

    def test_cli_writes_firmware(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'gc9a01.bin')
            subprocess.run([sys.executable, os.path.join(PI, 'ckocka', 'panel.py'), '--firmware', p], check=True)
            with open(p, 'rb') as f:
                self.assertEqual(f.read(), panel.firmware_bin())

    def fake_sys(self, d, name='panel-mipi-dbidrmfb', bpp=16, max_bl=1):
        os.makedirs(os.path.join(d, 'graphics', 'fb0'))
        os.makedirs(os.path.join(d, 'graphics', 'fb1'))
        for fb, n in (('fb0', 'vc4drmfb'), ('fb1', name)):
            with open(os.path.join(d, 'graphics', fb, 'name'), 'w') as f:
                f.write(n + '\n')
            with open(os.path.join(d, 'graphics', fb, 'bits_per_pixel'), 'w') as f:
                f.write('%d\n' % bpp)
        bl = os.path.join(d, 'backlight', 'backlight_gpio')
        os.makedirs(bl)
        for k, v in (('max_brightness', max_bl), ('brightness', 0)):
            with open(os.path.join(bl, k), 'w') as f:
                f.write(str(v))
        return bl

    def test_fb_display(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as d:
            bl = self.fake_sys(d)
            dev, sysp = hw_real.FbDisplay.find(os.path.join(d, 'graphics'))
            self.assertEqual((dev, os.path.basename(sysp)), ('/dev/fb1', 'fb1'))   # a HDMI fb0-ját átugorja
            fbfile = os.path.join(d, 'fb1.raw')
            open(fbfile, 'wb').close()
            disp = hw_real.FbDisplay(fbfile, sysp, os.path.join(d, 'backlight'))
            img = Image.new('RGB', (240, 240), (255, 0, 0))
            disp.show(img)
            disp.show(img)                                       # mindig az elejére ír
            disp.fb.close()
            with open(fbfile, 'rb') as f:
                data = f.read()
            self.assertEqual(len(data), 240 * 240 * 2)
            self.assertEqual(data[:2], b'\x00\xf8')              # piros RGB565 = 0xF800, kis végű a memóriában
            for v, want in ((0.6, '1'), (0.0, '0')):             # gpio-backlight: csak be/ki
                disp.brightness(v)
                with open(os.path.join(bl, 'brightness')) as f:
                    self.assertEqual(f.read(), want)

    def test_fb_display_rejects_32bit(self):
        with tempfile.TemporaryDirectory() as d:
            self.fake_sys(d, bpp=32)
            _, sysp = hw_real.FbDisplay.find(os.path.join(d, 'graphics'))
            with self.assertRaises(RuntimeError):
                hw_real.FbDisplay(os.path.join(d, 'nope'), sysp)

    def test_no_display_still_starts(self):
        with unittest.mock.patch.object(hw_real.FbDisplay, 'find', return_value=None), \
                unittest.mock.patch.object(hw_real, 'GC9A01', side_effect=ImportError('no spidev')), \
                self.assertLogs('ckocka.hw', 'WARNING'):
            self.assertIsInstance(hw_real.make_display(), hw_real.NullDisplay)

    def test_spidev_fallback_uses_new_pins(self):
        import inspect
        sig = inspect.signature(hw_real.GC9A01.__init__).parameters
        self.assertEqual((sig['dc'].default, sig['rst'].default, sig['bl'].default), (25, 27, 22))


# ============================================================================ 1. APA102-diagnosztika
class FakeDisplay:
    def __init__(self):
        self.frames = []

    def show(self, img):
        self.frames.append(img)


class Apa102DiagTest(unittest.TestCase):
    def test_decoder(self):
        self.assertEqual(diag.apa102_decode(bytes(100)), [None] * 3)
        stream = bytes(4) + bytes([0xFF, 1, 2, 3]) * 3
        self.assertEqual(diag.apa102_decode(stream), [(31, 3, 2, 1)] * 3)
        self.assertEqual(diag.apa102_decode(bytes([0xFF] * 50)), [None] * 3)   # kezdőkeret nélkül nem vált

    def test_patterns_provoke_the_leds(self):
        # a teszt képei a kijelző SPI-forgalmában (RGB565, nagy végű a vezetéken) APA102-kereteket hoznak létre:
        # ha a LED-ek a buszon vannak, a diagnosztika biztosan „megszólítja” őket
        lit = [diag.apa102_decode(hw_real.rgb565(img)) for img in diag.patterns()]
        self.assertTrue(all(l is not None for l in lit[0]), 'a fekete–fehér csíkok nem gyújtják meg a LED-eket')

    def test_flow(self):
        for ans, code in (('i', 1), ('n', 0), ('', 2), ('Igen', 1)):
            with self.subTest(ans=ans):
                disp, said, blanked = FakeDisplay(), [], []
                r = diag.spi_leds(disp, seconds=0.05, ask=lambda q: ans, out=said.append,
                                  blank=lambda: blanked.append(1))
                self.assertEqual(r, code)
                self.assertTrue(disp.frames)
                self.assertEqual(blanked, [1])
                if code == 1:
                    self.assertIn('19', said[-1])
                    self.assertIn('23', said[-1])

    def test_firmware_does_not_drive_respeaker_leds(self):
        # a ReSpeaker APA102 LED-jei a spidev0.1-en: csak a diagnosztika nyúlhat hozzájuk (kikapcsolásra)
        for f in os.listdir(os.path.join(PI, 'ckocka')):
            if f.endswith('.py') and f != 'diag.py':
                src = read(PI, 'ckocka', f).replace(' ', '')
                if 'SpiDev(' in src:                                 # csak a kijelző tartaléka: spidev0.0 (CE0)
                    self.assertEqual(f, 'hw_real.py')
                    self.assertIn('spi_dev=0', src)
                for bad in ('open(0,1)', 'spi_dev=1', 'device=1'):
                    self.assertNotIn(bad, src, f)


# ============================================================================ 3. Pi-Ener-lite
class PowerPolicyTest(unittest.TestCase):
    def feed(self, seq, **kw):
        pol = power.PowerPolicy(**kw)
        return [pol.update(ext, soc) for ext, soc in seq]

    def test_shutdown_needs_confirmations_without_ext_power(self):
        acts = self.feed([(False, 40), (False, 4), (False, 4), (False, 4), (False, 3)])
        self.assertEqual(acts[1:4], [['warn'], [], ['shutdown']])
        self.assertEqual(acts[4], [], 'egyszer állít le')

    def test_glitch_resets_counter(self):
        acts = self.feed([(False, 4), (False, 4), (False, 6), (False, 4), (False, 4)])
        self.assertNotIn('shutdown', sum(acts, []))

    def test_never_shuts_down_on_ext_power_or_unknown(self):
        acts = self.feed([(True, 1)] * 5 + [(False, None)] * 5 + [(None, None)] * 5)
        self.assertNotIn('shutdown', sum(acts, []))

    def test_warn_once_rearm_after_charging(self):
        acts = sum(self.feed([(False, 14), (False, 13), (True, 13), (False, 12)]), [])
        self.assertEqual(acts.count('warn'), 2)

    def test_eco_while_charging(self):
        acts = self.feed([(False, 50), (True, 50), (True, 80), (True, 99.5), (True, 60), (False, 60)])
        self.assertEqual(acts, [[], ['eco_on'], [], ['eco_off'], ['eco_on'], ['eco_off']])

    def test_constants(self):
        self.assertEqual((power.SHUTDOWN_SOC, power.EXT_POWER_GPIO, power.CW2015_ADDR), (5.0, 4, 0x62))


class FakeBus:
    def __init__(self, regs):
        self.regs, self.writes = regs, []

    def write_byte_data(self, addr, reg, v):
        self.writes.append((addr, reg, v))

    def read_i2c_block_data(self, addr, reg, n):
        assert addr == 0x62
        return self.regs[reg][:n]


class Cw2015Test(unittest.TestCase):
    def test_read(self):
        bus = FakeBus({0x04: [50, 128], 0x02: [0x33, 0x33]})
        g = power.CW2015(bus)
        self.assertEqual(bus.writes, [(0x62, 0x0A, 0x00)])       # ébresztés
        self.assertAlmostEqual(g.soc(), 50.5)
        self.assertAlmostEqual(g.vcell(), 0x3333 * 305e-6)      # ≈ 4,0 V
        self.assertTrue(3.9 < g.vcell() < 4.0)

    def test_monitor(self):
        pin = type('Pin', (), {'is_active': True})()
        m = power.PowerMonitor(pin, power.CW2015(FakeBus({0x04: [7, 0], 0x02: [0x2E, 0x00]})))
        ext, soc, volt = m.read()
        self.assertEqual((ext, soc), (True, 7.0))


class FakeMonitor:
    def __init__(self, seq):
        self.seq = list(seq)

    def read(self):
        return self.seq.pop(0) if len(self.seq) > 1 else self.seq[0]


class FakeCube:
    def __init__(self):
        self.calls = []

    def set_eco(self, on):
        self.calls.append(('eco', on))

    def emit(self, type_, **d):
        self.calls.append((type_, d))

    def battery_shutdown(self):
        self.calls.append(('bye',))


class PowerGuardTest(unittest.TestCase):
    def test_guard_shuts_down_once(self):
        cube, shut = FakeCube(), []
        mon = FakeMonitor([(True, 50, 3.9), (False, 14, 3.6), (False, 4, 3.4), (False, 4, 3.4), (False, 4, 3.3)])

        async def t():
            await asyncio.wait_for(power.guard(cube, mon, shutdown=lambda: shut.append(1), interval=0, goodbye=0), 5)
        with self.assertLogs('ckocka.power', 'WARNING'):
            asyncio.run(t())
        self.assertEqual(shut, [1])
        kinds = [c[0] for c in cube.calls]
        self.assertEqual(kinds, ['eco', 'eco', 'battery', 'battery', 'bye'])
        self.assertTrue(cube.calls[3][1]['shutdown'])

    def test_cube_eco_and_goodbye(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)
        cube = Cube(hw, settings=False)
        cube.s.on, cube.s.bright = True, 0.8
        cube.set_eco(True)
        self.assertEqual(hw.mcu.sent[-1]['bright'], 0.4)
        cube.set_eco(False)
        self.assertEqual(hw.mcu.sent[-1]['bright'], 0.8)
        cube.battery_shutdown()
        self.assertEqual((cube.face.text, cube.s.on, hw.mcu.sent[-1]['mode']), ('LOW BATTERY', False, 'off'))

    def test_sim_has_no_power_guard(self):
        self.assertIsNone(hw_sim.make(VOICE, None).power)


# ============================================================================ 2–3. install.sh
class InstallCompatTest(unittest.TestCase):
    def setUp(self):
        self.sh = read(PI, 'install.sh')

    def test_respeaker_v2_overlay_built_and_enabled(self):
        self.assertIn('seeed-linux-dtoverlays', self.sh)
        self.assertIn('OVL=respeaker-2mic-v2_0', self.sh)
        self.assertIn('install -m 644 "$SRC/overlays/rpi/$OVL-overlay.dtbo" "$OVERLAYS/$OVL.dtbo"', self.sh)
        self.assertIn('[ -f "$CONFIG" ] || CONFIG=/boot/config.txt', self.sh)    # /boot/firmware/overlays/ az alap
        self.assertIn('echo "dtoverlay=$OVL" >> "$CONFIG"', self.sh)

    def test_display_ups_and_shutdown_setup(self):
        for want in ("sed -i '/^dtoverlay=gc9a01/d'", 'panel.py" --firmware /lib/firmware/gc9a01.bin',
                     'panel.py" --config', 'dtparam=i2c_arm=on', 'dtoverlay=i2c-rtc,ds1307',
                     '/usr/sbin/shutdown -h now', 'visudo -cf', 'python3-smbus'):
            self.assertIn(want, self.sh)
        self.assertEqual(power.SHUTDOWN_CMD[-3:], ['/usr/sbin/shutdown', '-h', 'now'])   # pont azt, amit a sudoers enged

    @unittest.skipUnless(shutil.which('sh') and shutil.which('awk'), 'nincs sh/awk')
    def test_config_block_is_idempotent(self):
        start = self.sh.index('config_block() {')
        func = self.sh[start:self.sh.index('\n}\n', start) + 3]
        with tempfile.TemporaryDirectory() as d:
            cfg = os.path.join(d, 'config.txt')
            with open(cfg, 'w', newline='\n') as f:
                f.write('[pi4]\narm_boost=1\n[all]\ndtparam=audio=on\n')
            script = func + 'REBOOT=0\nconfig_block display <<EOF\ndtparam=spi=on\nEOF\necho "R=$REBOOT"\n'
            env = dict(os.environ, CONFIG=cfg.replace('\\', '/'))
            runs = [subprocess.run(['sh', '-c', script], env=env, capture_output=True, text=True, check=True).stdout
                    for _ in range(2)]
            self.assertEqual([r.strip() for r in runs], ['R=1', 'R=0'])       # másodszor nincs változás
            with open(cfg) as f:
                text = f.read()
            self.assertEqual(text.count('# ckocka-display begin'), 1)
            self.assertIn('# ckocka-display begin\n[all]\ndtparam=spi=on\n# ckocka-display end\n', text)
            self.assertTrue(text.startswith('[pi4]\narm_boost=1\n[all]\ndtparam=audio=on\n'))
            self.assertTrue(os.path.exists(cfg + '.ckocka.bak'))


if __name__ == '__main__':
    unittest.main()
