# C-kocka – Seeed XIAO RP2040 firmware (CircuitPython 9.x)
# A kocka „reflexei” ÉS az arca: kerek kijelző (az arc animációja itt fut), LED-gyűrű + C-szalag (NeoDriveren),
# 4 gomb, érintés, mozgásérzékelő (dobás / rázás / fordítás), rezgés.
# A Pi-vel USB-n beszél (OTG, usb_cdc data port), soronként egy JSON – lásd firmware/pi/ckocka/protocol.py.
# A Pi csak az állapotot küldi ("face", beszéd közben "talk"), az arcot a faces.py rajzolja vektorosan.
#
# Lábkiosztás (XIAO RP2040) – mind a 11 láb foglalt; AZ EGYETLEN HELY: a PINS táblázat lent.
#   D0  rezgőmotor-modul jelbemenete (IN/SIG), PWM 20 kHz; a modul VCC-je 3V3 (vagy 5V), GND közös
#   D1 gomb 1 – Andor (fa)   D2 gomb 2   D3 gomb 3   D6 gomb 4      (gomb a GND felé, belső felhúzás)
#   D7  érintés: rézfólia-elektróda (az érintőbetét alatt) + 1 MΩ lehúzó ellenállás a GND felé (a gombok prototípus-lapján)
#       – a touchio lehúzó ellenállás nélkül nem indul; ilyenkor digitális bemenetként olvassuk, így tartalékként
#         egy AT42QT1010 (aktív magas kimenet) is visszadugható ugyanide, szoftvercsere nélkül
#   D4 = SDA, D5 = SCL  I2C (400 kHz) – Qwiic-lánc az Adafruit 4397 kábellel (STEMMA QT -> női Dupont: 3V3, GND, D4, D5):
#          1. LSM6DS3TR-C (IMU, 0x6A) – függőlegesen a szán jobb sínjén; a tengelyek átszámolása: reflex.IMU_AXES
#          2. Adafruit NeoDriver (seesaw, alapcím 0x60 – a valódi panelen ellenőrizni: NEODRIVER_ADDR) -> a 31 LED egy
#             láncban: előbb a 24-es gyűrű, utána a 7 LED-es C-szalag. A LED-ek 5 V-ja a UPS-ről; összesen ≤ 30 %
#             fényerő (reflex.LED_BUDGET, ≈ 0,56 A), alvás közben ≤ 8 %. A NeoDriver maga illeszti a jelszintet.
#   D8 = SCK, D10 = MOSI, D9 = DC   GC9A01 kijelző (SPI0, 240×240). A CS a GND-n, a RST és a háttérfény 3,3 V-on:
#          nincs reset-láb, ezért induláskor szoftveres reset (0x01) megy ki, a háttérfény mindig világít.
#
# Szükséges könyvtárak (circup install): adafruit_gc9a01a adafruit_display_text adafruit_lsm6ds adafruit_seesaw
#                                        adafruit_pixelbuf adafruit_debouncer adafruit_ticks
# A CIRCUITPY meghajtóra: boot.py, code.py, reflex.py és faces.py (PC-n tesztelve)
# boot.py-ban: usb_cdc.enable(console=True, data=True)   – a „data” porton megy a JSON
import json, math, time
import board, digitalio, busio, usb_cdc
from adafruit_debouncer import Debouncer
from reflex import TouchDetector, Buzzer, duty_u16, to_cube, led_scale, LED_BUDGET
from faces import Face, N_POLY, N_BAR, N_DOT, N_TEXT

PINS = {
    'motor': board.D0,
    'buttons': (board.D1, board.D2, board.D3, board.D6),
    'touch': board.D7,
    'sda': board.D4, 'scl': board.D5,
    'lcd_sck': board.D8, 'lcd_mosi': board.D10, 'lcd_dc': board.D9,
}
I2C_HZ = 400_000
NEODRIVER_ADDR = 0x60                                 # a NeoDriver alapcíme (címátkötőkkel 0x60–0x6F) – ellenőrizni!
NEODRIVER_PIN = 15                                    # a NeoDriver kimenete a seesaw 15-ös lába
LED_FRAME = 0.02                                      # LED-frissítés 50 Hz (az I2C-írás ~3 ms)
FACE_FRAME = 0.04                                     # arc 25 Hz (csak a változó alakzatok rajzolódnak újra)
LCD_HZ = 24_000_000

FW = '1.4'
RING_N, C_N = 24, 7


def pin_in(p, pull=digitalio.Pull.UP):
    d = digitalio.DigitalInOut(p)
    d.direction = digitalio.Direction.INPUT
    d.pull = pull
    return d


buttons = [Debouncer(pin_in(p)) for p in PINS['buttons']]

# érintés: touchio (1 MΩ lehúzóval); ha nem indul, digitális bemenet (AT42QT1010 tartalék)
touch_pad, touch_dig, touch_det = None, None, TouchDetector()
try:
    import touchio
    touch_pad = touchio.TouchIn(PINS['touch'])
