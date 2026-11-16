# C-kocka – Seeed XIAO RP2040 firmware (CircuitPython 9.x)
# A kocka „reflexei”: LED-gyűrű + C-szalag, 4 gomb, érintés, mozgásérzékelő (dobás / rázás / fordítás), rezgés.
# A Raspberry Pi-vel USB-n beszél (usb_cdc data port), soronként egy JSON – lásd firmware/pi/ckocka/protocol.py.
#
# Lábkiosztás (XIAO RP2040):
#   D0  NeoPixel Ring 24 (alsó fénygyűrű)        D1  S-alakú WS2812 szalag a C mögött (7 LED)
#   D2  gomb 1 – Andor (fa)   D3 gomb 2   D8 gomb 3   D9 gomb 4      (gomb a GND felé, belső felhúzás)
#   D10 AT42QT1010 OUT (érintés, aktív magas)
#   D4/D5  I2C (SDA/SCL) – Qwiic lánc: LSM6DS3TR-C (IMU) + DRV2605L (rezgés)
#
# Szükséges könyvtárak (circup install): neopixel, adafruit_lsm6ds, adafruit_drv2605, adafruit_debouncer, adafruit_ticks
# boot.py-ban: usb_cdc.enable(console=True, data=True)   – a „data” porton megy a JSON
import json, math, time
import board, digitalio, busio, neopixel, usb_cdc
from adafruit_debouncer import Debouncer

FW = '1.0'
RING_N, C_N = 24, 7

ring = neopixel.NeoPixel(board.D0, RING_N, brightness=1.0, auto_write=False)
cstrip = neopixel.NeoPixel(board.D1, C_N, brightness=1.0, auto_write=False)


def pin_in(p, pull=digitalio.Pull.UP):
    d = digitalio.DigitalInOut(p)
    d.direction = digitalio.Direction.INPUT
    d.pull = pull
    return d


buttons = [Debouncer(pin_in(p)) for p in (board.D2, board.D3, board.D8, board.D9)]
touch = Debouncer(pin_in(board.D10, None))

i2c = busio.I2C(board.D5, board.D4)
try:
    from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC
    imu = LSM6DS3TRC(i2c)
except Exception:
    imu = None
try:
    import adafruit_drv2605
    haptic = adafruit_drv2605.DRV2605(i2c)
except Exception:
    haptic = None

port = usb_cdc.data or usb_cdc.console


def send(obj):
    if port:
        port.write((json.dumps(obj) + '\n').encode())


# ------------------------------------------------------------------ fények
L = {'hue': 28, 'bright': 0.8, 'mode': 'off', 'flash': 0.0, 'camled': False}


def hsv(h, v):
    h = (h % 360) / 60
    i, f = int(h), h - int(h)
    p, q, t = 0, v * (1 - f), v * f
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i % 6]
    return int(r * 255), int(g * 255), int(b * 255)


def draw_leds(now):
    mode, b = L['mode'], L['bright']
    if mode == 'off':
        ring.fill((0, 0, 0)); cstrip.fill((0, 0, 0))
    elif mode == 'dim':                               # Ne zavarj / fejjel lefelé: alig látszó, lassan „lélegző” fény
        v = b * (0.06 + 0.04 * math.sin(now * 1.2))
        ring.fill(hsv(L['hue'], v)); cstrip.fill(hsv(L['hue'], v))
    elif mode == 'party':                             # ütemre (a Pi küldi a "beat"-et) színváltás és felvillanás
        L['flash'] = max(0.35, L['flash'] - 0.06)
        for i in range(RING_N):
            ring[i] = hsv(L['hue'] + i * 15 + now * 40, b * L['flash'])
        cstrip.fill(hsv(L['hue'] + 180, b * L['flash']))
    else:
        ring.fill(hsv(L['hue'], b * 0.85)); cstrip.fill(hsv(L['hue'], b))
    if L['camled']:                                   # a kamera jelzőfénye: a C-szalag utolsó LED-je zöld (mindig látszik, ha a kamera figyel)
        cstrip[C_N - 1] = (0, 160, 40)
    ring.show(); cstrip.show()


