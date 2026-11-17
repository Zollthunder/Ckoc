"""Valódi hardver a Raspberry Pi Zero 2 W-n.

  Kijelző : GC9A01 1,28" kerek, 240×240, a Linux mipi-dbi-spi meghajtójával (/dev/fbN) – SPI0 (MOSI GPIO10, SCLK GPIO11,
            CE0 GPIO8), DC GPIO25, RST GPIO27, háttérfény GPIO22 (lásd panel.py; a gyári gc9a01 overlay a GPIO18-at, az
            I2S órajelét foglalná). Ha nincs framebuffer, tartalékként közvetlenül spidev-vel hajtjuk ugyanezeken a lábakon.
  Táp     : Pi-Ener-lite UPS – GPIO4 (alacsony = van külső táp), CW2015 töltöttségmérő 0x62 (power.py)
  Hang    : Seeed ReSpeaker 2-Mics Pi HAT, 1 hangszóró (mono) – v1 (WM8960) és v2.0 (TLV320AIC3104) is; ALSA a kártya
            nevével (seeed2micvoicec, firmware/pi/asound.conf), lejátszás: aplay (dmix), dekódolás: mpg123;
            hangerő és mikrofon-némítás: amixer (a kodek szerint más vezérlőnevekkel)
  XIAO    : UART – Pi GPIO14 (TXD) -> XIAO D7 (RX), GPIO15 (RXD) <- XIAO D6 (TX), 115200 8N1, /dev/serial0
            (Pi Zero 2 W-n a mini UART; a PL011 a Bluetooth-é), soronként egy JSON
  Kamera  : OV5647 (picamera2) + OpenCV Haar-kaszkád – csak helyben, kép nem hagyja el a kockát

FIGYELEM: ez a kód hardver nélkül készült (a C-kocka koncepció). A GC9A01 inicializáló sorozata a gyártói
referenciakódból való; az első élesztésnél a lábkiosztást és a színsorrendet ellenőrizni kell.
"""
import asyncio, glob, json, logging, os, subprocess, threading, time

import numpy as np

from . import hal, panel

log = logging.getLogger('ckocka.hw')

# --------------------------------------------------------------------------------------------- kijelző
GC9A01_INIT = panel.GC9A01_INIT


def rgb565(img, byteorder='>'):
    a = np.asarray(img.convert('RGB'), dtype=np.uint16)
    v = ((a[..., 0] & 0xF8) << 8) | ((a[..., 1] & 0xFC) << 3) | (a[..., 2] >> 3)
    return v.astype(byteorder + 'u2').tobytes()



class FbDisplay(hal.Display):
    """A mipi-dbi-spi meghajtó framebuffere (a kernel küldi SPI-n, a CE0-t ő kezeli). RGB565, kis végű a memóriában."""

    @staticmethod
    def find(sys_dir='/sys/class/graphics', match='mipi-dbi'):
        """A panel /dev/fbN eszköze a meghajtó neve alapján (a HDMI is kaphat fb0-t, ezért nem a sorszám számít)."""
        for d in sorted(glob.glob(os.path.join(sys_dir, 'fb*'))):
            try:
                with open(os.path.join(d, 'name')) as f:
                    if match in f.read():
                        return '/dev/' + os.path.basename(d), d
            except OSError:
                pass
        return None

    def __init__(self, dev, sys_path, backlight_dir='/sys/class/backlight'):
        with open(os.path.join(sys_path, 'bits_per_pixel')) as f:
            if int(f.read()) != 16:
                raise RuntimeError('a kijelző framebuffere nem 16 bites (RGB565)')
        self.fb = open(dev, 'r+b', buffering=0)
        self.bl = sorted(glob.glob(os.path.join(backlight_dir, '*')))
        log.info('kijelző: %s (mipi-dbi-spi)', dev)

    def show(self, img):
        self.fb.seek(0)
        self.fb.write(rgb565(img, '<'))

    def brightness(self, v):
        """A gpio-backlight csak be/ki (max_brightness = 1); PWM-es háttérfénynél fokozatos."""
        for d in self.bl:
            try:
                with open(os.path.join(d, 'max_brightness')) as f:
                    mx = int(f.read())
                v = max(0.0, min(1.0, v))
                with open(os.path.join(d, 'brightness'), 'w') as f:
                    f.write(str(round(v * mx) if mx > 1 else int(v > 0)))
            except (OSError, ValueError) as e:
                log.warning('háttérfény: %s', e)


