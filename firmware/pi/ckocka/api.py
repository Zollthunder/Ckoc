"""WebSocket-kapcsolat a telefonos apphoz (helyi Wi-Fi): ws://ckocka.local:8765

Az app ugyanazokat a parancsokat küldi, mint a webes szimulátor (persona.set, led.color …), a kocka eseményeket
és állapotot küld vissza. Ha a CKOCKA_TOKEN környezeti változó be van állítva, az első üzenetnek
{"type": "auth", "token": "..."} kell lennie (párosító kód) – így a hálózaton más nem vezérelheti.
A Bluetooth (BLE) kapcsolat ugyanerre az üzenetformára épülhetne; ez a koncepcióban nincs kidolgozva.
"""
import asyncio, json, logging, os

log = logging.getLogger('ckocka.api')


async def serve(cube, host='0.0.0.0', port=8765):
    try:
        import websockets
    except ImportError:
        log.warning('a "websockets" csomag nincs telepítve – az app-kapcsolat kikapcsolva (pip install websockets)')
        return
    token = os.environ.get('CKOCKA_TOKEN')

    async def handler(ws):
        peer = getattr(ws, 'remote_address', '?')
        if token:
            try:
                first = json.loads(await asyncio.wait_for(ws.recv(), 10))
            except Exception:
                return await ws.close(1008, 'auth')
            if first.get('type') != 'auth' or first.get('token') != token:
                return await ws.close(1008, 'auth')
        log.info('app csatlakozott: %s', peer)
        queue = asyncio.Queue()
        cube.listeners.append(queue.put_nowait)
        cube.broadcast_state()

        async def sender():
            while True:
                await ws.send(await queue.get())
        task = asyncio.ensure_future(sender())
        try:
            async for raw in ws:
                await ws.send(json.dumps({'type': 'ack', 'data': await cube.command_json(raw)}))
        finally:
            task.cancel()
            cube.listeners.remove(queue.put_nowait)
            log.info('app lecsatlakozott: %s', peer)

    async with websockets.serve(handler, host, port):
        log.info('app-kapcsolat: ws://%s:%d', host, port)
        await asyncio.Future()
