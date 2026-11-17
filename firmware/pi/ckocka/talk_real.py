"""Valódi beszélgetés a Raspberry Pi Zero 2 W-n – minden HELYBEN fut, csak a felismert szöveg megy a Claude API-nak.

  Mikrofon       : ReSpeaker 2-Mics Pi HAT (ALSA dsnoop) – `arecord`, 16 kHz, mono, 16 bit, 80 ms-os darabok
  Ébresztőszó    : openWakeWord (helyben, ONNX) – alapból „hey jarvis” (CKOCKA_WAKEWORD); saját „Hey C” modell
                   tanítható, és fájlútvonallal megadható
  Beszédfelism.  : faster-whisper, „tiny.en”, int8 (CKOCKA_WHISPER) – a Pi Zero 2 W-n egy rövid mondat ~2–4 s
  Beszédszintézis: Piper (helyben, ONNX) – az önálló `piper` program (CKOCKA_PIPER_BIN), angol hang (CKOCKA_PIPER_MODEL)
  Ész            : Claude API (claude.py) – csak ha az ANTHROPIC_API_KEY be van állítva

FIGYELEM: hardver nélkül készült (a C-kocka koncepció); az első élesztésnél a hangerőküszöböket és az ébresztőszó
érzékenységét a valódi mikrofonhoz kell hangolni.
"""
import asyncio, logging, os, shutil, subprocess, tempfile, threading

from . import talk

log = logging.getLogger('ckocka.talk')

PIPER_SPEED = {'sunny': 1.0, 'chill': 1.12, 'hype': 0.88, 'sarcastic': 1.04, 'pro': 0.97}   # length_scale: >1 lassabb


class AlsaEars(talk.Ears):
    """Egyetlen olvasó szál: 'wake' állapotban az ébresztőszót keresi, 'record' állapotban felvesz a csend végéig."""

    def __init__(self, device='default', wakeword=None, threshold=0.5):
        self.device, self.threshold, self.enabled = device, threshold, True
        self.loop = asyncio.get_event_loop()
        self._mode, self._buf, self._ep, self._done = 'wake', [], None, None
        self._lock = threading.Lock()
        self._wake_ev = asyncio.Event()
        self.oww = None
        name = wakeword or os.environ.get('CKOCKA_WAKEWORD', 'hey_jarvis')
        if name.lower() != 'off':
            try:
                from openwakeword.model import Model
                self.oww, self.ww_name = Model(wakeword_models=[name], inference_framework='onnx'), name
                log.info('ébresztőszó: %s', name)
            except Exception as e:
                log.warning('openWakeWord nem érhető el (%s) – csak érintésre hallgat', e)
        threading.Thread(target=self._reader, daemon=True).start()

    def _reader(self):
        import numpy as np
        while True:
            p = subprocess.Popen(['arecord', '-q', '-D', self.device, '-f', 'S16_LE', '-c', '1', '-r', str(talk.SAMPLE_RATE),
                                  '-t', 'raw'], stdout=subprocess.PIPE)
            try:
                while True:
                    frame = p.stdout.read(talk.FRAME * 2)
                    if len(frame) < talk.FRAME * 2:
                        break
                    self._feed(frame, np)
            finally:
                p.kill()
            log.warning('a mikrofon-folyam leállt – újraindul')
            threading.Event().wait(2)

    def _feed(self, frame, np):
        with self._lock:
            mode = self._mode if self.enabled else 'off'
            if mode == 'record':
                self._buf.append(frame)
                res = self._ep.push(talk.rms(frame))
                if res:
                    pcm = b''.join(self._buf) if res == 'done' else b''
                    self._mode, self._buf = 'wake', []
                    self._resolve(pcm)
                return
        if mode == 'wake' and self.oww is not None:
            score = self.oww.predict(np.frombuffer(frame, dtype=np.int16)).get(self.ww_name, 0.0)
            if score >= self.threshold:
                self.oww.reset()
                self.loop.call_soon_threadsafe(self._wake_ev.set)

    def _resolve(self, pcm):
        fut, self._done = self._done, None
        if fut is not None:
            self.loop.call_soon_threadsafe(lambda: fut.done() or fut.set_result(pcm))

    async def wake(self):
        if self.oww is None:
            return await super().wake()
        self._wake_ev.clear()
        await self._wake_ev.wait()

    async def record(self, max_s=10.0):
        if not self.enabled:
            return b''
        fut = self.loop.create_future()
        with self._lock:
            self._resolve(b'')                           # egy esetleg még futó felvétel lezárása
            self._done, self._buf, self._ep, self._mode = fut, [], talk.Endpointer(max_s=max_s), 'record'
        return await fut

    def enable(self, on):
        with self._lock:
            self.enabled = on
            if not on:
                self._mode, self._buf = 'wake', []
                self._resolve(b'')


class WhisperStt(talk.Stt):
    def __init__(self, model=None):
        from faster_whisper import WhisperModel
        name = model or os.environ.get('CKOCKA_WHISPER', 'tiny.en')
        self.model = WhisperModel(name, device='cpu', compute_type='int8', cpu_threads=4)
        log.info('beszédfelismerés: faster-whisper %s', name)

    def _run(self, pcm):
        import numpy as np
        audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        segments, _ = self.model.transcribe(audio, language='en', beam_size=1, condition_on_previous_text=False)
        return ' '.join(s.text.strip() for s in segments).strip()

    async def transcribe(self, pcm):
        if not pcm:
            return ''
        return await asyncio.get_running_loop().run_in_executor(None, self._run, pcm)


class PiperVoice(talk.Voice):
    def __init__(self, model=None):
        self.exe = os.environ.get('CKOCKA_PIPER_BIN') or ('/opt/ckocka/piper/piper' if os.path.exists('/opt/ckocka/piper/piper')
                                                          else shutil.which('piper'))
        self.model = model or os.environ.get('CKOCKA_PIPER_MODEL', '/opt/ckocka/piper/en_US-lessac-medium.onnx')
        for p in (self.exe, self.model):
            if not p or not os.path.exists(p):
                raise FileNotFoundError(p or 'piper')
        self.dir, self.n = tempfile.mkdtemp(prefix='ckocka-tts-'), 0

    def _run(self, text, persona, path):
        subprocess.run([self.exe, '--model', self.model, '--output_file', path, '--length_scale', str(PIPER_SPEED.get(persona, 1.0))],
                       input=text.encode('utf-8'), check=True, capture_output=True)
        return path

    async def synth(self, text, persona):
        self.n += 1
        path = os.path.join(self.dir, 'reply_%d.wav' % (self.n % 4))
        return await asyncio.get_running_loop().run_in_executor(None, self._run, text, persona, path)


def make(mind):
    """A valódi beszélgetés összerakása. Ha valamelyik helyi rész hiányzik, None: a kocka a régi módon viselkedik
    (érintésre pontos idő / személyiség-mondat), és a napló megmondja, mit kell telepíteni."""
    try:
        stt, voice = WhisperStt(), PiperVoice()          # előbb ezek: ha hiányoznak, a mikrofon el se induljon
        return talk.Talk(AlsaEars(), stt, mind, voice)
    except Exception as e:
        log.warning('a beszélgetés nem indul (%s: %s) – lásd firmware/README.md, „Beszélgetés”', type(e).__name__, e)
        return None
