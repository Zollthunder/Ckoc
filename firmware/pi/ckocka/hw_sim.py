"""Szimulált hardver a PC-re: a kijelző képeit PNG-be menti, a hangot és a LED-eket a naplóba írja.
Így a teljes szoftver hardver nélkül is futtatható és tesztelhető."""
import asyncio, logging, math, os, random, time

from . import hal

log = logging.getLogger('ckocka.sim')


class SimDisplay(hal.Display):
    """Csak a „kulcsképeket” menti (ha a kép jelentősen változik), hogy át lehessen nézni, mit mutatott a kijelző."""

    def __init__(self, out_dir=None):
        self.out_dir, self.count, self.saved, self._last_sig, self.last = out_dir, 0, [], None, None
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

    def show(self, img):
        self.count += 1
        self.last = img
        sig = img.resize((24, 24)).tobytes()
        if self.out_dir and (self._last_sig is None or sum(abs(a - b) for a, b in zip(sig, self._last_sig)) > 9000):
            p = os.path.join(self.out_dir, 'face_%04d.png' % len(self.saved))
            img.save(p)
            self.saved.append(p)
        self._last_sig = sig


class SimAudio(hal.Audio):
    """A mondat hosszát az MP3 méretéből becsüli (64 kbit/s); speed < 1 a tesztekben gyorsítja az időt."""

    def __init__(self, speed=1.0):
        self.speed, self.played, self._until, self._stop = speed, [], 0.0, asyncio.Event()
        self.music_on = False

    async def play_clip(self, path, rate=1.0):
        try:
            dur = os.path.getsize(path) * 8 / 64000 / rate
        except OSError:
            log.warning('hiányzó hangfájl: %s', path)
            dur = 1.0
        self.played.append(os.path.basename(path))
        log.info('♪ %s (%.1f s)', os.path.basename(path), dur)
        self._stop.clear()
        self._until = time.monotonic() + dur * self.speed
        try:
            await asyncio.wait_for(self._stop.wait(), timeout=dur * self.speed)
        except asyncio.TimeoutError:
            pass
        self._until = 0.0

    def level(self):
        if time.monotonic() < self._until:
            return 0.35 + 0.35 * abs(math.sin(time.monotonic() * 17))
        return 0.0

    def stop(self):
        self._until = 0.0
        self._stop.set()

    def sfx(self, wav_bytes):
        log.info('♪ hangeffekt (%d bájt)', len(wav_bytes))

    def music(self, wav_bytes, loop=True):
        self.music_on = wav_bytes is not None
        log.info('♪ zene %s', 'indul' if self.music_on else 'leáll')


class SimMcu(hal.Mcu):
    def __init__(self):
        super().__init__()
        self.sent = []

    def send(self, obj):
        self.sent.append(obj)
        if obj.get('cmd') != 'beat':
            log.info('-> XIAO %s', obj)

    def inject(self, ev):
        self.events.put_nowait(ev)


class SimCamera(hal.Camera):
    def __init__(self, face=0.7, looking=0.15, tired=0.0):
        self.p, self.enabled = (face, looking, tired), True

    async def look(self):
        if not self.enabled:
            return {'face': False}
        f, l, t = self.p
        face = random.random() < f
        return {'face': face, 'looking': face and random.random() < l, 'tired': face and random.random() < t, 'x': 0.0}

    def enable(self, on):
        self.enabled = on
        log.info('kamera %s', 'BE' if on else 'KI')


def make(voice_dir, frames_dir=None, speed=1.0):
    return hal.Hardware(SimDisplay(frames_dir), SimAudio(speed), SimMcu(), SimCamera(), voice_dir)