except Exception as e:                                # ValueError: nincs lehúzó ellenállás a lábon – ne álljon le
    print('FIGYELEM: az érintés (touchio) nem indult a D7-en:', e)
    print('  Kell egy 1 MΩ-os ellenállás a D7 és a GND közé (a gombok prototípus-lapján).')
    print('  Addig digitális bemenetként olvasom (belső lehúzással: nem ad hamis érintést; AT42QT1010 is mehet ide).')
    touch_dig = Debouncer(pin_in(PINS['touch'], digitalio.Pull.DOWN))
TOUCH_KIND = 'touchio' if touch_pad else 'digital'

# rezgés: kész rezgőmotor-modul (ERM + tranzisztor) PWM-mel
try:
    import pwmio
    motor = pwmio.PWMOut(PINS['motor'], frequency=20000, duty_cycle=0)   # 20 kHz: nem hallható sípolás
except Exception:
    motor = None
buzzer = Buzzer()

i2c = imu = strip = None
try:
    i2c = busio.I2C(PINS['scl'], PINS['sda'], frequency=I2C_HZ)   # felhúzó nélkül (üres Qwiic-lánc) RuntimeError
except Exception as e:
    print('FIGYELEM: az I2C nem indult (D4/D5, Adafruit 4397 kábel) – nincs IMU és LED:', e)
if i2c:
    try:
        from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC
        imu = LSM6DS3TRC(i2c)
    except Exception as e:
        print('FIGYELEM: nincs IMU (LSM6DS3TR-C a Qwiic-láncon):', e)
    try:
        from adafruit_seesaw import seesaw, neopixel as ss_neopixel
        strip = ss_neopixel.NeoPixel(seesaw.Seesaw(i2c, NEODRIVER_ADDR), NEODRIVER_PIN, RING_N + C_N,
                                     brightness=1.0, auto_write=False)
    except Exception as e:
        print('FIGYELEM: nincs NeoDriver a 0x%02X címen (LED-ek nélkül fut):' % NEODRIVER_ADDR, e)

# kijelző: GC9A01 a displayio-val; ha nem indul, a kocka arc nélkül is működik
display = face_slots = None
face = Face()
try:
    import displayio, vectorio, terminalio
    from fourwire import FourWire
    from adafruit_gc9a01a import GC9A01A
    from adafruit_display_text.label import Label
    displayio.release_displays()
    lcd_spi = busio.SPI(clock=PINS['lcd_sck'], MOSI=PINS['lcd_mosi'])
    lcd_bus = FourWire(lcd_spi, command=PINS['lcd_dc'], chip_select=None, reset=None, baudrate=LCD_HZ)
    lcd_bus.send(0x01, b'')                           # szoftveres reset (nincs RST-láb; a könyvtár init-sora nem küldi)
    time.sleep(0.15)
    display = GC9A01A(lcd_bus, width=240, height=240, auto_refresh=True)
    root = displayio.Group()

    def palette(c=(0, 0, 0)):
        pal = displayio.Palette(1)
        pal[0] = (c[0] << 16) | (c[1] << 8) | c[2]
        return pal

    bg = palette((5, 6, 8))
    root.append(vectorio.Rectangle(pixel_shader=bg, width=240, height=240, x=0, y=0))
    face_slots = {'polys': [], 'bars': [], 'dots': [], 'texts': []}
    for kind, n in (('bars', N_BAR), ('polys', N_POLY), ('dots', N_DOT)):
        for _ in range(n):
            g = displayio.Group()
            pal = palette()
            if kind == 'dots':
                shape = vectorio.Circle(pixel_shader=pal, radius=3, x=0, y=0)
            else:
                shape = vectorio.Polygon(pixel_shader=pal, points=[(0, 0), (1, 0), (0, 1)], x=0, y=0)
            g.append(shape)
            g.hidden = True
            root.append(g)
            face_slots[kind].append([g, shape, pal, None])   # [csoport, alakzat, paletta, utolsó állapot]
    for _ in range(N_TEXT):
        lbl = Label(terminalio.FONT, text=' ', color=0xFFFFFF, scale=2, anchor_point=(0.5, 0.5),
                    anchored_position=(120, 120))
        lbl.hidden = True
        root.append(lbl)
        face_slots['texts'].append([lbl, lbl, None, None])
    display.root_group = root
except Exception as e:
    print('FIGYELEM: a kijelző nem indult (D8 SCK, D10 MOSI, D9 DC):', e)
    display = face_slots = None

port = usb_cdc.data or usb_cdc.console


def send(obj):
    if port:
        port.write((json.dumps(obj) + '\n').encode())


# ------------------------------------------------------------------ fények
L = {'hue': 28, 'bright': 0.8, 'mode': 'off', 'flash': 0.0, 'camled': False, 'next': 0.0, 'budget': LED_BUDGET}
ring = [(0, 0, 0)] * RING_N                           # a lánc első 24 LED-je
cstrip = [(0, 0, 0)] * C_N                            # utána a 7 LED-es C-szalag