class GC9A01(hal.Display):
    """Tartalék: közvetlen spidev-vezérlés (ha a mipi-dbi-spi overlay nincs betöltve). Ugyanazok a lábak."""

    def __init__(self, dc=panel.PINS['dc'], rst=panel.PINS['reset'], bl=panel.PINS['backlight'], spi_bus=0, spi_dev=0,
                 hz=panel.SPEED_HZ):
        import spidev
        from gpiozero import DigitalOutputDevice, PWMOutputDevice
        self.dc, self.rst, self.bl = DigitalOutputDevice(dc), DigitalOutputDevice(rst), PWMOutputDevice(bl)
        self.spi = spidev.SpiDev()
        self.spi.open(spi_bus, spi_dev)
        self.spi.max_speed_hz, self.spi.mode = hz, 0
        self.rst.off(); time.sleep(0.05); self.rst.on(); time.sleep(0.12)
        for cmd, data in GC9A01_INIT:
            self._cmd(cmd, data)
        self._cmd(0x11); time.sleep(0.12)      # kilépés alvásból
        self._cmd(0x29); time.sleep(0.02)      # kijelző be
        self.bl.value = 0.9

    def _cmd(self, c, data=()):
        self.dc.off(); self.spi.writebytes([c])
        if data:
            self.dc.on(); self.spi.writebytes(list(data))

    def show(self, img):
        self._cmd(0x2A, [0, 0, 0, 239]); self._cmd(0x2B, [0, 0, 0, 239]); self._cmd(0x2C)
        self.dc.on()
        self.spi.writebytes2(rgb565(img))

    def brightness(self, v):
        self.bl.value = max(0.0, min(1.0, v))


# --------------------------------------------------------------------------------------------- hang
RESPEAKER_CARD = 'seeed2micvoicec'          # mindkét ReSpeaker 2-Mics változat ezzel a névvel jelenik meg (aplay -l)

# A két kodek ALSA-vezérlői (a Linux wm8960 és tlv320aic3x meghajtójának nevei). Az első élesztésnél ellenőrizni:
#   amixer -c seeed2micvoicec controls
# Ha egy név nem létezik, csak figyelmeztetés megy a naplóba, a kocka attól még elindul.
CODECS = {
    'wm8960': {                              # v1 – a WM8960 saját D osztályú erősítője hajtja a JST hangszórókimenetet
        'name': 'ReSpeaker 2-Mics v1 (WM8960)',
        'capture': 'Capture Switch',
        'init': [('Left Output Mixer PCM Playback Switch', 'on'), ('Right Output Mixer PCM Playback Switch', 'on'),
                 ('Playback Volume', '90%'), ('Speaker Playback Volume', '85%'), ('Headphone Playback Volume', '70%'),
                 ('Left Input Mixer Boost Switch', 'on'), ('Right Input Mixer Boost Switch', 'on'),
                 ('Capture Volume', '70%'), ('Capture Switch', 'on')],
    },
    # v2.0 (kapcsolási rajz, 2024-11-15): a JST hangszórókimenetet (J2) egy TPA2005D1 mono D osztályú erősítő hajtja,
    # bemenete a kodek két VONALKIMENETÉNEK különbségi összege (IN+ = LEFT_LOP + RIGHT_LOP, IN- = LEFT_LOM + RIGHT_LOM),
    # tehát (L+R) szól. Az erősítő ~SHUTDOWN lába (AMP_CTL) 10 kΩ-mal AVDD_3V3-ra húzva: mindig bekapcsolt, GPIO nem kell
    # (a fejhallgató-dugóra némító Q1 tranzisztor nincs beültetve). A HPLOUT/HPROUT csak a 3,5 mm-es aljzatra megy.
    'tlv320aic3x': {
        'name': 'ReSpeaker 2-Mics v2.0 (TLV320AIC3104)',
        'capture': 'PGA Capture Switch',
        'init': [('Left Line Mixer DACL1 Switch', 'on'), ('Right Line Mixer DACR1 Switch', 'on'),   # hangszóró
                 ('Line DAC Playback Volume', '85%'), ('Line Playback Switch', 'on'),
                 ('Left HP Mixer DACL1 Switch', 'on'), ('Right HP Mixer DACR1 Switch', 'on'),       # 3,5 mm-es aljzat
                 ('HP DAC Playback Volume', '70%'), ('HP Playback Switch', 'on'),
                 ('PCM Playback Volume', '90%'),
                 ('PGA Capture Volume', '60%'), ('PGA Capture Switch', 'on')],
    },
}


def detect_codec(proc_dir='/proc/asound', card=RESPEAKER_CARD):
    """Melyik ReSpeaker van fent? A kártya sorszáma a /proc/asound/cards-ból, a kodek a /proc/asound/pcm-ből
    (pl. '02-00: 1f000a4000.i2s-tlv320aic3x-hifi tlv320aic3x-hifi-0 : ...'). Nincs ilyen kártya: None."""
    import os, re
    try:
        with open(os.path.join(proc_dir, 'cards'), encoding='utf-8', errors='replace') as f:
            cards = f.read()
        with open(os.path.join(proc_dir, 'pcm'), encoding='utf-8', errors='replace') as f:
            pcm = f.read()
    except OSError:
        return None
    m = re.search(r'^\s*(\d+)\s+\[' + re.escape(card) + r'\s*\]', cards, re.M)
    if not m:
        return None
    prefix = '%02d-' % int(m.group(1))
    for line in pcm.splitlines():
        if line.startswith(prefix):
            for key in CODECS:
                if key in line:
                    return key
    return None


