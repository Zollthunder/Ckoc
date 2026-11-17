"""A kerek kijelző és az arc tesztjei – hardver nélkül.
  * firmware/xiao/faces.py: az arc képkockái (vektoros alakzatok), Pillow-val kirajzolva és megvizsgálva
  * firmware/xiao/code.py: a GC9A01 indítása (D8 SCK, D10 MOSI, D9 DC, CS és RST nélkül, szoftveres reset) és az
    alakzatok frissítése szimulált displayio-val
  * brain.Cube: a Pi csak az állapotot küldi (face / talk), változáskor
A képek megnézhetők:  CKOCKA_FACE_PNG=out python -m unittest tests.test_face_xiao   (a firmware/pi mappából)
Futtatás:  python -m unittest discover -s tests -v
"""
import asyncio, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('CKOCKA_HOME', tempfile.mkdtemp())

from test_hardware import FakeXiao, read, XIAO                 # noqa: E402
import faces                                                   # noqa: E402  (firmware/xiao/faces.py)
from ckocka import hw_sim                                      # noqa: E402
from ckocka.brain import Cube                                  # noqa: E402

from PIL import Image, ImageDraw                               # noqa: E402

VOICE = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'web', 'voice'))
PNG_DIR = os.environ.get('CKOCKA_FACE_PNG')


def render(fr):
    """Egy faces.Face képkocka kirajzolása (ugyanazok az alakzatok, amiket a XIAO displayio-val rajzol)."""
    img = Image.new('RGB', (240, 240), faces.BG)
    d = ImageDraw.Draw(img)
    for spec in fr['bars'] + fr['polys']:
        if spec:
            d.polygon(spec[0], fill=spec[1])
    for spec in fr['dots']:
        if spec:
            x, y, r, c = spec
            d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    return img


def lit(img, box):
    """Hány „világító” (nem háttér) képpont van a dobozban."""
    reg = img.crop(box)
    return sum(1 for p in reg.getdata() if sum(p) > 60)


def face(mode='face', **kw):
    f = faces.Face(rnd=__import__('random').Random(3))
    f.set(dict(mode=mode, **kw))
    f._next_blink = 99                                          # a tesztben ne pislogjon véletlenül
    return f


def save(name, img):
    if PNG_DIR:
        os.makedirs(PNG_DIR, exist_ok=True)
        img.save(os.path.join(PNG_DIR, name + '.png'))


