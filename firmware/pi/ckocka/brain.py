"""A C-kocka „agya”: viselkedés és állapotgép – a webes szimulátor (web/sim.js) logikájának Python-változata.

Bemenetek:  XIAO események (gombok, érintés, IMU), app-parancsok (WebSocket), kamera (helyben).
Kimenetek:  arc a kijelzőn, hang, LED-ek és rezgés (XIAO-n át), események az appnak.
"""
import asyncio, json, logging, os, random, time

from . import protocol, state as st_mod, synth
from .face import FaceRenderer, FaceState

log = logging.getLogger('ckocka')
FPS = 15


class JokeBag:
    """Véletlen sorrend, ismétlés nélkül, amíg mind el nem hangzott; kör végén sem jön kétszer ugyanaz."""

    def __init__(self, count, rng=random):
        self.count, self.rng, self.bag, self.last = count, rng, [], 0

    def next(self):
        if not self.bag:
            self.bag = list(range(1, self.count + 1))
            self.rng.shuffle(self.bag)
            if self.count > 1 and self.bag[-1] == self.last:
                self.bag[0], self.bag[-1] = self.bag[-1], self.bag[0]
        self.last = self.bag.pop()
        return self.last


class Cube:
    def __init__(self, hw, settings=True):
        self.hw = hw
        self.s = st_mod.State()
        if settings:
            st_mod.load(self.s)
        self.face = FaceState(persona=self.s.base_persona(), hue=self.s.hue)
        self.renderer = FaceRenderer()
        self.listeners = []                   # app-kapcsolatok: fn(json_str)
        self.lines = self._load_lines()
        self.jokes = JokeBag(sum(1 for k in self.lines if k.startswith('joke_') and k.endswith('q')))
        self._sfx = {k: synth.to_wav_bytes(f()) for k, f in synth.SFX.items()}
        self._party_wav, self._party_beats = None, []
        self._tasks = []
        self._say_token = 0
        self._call = None
        self._last_cheer = 0.0

    # ------------------------------------------------------------ segédek
    def _load_lines(self):
        p = os.path.join(self.hw.voice_dir, 'lines.json')
        try:
            with open(p, encoding='utf-8') as f:
                return {l['id']: l['text'] for l in json.load(f)}
        except OSError:
            log.warning('nincs lines.json: %s', p)
            return {}

    def emit(self, type_, **data):
        msg = protocol.event(type_, **data)
        log.info('kocka -> app %s %s', type_, data or '')
        for fn in list(self.listeners):
            fn(msg)

    def broadcast_state(self):
        msg = json.dumps({'type': 'state', 'data': self.s.public()}, ensure_ascii=False)
        for fn in list(self.listeners):
            fn(msg)

    def lights(self):
        """A LED-ek állapota a XIAO-nak: szín, fényerő és üzemmód az állapotból számolva."""
        s = self.s
        mode = 'off' if not s.on else 'dim' if (s.upside_down or s.dnd) else 'party' if s.party else 'solid'
        self.hw.mcu.send({'cmd': 'leds', 'hue': round(s.hue), 'bright': round(s.bright, 2), 'mode': mode})

    def buzz(self):
        self.hw.mcu.send({'cmd': 'haptic', 'pattern': 'buzz'})

    async def say(self, line_id, mouth_after='smile', sub=None):
        """Egy előre generált mondat (voice/<id>.mp3) – ugyanazok a fájlok, mint a webes szimulátorban."""
        s = self.s
        if not s.on or s.upside_down:
            return
        if s.dnd:
            self.buzz()
            return
        text = self.lines.get(line_id, line_id)
        log.info('mondja: %s', sub or text.replace('Captain', s.nick))
        self.emit('speech.say', id=line_id, text=sub or text.replace('Captain', s.nick))
        self._say_token += 1
        token = self._say_token
        self.hw.audio.stop()
        if s.voice:
            await self.hw.audio.play_clip(os.path.join(self.hw.voice_dir, line_id + '.mp3'), s.rate())
        else:
            await asyncio.sleep(0.6 + len(text) * 0.055)
        if token == self._say_token:
            self.face.mouth = mouth_after

    def show_text(self, text, sub='', color=None):
        self.face.mode, self.face.text, self.face.sub, self.face.text_color = 'text', text, sub, color

    def back_to_face(self):
        s = self.s
        self.face.mode = 'privacy' if s.upside_down else 'dnd' if s.dnd else 'eq' if s.party else 'face'

    async def _busy(self, coro):
        """Egy hosszabb jelenet (vicc, dobás…) közben a gombok nem vágnak bele."""
        self.s.busy = True
        try:
            await coro
        finally:
            self.s.busy = False

    # ------------------------------------------------------------ be/ki
    async def boot(self):
        s = self.s
        if s.on:
            return
        s.on = True
        self.face.mode, self.face.mouth = 'face', 'smile'
        self.lights()
        self.hw.audio.sfx(self._sfx['boot'])
        log.info('bekapcsolva')
        since = st_mod.since_text(s.last_seen)
        s.last_seen = time.time()
        st_mod.save(s)

        async def ritual():
            await asyncio.sleep(0.6)
            await self.say('boot1')
            self.emit('event.welcome', lastSeenAgo=since)
            await self.say('boot2', sub=f"Welcome back, {s.nick}! I haven't seen you for {since}.")
            await asyncio.sleep(0.2)
            await self.say('boot3', mouth_after='grin')
            await asyncio.sleep(0.7)
            self.face.mouth = 'smile'
        await self._busy(ritual())
        self.broadcast_state()

    def power_off(self):
        s = self.s
        s.on = s.party = False
        self.hw.audio.music(None)
        self.hw.audio.stop()
        self.face.mode = 'off'
        self.lights()
        self.broadcast_state()

    # ------------------------------------------------------------ XIAO események
    async def on_mcu(self, ev):
        kind = ev.get('ev')
        if kind == 'hello':
            log.info('XIAO firmware %s', ev.get('fw'))
            self.lights()
            return
        if kind == 'imu' and ev.get('kind') == 'flip':
            return await self.flip(bool(ev.get('up')))
        if not self.s.on:
            return await self.boot()                 # bármely gomb/mozdulat bekapcsolja
        if kind == 'button':
            await self.button(int(ev['id']))
        elif kind == 'touch':
            await self.touch()
        elif kind == 'imu' and ev.get('kind') == 'throw':
            await self.throw()
        elif kind == 'imu' and ev.get('kind') == 'shake':
            await self.shake()

    async def button(self, n):
        s = self.s
        if s.upside_down:
            return
        if s.busy:
            log.info('gomb %d kihagyva (épp beszél)', n)
            return
        self.emit('event.button', id=n)
        if s.dnd:
            return self.buzz()
        if n == 1:                                   # Andor: dad joke
            j = self.jokes.next()

            async def joke():
                await self.say(f'joke_{j}q')
                await asyncio.sleep(0.7)
                await self.say(f'joke_{j}a', mouth_after='grin')
                self.hw.audio.sfx(self._sfx['drum'])
                await asyncio.sleep(1.2)
                self.face.mouth = 'smile'
            return await self._busy(joke())
        snd = s.assign.get(n, 'horn')
        if snd in ('horn', 'drum'):
            self.hw.audio.sfx(self._sfx[snd])
            self.face.mouth = 'o' if snd == 'horn' else 'grin'
            await asyncio.sleep(0.8)
            self.face.mouth = 'smile'
        elif snd == 'gooo':
            self.show_text('GO!')
            await self.say('btn_gooo')
            self.back_to_face()
        elif snd == 'coffee':
            await self.say('btn_coffee')
            self.show_text('YES', 'Obviously.', (92, 242, 138))
            self.hw.audio.sfx(self._sfx['ding'])
            await asyncio.sleep(1.8)
            self.back_to_face()

    async def touch(self):
        s = self.s
        if s.upside_down:
            return
        if self._call and not self._call['live']:          # hívás fogadása kihangosítva
            self._call['live'] = True
            self.face.call_live = True
            self.emit('event.call_answered', **{'from': self._call['from']})
            return
        if s.dnd:
            return self.buzz()
        self.emit('event.touch', action='listen')
        self.face.mode, self.face.look = 'listen', [0.0, -0.7]
        await asyncio.sleep(1.6)                           # itt indulna a beszédfelismerés (helyben vagy felhőben – beállítás kérdése)
        self.face.mode, self.face.look = 'face', [0.0, 0.0]
        if random.random() < 0.5:
            now = time.strftime('%H:%M')
            self.show_text(now)
            await self.say('time', sub=f"It's {now}, {s.nick}.")
            await asyncio.sleep(0.9)
            self.back_to_face()
        else:
            await self.say(f'idle_{s.base_persona()}_{random.randint(1, 3)}')

    async def throw(self):
        s = self.s
        s.throws += 1
        self.emit('event.throw', count=s.throws)
        self.hw.audio.sfx(self._sfx['whoosh'])

        async def scene():
            self.face.mode = 'dizzy'
            await asyncio.sleep(1.3)
            if s.throws == 1:
                await self.say('throw_1')
            else:
                await self.say('throw_n', sub=f"Ouch! Again? That's {s.throws} throws today. Okay, coffee break.")
            await asyncio.sleep(1.2)
            self.back_to_face()
        await self._busy(scene())

    async def shake(self):
        async def scene():
            self.show_text('...')
            await asyncio.sleep(0.9)
            yes = random.random() < 0.5
            self.show_text('YES' if yes else 'NO', color=(92, 242, 138) if yes else (255, 107, 107))
            self.emit('event.shake', answer='YES' if yes else 'NO')
            self.hw.audio.sfx(self._sfx['ding'])
            await asyncio.sleep(2.2)
            self.back_to_face()
        await self._busy(scene())

    async def flip(self, upside_down):
        """Fejjel lefelé: mikrofon ÉS kamera ki (adatvédelem), csend, sötét fények."""
        s = self.s
        if upside_down == s.upside_down:
            return
        if not s.on:
            await self.boot()
        s.upside_down = upside_down
        self.hw.camera.enable(not upside_down)
        self.set_mic(not upside_down)
        if upside_down:
            self.hw.audio.stop()
            if s.party:
                self.set_party(False)
        self.emit('event.orientation', upsideDown=upside_down, microphone=not upside_down, camera=not upside_down)
        self.back_to_face()
        self.lights()
        self.broadcast_state()

    def set_mic(self, on):
        """A Voice Bonnet mikrofonjainak némítása (ALSA kapcsoló a valódi hardveren)."""
        mute = getattr(self.hw.audio, 'set_capture', None)
        if mute:
            mute(on)

    def set_party(self, on):
        s = self.s
        s.party = bool(on and s.on and not s.upside_down and not s.dnd)
        if s.party:
            if self._party_wav is None:
                x, self._party_beats = synth.party_loop()
                self._party_wav = synth.to_wav_bytes(x)
            self.hw.audio.music(self._party_wav, loop=True)
            self._tasks.append(asyncio.ensure_future(self._party_beats_task()))
        else:
            self.hw.audio.music(None)
        self.back_to_face()
        self.lights()

    async def _party_beats_task(self):
        """Ütemre: a XIAO színt vált és felvillan, a kijelzőn hangszínkép."""
        period = 60 / synth.BPM
        while self.s.party:
            self.hw.mcu.send({'cmd': 'beat'})
            self.face.hue = (self.face.hue + 47) % 360
            self.face.eq = [random.random() ** 0.7 for _ in range(9)]
            await asyncio.sleep(period)

    async def incoming_call(self, caller='BRO'):
        """Bluetooth HFP hívás érkezik (a telefonról) – a kocka kihangosítóként működik."""
        if not self.s.on:
            return
        self.emit('event.call', **{'from': caller})
        if self.s.dnd:
            return self.buzz()
        self._call = {'from': caller, 'live': False}
        self.face.mode, self.face.caller, self.face.call_live = 'call', caller, False
        self.hw.audio.sfx(self._sfx['ring'])
        await asyncio.sleep(4.5)
        if self._call and not self._call['live']:
            self._call = None
            self.back_to_face()

    # ------------------------------------------------------------ kamera: leskelődés, felvidítás
    async def peek_loop(self):
        while True:
            await asyncio.sleep(9 + random.random() * 9)
            s = self.s
            if not (s.on and s.peek and not s.busy and not s.upside_down and not s.dnd and not s.party and self.face.mode == 'face'):
                continue
            seen = await self.hw.camera.look()
            if not seen.get('face'):
                continue
            if seen.get('tired') and time.time() - self._last_cheer > 600:
                self._last_cheer = time.time()
                await self.cheer_up()
                continue
            self.face.peeking, self.face.look = True, [0.0, -0.05]
            self.hw.mcu.send({'cmd': 'camled', 'on': True})
            self.emit('camera.peek')
            caught = False
            for _ in range(6):                       # ~2,6 s: ha közben ránk néz, elkapja a tekintetét
                await asyncio.sleep(0.45)
                if not s.on or s.dnd or s.upside_down or s.party or s.busy:
                    break                            # közben Ne zavarj / fordítás / party / beszéd: azonnal abbahagyja
                if (await self.hw.camera.look()).get('looking'):
                    caught = True
                    break
            self.hw.mcu.send({'cmd': 'camled', 'on': False})
            self.face.peeking = False
            if caught:
                self.face.look = [1.0, -0.6]
                self.emit('event.caught_peeking')
                await self._busy(self.say('peek_2' if s.base_persona() == 'sarcastic' else 'peek_1'))
            self.face.look = [0.0, 0.0]

    async def cheer_up(self):
        self.emit('event.camera', face='tired')

        async def scene():
            self.face.mouth = 'worried'
            await asyncio.sleep(0.8)
            await self.say('tired')
            j = self.jokes.next()
            await asyncio.sleep(0.4)
            await self.say(f'joke_{j}q')
            await asyncio.sleep(0.7)
            await self.say(f'joke_{j}a', mouth_after='grin')
            self.hw.audio.sfx(self._sfx['drum'])
            await asyncio.sleep(1.2)
            self.face.mouth = 'smile'
        await self._busy(scene())

    # ------------------------------------------------------------ app-parancsok
    async def command(self, type_, d):
        s = self.s
        if type_ == 'power.on':
            await self.boot()
        elif type_ == 'power.off':
            self.power_off()
        elif type_ == 'persona.set':
            s.persona = d['name']
            if d['name'] != 'custom':
                s.hue = st_mod.PERSONA_HUE[d['name']]
            self.face.persona = s.base_persona()
            self.lights()
            st_mod.save(s)
            self.broadcast_state()                   # az app azonnal frissüljön – a köszönés csak utána jön
            if s.on and not s.upside_down and not s.dnd:
                while s.busy:
                    await asyncio.sleep(0.2)
                await self.say('greet_' + s.base_persona())
        elif type_ == 'persona.custom':
            s.sliders.update(d)
            self.face.persona = s.base_persona()
        elif type_ == 'mode.party':
            if d['on'] and not s.on:
                await self.boot()
            self.set_party(d['on'])
        elif type_ == 'mode.dnd':
            s.dnd = d['on']
            if s.dnd:
                self.set_party(False)
                self.hw.audio.stop()
            self.back_to_face()
            self.lights()
        elif type_ == 'peek.set':
            s.peek = d['on']
        elif type_ == 'voice.set':
            s.voice = d['on']
            if not s.voice:
                self.hw.audio.stop()
        elif type_ == 'led.color':
            s.hue = d['hue']
            self.lights()
        elif type_ == 'led.brightness':
            s.bright = d['value']
            self.lights()
        elif type_ == 'user.nickname':
            s.nick = d['name'].strip() or 'Captain'
        elif type_ == 'button.assign':
            s.assign[int(d['button'])] = d['sound']
        st_mod.save(s)
        self.broadcast_state()

    async def command_json(self, raw):
        """Az API ezt hívja; a hibás üzenetet visszautasítja, de nem áll le tőle."""
        try:
            t, d = protocol.parse_command(raw)
        except protocol.ProtocolError as e:
            log.warning('hibás parancs: %s', e)
            return {'ok': False, 'error': str(e)}
        log.info('app -> kocka %s %s', t, d or '')
        asyncio.ensure_future(self.command(t, d))
        return {'ok': True}

    # ------------------------------------------------------------ futás
    async def face_loop(self):
        last = time.monotonic()
        while True:
            now = time.monotonic()
            self.renderer.tick(self.face, now - last)
            last = now
            self.face.talk_level = self.hw.audio.level()
            self.face.persona = self.s.base_persona()
            if not self.s.party:
                self.face.hue = self.s.hue
            self.hw.display.show(self.renderer.render(self.face, now))
            await asyncio.sleep(1 / FPS)

    async def mcu_loop(self):
        while True:
            ev = await self.hw.mcu.events.get()
            log.info('XIAO -> kocka %s', ev)
            asyncio.ensure_future(self.on_mcu(ev))

    def start(self):
        self._tasks += [asyncio.ensure_future(c) for c in (self.face_loop(), self.mcu_loop(), self.peek_loop())]
        self.lights()

    def stop(self):
        for t in self._tasks:
            t.cancel()
