"""Élő próba: a szimulált kocka WebSocket-API-ja egy „telefonos app” klienssel (a websockets csomag kell hozzá).
Futtatás (a firmware/pi mappából):  python tests/api_probe.py
"""
import asyncio, json, os, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ['CKOCKA_HOME'] = tempfile.mkdtemp()
os.environ['CKOCKA_TOKEN'] = 'ckocka-1234'            # párosító kód

import websockets                                      # noqa: E402
from ckocka import api, hw_sim                         # noqa: E402
from ckocka.brain import Cube                          # noqa: E402

VOICE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'web', 'voice'))
PORT = 8799
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(('  OK   ' if ok else '  HIBA ') + name + (' – ' + detail if detail else ''))


async def recv_until(ws, pred, timeout=8):
    """Üzenetek olvasása, amíg pred(msg) igaz nem lesz; visszaadja az összes közben kapott üzenetet."""
    got = []
    try:
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), timeout))
            got.append(m)
            if pred(m):
                return got
    except asyncio.TimeoutError:
        return got


async def main():
    hw = hw_sim.make(VOICE, None, speed=0.05)
    cube = Cube(hw, settings=False)
    hw.camera.enable(False)
    cube.start()
    server = asyncio.ensure_future(api.serve(cube, host='127.0.0.1', port=PORT))
    await asyncio.sleep(0.5)
    url = f'ws://127.0.0.1:{PORT}'

    print('1) párosító kód nélkül:')
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({'type': 'power.on', 'data': {}}))
        try:
            await asyncio.wait_for(ws.recv(), 3)
            check('kapcsolat elutasítva', False, 'üzenetet kapott')
        except websockets.ConnectionClosed as e:
            check('kapcsolat elutasítva', e.rcvd and e.rcvd.code == 1008, f'kód {e.rcvd.code if e.rcvd else "?"}')

    print('2) helyes párosító kóddal, mint a telefonos app:')
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({'type': 'auth', 'token': 'ckocka-1234'}))
        first = json.loads(await asyncio.wait_for(ws.recv(), 3))
        check('állapotot kap csatlakozáskor', first['type'] == 'state', f"on={first['data']['on']}")

        await ws.send(json.dumps({'type': 'power.on', 'data': {}}))
        got = await recv_until(ws, lambda m: m['type'] == 'speech.say' and m['data']['id'] == 'boot3')
        says = [m['data']['id'] for m in got if m['type'] == 'speech.say']
        check('bekapcsolás: a köszönés mondatai eseményként jönnek', says[:3] == ['boot1', 'boot2', 'boot3'], ', '.join(says))
        check('parancs nyugtázva', any(m['type'] == 'ack' and m['data']['ok'] for m in got))

        await recv_until(ws, lambda m: m['type'] == 'state' and m['data']['on'], 4)
        await ws.send(json.dumps({'type': 'persona.set', 'data': {'name': 'hype'}}))
        got = await recv_until(ws, lambda m: m['type'] == 'speech.say' and m['data']['id'] == 'greet_hype')
        st = [m for m in got if m['type'] == 'state']
        check('személyiség: Hype – állapot frissül', bool(st) and st[-1]['data']['persona'] == 'hype' and st[-1]['data']['hue'] == 330)
        check('személyiség: Hype – a kocka köszön', any(m['type'] == 'speech.say' and m['data']['id'] == 'greet_hype' for m in got))
        check('LED-parancs a XIAO-nak', hw.mcu.sent[-1] == {'cmd': 'leds', 'hue': 330, 'bright': 0.8, 'mode': 'solid'}, str(hw.mcu.sent[-1]))

        await ws.send(json.dumps({'type': 'led.color', 'data': {'hue': 999}}))
        got = await recv_until(ws, lambda m: m['type'] == 'ack')
        check('hibás parancs visszautasítva', got and not got[-1]['data']['ok'], got[-1]['data'].get('error', '') if got else '')

        await ws.send('ez nem JSON')
        got = await recv_until(ws, lambda m: m['type'] == 'ack')
        check('nem JSON üzenet visszautasítva, a kapcsolat él', got and not got[-1]['data']['ok'])

        hw.mcu.inject({'ev': 'imu', 'kind': 'throw'})           # valaki eldobja a kockát
        got = await recv_until(ws, lambda m: m['type'] == 'event.throw')
        check('dobás: az app eseményt kap', any(m['type'] == 'event.throw' for m in got))

        hw.mcu.inject({'ev': 'imu', 'kind': 'flip', 'up': True})
        got = await recv_until(ws, lambda m: m['type'] == 'event.orientation')
        ev = [m for m in got if m['type'] == 'event.orientation']
        check('fordítás: mikrofon és kamera ki', bool(ev) and ev[-1]['data'] == {'upsideDown': True, 'microphone': False, 'camera': False})

    print('3) két app egyszerre (pl. telefon + tablet):')
    async with websockets.connect(url) as a, websockets.connect(url) as b:
        for ws in (a, b):
            await ws.send(json.dumps({'type': 'auth', 'token': 'ckocka-1234'}))
            await asyncio.wait_for(ws.recv(), 3)
        await a.send(json.dumps({'type': 'user.nickname', 'data': {'name': 'Zollo'}}))
        got_b = await recv_until(b, lambda m: m['type'] == 'state' and m['data']['nick'] == 'Zollo', 4)
        check('az egyik app módosítása a másikban is látszik', any(m['type'] == 'state' and m['data']['nick'] == 'Zollo' for m in got_b))

    cube.stop()
    server.cancel()
    print(f'\n{sum(results)}/{len(results)} ellenőrzés sikeres')
    return all(results)


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
