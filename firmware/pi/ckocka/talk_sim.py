"""Szimulált beszélgetés a PC-re és a tesztekhez: mikrofon, hálózat és kulcs nélkül.

  SimEars   a „hang” maga a szöveg: hear('what time is it') = valaki ezt mondta; wake_word() = elhangzott az ébresztőszó
  SimStt    a „PCM” visszaalakítása szöveggé
  SimMind   kulcs nélküli, személyiségenként előre megírt válaszok (ha nincs ANTHROPIC_API_KEY)
  SimVoice  valódi (néma) WAV-fájl, a szöveg hosszával arányos időtartammal – a SimAudio ebből számolja, meddig „beszél”
"""
import asyncio, logging, os, tempfile, wave

from . import talk

log = logging.getLogger('ckocka.talk')


class SimEars(talk.Ears):
    def __init__(self, speed=1.0):
        self.speed, self.enabled, self.records = speed, True, 0
        self._heard, self._wake = asyncio.Queue(), asyncio.Event()

    def hear(self, text):
        """Valaki mondott valamit a kockának (a következő felvétel ezt kapja)."""
        self._heard.put_nowait(text)

    def wake_word(self):
        self._wake.set()

    async def wake(self):
        await self._wake.wait()
        self._wake.clear()

    async def record(self, max_s=10.0):
        self.records += 1
        if not self.enabled:
            return b''
        try:
            text = await asyncio.wait_for(self._heard.get(), timeout=max(0.05, 5.0 * self.speed))
        except asyncio.TimeoutError:
            return b''                                   # senki nem szólalt meg
        return text.encode('utf-8') if self.enabled else b''

    def enable(self, on):
        self.enabled = on
        if not on:
            while not self._heard.empty():               # adatvédelem: ami addig „elhangzott”, elveszik
                self._heard.get_nowait()


class SimStt(talk.Stt):
    async def transcribe(self, pcm):
        return pcm.decode('utf-8', 'replace')


SIM_REPLIES = {
    'sunny': "Great question! I'm only the offline simulator, but I'd love to chat once I get my API key.",
    'chill': "Easy now. I'm just the offline simulator, so no real brain yet. Give me a key and we'll talk.",
    'hype': "Whoa, love it! I'm the offline simulator right now, but plug in my API key and let's go!",
    'sarcastic': "Oh, a deep one. Sadly I'm the offline simulator, so my brain is still in the box.",
    'pro': 'Noted. This is the offline simulator; set ANTHROPIC_API_KEY for real answers.',
}


class SimMind(talk.Mind):
    """Előre megírt válasz a rendszerpromptban szereplő személyiség szerint; minden hívást megjegyez (tesztekhez)."""

    def __init__(self, delay=0.0):
        self.delay, self.calls = delay, []

    async def reply(self, system, messages):
        self.calls.append((system, list(messages)))
        await asyncio.sleep(self.delay)
        for name, line in SIM_REPLIES.items():
            if talk.PERSONAS[name] in system:
                return talk.Reply(line)
        return talk.Reply(SIM_REPLIES['sunny'])


class SimVoice(talk.Voice):
    """Néma WAV, szavanként ~0,3 s (8 kHz-en, hogy kicsi legyen); a szövegeket megjegyzi."""

    def __init__(self, out_dir=None):
        self.dir = out_dir or tempfile.mkdtemp(prefix='ckocka-tts-')
        self.spoken, self.n = [], 0

    async def synth(self, text, persona):
        self.spoken.append(text)
        self.n += 1
        path = os.path.join(self.dir, 'reply_%d.wav' % (self.n % 4))
        with wave.open(path, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(8000)
            w.writeframes(b'\0\0' * int(8000 * (0.4 + 0.3 * len(text.split()))))
        log.info('TTS (%s): %s', persona, text)
        return path


def make(mind=None, speed=1.0):
    """Szimulált fülek/hang; az ész alapból a kulcs nélküli SimMind, de átadható a valódi ClaudeMind is."""
    return talk.Talk(SimEars(speed), SimStt(), mind or SimMind(), SimVoice())
