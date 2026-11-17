# C-kocka – Seeed XIAO RP2040 firmware (CircuitPython 9.x)
# A kocka „reflexei”: LED-gyűrű + C-szalag, 4 gomb, érintés, mozgásérzékelő (dobás / rázás / fordítás), rezgés.
# Hardver a 2026-11-17-i költségoptimalizálás szerint: az érintést a XIAO maga érzékeli (touchio), a rezgés egy kész
# rezgőmotor-modul PWM-mel hajtva (az AT42QT1010 és a DRV2605L kimaradt).
# A Raspberry Pi-vel USB-n beszél (usb_cdc data port), soronként egy JSON – lásd firmware/pi/ckocka/protocol.py.
#
# Lábkiosztás (XIAO RP2040):
#   D0  NeoPixel Ring 24 (alsó fénygyűrű)        D1  S-alakú WS2812 szalag a C mögött (7 LED)
#       – mindkettő 74AHCT125 szintillesztőn át (3,3 V -> 5 V); a LED-ek tápja a UPS 5 V-ja, közös GND;
#         összesen legfeljebb 30 % fényerő (reflex.LED_BUDGET, ≈ 0,56 A)
#   D2  gomb 1 – Andor (fa)   D3 gomb 2   D8 gomb 3   D9 gomb 4      (gomb a GND felé, belső felhúzás)
#   D10 érintés: rézfólia-elektróda (az érintőbetét alatt) + 1 MΩ lehúzó ellenállás a GND felé (a gombok prototípus-lapján)
#       – a touchio lehúzó ellenállás nélkül nem indul; ilyenkor digitális bemenetként olvassuk, így tartalékként
#         egy AT42QT1010 (aktív magas kimenet) is visszadugható ugyanide, szoftvercsere nélkül
#   D6  rezgőmotor-modul jelbemenete (IN/SIG), PWM 20 kHz; a modul VCC-je 3V3 (vagy 5V), GND közös
#   D4 = SDA, D5 = SCL  I2C – LSM6DS3TR-C (IMU) az Adafruit 4397 kábellel (STEMMA QT -> női Dupont: 3V3, GND, D4, D5;
#          a XIAO-n nincs Qwiic-aljzat) – függőlegesen a szán jobb sínjén; a tengelyek átszámolása egy helyen:
#          reflex.IMU_AXES (a mozgásfelismerés már a kocka tengelyein dolgozik). Ha nincs bekötve, IMU nélkül fut.
#
# Szükséges könyvtárak (circup install): neopixel, adafruit_lsm6ds, adafruit_debouncer, adafruit_ticks
# A CIRCUITPY meghajtóra: boot.py, code.py és reflex.py (érintés, rezgés, IMU-tengelyek – PC-n tesztelve)
# boot.py-ban: usb_cdc.enable(console=True, data=True)   – a „data” porton megy a JSON
import json, math, time
import board, digitalio, busio, neopixel, usb_cdc
from adafruit_debouncer import Debouncer
from reflex import TouchDetector, Buzzer, duty_u16, to_cube, led_scale

FW = '1.2'
RING_N, C_N = 24, 7

ring = neopixel.NeoPixel(board.D0, RING_N, brightness=1.0, auto_write=False)
cstrip = neopixel.NeoPixel(board.D1, C_N, brightness=1.0, auto_write=False)


def pin_in(p, pull=digitalio.Pull.UP):
    d = digitalio.DigitalInOut(p)
    d.direction = digitalio.Direction.INPUT
    d.pull = pull
    return d


buttons = [Debouncer(pin_in(p)) for p in (board.D2, board.D3, board.D8, board.D9)]

# érintés: touchio (1 MΩ lehúzóval); ha nem indul, digitális bemenet (AT42QT1010 tartalék)
touch_pad, touch_dig, touch_det = None, None, TouchDetector()
try:
    import touchio
    touch_pad = touchio.TouchIn(board.D10)
except Exception as e:                                # ValueError: nincs lehúzó ellenállás a lábon – ne álljon le
    print('FIGYELEM: az érintés (touchio) nem indult a D10-en:', e)
    print('  Kell egy 1 MΩ-os ellenállás a D10 és a GND közé (a gombok prototípus-lapján).')
    print('  Addig digitális bemenetként olvasom (belső lehúzással: nem ad hamis érintést; AT42QT1010 is mehet ide).')
    touch_dig = Debouncer(pin_in(board.D10, digitalio.Pull.DOWN))
TOUCH_KIND = 'touchio' if touch_pad else 'digital'