class AlsaAudio(hal.Audio):
    """Beszéd: mpg123 dekódol nyers PCM-re, aplay játssza le; közben mérjük a hangerőt (a száj mozgásához).
    A 'default' eszköz az /etc/asound.conf szerint a ReSpeaker, mono keveréssel (mindkét csatornán ugyanaz)."""

    def __init__(self, device='default', card=RESPEAKER_CARD, proc_dir='/proc/asound'):
        self.device, self.card = device, card
        self._lvl, self._proc, self._music, self._lock, self._gen = 0.0, None, None, threading.Lock(), 0
        self.codec = detect_codec(proc_dir, card)
        if self.codec:
            log.info('hangpanel: %s', CODECS[self.codec]['name'])
            for name, value in CODECS[self.codec]['init']:
                self._amixer(name, value)
        else:
            log.warning('a ReSpeaker hangkártya (%s) nem található – lásd firmware/README.md, „Hangpanel”', card)

    def _amixer(self, name, value):
        r = subprocess.run(['amixer', '-q', '-c', self.card, 'cset', 'name=' + name, value],
                           check=False, capture_output=True, text=True)
        if r.returncode != 0:
            log.warning('amixer: %r = %s nem sikerült (%s)', name, value, (r.stderr or '').strip())
        return r.returncode == 0

    @staticmethod
    def _decode(path):
        """MP3 (előre generált mondatok) vagy WAV (a Piper válaszai) -> mono 16 bites PCM és mintavétel."""
        if path.lower().endswith('.wav'):
            import wave
            with wave.open(path, 'rb') as w:
                sr, ch, raw = w.getframerate(), w.getnchannels(), w.readframes(w.getnframes())
            pcm = np.frombuffer(raw, dtype='<i2')
            return (pcm.reshape(-1, ch).mean(axis=1).astype('<i2') if ch > 1 else pcm), sr
        dec = subprocess.run(['mpg123', '-q', '-m', '-r', '24000', '-s', path], capture_output=True)
        return np.frombuffer(dec.stdout, dtype='<i2'), 24000

    def _play_pcm(self, path, rate, gen):
        pcm, sr = self._decode(path)
        with self._lock:
            if gen != self._gen:                         # dekódolás közben leállították
                return
            self._proc = subprocess.Popen(['aplay', '-q', '-D', self.device, '-f', 'S16_LE', '-c', '1', '-r', str(int(sr * rate))],
                                          stdin=subprocess.PIPE)
        proc, step = self._proc, int(sr * rate * 0.05)
        try:
            for i in range(0, len(pcm), step):
                if proc.poll() is not None or gen != self._gen:
                    proc.kill()
                    break
                chunk = pcm[i:i + step]
                self._lvl = min(1.0, float(np.sqrt(np.mean(chunk.astype(np.float32) ** 2))) / 6000)
                proc.stdin.write(chunk.tobytes())
            proc.stdin.close(); proc.wait()
        except (BrokenPipeError, ValueError):
            pass
        finally:
            self._lvl = 0.0

    async def play_clip(self, path, rate=1.0):
        with self._lock:
            self._gen += 1
            gen = self._gen
        await asyncio.get_running_loop().run_in_executor(None, self._play_pcm, path, rate, gen)

    def level(self):
        return self._lvl

    def stop(self):
        with self._lock:
            self._gen += 1                           # a folyamatban lévő (akár még dekódoló) mondat se szólaljon meg
            if self._proc and self._proc.poll() is None:
                self._proc.kill()

    def sfx(self, wav_bytes):
        p = subprocess.Popen(['aplay', '-q', '-D', self.device], stdin=subprocess.PIPE)
        threading.Thread(target=lambda: (p.stdin.write(wav_bytes), p.stdin.close()), daemon=True).start()

    def music(self, wav_bytes, loop=True):
        if self._music:
            self._music.set()
            self._music = None
        if wav_bytes is None:
            return
        stop = self._music = threading.Event()

        def run():
            while not stop.is_set():
                p = subprocess.Popen(['aplay', '-q', '-D', self.device], stdin=subprocess.PIPE)
                try:
                    p.stdin.write(wav_bytes); p.stdin.close()
                except BrokenPipeError:
                    pass
                while p.poll() is None:
                    if stop.wait(0.1):
                        p.kill()
                if not loop:
                    break
        threading.Thread(target=run, daemon=True).start()

    def set_capture(self, on):
        """A két mikrofon ki/be a kodekben (fejjel lefelé: adatvédelem). Ettől függetlenül a beszélgetés is eldobja
        a hangot (talk.Ears.enable), így ha a kodek vezérlője nem állítható, a mikrofon akkor sem „hallgat”."""
        if not self.codec:
            return False
        return self._amixer(CODECS[self.codec]['capture'], 'on' if on else 'off')


