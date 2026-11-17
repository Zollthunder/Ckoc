"""A kocka állapota és a beállítások mentése (a Pi-n: ~/.config/ckocka/settings.json)."""
import json, os, time
from dataclasses import dataclass, field, asdict

PERSONA_HUE = {'sunny': 45, 'chill': 187, 'hype': 330, 'sarcastic': 250, 'pro': 28}
# lejátszási sebesség személyiségenként (a hangfájl kicsit gyorsabb/lassabb)
PERSONA_RATE = {'sunny': 1.04, 'chill': 0.94, 'hype': 1.09, 'sarcastic': 0.97, 'pro': 1.0}


@dataclass
class State:
    on: bool = False
    persona: str = 'sunny'
    sliders: dict = field(default_factory=lambda: {'humor': 80, 'energy': 60, 'chatty': 50, 'sarcasm': 30, 'kind': 90})
    party: bool = False
    dnd: bool = False
    cat: bool = False            # cat mode: macskaarc, simogatásra dorombol
    peek: bool = True
    voice: bool = True
    hue: float = 45
    bright: float = 0.8
    nick: str = 'Captain'
    assign: dict = field(default_factory=lambda: {2: 'horn', 3: 'gooo', 4: 'coffee'})
    upside_down: bool = False
    throws: int = 0
    busy: bool = False
    last_seen: float = 0.0

    def base_persona(self):
        """A „Saját” személyiség a csúszkák alapján egy alap-személyiség hangjait használja."""
        if self.persona != 'custom':
            return self.persona
        s = self.sliders
        return 'sarcastic' if s['sarcasm'] > 60 else 'hype' if s['energy'] > 70 else 'chill' if s['energy'] < 30 else 'sunny'

    def rate(self):
        if self.persona == 'custom':
            return 0.94 + self.sliders['energy'] / 666
        return PERSONA_RATE[self.persona]

    def public(self):
        """Az appnak küldött állapot (ugyanaz a forma, mint a webes szimulátorban)."""
        d = asdict(self)
        d['flipped'] = d.pop('upside_down')
        for k in ('throws', 'busy', 'last_seen'):
            d.pop(k)
        d['assign'] = {str(k): v for k, v in self.assign.items()}
        return d


SETTINGS_KEYS = ('persona', 'sliders', 'cat', 'peek', 'voice', 'hue', 'bright', 'nick', 'assign', 'last_seen')


def settings_path():
    return os.path.join(os.environ.get('CKOCKA_HOME') or os.path.expanduser('~/.config/ckocka'), 'settings.json')


def load(st: State):
    try:
        with open(settings_path(), encoding='utf-8') as f:
            d = json.load(f)
        for k in SETTINGS_KEYS:
            if k in d:
                setattr(st, k, d[k])
        st.assign = {int(k): v for k, v in st.assign.items()}
    except (OSError, ValueError):
        pass
    return st


def save(st: State):
    p = settings_path()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({k: getattr(st, k) for k in SETTINGS_KEYS}, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)       # atomikus csere: áramszünetnél sem sérül a fájl


def since_text(last_seen, now=None):
    """„14 hours, 3 minutes and 12 seconds” – a bekapcsolási köszönéshez (felirat / napló)."""
    if not last_seen:
        return '14 hours, 3 minutes and 12 seconds'
    s = max(1, int((now or time.time()) - last_seen))
    h, m, sec = s // 3600, s % 3600 // 60, s % 60
    return (f'{h} hours, ' if h else '') + (f'{m} minutes and ' if m else '') + f'{sec} seconds'
