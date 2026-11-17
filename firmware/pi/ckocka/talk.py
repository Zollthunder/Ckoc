"""Beszélgetés: ébresztőszó vagy érintés → hallgatás → beszédfelismerés → Claude → beszédszintézis → hangszóró.

Négy cserélhető rész, a hardver-absztrakció (hal.py) mintájára:
  Ears   mikrofon: ébresztőszó figyelése és egy mondat felvétele (16 kHz, mono, 16 bit PCM)
  Stt    beszédfelismerés: PCM -> szöveg (a Pi-n helyben: faster-whisper)
  Mind   a válasz: rendszerprompt + beszélgetés -> szöveg (Claude API)
  Voice  beszédszintézis: szöveg -> WAV-fájl, amit a hal.Audio játszik le (a Pi-n helyben: Piper)

Valódi megvalósítás: talk_real.py (Pi), szimulált: talk_sim.py (PC, tesztek – mikrofon, hálózat és kulcs nélkül).
Ez a fájl hardver- és hálózatfüggetlen: a személyiségek rendszerpromptja, a beszélgetés emléke és a csend-felismerés.
"""
import abc, asyncio, math, re, time
from dataclasses import dataclass, field

MODEL = 'claude-opus-5-5'
SAMPLE_RATE = 16000              # a mikrofon és a Whisper mintavétele
FRAME = 1280                     # 80 ms – az openWakeWord ekkora darabokat vár


# ------------------------------------------------------------------ a négy cserélhető rész
class Ears(abc.ABC):
    async def wake(self):
        """Visszatér, amikor elhangzott az ébresztőszó. Alapból soha (ekkor csak érintésre hallgat)."""
        await asyncio.Future()

    @abc.abstractmethod
    async def record(self, max_s=10.0):
        """Egy mondat felvétele a csend végéig. Visszaad: PCM bájtok (b'', ha senki nem szólalt meg)."""

    @abc.abstractmethod
    def enable(self, on):
        """Fejjel lefelé / adatvédelem: a mikrofon teljesen kikapcsol, a folyamatban lévő felvétel üresen ér véget."""


class Stt(abc.ABC):
    @abc.abstractmethod
    async def transcribe(self, pcm):
        """PCM (16 kHz, mono, 16 bit) -> angol szöveg."""


class Mind(abc.ABC):
    @abc.abstractmethod
    async def reply(self, system, messages):
        """Visszaad: Reply. Hibánál MindError-t dob, benne a kimondható mondattal."""


class Voice(abc.ABC):
    @abc.abstractmethod
    async def synth(self, text, persona):
        """Szöveg -> WAV-fájl elérési útja (a hal.Audio.play_clip játssza le)."""


@dataclass
class Reply:
    text: str                    # amit kimond
    content: object = None       # amit a beszélgetés emlékébe visszaküldünk (Claude-nál a teljes válasz-tartalom)


class MindError(Exception):
    def __init__(self, spoken, detail=''):
        super().__init__(detail or spoken)
        self.spoken = spoken


@dataclass
class Talk:
    ears: Ears
    stt: Stt
    mind: Mind
    voice: Voice
    dialog: 'Dialog' = None

    def __post_init__(self):
        self.dialog = self.dialog or Dialog()


# ------------------------------------------------------------------ személyiségek
BASE_PROMPT = """You are C, a small talking desk cube: 90 mm wide, with a round face display, a ring of lights and a speaker. \
You are a friendly desk companion and assistant for {nick}.

How you talk:
- Your reply is spoken aloud by a small text-to-speech engine. Write plain spoken English only: no markdown, lists, \
emoji, URLs, code or stage directions.
- {length}
- Always answer in English, even if the user speaks another language.
- The user's words come from on-device speech recognition and may contain mistakes. If something is unclear, make a \
sensible guess or ask one short question.
- Each user message starts with the local time in square brackets. Mention it only when it is relevant.
- You cannot browse the web, set timers or alarms, play music on request, or control other devices. If asked, say so \
briefly and suggest what you can do instead.

Your personality right now: {persona}"""

PERSONAS = {
    'sunny': 'Sunny. Warm, upbeat and encouraging, a little playful. You love a good dad joke and you see the bright side.',
    'chill': 'Chill. Relaxed, calm and laid-back. You speak softly and slowly, never rush, and help the user unwind.',
    'hype': "Hype. Bursting with energy, an enthusiastic hype-man. You celebrate the user's wins and pump them up.",
    'sarcastic': 'Sarcastic. Dry, deadpan wit and gentle teasing, but never mean or hurtful, and you still actually help.',
    'pro': 'Pro. Professional, precise and efficient, like a capable executive assistant. No jokes unless asked.',
}
LENGTH = {
    'short': 'Keep it very short: one sentence, at most 25 words, unless the user explicitly asks for more.',
    'normal': 'Keep it short: one to three sentences, under 50 words, unless the user explicitly asks for more.',
    'long': 'Keep it conversational: up to four sentences, under 80 words, unless the user explicitly asks for more.',
}


def _level(v, low, mid, high):
    return low if v < 34 else mid if v < 67 else high


