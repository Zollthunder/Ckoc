"""A beszélgetés tesztjei – mikrofon, hálózat és API-kulcs nélkül (a Claude API-t egy hamis kliens helyettesíti).
Futtatás (a firmware/pi mappából):  python -m unittest discover -s tests -v
"""
import asyncio, json, os, sys, tempfile, types, unittest, wave

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('CKOCKA_HOME', tempfile.mkdtemp())

from ckocka import claude, hw_sim, state, talk, talk_sim       # noqa: E402
from ckocka.brain import Cube                                   # noqa: E402
from ckocka.face import FaceRenderer, FaceState                 # noqa: E402

VOICE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'web', 'voice'))
SPEED = 0.02

try:
    import anthropic
except ImportError:
    anthropic = None


def run(coro):
    return asyncio.run(coro)


# ------------------------------------------------------------------ hamis Claude-kliens (a hivatalos SDK alakját utánozza)
def block(type_, **kw):
    return types.SimpleNamespace(type=type_, **kw)


def response(*content, stop='end_turn'):
    return types.SimpleNamespace(content=list(content), stop_reason=stop, stop_details=None,
                                 usage=types.SimpleNamespace(input_tokens=120, output_tokens=30))


class FakeClient:
    """client.beta.messages.create(...) – megjegyzi a hívásokat, és a megadott választ (vagy kivételt) adja."""

    def __init__(self, result):
        self.calls, self.result = [], result
        self.beta = types.SimpleNamespace(messages=types.SimpleNamespace(create=self._create))

    async def _create(self, **kw):
        self.calls.append(kw)
        if isinstance(self.result, BaseException):
            raise self.result
        return self.result


# ------------------------------------------------------------------ talk.py: prompt, emlék, kimondható szöveg, csend
class PromptTest(unittest.TestCase):
    def test_each_persona_has_its_prompt(self):
        prompts = set()
        for name in ('sunny', 'chill', 'hype', 'sarcastic', 'pro'):
            p = talk.system_prompt(state.State(persona=name, nick='Zollo'))
            self.assertIn(talk.PERSONAS[name], p)
            self.assertIn('Zollo', p)
            self.assertIn('English', p)
            self.assertIn('no markdown', p)
            prompts.add(p)
        self.assertEqual(len(prompts), 5)

    def test_custom_persona_from_sliders(self):
        s = state.State(persona='custom')
        s.sliders.update(humor=90, energy=10, chatty=5, sarcasm=95, kind=20)
        p = talk.system_prompt(s)
        self.assertIn('Very funny', p)
        self.assertIn('Calm', p)
        self.assertIn('Strongly sarcastic', p)
        self.assertIn('Blunt', p)
        self.assertIn(talk.LENGTH['short'], p)                     # nem beszédes: egy mondat
        s.sliders['chatty'] = 95
        self.assertIn(talk.LENGTH['long'], talk.system_prompt(s))


class SpeakableTest(unittest.TestCase):
    def test_strips_markdown_emoji_links(self):
        t = talk.speakable('**Sure!** 😄 Here:\n- one\n- see [the docs](https://x.y/z) or https://a.b\n# Done')
        self.assertEqual(t, 'Sure! Here: one see the docs or Done')

    def test_long_text_cut_at_sentence(self):
        t = talk.speakable('This is a sentence. ' * 40, limit=100)
        self.assertLessEqual(len(t), 100)
        self.assertTrue(t.endswith('.'))


class EndpointerTest(unittest.TestCase):
    def feed(self, levels, **kw):
        ep = talk.Endpointer(**kw)
        for i, lv in enumerate(levels):
            r = ep.push(lv)
            if r:
                return r, i
        return None, len(levels)

    def test_speech_then_silence(self):
        r, i = self.feed([100] * 5 + [3000] * 15 + [120] * 20)
        self.assertEqual(r, 'done')
        self.assertEqual(i, 5 + 15 + 9)                            # 0,8 s csend = 10 darab (80 ms)

    def test_nobody_speaks(self):
        self.assertEqual(self.feed([100] * 200)[0], 'empty')

    def test_speech_right_away(self):                              # érintés után azonnal beszél: a zajszintet ne a beszédből mérje
        self.assertEqual(self.feed([4000] * 10 + [150] * 15)[0], 'done')

    def test_max_length(self):
        self.assertEqual(self.feed([3000] * 500, max_s=2.0), ('done', 24))

    def test_rms(self):
        self.assertAlmostEqual(talk.rms(b'\x10\x27' * 4), 10000.0)  # 0x2710 = 10000
        self.assertEqual(talk.rms(b''), 0.0)


