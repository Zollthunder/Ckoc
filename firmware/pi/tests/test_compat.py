"""A kompatibilitás-ellenőrzés (KOMPATIBILITAS.md, 2026-11-17) és az azt követő döntések tesztjei – hardver nélkül.
  * ReSpeaker v2.0 overlay fordítása és beírása                                   (install.sh)
  * Pi-Ener-lite: GPIO4, CW2015, biztonságos leállás, alvás töltés közben         (ckocka/power.py, brain.py)
  * XIAO: lábtábla (mind a 11 láb), touchio-hiba és hiányzó IMU barátságosan       (firmware/xiao/code.py)
  * WS2812: összesen ≤ 30 % fényerő, alvás közben ≤ 8 %; a 31 LED egy láncban a NeoDriveren
  * a XIAO USB-n (CDC) a Pi-hez – szimulált soros vonallal
  (A kijelző és az arc tesztjei: test_face_xiao.py)
Futtatás (a firmware/pi mappából):  python -m unittest discover -s tests -v
"""
import asyncio, os, shutil, subprocess, sys, tempfile, unittest
import time as _real_time
import unittest.mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('CKOCKA_HOME', tempfile.mkdtemp())

from test_hardware import FakeXiao, read, reflex, PI, XIAO as XIAO_DIR   # noqa: E402
from ckocka import diag, hw_real, hw_sim, power                # noqa: E402
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
        self.assertLess(fx.strip.brightness, 1.0)

    def test_dim_request_untouched(self):
        fx = self.run_leds(0.2, 'solid', 60)
        self.assertEqual(fx.strip.brightness, 1.0)              # a kis fényerőt nem csökkenti tovább


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
        self.assertIn('D7', fx.console)
        self.assertEqual(fx.out[0]['touch'], 'digital')
        self.assertEqual(fx.step, 200)
        self.assertEqual(fx.pins['D7'].pull, 2, 'belső lehúzás: lebegő bemenet ne adjon hamis érintést')

    def test_touchio_ok_no_warning(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=20).run()
        self.assertNotIn('FIGYELEM: az érintés', fx.console)


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

    def test_charging_follows_ext_power(self):
        acts = self.feed([(False, 50), (True, 50), (True, 100), (None, 100), (False, 99)])
        self.assertEqual(acts, [[], ['charge_on'], [], [], ['charge_off']])

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

    def set_charging(self, on):
        self.calls.append(('charge', on))

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
        self.assertEqual(kinds, ['charge', 'charge', 'battery', 'battery', 'bye'])
        self.assertTrue(cube.calls[3][1]['shutdown'])

    def test_cube_goodbye(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)
        cube = Cube(hw, settings=False)
        cube.s.on, cube.s.bright = True, 0.8
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

    def test_ups_and_shutdown_setup(self):
        for want in ('dtparam=i2c_arm=on', 'dtoverlay=i2c-rtc,ds1307', '/usr/sbin/shutdown -h now', 'visudo -cf',
                     'python3-smbus', 'usermod -aG dialout pi'):
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
            # egy korábbi telepítés kijelző-blokkja kikerül (a kijelzőt már a XIAO hajtja)
            start = self.sh.index('config_unblock() {')
            unblock = self.sh[start:self.sh.index('\n}\n', start) + 3]
            out = subprocess.run(['sh', '-c', unblock + 'REBOOT=0\nconfig_unblock display\nconfig_unblock uart\necho "R=$REBOOT"\n'],
                                 env=env, capture_output=True, text=True, check=True).stdout
            self.assertEqual(out.strip(), 'R=1')
            with open(cfg) as f:
                self.assertEqual(f.read(), '[pi4]\narm_boost=1\n[all]\ndtparam=audio=on\n')

    def test_no_pi_display_or_uart_left(self):
        code = ' '.join(l for l in self.sh.splitlines() if not l.lstrip().startswith('#'))   # megjegyzések nélkül
        for gone in ('mipi-dbi-spi', 'panel.py', 'enable_uart', 'spidev', 'gc9a01'):
            self.assertNotIn(gone, code)
        self.assertFalse(os.path.exists(os.path.join(PI, 'ckocka', 'panel.py')))
        self.assertNotIn('Display', read(PI, 'ckocka', 'hw_real.py'))


