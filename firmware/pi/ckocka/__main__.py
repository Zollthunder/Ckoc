"""A C-kocka szoftverének indítása.

  Raspberry Pi-n:     python3 -m ckocka
  PC-n, hardver nélkül: python -m ckocka --sim                (interaktív: írd be: 1-4, t, throw, shake, flip, call, q,
                                                              ask <angol mondat>, hey <angol mondat>)
  Bemutató:           python -m ckocka --sim --demo --frames out/   (végigmegy a funkciókon, a kijelző képeit PNG-be menti)
"""
import argparse, asyncio, logging, os, sys

from .brain import Cube
from . import api

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_VOICE = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'web', 'voice'))


async def demo(cube, mcu):
    """Forgatókönyv: ugyanaz, amit a webes szimulátorban kattintgatni lehet."""
    steps = [
        ('bekapcsolás (bármely gomb)', lambda: mcu.inject({'ev': 'button', 'id': 3}), 6),
        ('Andor-gomb: dad joke', lambda: mcu.inject({'ev': 'button', 'id': 1}), 1),
        ('vicc közben újra megnyomva (ki kell hagynia)', lambda: mcu.inject({'ev': 'button', 'id': 1}), 6),
        ('app: Hype személyiség', lambda: cube.command_json('{"type":"persona.set","data":{"name":"hype"}}'), 5),
        ('dobás', lambda: mcu.inject({'ev': 'imu', 'kind': 'throw'}), 5),
        ('rázás: YES/NO', lambda: mcu.inject({'ev': 'imu', 'kind': 'shake'}), 4),
        ('app: party mód', lambda: cube.command_json('{"type":"mode.party","data":{"on":true}}'), 3),
        ('érintés + kérdés: beszélgetés (kulcs nélkül a szimulált ész felel)', lambda: ask(cube, mcu, 'What should I do this afternoon?'), 6),
        ('fejjel lefelé: adatvédelem', lambda: mcu.inject({'ev': 'imu', 'kind': 'flip', 'up': True}), 2),
        ('vissza', lambda: mcu.inject({'ev': 'imu', 'kind': 'flip', 'up': False}), 2),
        ('app: Ne zavarj', lambda: cube.command_json('{"type":"mode.dnd","data":{"on":true}}'), 1),
        ('gomb Ne zavarj módban (csak rezeg)', lambda: mcu.inject({'ev': 'button', 'id': 2}), 2),
        ('hibás app-üzenet (vissza kell utasítania)', lambda: cube.command_json('{"type":"led.color","data":{"hue":999}}'), 1),
    ]
    for title, act, wait in steps:
        logging.getLogger('demo').info('=== %s', title)
        r = act()
        if asyncio.iscoroutine(r):
            res = await r
            if not res.get('ok'):
                logging.getLogger('demo').info('    válasz: %s', res)
        await asyncio.sleep(wait)


def ask(cube, mcu, text, wake=False):
    """Szimuláció: valaki megszólítja a kockát (érintéssel vagy ébresztőszóval) és ezt mondja."""
    if not cube.talk:
        print('A beszélgetés ki van kapcsolva (--talk off).')
        return
    cube.talk.ears.hear(text)
    if wake:
        cube.talk.ears.wake_word()
    else:
        mcu.inject({'ev': 'touch'})


def make_talk(a):
    """A beszélgetés összerakása: ész = Claude (ha van ANTHROPIC_API_KEY), különben szimulációban a kulcs nélküli SimMind."""
    if a.talk == 'off':
        return None
    from . import claude
    log = logging.getLogger('ckocka')
    mind = None
    if a.talk == 'claude' or (a.talk == 'auto' and claude.has_key()):
        try:
            mind = claude.ClaudeMind()
        except ImportError:
            log.warning('az "anthropic" csomag nincs telepítve (pip install anthropic) – Claude nélkül')
    if not claude.has_key() and a.talk != 'sim':
        log.warning('nincs ANTHROPIC_API_KEY környezeti változó – %s', 'szimulált válaszok' if a.sim else 'beszélgetés nélkül')
    if a.sim:
        from . import talk_sim
        return talk_sim.make(mind, a.speed)
    if mind is None:
        return None                                  # a Pi-n kulcs nélkül: érintésre a régi viselkedés (idő / mondat)
    from . import talk_real
    return talk_real.make(mind)


