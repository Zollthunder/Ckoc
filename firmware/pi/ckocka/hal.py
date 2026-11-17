"""Hardver-absztrakció: a „agy” (brain.py) csak ezeket a felületeket látja.
Két megvalósítás: hw_real.py (Raspberry Pi + XIAO) és hw_sim.py (PC, hardver nélkül)."""
import abc, asyncio


class Display(abc.ABC):
    @abc.abstractmethod
    def show(self, img):
        """240×240 RGB Pillow-kép kitétele a kerek kijelzőre."""


class Audio(abc.ABC):
    @abc.abstractmethod
    async def play_clip(self, path, rate=1.0):
        """Egy mondat lejátszása; akkor tér vissza, amikor véget ért (vagy stop() leállította)."""

    @abc.abstractmethod
    def level(self):
        """A most szóló hang hangereje 0..1 (a száj mozgásához)."""

    @abc.abstractmethod
    def stop(self):
        """A beszéd leállítása."""

    @abc.abstractmethod
    def sfx(self, wav_bytes):
        """Rövid hangeffekt (nem blokkol)."""

    @abc.abstractmethod
    def music(self, wav_bytes, loop=True):
        """Háttérzene indítása (party); None = leállítás."""


class Mcu(abc.ABC):
    """A XIAO RP2040: LED-ek, gombok, érintés, IMU, rezgés."""

    def __init__(self):
        self.events = asyncio.Queue()       # {"ev": "button", "id": 1} stb.

    @abc.abstractmethod
    def send(self, obj):
        """Pi -> XIAO üzenet (dict)."""


class Camera(abc.ABC):
    @abc.abstractmethod
    async def look(self):
        """Egy kép elemzése HELYBEN (semmi nem megy a felhőbe). Visszaad: {"face": bool, "tired": bool, "x": -1..1}."""

    @abc.abstractmethod
    def enable(self, on):
        """Fejjel lefelé / adatvédelem: a kamera teljesen kikapcsol."""


class Hardware:
    def __init__(self, display, audio, mcu, camera, voice_dir, power=None):
        self.display, self.audio, self.mcu, self.camera, self.voice_dir = display, audio, mcu, camera, voice_dir
        # display: csak a szimulációban (a face.py képei PNG-be); a valódi kockán None – az arcot a XIAO rajzolja
        self.power = power                    # power.PowerMonitor (UPS) vagy None (szimuláció, UPS nélkül)