# ============================================================================ XIAO lábtábla és a USB-s soros vonal
class XiaoPinsTest(unittest.TestCase):
    WANT = {'motor': 'D0', 'buttons': ('D1', 'D2', 'D3', 'D6'), 'touch': 'D7', 'sda': 'D4', 'scl': 'D5',
            'lcd_sck': 'D8', 'lcd_mosi': 'D10', 'lcd_dc': 'D9'}

    def test_pin_table_as_decided(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=5).run()
        self.assertEqual(fx.pwm.pin, 'D0')
        self.assertEqual(sorted(p for p in fx.pins if p != 'D7'), ['D1', 'D2', 'D3', 'D6'])   # gombok
        self.assertIn('D7', FakeXiao(lambda t: 1000, lambda fx: None, pulldown=False, steps=5).run().pins)  # érintés
        self.assertEqual(fx.i2c_args, ('D5', 'D4'))
        self.assertEqual((fx.lcd['clock'], fx.lcd['MOSI'], fx.lcd['command']), ('D8', 'D10', 'D9'))
        used = ['D0', 'D1', 'D2', 'D3', 'D6', 'D7', 'D4', 'D5', 'D8', 'D10', 'D9']
        self.assertEqual(sorted(used), sorted('D%d' % i for i in range(11)))   # mind a 11 foglalt, egyik sem kétszer

    def test_pins_only_in_table(self):
        code = read(XIAO_DIR, 'code.py')
        for line in code.splitlines():
            if 'board.D' in line and not line.lstrip().startswith('#'):
                self.assertTrue(line.startswith("    '"), line)

    def test_buttons_in_order(self):
        # a 4. gomb (D6) lenyomása 'button' 4-et küld
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=60)
        mods = fx.modules
        def modules():
            m = mods()
            orig = m['adafruit_debouncer'].Debouncer

            class D(orig):
                def update(self):
                    if self.io.pin != 'D6':
                        return super().update()
                    v = not (0.4 < fx.t < 0.5)                         # a 4. gomb egyszer lenyomva
                    self.rose, self.fell = (self.state is False and v), (self.state is True and not v)
                    self.state = v
            m['adafruit_debouncer'] = type(m['adafruit_debouncer'])(Debouncer=D)
            return m
        fx.modules = modules
        fx.run()
        self.assertEqual([e['id'] for e in fx.out if e['ev'] == 'button'], [4])

    def test_usb_port_and_commands(self):
        # Pi -> XIAO: a hw_real.SerialMcu.send bájtjai mennek a XIAO USB-s data portjára
        sent = []
        mcu = hw_real.SerialMcu.__new__(hw_real.SerialMcu)
        mcu.ser = type('Ser', (), {'write': lambda self, b: sent.append(b)})()
        mcu.send({'cmd': 'haptic', 'pattern': 'tick'})

        def script(fx):
            if fx.step == 20:
                fx.inbox += b''.join(sent)
        fx = FakeXiao(lambda t: 1000, script, steps=60).run()
        self.assertTrue(any(d > 0 for _, d in fx.duty_log), 'a parancs nem ért át')
        self.assertTrue(fx.wire.startswith(b'{"ev": "hello"'))
        self.assertIn('data=True', read(XIAO_DIR, 'boot.py'))
        self.assertNotIn('UART', read(XIAO_DIR, 'code.py'))