class DialogTest(unittest.TestCase):
    def test_history_and_resets(self):
        async def t():
            mind, d, s = talk_sim.SimMind(), talk.Dialog(), state.State(persona='hype')
            await d.ask(mind, s, 'hi', now=1000, clock='10:00')
            await d.ask(mind, s, 'again', now=1010, clock='10:00')
            sysm, msgs = mind.calls[-1]
            self.assertIn(talk.PERSONAS['hype'], sysm)
            self.assertEqual([m['role'] for m in msgs], ['user', 'assistant', 'user'])
            self.assertEqual(msgs[0]['content'], '[10:00] hi')
            s.persona = 'chill'                                    # új személyiség: új beszélgetés
            await d.ask(mind, s, 'x', now=1020)
            self.assertEqual(len(mind.calls[-1][1]), 1)
            await d.ask(mind, s, 'y', now=1020 + 301)              # 5 perc csend után is
            self.assertEqual(len(mind.calls[-1][1]), 1)
            for i in range(30):                                    # túl hosszú beszélgetés: újrakezdi
                await d.ask(mind, s, str(i), now=2000 + i)
            self.assertLessEqual(len(d.messages), d.max_turns * 2)
        run(t())

    def test_failed_question_is_removed(self):
        class Broken(talk.Mind):
            async def reply(self, system, messages):
                raise talk.MindError('oops')

        async def t():
            d, s = talk.Dialog(), state.State()
            await d.ask(talk_sim.SimMind(), s, 'one', now=1)
            with self.assertRaises(talk.MindError):
                await d.ask(Broken(), s, 'two', now=2)
            self.assertEqual([m['role'] for m in d.messages], ['user', 'assistant'])
        run(t())

    def test_reset_while_waiting(self):
        async def t():
            d, s, mind = talk.Dialog(), state.State(), talk_sim.SimMind(delay=0.05)
            task = asyncio.ensure_future(d.ask(mind, s, 'slow', now=1))
            await asyncio.sleep(0.01)
            d.reset()                                              # pl. közben személyiséget váltottak az appban
            await task
            self.assertEqual(d.messages, [])                       # a régi válasz nem kerül az új beszélgetés elejére
        run(t())