def hsv(h, v):
    h = (h % 360) / 60
    i, f = int(h), h - int(h)
    p, q, t = 0, v * (1 - f), v * f
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i % 6]
    return int(r * 255), int(g * 255), int(b * 255)


def fill(px, c):
    for i in range(len(px)):
        px[i] = c


def draw_leds(now):
    if not strip or now < L['next']:
        return
    L['next'] = now + LED_FRAME
    mode, b = L['mode'], L['bright']
    if mode == 'off':
        fill(ring, (0, 0, 0)); fill(cstrip, (0, 0, 0))
    elif mode == 'dim':                               # Ne zavarj / fejjel lefelé: alig látszó, lassan „lélegző” fény
        v = b * (0.06 + 0.04 * math.sin(now * 1.2))
        fill(ring, hsv(L['hue'], v)); fill(cstrip, hsv(L['hue'], v))
    elif mode == 'party':                             # ütemre (a Pi küldi a "beat"-et) színváltás és felvillanás
        L['flash'] = max(0.35, L['flash'] - 0.06)
        for i in range(RING_N):
            ring[i] = hsv(L['hue'] + i * 15 + now * 40, b * L['flash'])
        fill(cstrip, hsv(L['hue'] + 180, b * L['flash']))
    elif mode == 'listen':                            # hallgat: a gyűrű lassan „lélegzik”
        v = b * (0.45 + 0.4 * math.sin(now * 3.2))
        fill(ring, hsv(L['hue'], v)); fill(cstrip, hsv(L['hue'], b))
    elif mode == 'think':                             # gondolkodik: körbefutó fénycsík a gyűrűn
        head = now * 14
        for i in range(RING_N):
            k = max(0.0, 1 - ((head - i) % RING_N) / 6)
            ring[i] = hsv(L['hue'], b * (0.08 + 0.9 * k))
        fill(cstrip, hsv(L['hue'], b * 0.5))
    else:
        fill(ring, hsv(L['hue'], b * 0.85)); fill(cstrip, hsv(L['hue'], b))
    if L['camled']:                                   # a kamera jelzőfénye: a C-szalag utolsó LED-je zöld (mindig látszik, ha a kamera figyel)
        cstrip[C_N - 1] = (0, 160, 40)
    frame = ring + cstrip
    scale = led_scale(frame, L['budget'])             # összesen ≤ 30 % (UPS 5 V); alvás közben ≤ 8 %
    if strip.brightness != scale:
        strip.brightness = scale
    strip[0:RING_N + C_N] = frame
    strip.show()


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
        if c == 'face':
            face.set(m)
        elif c == 'talk':
            face.talk(m.get('v', 0), time.monotonic())
        elif c == 'leds':
            L.update(hue=m.get('hue', L['hue']), bright=m.get('bright', L['bright']), mode=m.get('mode', L['mode']))
            L['budget'] = max(0.0, min(LED_BUDGET, float(m.get('budget', LED_BUDGET))))   # a 30 % fölé soha
        elif c == 'beat':
            L['hue'] = (L['hue'] + 47) % 360; L['flash'] = 1.0
            face.beat()
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


# ------------------------------------------------------------------ arc: a faces.Face képkockája -> alakzatok
F = {'next': 0.0}


def rgb(c):
    return (c[0] << 16) | (c[1] << 8) | c[2]


def draw_face(now):
    if not face_slots or now < F['next']:
        return
    F['next'] = now + FACE_FRAME
    fr = face.frame(now)
    for kind in ('polys', 'bars', 'dots', 'texts'):
        for slot, spec in zip(face_slots[kind], fr[kind]):
            if spec == slot[3]:
                continue                              # változatlan: nem rajzolódik újra
            slot[3] = spec
            g, shape, pal = slot[0], slot[1], slot[2]
            if spec is None:
                g.hidden = True
                continue
            if kind == 'texts':
                text, y, scale, col = spec
                shape.text, shape.scale, shape.color = text, scale, rgb(col)
                shape.anchored_position = (120, y)
            elif kind == 'dots':
                x, y, r, col = spec
                shape.x, shape.y, shape.radius = x, y, r
                pal[0] = rgb(col)
            else:
                pts, col = spec
                shape.points = pts
                pal[0] = rgb(col)
            g.hidden = False


# ------------------------------------------------------------------ főciklus (~100 Hz)
if imu:                                               # a konzolra: álló kockánál ≈ (0, 1, 0) – lásd reflex.IMU_AXES
    print('cube_g', tuple(round(v / 9.81, 2) + 0.0 for v in to_cube(imu.acceleration)))   # +0.0: ne írjon -0.0-t
send({'ev': 'hello', 'fw': FW, 'imu': imu is not None, 'leds': strip is not None, 'display': display is not None,
      'haptic': motor is not None, 'touch': TOUCH_KIND, 'upside': IMU['upside']})
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
    draw_face(now)
    if now - last_hello > 30:                         # életjel: ha a Pi újraindul, újra megkapja az állapotot (a tájolást is)
        send({'ev': 'hello', 'fw': FW, 'upside': IMU['upside']}); last_hello = now
    time.sleep(0.01)