class FakeSerialModule:
    """A pyserial helyett: a Serial() egy szimulált soros vonal, amelyen a XIAO bájtjai jönnek."""

    def __init__(self, rx):
        self.rx, self.opened, self.tx = bytearray(rx), [], []

    def Serial(self, port, baud, timeout=1):
        self.opened.append((port, baud))
        mod = self

        class S:
            @property
            def in_waiting(self):
                return len(mod.rx)

            def read(self, n):
                if not mod.rx:
                    _real_time.sleep(0.01)       # a valódi time: a háttérszál ne a szimulált XIAO óráját léptesse
                    return b''
                b = bytes(mod.rx[:n])
                del mod.rx[:n]
                return b

            def write(self, b):
                mod.tx.append(b)
        return S()


class PiSerialTest(unittest.TestCase):
    def test_default_port_is_xiao_usb(self):
        with unittest.mock.patch.dict(os.environ, {'CKOCKA_XIAO_PORT': ''}), \
                unittest.mock.patch('glob.glob', side_effect=lambda pat: ['/dev/serial/by-id/usb-Seeed_XIAO_RP2040-if02']
                                    if 'CircuitPython' not in pat and 'XIAO' in pat else []):
            self.assertEqual(hw_real.find_xiao_port(), '/dev/serial/by-id/usb-Seeed_XIAO_RP2040-if02')
        with unittest.mock.patch.dict(os.environ, {'CKOCKA_XIAO_PORT': '/dev/ttyACM5'}):
            self.assertEqual(hw_real.find_xiao_port(), '/dev/ttyACM5')

    def test_xiao_events_reach_the_pi(self):
        # a szimulált XIAO valódi kimenete (hello + érintés), darabokra törve és zajjal, a Pi olvasóján át
        fx = FakeXiao(lambda t: 2400 if 1.0 <= t < 1.4 else 1000, lambda fx: None, steps=200).run()
        fake = FakeSerialModule(b'\x00\xffzaj\n' + fx.wire)

        async def t():
            with unittest.mock.patch.dict(sys.modules, {'serial': fake}), \
                    unittest.mock.patch.dict(os.environ, {'CKOCKA_XIAO_PORT': '/dev/ttyACM1'}):
                mcu = hw_real.SerialMcu()
                evs = [await asyncio.wait_for(mcu.events.get(), 3) for _ in range(2)]
                mcu.send({'cmd': 'beat'})
                return evs
        evs = asyncio.run(t())
        self.assertEqual(fake.opened[0], ('/dev/ttyACM1', 115200))
        self.assertEqual([e['ev'] for e in evs], ['hello', 'touch'])
        self.assertEqual(evs[0]['fw'], '1.4')
        self.assertEqual(fake.tx, [b'{"cmd":"beat"}\n'])



