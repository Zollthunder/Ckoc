"""A C-kocka szoftverének tesztjei – hardver nélkül, szimulált hardverrel.
Futtatás (a firmware/pi mappából):  python -m unittest discover -s tests -v
"""
import asyncio, json, os, sys, tempfile, unittest
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ['CKOCKA_HOME'] = tempfile.mkdtemp()

from ckocka import protocol, state, hw_sim                    # noqa: E402
from ckocka.brain import Cube, JokeBag                         # noqa: E402
from ckocka.face import FaceRenderer, FaceState                # noqa: E402

VOICE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'web', 'voice'))


def run(coro):
    return asyncio.run(coro)


class ProtocolTest(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(protocol.parse_command('{"type":"persona.set","data":{"name":"hype"}}'), ('persona.set', {'name': 'hype'}))
        self.assertEqual(protocol.parse_command({'type': 'persona.custom', 'data': {'humor': 10}})[0], 'persona.custom')

    def test_invalid(self):
        for raw in ('nem json', '{"type":"hack"}', '{"type":"led.color","data":{"hue":999}}',
                    '{"type":"persona.set","data":{}}', '{"type":"button.assign","data":{"button":1,"sound":"horn"}}'):
            with self.assertRaises(protocol.ProtocolError, msg=raw):
                protocol.parse_command(raw)


class JokeBagTest(unittest.TestCase):
    def test_no_repeat_until_all_told(self):
        bag, seq = JokeBag(25), []
        for _ in range(25 * 4):
            seq.append(bag.next())
        for r in range(4):
            self.assertEqual(sorted(seq[r * 25:(r + 1) * 25]), list(range(1, 26)))
        self.assertFalse(any(a == b for a, b in zip(seq, seq[1:])), 'kétszer egymás után ugyanaz')


class StateTest(unittest.TestCase):
    def test_since_text(self):
        self.assertEqual(state.since_text(1000, 1000 + 3 * 3600 + 5 * 60 + 7), '3 hours, 5 minutes and 7 seconds')

    def test_custom_persona(self):
        s = state.State(persona='custom')
        s.sliders['sarcasm'] = 90
        self.assertEqual(s.base_persona(), 'sarcastic')

    def test_save_load(self):
        s = state.State(nick='Zollo', hue=187)
        state.save(s)
        self.assertEqual(state.load(state.State()).nick, 'Zollo')


class FaceTest(unittest.TestCase):
    def test_all_modes_render(self):
        r = FaceRenderer()
        for mode in ('off', 'face', 'listen', 'dizzy', 'text', 'eq', 'privacy', 'dnd', 'call'):
            img = r.render(FaceState(mode=mode, text='YES', caller='BRO'), 1.0)
            self.assertEqual(img.size, (240, 240))


class CubeTest(unittest.TestCase):
    def make(self):
        hw = hw_sim.make(VOICE, None, speed=0.02)                 # a mondatok 50× gyorsabban „szólnak”
        cube = Cube(hw, settings=False)
        hw.camera.enable(False)                                   # a leskelődés ne zavarja a teszteket
        return cube, hw

    def test_boot_and_joke(self):
        async def t():
            cube, hw = self.make()
            cube.start()
            await cube.on_mcu({'ev': 'button', 'id': 3})          # bármely gomb bekapcsol
            self.assertTrue(cube.s.on)
            self.assertEqual(hw.audio.played[:3], ['boot1.mp3', 'boot2.mp3', 'boot3.mp3'])
            task = asyncio.ensure_future(cube.on_mcu({'ev': 'button', 'id': 1}))
            await asyncio.sleep(0.01)
            await cube.on_mcu({'ev': 'button', 'id': 1})          # vicc közben: ki kell hagynia
            await task
            jokes = [p for p in hw.audio.played if p.startswith('joke_')]
            self.assertEqual(len(jokes), 2, jokes)                 # pontosan egy vicc: kérdés + csattanó
            self.assertEqual(jokes[0][:-6], jokes[1][:-6])         # ugyanannak a viccnek a q/a párja
            cube.stop()
        run(t())

    def test_flip_privacy(self):
        async def t():
            cube, hw = self.make()
            await cube.boot()
            await cube.command('mode.party', {'on': True})
            self.assertTrue(cube.s.party)
            await cube.on_mcu({'ev': 'imu', 'kind': 'flip', 'up': True})
            self.assertTrue(cube.s.upside_down)
            self.assertFalse(cube.s.party)                         # fordításra a party leáll
            self.assertFalse(hw.camera.enabled)                    # és a kamera kikapcsol
            self.assertEqual(cube.face.mode, 'privacy')
            n = len(hw.audio.played)
            await cube.on_mcu({'ev': 'button', 'id': 1})           # fejjel lefelé nem beszél
            self.assertEqual(len(hw.audio.played), n)
            cube.stop()
        run(t())

    def test_dnd_only_buzzes(self):
        async def t():
            cube, hw = self.make()
            await cube.boot()
            await cube.command('mode.dnd', {'on': True})
            n = len(hw.audio.played)
            await cube.on_mcu({'ev': 'button', 'id': 1})
            self.assertEqual(len(hw.audio.played), n)
            self.assertIn({'cmd': 'haptic', 'pattern': 'buzz'}, hw.mcu.sent)
            self.assertEqual(hw.mcu.sent[-2]['mode'] if hw.mcu.sent[-1].get('cmd') == 'haptic' else hw.mcu.sent[-1]['mode'], 'dim')
            cube.stop()
        run(t())

    def test_commands_and_events(self):
        async def t():
            cube, hw = self.make()
            got = []
            cube.listeners.append(got.append)
            await cube.boot()
            self.assertFalse((await cube.command_json('{"type":"led.color","data":{"hue":999}}'))['ok'])
            await cube.command('led.color', {'hue': 150})
            self.assertEqual(hw.mcu.sent[-1], {'cmd': 'leds', 'hue': 150, 'bright': 0.8, 'mode': 'solid'})
            await cube.on_mcu({'ev': 'imu', 'kind': 'throw'})
            types = Counter(json.loads(m)['type'] for m in got)
            self.assertGreaterEqual(types['event.throw'], 1)
            self.assertGreaterEqual(types['state'], 1)
            cube.stop()
        run(t())


if __name__ == '__main__':
    unittest.main()
