"""A C-kocka üzenetei – ugyanaz a nyelv, mint a webes szimulátorban (sim.html protokollnaplója).

Három irány:
  app  -> Pi   : parancsok   {"type": "persona.set", "data": {"name": "hype"}}      (WebSocket, JSON)
  Pi   -> app  : események   {"type": "event.throw", "data": {"count": 3}}          (WebSocket, JSON)
  XIAO <-> Pi  : soronként egy JSON (USB CDC soros port, 115200)
       XIAO -> Pi : {"ev": "button", "id": 1} | {"ev": "touch"} | {"ev": "imu", "kind": "throw"|"shake"|"flip", "up": true}
                    {"ev": "hello", "fw": "1.1", "imu": true, "haptic": true, "touch": "touchio"|"digital", "upside": false}
                    {"ev": "battery", ...}
       Pi -> XIAO : {"cmd": "leds", "hue": 28, "bright": 0.8, "mode": "solid"|"dim"|"party"|"off"|"listen"|"think"}
                    {"cmd": "beat"}  (party: egy ütem – a XIAO színt vált és felvillan)
                    {"cmd": "haptic", "pattern": "buzz"|"tick"}
                    {"cmd": "camled", "on": true}
"""
import json

PERSONAS = ('sunny', 'chill', 'hype', 'sarcastic', 'pro', 'custom')
SOUNDS = ('horn', 'gooo', 'drum', 'coffee')

# parancs -> a data kötelező/megengedett mezői és ellenőrzői
COMMANDS = {
    'power.on': {}, 'power.off': {},
    'persona.set': {'name': lambda v: v in PERSONAS},
    'persona.custom': {'humor': 'pct', 'energy': 'pct', 'chatty': 'pct', 'sarcasm': 'pct', 'kind': 'pct'},
    'mode.party': {'on': bool}, 'mode.dnd': {'on': bool},
    'peek.set': {'on': bool}, 'voice.set': {'on': bool},
    'led.color': {'hue': lambda v: isinstance(v, (int, float)) and 0 <= v < 360},
    'led.brightness': {'value': lambda v: isinstance(v, (int, float)) and 0 <= v <= 1},
    'user.nickname': {'name': lambda v: isinstance(v, str) and len(v) <= 20},     # üres = vissza az alapértékre (Captain)
    'button.assign': {'button': lambda v: v in (2, 3, 4), 'sound': lambda v: v in SOUNDS},
    'state.request': {},
}


class ProtocolError(ValueError):
    pass


def _check(rule, v):
    if rule == 'pct':
        return isinstance(v, (int, float)) and 0 <= v <= 100
    if rule is bool:
        return isinstance(v, bool)
    return rule(v)


def parse_command(raw):
    """Egy app-üzenet ellenőrzése. Visszaad: (type, data); hibás üzenetnél ProtocolError."""
    try:
        msg = json.loads(raw) if isinstance(raw, (str, bytes)) else raw
    except json.JSONDecodeError as e:
        raise ProtocolError('nem JSON: %s' % e)
    t, d = msg.get('type'), msg.get('data') or {}
    if t not in COMMANDS:
        raise ProtocolError('ismeretlen parancs: %r' % t)
    rules = COMMANDS[t]
    for k, v in d.items():
        if k not in rules or not _check(rules[k], v):
            raise ProtocolError('%s: hibás mező %s=%r' % (t, k, v))
    if t not in ('persona.custom',) and set(rules) - set(d):
        raise ProtocolError('%s: hiányzó mező(k): %s' % (t, ', '.join(sorted(set(rules) - set(d)))))
    return t, d


def event(type_, **data):
    return json.dumps({'type': type_, 'data': data}, ensure_ascii=False)


def mcu_line(obj):
    """Pi -> XIAO üzenet egy sorban."""
    return (json.dumps(obj, separators=(',', ':')) + '\n').encode()