# ------------------------------------------------------------------ claude.py – hamis klienssel
class ClaudeMindTest(unittest.TestCase):
    def test_request_shape(self):
        content = [block('thinking', thinking='', signature='sig'), block('text', text='**Hello** there, Captain! 👋')]
        fc = FakeClient(response(*content))
        r = run(claude.ClaudeMind(client=fc).reply('SYS', [{'role': 'user', 'content': '[10:00] hi'}]))
        self.assertEqual(r.text, 'Hello there, Captain!')
        self.assertEqual(r.content, content)                        # a teljes tartalom (gondolkodás is) változatlanul megy vissza
        kw = fc.calls[0]
        self.assertEqual(kw['model'], 'claude-opus-5-5')
        self.assertEqual(kw['output_config'], {'effort': 'low'})
        self.assertEqual(kw['fallbacks'], 'default')
        self.assertEqual(kw['betas'], ['server-side-fallback-2026-07-01'])
        self.assertEqual(kw['system'], 'SYS')
        self.assertNotIn('thinking', kw)                           # Opus 5.5: a gondolkodás nem kapcsolható ki; az effort szabályoz
        self.assertNotIn('temperature', kw)

    def test_refusal_and_empty(self):
        with self.assertRaises(talk.MindError) as cm:
            run(claude.ClaudeMind(client=FakeClient(response(stop='refusal'))).reply('S', []))
        self.assertEqual(cm.exception.spoken, claude.SAY['refusal'])
        with self.assertRaises(talk.MindError) as cm:
            run(claude.ClaudeMind(client=FakeClient(response(block('text', text='  ')))).reply('S', []))
        self.assertEqual(cm.exception.spoken, claude.SAY['empty'])

    def test_no_key_no_client(self):
        old = os.environ.pop('ANTHROPIC_API_KEY', None)
        try:
            self.assertFalse(claude.has_key())
            with self.assertRaises(talk.MindError) as cm:
                run(claude.ClaudeMind().reply('S', [{'role': 'user', 'content': 'x'}]))
            self.assertEqual(cm.exception.spoken, claude.SAY['nokey'])
        finally:
            if old is not None:
                os.environ['ANTHROPIC_API_KEY'] = old

    def test_network_error_is_spoken_not_raised(self):
        with self.assertRaises(talk.MindError) as cm:
            run(claude.ClaudeMind(client=FakeClient(RuntimeError('boom'))).reply('S', []))
        self.assertEqual(cm.exception.spoken, claude.SAY['error'])

    @unittest.skipUnless(anthropic, 'az anthropic csomag nincs telepítve')
    def test_sdk_error_classes(self):
        import httpx2 as httpx                                      # az SDK 1.x+ httpx2-t használ
        req = httpx.Request('POST', 'https://api.anthropic.com/v1/messages')
        cases = [
            (anthropic.AuthenticationError('bad', response=httpx.Response(401, request=req), body=None), 'auth'),
            (anthropic.RateLimitError('slow', response=httpx.Response(429, request=req), body=None), 'busy'),
            (anthropic.InternalServerError('down', response=httpx.Response(500, request=req), body=None), 'busy'),
            (anthropic.APIConnectionError(request=req), 'offline'),
            (anthropic.APITimeoutError(request=req), 'offline'),
            (anthropic.BadRequestError('bad', response=httpx.Response(400, request=req), body=None), 'error'),
        ]
        for exc, kind in cases:
            self.assertEqual(claude._classify(exc), kind, type(exc).__name__)

    @unittest.skipUnless(anthropic, 'az anthropic csomag nincs telepítve')
    def test_real_sdk_wire_format(self):
        """A valódi SDK-n át, de hálózat helyett egy helyi álszerverrel: pontosan ez menne az API-nak."""
        import httpx2 as httpx
        seen = []

        def handler(req):
            seen.append((dict(req.headers), json.loads(req.content)))
            return httpx.Response(200, json={
                'id': 'msg_1', 'type': 'message', 'role': 'assistant', 'model': 'claude-opus-5-5',
                'content': [{'type': 'thinking', 'thinking': '', 'signature': 'abc'}, {'type': 'text', 'text': 'Hi *there*!'}],
                'stop_reason': 'end_turn', 'stop_sequence': None, 'usage': {'input_tokens': 10, 'output_tokens': 5}})

        async def t():
            c = anthropic.AsyncAnthropic(api_key='test', http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
            d, s, mind = talk.Dialog(), state.State(), claude.ClaudeMind(client=c)
            self.assertEqual((await d.ask(mind, s, 'hi', now=1)).text, 'Hi there!')
            await d.ask(mind, s, 'again', now=2)
        run(t())
        headers, body = seen[-1]
        self.assertEqual(headers['anthropic-beta'], 'server-side-fallback-2026-07-01')
        self.assertEqual(body['model'], 'claude-opus-5-5')
        self.assertEqual(body['output_config'], {'effort': 'low'})
        self.assertEqual(body['fallbacks'], 'default')
        self.assertEqual(body['messages'][1]['content'][0], {'type': 'thinking', 'thinking': '', 'signature': 'abc'})


# ------------------------------------------------------------------ a kocka beszélget (szimulált hardver + szimulált beszélgetés)
class ConverseTest(unittest.TestCase):
    def make(self, mind=None):
        hw = hw_sim.make(VOICE, None, speed=SPEED)
        tk = talk_sim.make(mind, SPEED)
        cube = Cube(hw, settings=False, talk=tk)
        hw.camera.enable(False)
        got = []
        cube.listeners.append(got.append)
        return cube, hw, tk, got

    @staticmethod
    def events(got):
        return [json.loads(m) for m in got]

    def test_touch_question_answer(self):
        async def t():
            cube, hw, tk, got = self.make(talk_sim.SimMind(delay=0.15))
            await cube.boot()
            cube.s.persona = 'sarcastic'
            tk.ears.hear('What is the meaning of life?')
            task = asyncio.ensure_future(cube.on_mcu({'ev': 'touch'}))
            await asyncio.sleep(0.05)
            self.assertEqual(cube.face.mode, 'think')              # a Claude válaszára vár
            self.assertEqual(hw.mcu.sent[-1]['mode'], 'think')
            await task
            modes = [m['mode'] for m in hw.mcu.sent if m.get('cmd') == 'leds']
            self.assertIn('listen', modes)
            self.assertEqual(modes[-1], 'solid')                   # a végén vissza a normál fényre
            self.assertEqual(cube.face.mode, 'face')
            system, msgs = tk.mind.calls[0]
            self.assertIn(talk.PERSONAS['sarcastic'], system)
            self.assertTrue(msgs[-1]['content'].endswith('What is the meaning of life?'))
            self.assertEqual(tk.voice.spoken, [talk_sim.SIM_REPLIES['sarcastic']])
            self.assertTrue(hw.audio.played[-1].startswith('reply_'))   # a TTS-hang szólt a hangszórón
            ev = self.events(got)
            types_ = [e['type'] for e in ev]
            for ty in ('event.touch', 'speech.heard', 'speech.say'):
                self.assertIn(ty, types_)
            self.assertEqual([e for e in ev if e['type'] == 'speech.say'][-1]['data']['text'], talk_sim.SIM_REPLIES['sarcastic'])
            self.assertFalse(cube.s.busy)
        run(t())

    def test_wake_word(self):
        async def t():
            cube, hw, tk, got = self.make()
            await cube.boot()
            cube.start()
            tk.ears.hear('Hello cube')
            tk.ears.wake_word()
            for _ in range(100):
                await asyncio.sleep(0.02)
                if tk.voice.spoken:
                    break
            self.assertEqual(len(tk.mind.calls), 1)
            self.assertIn('event.wake', [e['type'] for e in self.events(got)])
            self.assertIn({'cmd': 'haptic', 'pattern': 'tick'}, hw.mcu.sent)
            cube.stop()
        run(t())

    def test_wake_word_ignored_when_off_or_flipped(self):
        async def t():
            cube, hw, tk, got = self.make()
            cube.start()
            tk.ears.wake_word()                                    # kikapcsolva: nem hallgat
            await asyncio.sleep(0.1)
            self.assertEqual(tk.ears.records, 0)
            await cube.boot()
            await cube.on_mcu({'ev': 'imu', 'kind': 'flip', 'up': True})
            tk.ears.wake_word()                                    # fejjel lefelé: nem hallgat
            await asyncio.sleep(0.1)
            self.assertEqual(tk.ears.records, 0)
            cube.stop()
        run(t())

    def test_flip_while_listening_stops_everything(self):
        async def t():
            cube, hw, tk, got = self.make()
            await cube.boot()
            task = asyncio.ensure_future(cube.on_mcu({'ev': 'touch'}))
            await asyncio.sleep(0.02)
            self.assertEqual(cube.face.mode, 'listen')
            await cube.on_mcu({'ev': 'imu', 'kind': 'flip', 'up': True})
            self.assertFalse(tk.ears.enabled)                      # a mikrofon azonnal kikapcsol
            tk.ears.hear('secret')                                 # ami fejjel lefelé „elhangzik”, nem jut el sehova
            await task
            self.assertEqual(tk.mind.calls, [])
            self.assertEqual(cube.face.mode, 'privacy')
            await cube.on_mcu({'ev': 'imu', 'kind': 'flip', 'up': False})
            self.assertTrue(tk.ears.enabled)
        run(t())

    def test_dnd_only_buzzes(self):
        async def t():
            cube, hw, tk, got = self.make()
            await cube.boot()
            await cube.command('mode.dnd', {'on': True})
            tk.ears.hear('hello')
            await cube.on_mcu({'ev': 'touch'})
            self.assertEqual(tk.ears.records, 0)
            self.assertIn({'cmd': 'haptic', 'pattern': 'buzz'}, hw.mcu.sent)
        run(t())

    def test_silence_no_api_call(self):
        async def t():
            cube, hw, tk, got = self.make()
            await cube.boot()
            await cube.on_mcu({'ev': 'touch'})                     # megérintik, de senki nem szól
            self.assertEqual(tk.mind.calls, [])
            self.assertEqual(cube.face.mode, 'face')
            self.assertEqual(hw.mcu.sent[-1]['mode'], 'solid')
        run(t())

    def test_api_error_is_spoken(self):
        async def t():
            cube, hw, tk, got = self.make(claude.ClaudeMind(client=FakeClient(RuntimeError('net down'))))
            await cube.boot()
            tk.ears.hear('Are you there?')
            await cube.on_mcu({'ev': 'touch'})
            self.assertEqual(tk.voice.spoken, [claude.SAY['error']])   # nem némul el, megmondja, mi a baj
            self.assertEqual(tk.dialog.messages, [])
        run(t())

    def test_claude_conversation_multi_turn(self):
        async def t():
            content = [block('text', text='Sure thing!')]
            fc = FakeClient(response(*content))
            cube, hw, tk, got = self.make(claude.ClaudeMind(client=fc))
            await cube.boot()
            for q in ('First question', 'Second question'):
                tk.ears.hear(q)
                await cube.on_mcu({'ev': 'touch'})
            msgs = fc.calls[1]['messages']
            self.assertEqual([m['role'] for m in msgs], ['user', 'assistant', 'user'])
            self.assertEqual(msgs[1]['content'], content)
            await cube.command('persona.set', {'name': 'pro'})     # személyiségváltás: új beszélgetés, új rendszerprompt
            tk.ears.hear('Third')
            await cube.on_mcu({'ev': 'touch'})
            self.assertEqual(len(fc.calls[2]['messages']), 1)
            self.assertIn(talk.PERSONAS['pro'], fc.calls[2]['system'])
        run(t())

    def test_voice_off_still_answers_in_app(self):
        async def t():
            cube, hw, tk, got = self.make()
            await cube.boot()
            await cube.command('voice.set', {'on': False})
            n = len(hw.audio.played)
            tk.ears.hear('hi')
            await cube.on_mcu({'ev': 'touch'})
            self.assertEqual(len(hw.audio.played), n)              # némítva nem szól
            self.assertIn('speech.say', [e['type'] for e in self.events(got)])
        run(t())


class SimPartsTest(unittest.TestCase):
    def test_think_face_renders(self):
        img = FaceRenderer().render(FaceState(mode='think'), 1.0)
        self.assertEqual(img.size, (240, 240))

    def test_sim_audio_wav_duration(self):
        async def t():
            path = await talk_sim.SimVoice().synth('one two three four', 'sunny')
            with wave.open(path) as w:
                self.assertAlmostEqual(w.getnframes() / w.getframerate(), 0.4 + 1.2, places=2)
            a = hw_sim.SimAudio(speed=0.01)
            await a.play_clip(path)
            self.assertEqual(a.played, [os.path.basename(path)])
        run(t())

    def test_key_never_in_repo_files(self):
        """A kulcs csak környezeti változóból jöhet: a firmware forrásában nincs kulcs-formájú szöveg."""
        root, needle = os.path.join(os.path.dirname(__file__), '..', '..'), 'sk-' + 'ant-'
        for dirpath, _, files in os.walk(root):
            for f in files:
                if f.endswith(('.py', '.sh', '.service', '.md', '.txt')):
                    with open(os.path.join(dirpath, f), encoding='utf-8', errors='replace') as fh:
                        self.assertNotIn(needle, fh.read(), f)


if __name__ == '__main__':
    unittest.main()