# rezgés: kész rezgőmotor-modul (ERM + tranzisztor) PWM-mel
try:
    import pwmio
    motor = pwmio.PWMOut(board.D6, frequency=20000, duty_cycle=0)   # 20 kHz: nem hallható sípolás
except Exception:
    motor = None
buzzer = Buzzer()

try:                                                  # busio.I2C(SCL, SDA): D5 = SCL, D4 = SDA
    i2c = busio.I2C(board.D5, board.D4)               # felhúzó nélkül (nincs bekötve az IMU) RuntimeError-t dob
    from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC
    imu = LSM6DS3TRC(i2c)
except Exception as e:
    print('FIGYELEM: nincs IMU (LSM6DS3TR-C a D4/D5-ön, Adafruit 4397 kábel):', e)
    imu = None

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
    elif mode == 'listen':                            # hallgat: a gyűrű lassan „lélegzik”
        v = b * (0.45 + 0.4 * math.sin(now * 3.2))
        ring.fill(hsv(L['hue'], v)); cstrip.fill(hsv(L['hue'], b))
    elif mode == 'think':                             # gondolkodik: körbefutó fénycsík a gyűrűn
        head = now * 14
        for i in range(RING_N):
            k = max(0.0, 1 - ((head - i) % RING_N) / 6)
            ring[i] = hsv(L['hue'], b * (0.08 + 0.9 * k))
        cstrip.fill(hsv(L['hue'], b * 0.5))
    else:
        ring.fill(hsv(L['hue'], b * 0.85)); cstrip.fill(hsv(L['hue'], b))
    if L['camled']:                                   # a kamera jelzőfénye: a C-szalag utolsó LED-je zöld (mindig látszik, ha a kamera figyel)
        cstrip[C_N - 1] = (0, 160, 40)
    ring.brightness = cstrip.brightness = led_scale(list(ring) + list(cstrip))   # összesen ≤ 30 % (UPS 5 V)
    ring.show(); cstrip.show()


# ------------------------------------------------------------------ mozgás: dobás, rázás, fordítás
IMU = {'free_t': None, 'shake': [], 'down_since': None, 'upside': False, 'cool': 0.0}


def read_imu(now):
    if not imu:
        return
    ax, ay, az = to_cube([v / 9.81 for v in imu.acceleration])   # g egységben, a KOCKA tengelyein (Y fel)
    g = math.sqrt(ax * ax + ay * ay + az * az)                   # dobás, rázás: csak a nagyság számít (iránytól független)
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
    # fordítás hiszterézissel: fejjel lefelé, ha a kocka Y-ja < -0,8 g; vissza csak ha > +0,5 g (oldalára fektetve
    # marad, ami volt) – 0,5 s-ig tartósan. Fejjel lefelé a Pi némítja a mikrofont és kikapcsolja a kamerát.
    down = (ay < -0.8) if not IMU['upside'] else not (ay > 0.5)
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
        elif c == 'haptic' and motor:
            buzzer.play(m.get('pattern', 'tick'), time.monotonic())     # 'buzz': Ne zavarj, 'tick': hallgat


def read_touch(now):
    """True, ha most kezdődött egy érintés."""
    if touch_pad:
        return touch_det.update(touch_pad.raw_value, now)
    touch_dig.update()
    return touch_dig.rose


# ------------------------------------------------------------------ főciklus (~100 Hz)
if imu:                                               # a konzolra: álló kockánál ≈ (0, 1, 0) – lásd reflex.IMU_AXES
    print('cube_g', tuple(round(v / 9.81, 2) + 0.0 for v in to_cube(imu.acceleration)))   # +0.0: ne írjon -0.0-t
send({'ev': 'hello', 'fw': FW, 'imu': imu is not None, 'haptic': motor is not None, 'touch': TOUCH_KIND,
      'upside': IMU['upside']})
last_hello = time.monotonic()
while True:
    now = time.monotonic()
    for i, b in enumerate(buttons):
        b.update()
        if b.fell:                                    # lenyomás (a gomb a GND felé húz)
            send({'ev': 'button', 'id': i + 1})
    if read_touch(now):
        send({'ev': 'touch'})
    read_imu(now)
    read_port()
    if motor:
        motor.duty_cycle = duty_u16(buzzer.duty(now))
    draw_leds(now)
    if now - last_hello > 30:                         # életjel: ha a Pi újraindul, újra megkapja az állapotot (a tájolást is)
        send({'ev': 'hello', 'fw': FW, 'upside': IMU['upside']}); last_hello = now
    time.sleep(0.01)