class FaceFramesTest(unittest.TestCase):
    def test_slot_counts_fixed_for_every_mode(self):
        for mode in faces.MODES:
            for persona in faces.EYE:
                with self.subTest(mode=mode, persona=persona):
                    fr = face(mode, persona=persona, text='YES', sub='Obviously.', caller='BRO').frame(1.0)
                    self.assertEqual([len(fr[k]) for k in ('polys', 'bars', 'dots', 'texts')],
                                     [faces.N_POLY, faces.N_BAR, faces.N_DOT, faces.N_TEXT])
                    for spec in fr['polys'] + fr['bars']:
                        if spec:
                            self.assertGreaterEqual(len(spec[0]), 3)
                            for x, y in spec[0]:
                                self.assertTrue(-5 <= x <= 245 and -5 <= y <= 245, (mode, x, y))
                    save('%s_%s' % (mode, persona), render(fr))

    def test_off_and_sleep_are_dark(self):
        for mode in ('off', 'sleep'):
            fr = face(mode).frame(1.0)
            self.assertEqual(lit(render(fr), (0, 0, 240, 240)), 0)
            self.assertEqual(fr['texts'], [None, None])

    def test_idle_face_two_eyes_and_smile(self):
        img = render(face('face').frame(1.0))
        self.assertGreater(lit(img, (66, 77, 96, 111)), 300)       # bal szem
        self.assertGreater(lit(img, (144, 77, 174, 111)), 300)     # jobb szem
        self.assertGreater(lit(img, (95, 130, 145, 165)), 80)      # mosoly
        self.assertEqual(lit(img, (0, 0, 40, 40)), 0)              # a sarok (a kerek kijelzőn kívül) sötét

    def test_talking_mouth_follows_level(self):
        f = face('face')
        sizes = []
        for v in (0.0, 0.3, 0.9):
            f.talk(v, 1.0)
            sizes.append(lit(render(f.frame(1.0)), (90, 120, 150, 180)))
        self.assertLess(sizes[1], sizes[2])
        f.talk(0.9, 1.0)
        f.frame(1.0)
        quiet = render(f.frame(1.5))                               # 0,4 s „talk” nélkül: a száj becsukódik
        self.assertEqual(f.level, 0.0)
        self.assertLess(lit(quiet, (90, 120, 150, 180)), sizes[2])

    def test_blink(self):
        f = face('face')
        f._next_blink = 0.0
        f.frame(0.0)
        opens = []
        for k in range(1, 12):
            fr = f.frame(k * 0.02)
            opens.append(lit(render(fr), (66, 60, 96, 120)))
        self.assertLess(min(opens), max(opens) * 0.3)             # közben majdnem becsukódik…
        self.assertGreater(opens[-1], max(opens) * 0.9)            # …majd újra nyitva

    def test_personas_per_design(self):
        eye_h = {}
        for p in ('sunny', 'chill', 'hype', 'sarcastic', 'pro'):
            fr = face('face', persona=p).frame(1.0)
            ys = [y for _, y in fr['polys'][0][0]]
            eye_h[p] = max(ys) - min(ys)
            self.assertEqual(fr['polys'][3] is not None, p == 'sarcastic')   # szemöldök csak a Sarcastic-nál
        self.assertLess(eye_h['chill'], eye_h['sunny'] * 0.6)    # félig lehunyt szemek
        self.assertGreater(eye_h['hype'], eye_h['sunny'])        # tágra nyílt szemek
        r = face('face', persona='sarcastic').frame(1.0)['polys']
        h = [max(y for _, y in r[i][0]) - min(y for _, y in r[i][0]) for i in (0, 1)]
        self.assertLess(h[1], h[0])                               # az egyik szem hunyorít

    def test_states(self):
        lis = face('listen').frame(1.0)
        self.assertEqual(sum(1 for d in lis['dots'] if d), 3)
        th = face('think').frame(1.0)
        self.assertEqual(sum(1 for d in th['dots'] if d), 3)
        self.assertLess(max(y for _, y in th['polys'][0][0]), max(y for _, y in face().frame(1.0)['polys'][0][0]))   # felfelé néz
        dz = face('dizzy').frame(1.0)
        self.assertGreaterEqual(sum(1 for d in dz['dots'] if d), 16)                     # spirál alakú szemek
        self.assertNotEqual(dz['dots'][0][:2], face('dizzy').frame(1.1)['dots'][0][:2])   # forog
        peek = face('face', peek=True).frame(1.0)['polys'][0][0]
        self.assertLess(max(y for _, y in peek) - min(y for _, y in peek), 25)          # leskelődik: résnyire nyitott szem
        grin = face('face', mouth='grin').frame(1.0)
        self.assertEqual(grin['dots'][-1][3], (255, 255, 255))                         # felragyog: csillogás

    def test_text_and_call_fit(self):
        for text in ('YES', 'NO', 'GO!', '...', '14:05', 'LOW BATTERY'):
            fr = face('text', text=text, sub='shutting down', color=[92, 242, 138]).frame(1.0)
            t, y, scale, col = fr['texts'][0]
            self.assertEqual(t, text)
            self.assertLessEqual(len(text) * 6 * scale, 210)       # elfér a kerek kijelzőn
            self.assertEqual(col, (92, 242, 138))
            self.assertEqual(fr['texts'][1][0], 'shutting down')
        fr = face('call', caller='BRO', live=True).frame(1.0)
        self.assertEqual([t[0] for t in fr['texts']], ['BRO', 'speakerphone'])

    def test_eq_bars_jump_on_beat(self):
        f = face('eq')
        before = render(f.frame(1.0))
        f.beat()
        after = render(f.frame(1.01))
        self.assertGreater(lit(after, (30, 40, 210, 160)), lit(before, (30, 40, 210, 160)))
        self.assertEqual(sum(1 for b in f.frame(1.02)['bars'] if b), 9)

    def test_bad_input_is_safe(self):
        f = faces.Face()
        f.set({'mode': 'nonsense', 'mouth': 'x', 'persona': 'y', 'look': [9, -9], 'text': 'A' * 100})
        self.assertEqual((f.mode, f.mouth, f.persona, f.look), ('face', 'smile', 'sunny', (1.0, -1.0)))
        self.assertLessEqual(len(f.text), 24)
        f.frame(1.0)