def custom_persona(sliders):
    """A „Saját” személyiség a csúszkákból (0–100) – ugyanazok a csúszkák, mint az appban."""
    s = sliders
    parts = [
        _level(s.get('humor', 50), 'Mostly serious, with little humour.', 'Lightly humorous.', 'Very funny, jokes often.'),
        _level(s.get('energy', 50), 'Calm and low-key.', 'Moderately lively.', 'Very energetic and excited.'),
        _level(s.get('sarcasm', 30), 'Sincere, no sarcasm.', 'A little dry wit now and then.', 'Strongly sarcastic and deadpan, but never cruel.'),
        _level(s.get('kind', 80), 'Blunt and direct.', 'Friendly.', 'Very kind, warm and supportive.'),
    ]
    return 'Custom. ' + ' '.join(parts)


def system_prompt(state):
    """A rendszerprompt a kocka aktuális állapotából (személyiség, becenév, „beszédesség”)."""
    if state.persona == 'custom':
        persona = custom_persona(state.sliders)
        length = _level(state.sliders.get('chatty', 50), 'short', 'normal', 'long')
    else:
        persona = PERSONAS.get(state.persona, PERSONAS['sunny'])
        length = 'short' if state.persona == 'pro' else 'normal'
    return BASE_PROMPT.format(nick=state.nick or 'Captain', length=LENGTH[length], persona=persona)


# ------------------------------------------------------------------ a beszélgetés emléke
@dataclass
class Dialog:
    """A beszélgetés emléke. Csak HOZZÁÍRUNK (a válaszok teljes tartalma változatlanul megy vissza – a Claude
    gondolkodási blokkjai így érvényesek maradnak); régi részt nem törlünk, hanem új beszélgetést kezdünk:
    személyiség- vagy becenévváltáskor, hosszabb csend után, vagy ha túl hosszú lett."""
    idle_s: float = 300.0
    max_turns: int = 12
    messages: list = field(default_factory=list)
    system: str = ''
    last: float = 0.0

    def reset(self):
        self.messages, self.system = [], ''

    def _fresh(self, system, now):
        if system != self.system or now - self.last > self.idle_s or len(self.messages) >= self.max_turns * 2:
            self.messages, self.system = [], system

    async def ask(self, mind, state, text, now=None, clock=None):
        now = time.time() if now is None else now
        self._fresh(system_prompt(state), now)
        stamp = clock or time.strftime('%H:%M, %A', time.localtime(now))
        msgs = self.messages
        msgs.append({'role': 'user', 'content': f'[{stamp}] {text}'})
        try:
            r = await mind.reply(self.system, list(msgs))
        except BaseException:
            msgs.pop()                                # sikertelen kérdés: a beszélgetés maradjon szabályos (user/assistant váltakozva)
            raise
        msgs.append({'role': 'assistant', 'content': r.content if r.content is not None else r.text})
        if msgs is self.messages:                     # ha közben új beszélgetés kezdődött (reset), a régi válasz oda nem kerül be
            self.last = now
        return r


# ------------------------------------------------------------------ kimondható szöveg
_EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿️‍]')


def speakable(text, limit=420):
    """A TTS-nek: markdown, emoji és felesleges szóközök nélkül, mondathatáron rövidítve."""
    t = _EMOJI.sub('', text or '')
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)        # [szöveg](link) -> szöveg
    t = re.sub(r'https?://\S+', '', t)
    t = re.sub(r'^\s*(#+|[-*•]|\d+[.)])\s+', '', t, flags=re.M)
    t = re.sub(r'[*_`#~>|]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if len(t) > limit:
        cut = max(t.rfind(p, 0, limit) for p in '.!?')
        t = t[:cut + 1] if cut > limit // 3 else t[:limit].rsplit(' ', 1)[0] + '.'
    return t


# ------------------------------------------------------------------ csend-felismerés (mikor fejezte be a mondatot)
def rms(frame):
    """Egy 16 bites PCM darab hangereje (numpy nélkül is, hogy a tesztek bárhol fussanak)."""
    import array
    a = array.array('h')
    a.frombytes(frame[:len(frame) // 2 * 2])
    return math.sqrt(sum(x * x for x in a) / len(a)) if a else 0.0


class Endpointer:
    """Hangerő alapú végpont-felismerés 80 ms-os darabokra.
    - az első ~0,3 s legcsendesebb darabjából méri a háttérzajt; beszéd = annál háromszor hangosabb (legalább `floor`)
    - ha `wait_s` alatt senki nem szólal meg: üres felvétel
    - a beszéd után `tail_s` csend: vége; legfeljebb `max_s` hosszú"""

    def __init__(self, max_s=10.0, wait_s=5.0, tail_s=0.8, floor=350.0, frame_s=FRAME / SAMPLE_RATE):
        self.max_n, self.wait_n, self.tail_n = (int(x / frame_s) for x in (max_s, wait_s, tail_s))
        self.floor, self.noise, self.n, self.speech, self.quiet = floor, [], 0, 0, 0

    def push(self, level):
        """Visszaad: None = folytatódik, 'done' = mondat vége, 'empty' = nem szólalt meg senki."""
        self.n += 1
        if len(self.noise) < 4:
            self.noise.append(level)
        # a legcsendesebb darab háromszorosa – de felülről korlátozva: ha azonnal beszélni kezd, a beszédet ne mérje zajnak
        thr = max(self.floor, min(3 * min(self.noise), 3 * self.floor))
        if level > thr:
            self.speech += 1
            self.quiet = 0
        elif self.speech:
            self.quiet += 1
        if self.speech >= 2 and self.quiet >= self.tail_n:
            return 'done'
        if self.n >= self.max_n:
            return 'done' if self.speech >= 2 else 'empty'
        if self.speech < 2 and self.n >= self.wait_n:
            return 'empty'
        return None