# ============================================================================ alvás töltés közben (HOKEZELES.md 7.5)
class ChargingSleepTest(unittest.TestCase):
    def make(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)
        cube = Cube(hw, settings=False)
        cube.s.on = True
        return cube, hw

    def test_sleeps_after_awake_window(self):
        cube, hw = self.make()
        with unittest.mock.patch.object(power, 'CHARGE_AWAKE', 0.0):
            cube.set_charging(True)
            self.assertFalse(cube.sleeping)

            async def t():
                task = asyncio.ensure_future(cube.charge_loop(period=0.01))
                await asyncio.sleep(0.05)
                task.cancel()
            asyncio.run(t())
        self.assertTrue(cube.sleeping)
        leds = [m for m in hw.mcu.sent if m.get('cmd') == 'leds'][-1]
        self.assertEqual((leds['mode'], leds['budget']), ('dim', 0.08))     # LED ≤ 8 %
        self.assertFalse(hw.camera.enabled)                                  # a kamera szünetel
        self.assertEqual(cube.face_msg()['mode'], 'sleep')                   # az arc kialszik

    def test_awake_window_is_15_minutes(self):
        cube, hw = self.make()
        self.assertEqual(power.CHARGE_AWAKE, 15 * 60)
        cube.set_charging(True)
        self.assertAlmostEqual(cube._awake_until - __import__('time').monotonic(), 900, delta=2)

    def test_does_not_sleep_while_busy(self):
        cube, hw = self.make()
        with unittest.mock.patch.object(power, 'CHARGE_AWAKE', 0.0):
            cube.set_charging(True)
            cube.s.busy = True

            async def t():
                task = asyncio.ensure_future(cube.charge_loop(period=0.01))
                await asyncio.sleep(0.05)
                task.cancel()
            asyncio.run(t())
        self.assertFalse(cube.sleeping)

    def test_wakes_on_touch_app_or_unplug(self):
        for how in ('button', 'app', 'unplug'):
            with self.subTest(how=how):
                cube, hw = self.make()
                cube.set_charging(True)
                cube.go_sleep()
                self.assertTrue(cube.sleeping)

                async def t():
                    if how == 'button':
                        await cube.on_mcu({'ev': 'button', 'id': 2})
                    elif how == 'app':
                        await cube.command_json('{"type":"led.color","data":{"hue":120}}')
                    else:
                        cube.set_charging(False)
                asyncio.run(t())
                self.assertFalse(cube.sleeping)
                self.assertTrue(hw.camera.enabled)
                self.assertEqual([m for m in hw.mcu.sent if m.get('cmd') == 'leds'][-1]['budget'], 0.3)

    def test_xiao_caps_led_budget(self):
        def script(fx):
            if fx.step == 2:
                fx.send({'cmd': 'leds', 'hue': 60, 'bright': 1.0, 'mode': 'solid', 'budget': 0.08})
            if fx.step == 60:
                fx.send({'cmd': 'leds', 'hue': 60, 'bright': 1.0, 'mode': 'solid', 'budget': 0.9})   # 30 % fölé nem
        fx = FakeXiao(lambda t: 1000, script, steps=50).run()
        self.assertLessEqual(fx.led_max, 0.08 * 31 * 765 * 1.01)
        fx = FakeXiao(lambda t: 1000, script, steps=120).run()
        self.assertLessEqual(fx.led_max, LED_LIMIT * 1.01)
        self.assertEqual(reflex.SLEEP_BUDGET, power.SLEEP_LED_BUDGET)


# ============================================================================ B. LED-ek: Adafruit NeoDriver (seesaw)
class NeoDriverTest(unittest.TestCase):
    def run_leds(self, script=None, **kw):
        def s(fx):
            if fx.step == 2:
                fx.send({'cmd': 'leds', 'hue': 60, 'bright': 1.0, 'mode': 'solid'})
                fx.send({'cmd': 'camled', 'on': True})
        fx = FakeXiao(lambda t: 1000, script or s, steps=100)
        for k, v in kw.items():
            setattr(fx, k, v)
        return fx.run()

    def test_one_chain_of_31_on_neodriver(self):
        fx = self.run_leds()
        self.assertEqual((fx.strip.ss.addr, fx.strip.pin, len(fx.strip)), (0x60, 15, 31))
        self.assertFalse(fx.strip.auto_write)
        self.assertEqual(fx.i2c_hz, 400000)
        self.assertEqual(fx.strip[30], (0, 160, 40))                   # kamera-jelzőfény: a C-szalag utolsó LED-je
        self.assertEqual(fx.strip[0], fx.strip[23])                    # a gyűrű 0–23
        self.assertTrue(fx.out[0]['leds'])
        self.assertLessEqual(fx.led_max, LED_LIMIT * 1.01)

    def test_led_refresh_throttled(self):
        fx = self.run_leds()
        self.assertLess(fx.led_shows, 100 * 0.012 / 0.02 + 2)          # ~50 Hz, nem minden körben (I2C-idő)

    def test_missing_neodriver_keeps_running(self):
        fx = self.run_leds(neodriver_missing=True)
        self.assertFalse(fx.out[0]['leds'])
        self.assertIn('nincs NeoDriver', fx.console)
        self.assertEqual(fx.step, 100)


if __name__ == '__main__':
    unittest.main()
