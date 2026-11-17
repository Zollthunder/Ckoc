"""Cat mode tesztjei: macskaarc a XIAO-n és a PC-s előnézetben, dorombolás simogatásra (hang + rezgés), parancs, mentés.
Futtatás (a firmware/pi mappából):  python -m unittest tests.test_cat -v
"""
import os, sys, tempfile, unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
os.environ.setdefault('CKOCKA_HOME', tempfile.mkdtemp())

import numpy as np                                             # noqa: E402
from test_face_xiao import face, render, lit, save             # noqa: E402
import faces, reflex                                           # noqa: E402  (firmware/xiao)
from ckocka import protocol, state, synth, hw_sim              # noqa: E402
from ckocka.brain import Cube                                  # noqa: E402
from ckocka.face import FaceRenderer, FaceState                # noqa: E402
from test_ckocka import run, VOICE                             # noqa: E402


class CatFaceTest(unittest.TestCase):
    def test_cat_frames_fit_the_round_display(self):
        for mode in faces.CAT_MODES:
            with self.subTest(mode=mode):
                fr = face(mode, cat=True).frame(1.0)
                self.assertEqual(len(fr['polys']), faces.N_POLY)
                for spec in fr['polys']:
                    if spec:
                        for x, y in spec[0]:                    # minden pont a kerek kijelzőn belül (r = 120, 3 px tűrés)
                            self.assertLess((x - 120) ** 2 + (y - 120) ** 2, 123 ** 2, (mode, x, y))
                save('cat_' + mode, render(fr))

    def test_cat_has_ears_and_normal_face_has_none(self):
        ears = (60, 22, 100, 54)                                     # a bal fül helye
        self.assertGreater(lit(render(face('face', cat=True).frame(1.0)), ears), 200)
        self.assertEqual(lit(render(face('face').frame(1.0)), ears), 0)

    def test_purr_closes_the_eyes(self):
        eye = (64, 80, 96, 112)                                      # a bal szem közepe
        self.assertGreater(lit(render(face('face', cat=True).frame(1.0)), eye), lit(render(face('purr', cat=True).frame(1.0)), eye) * 2)

    def test_other_modes_unchanged_in_cat_mode(self):
        for mode in ('text', 'dizzy', 'privacy', 'dnd', 'call', 'eq'):
            with self.subTest(mode=mode):
                a = face(mode, text='YES', caller='BRO').frame(1.0)
                b = face(mode, cat=True, text='YES', caller='BRO').frame(1.0)
                self.assertEqual(a['polys'], b['polys'])
                self.assertEqual(a['texts'], b['texts'])

    def test_pc_preview_renders_cat(self):
        r = FaceRenderer()
        for mode in ('face', 'listen', 'think', 'purr'):
            img = r.render(FaceState(mode=mode, cat=True), 1.0)
            self.assertGreater(lit(img, (60, 22, 100, 54)), 200, mode)


class CatSoundTest(unittest.TestCase):
    def test_purr_and_meow(self):
        x = synth.purr()
        self.assertAlmostEqual(len(x) / synth.SR, synth.PURR_LEN, places=2)
        self.assertLessEqual(np.abs(x).max(), 1.0)
        self.assertGreater(np.sqrt((x ** 2).mean()), 0.02)          # hallható
        spec = np.abs(np.fft.rfft(x))
        f = np.fft.rfftfreq(len(x), 1 / synth.SR)
        self.assertGreater(spec[f < 500].sum(), spec[f >= 500].sum() * 3)   # mély hang
        self.assertIn('purr', synth.SFX)
        self.assertIn('meow', synth.SFX)

    def test_haptic_purr_pattern(self):
        steps = reflex.PATTERNS['purr']
        total = sum(length for _, length in steps)
        self.assertAlmostEqual(total, synth.PURR_LEN, delta=0.15)  # ugyanannyi ideig rezeg, mint a hang
        self.assertEqual(steps[0][0], 1.0)                         # rúgással indul (ERM)
        self.assertLess(max(d for d, l in steps if l > 0.1), 0.6)  # halk, nem „Ne zavarj”-erősségű


class CatCubeTest(unittest.TestCase):
    def make(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)
        cube = Cube(hw, settings=False)
        hw.camera.enable(False)
        return cube, hw

    def test_protocol(self):
        self.assertEqual(protocol.parse_command('{"type":"mode.cat","data":{"on":true}}'), ('mode.cat', {'on': True}))
        with self.assertRaises(protocol.ProtocolError):
            protocol.parse_command('{"type":"mode.cat","data":{"on":"igen"}}')

    def test_setting_is_saved(self):
        state.save(state.State(cat=True))
        self.assertTrue(state.load(state.State()).cat)
        self.assertIn('cat', state.State().public())

    def test_touch_purrs_in_cat_mode(self):
        async def t():
            cube, hw = self.make()
            await cube.boot()
            await cube.command('mode.cat', {'on': True})
            self.assertTrue(cube.face_msg()['cat'])
            got = []
            cube.listeners.append(got.append)
            modes = []
            orig = cube.hw.mcu.send
            with mock.patch.object(synth, 'PURR_LEN', 0.05):
                cube.hw.mcu.send = lambda m: (modes.append(cube.face.mode), orig(m))
                await cube.touch()
            self.assertIn({'cmd': 'haptic', 'pattern': 'purr'}, hw.mcu.sent)
            self.assertIn('purr', modes)
            self.assertEqual(cube.face.mode, 'face')               # utána vissza a (macska)arcra
            self.assertTrue(any('"purr"' in m for m in got))
            await cube.command('mode.cat', {'on': False})
            self.assertFalse(cube.face_msg()['cat'])
            cube.stop()
        run(t())

    def test_dnd_beats_cat(self):
        async def t():
            cube, hw = self.make()
            await cube.boot()
            await cube.command('mode.cat', {'on': True})
            await cube.command('mode.dnd', {'on': True})
            await cube.touch()
            self.assertNotIn({'cmd': 'haptic', 'pattern': 'purr'}, hw.mcu.sent)
            self.assertIn({'cmd': 'haptic', 'pattern': 'buzz'}, hw.mcu.sent)
            cube.stop()
        run(t())


if __name__ == '__main__':
    unittest.main()