async def main(a):
    if a.sim:
        from . import hw_sim
        hw = hw_sim.make(a.voice or REPO_VOICE, a.frames, a.speed)
    else:
        from . import hw_real
        hw = hw_real.make(a.voice or '/opt/ckocka/voice')
    cube = Cube(hw, settings=not a.demo, talk=make_talk(a))
    cube.start()
    tasks = []
    if not a.no_api:
        tasks.append(asyncio.ensure_future(api.serve(cube, port=a.port)))
    if a.demo:
        await demo(cube, hw.mcu)
        cube.stop()
        print('\nKész. Kijelzőképek: %d mentve%s; XIAO-üzenetek: %d; lejátszott mondatok: %s' % (
            len(hw.display.saved), ' (%s)' % a.frames if a.frames else '', len(hw.mcu.sent), ', '.join(hw.audio.played)))
        return
    if a.sim:
        await interactive(cube, hw.mcu)
    else:
        await asyncio.Future()


async def interactive(cube, mcu):
    loop = asyncio.get_running_loop()
    print('Parancsok: 1-4 (gombok), t (érintés), throw, shake, flip, unflip, call, cmd {json}, q\n'
          '           ask <mondat> (érintés + kérdés), hey <mondat> (ébresztőszó + kérdés) – angolul')
    while True:
        line = (await loop.run_in_executor(None, sys.stdin.readline)).strip()
        if line in ('q', ''):
            if line == 'q':
                break
            continue
        if line in '1234' and len(line) == 1:
            mcu.inject({'ev': 'button', 'id': int(line)})
        elif line == 't':
            mcu.inject({'ev': 'touch'})
        elif line in ('throw', 'shake'):
            mcu.inject({'ev': 'imu', 'kind': line})
        elif line in ('flip', 'unflip'):
            mcu.inject({'ev': 'imu', 'kind': 'flip', 'up': line == 'flip'})
        elif line == 'call':
            asyncio.ensure_future(cube.incoming_call())
        elif line.startswith(('ask ', 'hey ')):
            ask(cube, mcu, line[4:], wake=line.startswith('hey '))
        elif line.startswith('cmd '):
            print(await cube.command_json(line[4:]))
    cube.stop()


def run():
    p = argparse.ArgumentParser(prog='ckocka', description='A C-kocka szoftvere (Raspberry Pi Zero 2 W + XIAO RP2040)')
    p.add_argument('--sim', action='store_true', help='szimulált hardver (PC)')
    p.add_argument('--demo', action='store_true', help='bemutató forgatókönyv (csak --sim-mel)')
    p.add_argument('--frames', help='a kijelző kulcsképeinek mappája (szimulációban)')
    p.add_argument('--voice', help='a hangfájlok mappája (lines.json + *.mp3)')
    p.add_argument('--speed', type=float, default=1.0, help='szimulációban a mondatok időtartamának szorzója')
    p.add_argument('--port', type=int, default=8765)
    p.add_argument('--no-api', action='store_true')
    p.add_argument('--talk', choices=('auto', 'claude', 'sim', 'off'), default='auto',
                   help='beszélgetés: auto = Claude, ha van ANTHROPIC_API_KEY (szimulációban különben szimulált ész); '
                        'sim = mindig szimulált ész; off = nincs')
    p.add_argument('-v', '--verbose', action='store_true')
    a = p.parse_args()
    if a.demo and not a.sim:
        p.error('a --demo csak --sim módban fut')
    logging.basicConfig(level=logging.INFO if (a.verbose or a.sim) else logging.WARNING,
                        format='%(asctime)s %(name)-10s %(message)s', datefmt='%H:%M:%S')
    try:
        asyncio.run(main(a))
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    run()