# --------------------------------------------------------------------------------------------- XIAO
XIAO_PORT = '/dev/serial0'          # enable_uart=1, soros konzol kikapcsolva (install.sh); felülírható: CKOCKA_XIAO_PORT
XIAO_BAUD = 115200


def xiao_port():
    return os.environ.get('CKOCKA_XIAO_PORT') or XIAO_PORT


class SerialMcu(hal.Mcu):
    def __init__(self, port=None, baud=XIAO_BAUD):
        super().__init__()
        self.port, self.baud, self.ser = port or xiao_port(), baud, None
        self.loop = asyncio.get_event_loop()
        threading.Thread(target=self._reader, daemon=True).start()

    def _reader(self):
        import serial
        while True:
            ser = None
            try:
                ser = serial.Serial(self.port, self.baud, timeout=1)
                self.ser = ser
                log.info('XIAO csatlakozva: %s', self.port)
                buf = b''
                while True:
                    buf += ser.read(ser.in_waiting or 1)       # időtúllépéskor üres – a port nyitva marad
                    while b'\n' in buf:
                        raw, buf = buf.split(b'\n', 1)
                        try:
                            ev = json.loads(raw.decode('utf-8', 'replace'))
                        except ValueError:
                            continue
                        self.loop.call_soon_threadsafe(self.events.put_nowait, ev)
            except Exception as e:                       # kihúzták, újraindult – pár másodperc múlva újra
                log.warning('XIAO kapcsolat: %s', e)
                self.ser = None
                if ser:
                    try:
                        ser.close()
                    except Exception:
                        pass
                time.sleep(2)

    def send(self, obj):
        if self.ser:
            try:
                self.ser.write((json.dumps(obj, separators=(',', ':')) + '\n').encode())
            except Exception as e:
                log.warning('XIAO írás: %s', e)


# --------------------------------------------------------------------------------------------- kamera
class LocalCamera(hal.Camera):
    """Arcfelismerés HELYBEN (OpenCV Haar). A „fáradtság” itt egyszerű közelítés: több egymás utáni képen nem
    talál nyitott szemet az arcon. Pontosabb modell (pl. MediaPipe) a Pi Zero 2 W-n lassú lenne."""

    def __init__(self):
        self.enabled, self.cam, self._closed_eyes = True, None, 0
        try:
            import cv2
            from picamera2 import Picamera2
            self.cv2 = cv2
            self.face = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.eyes = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            self.cam = Picamera2()
            self.cam.configure(self.cam.create_still_configuration(main={'size': (320, 240), 'format': 'RGB888'}))
            self.cam.start()
        except Exception as e:
            log.warning('kamera nem érhető el (%s) – leskelődés és felvidítás kikapcsolva', e)

    def _look(self):
        if not (self.enabled and self.cam):
            return {'face': False}
        gray = self.cv2.cvtColor(self.cam.capture_array(), self.cv2.COLOR_RGB2GRAY)
        faces = self.face.detectMultiScale(gray, 1.2, 5, minSize=(40, 40))
        if not len(faces):
            return {'face': False}
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        eyes = self.eyes.detectMultiScale(gray[y:y + h // 2, x:x + w], 1.1, 6)
        self._closed_eyes = self._closed_eyes + 1 if len(eyes) == 0 else 0
        return {'face': True, 'looking': len(eyes) >= 2 and w > 70, 'tired': self._closed_eyes >= 3,
                'x': (x + w / 2) / 160 - 1}

    async def look(self):
        return await asyncio.get_running_loop().run_in_executor(None, self._look)

    def enable(self, on):
        self.enabled = on
        if self.cam:
            (self.cam.start if on else self.cam.stop)()


class NullDisplay(hal.Display):
    def show(self, img):
        pass


def make_display():
    """mipi-dbi-spi framebuffer, különben közvetlen spidev; ha egyik sem megy, a kocka kijelző nélkül is elindul."""
    found = FbDisplay.find()
    try:
        return FbDisplay(*found) if found else GC9A01()
    except Exception as e:
        log.warning('a kijelző nem érhető el (%s) – kijelző nélkül fut. Ellenőrzés: python3 -m ckocka.diag spi-leds', e)
        return NullDisplay()


def make(voice_dir):
    from . import power
    return hal.Hardware(make_display(), AlsaAudio(), SerialMcu(), LocalCamera(), voice_dir, power=power.make_monitor())