# ------------------------------------------------------------------ mozgás: dobás, rázás, fordítás
IMU = {'free_t': None, 'shake': [], 'down_since': None, 'upside': False, 'cool': 0.0}


def read_imu(now):
    if not imu:
        return
    ax, ay, az = (v / 9.81 for v in imu.acceleration)     # g egységben
    g = math.sqrt(ax * ax + ay * ay + az * az)
    if now < IMU['cool']:
        return
    # dobás: szabadesés (< 0,3 g legalább 80 ms), majd becsapódás (> 2,5 g)
    if g < 0.3:
        IMU['free_t'] = IMU['free_t'] or now
    elif IMU['free_t'] is not None:
        if now - IMU['free_t'] > 0.08 and g > 2.5:
            send({'ev': 'imu', 'kind': 'throw'}); IMU['cool'] = now + 1.5
        if now - IMU['free_t'] > 1.5 or g > 2.5:
            IMU['free_t'] = None
    # rázás: legalább 4 erős lökés (> 1,8 g) 1 másodpercen belül
    if g > 1.8:
        IMU['shake'] = [t for t in IMU['shake'] if now - t < 1.0] + [now]
        if len(IMU['shake']) >= 4:
            send({'ev': 'imu', 'kind': 'shake'}); IMU['shake'] = []; IMU['cool'] = now + 1.2
    # fordítás hiszterézissel: fejjel lefelé, ha z < -0,8 g; vissza csak ha z > +0,5 g (oldalára fektetve marad, ami volt) – 0,5 s-ig tartósan
    down = (az < -0.8) if not IMU['upside'] else not (az > 0.5)
    if down != IMU['upside']:
        IMU['down_since'] = IMU['down_since'] or now
        if now - IMU['down_since'] > 0.5:
            IMU['upside'] = down
            send({'ev': 'imu', 'kind': 'flip', 'up': down}); IMU['down_since'] = None
    else:
        IMU['down_since'] = None


# ------------------------------------------------------------------ Pi -> XIAO parancsok
buf = b''


def read_port():
    global buf
    if not port or not port.in_waiting:
        return
    buf += port.read(port.in_waiting)
    while b'\n' in buf:
        line, buf = buf.split(b'\n', 1)
        try:
            m = json.loads(line)
        except ValueError:
            continue
        c = m.get('cmd')
        if c == 'leds':
            L.update(hue=m.get('hue', L['hue']), bright=m.get('bright', L['bright']), mode=m.get('mode', L['mode']))
        elif c == 'beat':
            L['hue'] = (L['hue'] + 47) % 360; L['flash'] = 1.0
        elif c == 'camled':
            L['camled'] = bool(m.get('on'))
        elif c == 'haptic' and haptic:
            haptic.sequence[0] = adafruit_drv2605.Effect(47 if m.get('pattern') == 'buzz' else 1)   # 47: buzz, 1: tick
            haptic.play()


# ------------------------------------------------------------------ főciklus (~100 Hz)
send({'ev': 'hello', 'fw': FW, 'imu': imu is not None, 'haptic': haptic is not None, 'upside': IMU['upside']})
last_hello = time.monotonic()
while True:
    now = time.monotonic()
    for i, b in enumerate(buttons):
        b.update()
        if b.fell:                                    # lenyomás (a gomb a GND felé húz)
            send({'ev': 'button', 'id': i + 1})
    touch.update()
    if touch.rose:
        send({'ev': 'touch'})
    read_imu(now)
    read_port()
    draw_leds(now)
    if now - last_hello > 30:                         # életjel: ha a Pi újraindul, újra megkapja az állapotot (a tájolást is)
        send({'ev': 'hello', 'fw': FW, 'upside': IMU['upside']}); last_hello = now
    time.sleep(0.01)