# ============================================================================ a code.py a szimulált kijelzővel
class XiaoDisplayTest(unittest.TestCase):
    def test_display_init_without_reset_and_cs(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=10).run()
        self.assertEqual((fx.lcd['clock'], fx.lcd['MOSI'], fx.lcd['command']), ('D8', 'D10', 'D9'))
        self.assertIsNone(fx.lcd['chip_select'])                  # a CS a GND-n
        self.assertIsNone(fx.lcd['reset'])                        # a RST 3,3 V-on
        self.assertEqual(fx.lcd_cmds[0], (0x01, b''))             # szoftveres reset a GC9A01A init-sora előtt
        self.assertEqual((fx.display.width, fx.display.height), (240, 240))
        self.assertIsNotNone(fx.display.root_group)
        self.assertTrue(fx.out[0]['display'])
        self.assertIn('fourwire', read(XIAO, 'code.py'))          # CircuitPython 9: fourwire.FourWire

    def test_memory_light(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=10).run()
        # nincs képkocka-puffer: csak néhány vektoros alakzat (+ 2 felirat)
        self.assertLessEqual(fx.shapes_made, 1 + faces.N_POLY + faces.N_BAR + faces.N_DOT)
        self.assertNotIn('Bitmap(240', read(XIAO, 'code.py'))

    def run_face(self, msgs, steps=60, snap=(59,)):
        def script(fx):
            for at, m in msgs:
                if fx.step == at:
                    fx.send(m)
        fx = FakeXiao(lambda t: 1000, script, steps=steps)
        fx.snap_at = snap
        return fx.run()

    def test_face_command_draws_face(self):
        fx = self.run_face([(2, {'cmd': 'face', 'mode': 'face', 'persona': 'sunny'})])
        img, texts = fx.snapshots[59]
        save('xiao_face', img)
        self.assertGreater(lit(img, (66, 77, 96, 111)), 300)
        self.assertGreater(lit(img, (144, 77, 174, 111)), 300)
        self.assertEqual(texts, [])

    def test_off_by_default_and_text(self):
        fx = self.run_face([], steps=20, snap=(19,))
        self.assertEqual(lit(fx.snapshots[19][0], (0, 0, 240, 240)), 0)   # amíg a Pi nem szól: sötét
        fx = self.run_face([(2, {'cmd': 'face', 'mode': 'text', 'text': 'YES', 'sub': 'Obviously.',
                                 'color': [92, 242, 138]})])
        self.assertEqual(fx.snapshots[59][1], ['YES', 'Obviously.'])

    def test_talk_opens_mouth_on_xiao(self):
        base = [(2, {'cmd': 'face', 'mode': 'face'})]
        quiet = self.run_face(base).snapshots[59][0]
        loud = self.run_face(base + [(50, {'cmd': 'talk', 'v': 0.9})]).snapshots[59][0]
        save('xiao_talk', loud)
        self.assertGreater(lit(loud, (90, 135, 150, 180)), lit(quiet, (90, 135, 150, 180)) + 100)

    def test_display_failure_keeps_running(self):
        fx = FakeXiao(lambda t: 1000, lambda fx: None, steps=40)
        fx.display_fail = 'SCK in use'
        fx.run()
        self.assertFalse(fx.out[0]['display'])
        self.assertIn('kijelző nem indult', fx.console)
        self.assertEqual(fx.step, 40)


# ============================================================================ a Pi: csak állapotot küld
class PiFaceLinkTest(unittest.TestCase):
    def make(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)
        return Cube(hw, settings=False), hw

    def faces_sent(self, hw):
        return [m for m in hw.mcu.sent if m.get('cmd') == 'face']

    def test_sends_only_on_change(self):
        cube, hw = self.make()
        cube.face.mode = 'face'
        for t in range(5):
            cube.sync_face(t * 0.1)
        self.assertEqual(len(self.faces_sent(hw)), 1)
        cube.face.mode = 'think'
        cube.sync_face(1.0)
        self.assertEqual([m['mode'] for m in self.faces_sent(hw)], ['face', 'think'])
        for k in ('mouth', 'persona', 'look', 'peek', 'text', 'sub', 'color', 'caller', 'live'):
            self.assertIn(k, self.faces_sent(hw)[-1])

    def test_talk_level_stream(self):
        cube, hw = self.make()
        for i, lvl in enumerate((0.0, 0.4, 0.42, 0.42, 0.42, 0.42, 0.8, 0.0)):
            cube.face.talk_level = lvl
            cube.sync_face(i * 0.1)
        talks = [m['v'] for m in hw.mcu.sent if m.get('cmd') == 'talk']
        self.assertEqual(talks[0], 0.4)
        self.assertEqual(talks[-1], 0.0)                           # a végén becsukja
        self.assertIn(0.8, talks)
        self.assertGreaterEqual(talks.count(0.42), 1)              # változatlan szintnél is frissít 0,25 s-onként

    def test_xiao_restart_gets_face_again(self):
        cube, hw = self.make()
        cube.face.mode = 'face'
        cube.sync_face(0.0)
        asyncio.run(cube.on_mcu({'ev': 'hello', 'fw': '1.4'}))
        cube.sync_face(0.1)
        self.assertEqual(len(self.faces_sent(hw)), 2)

    def test_face_loop_runs_in_sim_and_sends(self):
        cube, hw = self.make()

        async def t():
            cube.start()
            await cube.on_mcu({'ev': 'button', 'id': 3})            # bekapcsol
            await asyncio.sleep(0.3)
            cube.stop()
        asyncio.run(t())
        self.assertTrue(self.faces_sent(hw))
        self.assertGreater(hw.display.count, 0)                     # a szimulációban a face.py is rajzol

    def test_real_hardware_has_no_pi_display(self):
        src = read(HERE, '..', 'ckocka', 'hw_real.py')
        self.assertIn('hal.Hardware(None,', src)


if __name__ == '__main__':
    unittest.main()
