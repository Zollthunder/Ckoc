"""Táp: Pi-Ener-lite UPS (18650 cella) – külső táp figyelése, töltöttség, biztonságos leállás, alvás töltés közben.

  GPIO4        a UPS jelzése: ALACSONY = van külső táp (a panel kapcsolójával leválasztható)
  CW2015 0x62  töltöttségmérő (I2C-1): SOC a 0x04 (egész %) és 0x05 (1/256 %) regiszterben, VCELL 0x02–0x03
  DS1307 0x68  valós idejű óra – a kernel kezeli (dtoverlay=i2c-rtc,ds1307, install.sh), itt nem kell vele foglalkozni

Szabályok (PowerPolicy, hardver nélkül tesztelve):
  * külső táp nélkül, SHUTDOWN_SOC (5 %) alatt – CONFIRM egymás utáni mérésen át, hogy egy zajos minta ne állítsa
    le – a kocka elköszön és leállítja a Pi-t (sudo -n /usr/sbin/shutdown -h now; a jogot az install.sh adja meg)
  * WARN_SOC (15 %) alatt egyszer figyelmeztet (napló + az app felé 'battery' esemény)
  * külső tápon (GPIO4 alacsony) ALSZIK a kocka (HOKEZELES.md 7.5, F változat): a Pi-Ener-lite töltőárama fix 1 A, a
    töltő vesztesége közvetlenül a cella alatt keletkezik. Alvás: az arc kialszik, a LED-ek összesen ≤ 8 %, a kamera
    szünetel; az ébresztőszó, gomb, érintés, mozdulat vagy az app felébreszti, de töltés közben legfeljebb
    CHARGE_AWAKE (15 perc) ébrenlét után visszaalszik (brain.Cube.charge_loop). A számok egy helyen: lent.

FIGYELEM: valódi panel nélkül készült. A CW2015 pontos SOC-értékéhez a gyártó cellaprofilt is tölthet be (CONFIG
regiszter); profil nélkül a mérő a saját alapprofiljával becsül – az első élesztésnél össze kell vetni a cella
feszültségével (a 'battery' napló a VCELL-t is kiírja).
"""
import asyncio, logging, subprocess

log = logging.getLogger('ckocka.power')

EXT_POWER_GPIO = 4
CW2015_ADDR = 0x62
SHUTDOWN_SOC = 5.0
WARN_SOC = 15.0
CONFIRM = 3                    # ennyi egymás utáni mérés kell a leállításhoz
INTERVAL = 10.0                # másodperc két mérés között
CHARGE_AWAKE = 15 * 60         # töltés közben legfeljebb ennyi másodperc ébrenlét (HOKEZELES.md 7.5)
SLEEP_LED_BUDGET = 0.08        # alvás közben a 31 LED összes fényereje legfeljebb ennyi (a XIAO-n: reflex.SLEEP_BUDGET)
SHUTDOWN_CMD = ['sudo', '-n', '/usr/sbin/shutdown', '-h', 'now']


class PowerPolicy:
    """Bemenet: van-e külső táp, töltöttség % (None: nem olvasható). Kimenet: teendők listája."""

    def __init__(self, shutdown_soc=SHUTDOWN_SOC, warn_soc=WARN_SOC, confirm=CONFIRM):
        self.shutdown_soc, self.warn_soc, self.confirm = shutdown_soc, warn_soc, confirm
        self.low_count, self.warned, self.charging, self.done = 0, False, False, False

    def update(self, ext_power, soc):
        acts = []
        if self.done:
            return acts
        if ext_power is not None and bool(ext_power) != self.charging:     # külső táp = töltés (a cella tele is lehet)
            self.charging = bool(ext_power)
            acts.append('charge_on' if self.charging else 'charge_off')
        if ext_power or soc is None:              # külső tápon (vagy mérés nélkül) soha nem állít le
            self.low_count = 0
            if ext_power:
                self.warned = False
            return acts
        if soc < self.warn_soc and not self.warned:
            self.warned = True
            acts.append('warn')
        self.low_count = self.low_count + 1 if soc < self.shutdown_soc else 0
        if self.low_count >= self.confirm:
            self.done = True
            acts.append('shutdown')
        return acts


class CW2015:
    REG_VCELL, REG_SOC, REG_MODE = 0x02, 0x04, 0x0A

    def __init__(self, bus, addr=CW2015_ADDR):
        self.bus, self.addr = bus, addr
        self.bus.write_byte_data(addr, self.REG_MODE, 0x00)       # ébresztés (bekapcsolás után alvó módban lehet)

    def soc(self):
        hi, lo = self.bus.read_i2c_block_data(self.addr, self.REG_SOC, 2)
        return hi + lo / 256.0

    def vcell(self):
        hi, lo = self.bus.read_i2c_block_data(self.addr, self.REG_VCELL, 2)
        return (((hi & 0x3F) << 8) | lo) * 305e-6                  # 14 bit, 305 µV/LSB


class PowerMonitor:
    """A valódi UPS olvasása. ext_pin: .is_active (True = van külső táp); gauge: CW2015 vagy None."""

    def __init__(self, ext_pin, gauge):
        self.ext_pin, self.gauge = ext_pin, gauge

    def read(self):
        ext = bool(self.ext_pin.is_active) if self.ext_pin is not None else None
        soc = volt = None
        if self.gauge is not None:
            try:
                soc, volt = self.gauge.soc(), self.gauge.vcell()
            except OSError as e:
                log.warning('CW2015 olvasás: %s', e)
        return ext, soc, volt


def make_monitor(bus_no=1):
    """A UPS a Pi-n; ha nincs (vagy nem olvasható), None – a kocka attól még fut, csak leállásvédelem nélkül."""
    ext = gauge = None
    try:
        from gpiozero import DigitalInputDevice
        ext = DigitalInputDevice(EXT_POWER_GPIO, pull_up=True)    # felhúzva: ALACSONY (aktív) = van külső táp
    except Exception as e:
        log.warning('GPIO4 (külső táp jelzése) nem olvasható: %s', e)
    try:
        try:
            from smbus2 import SMBus
        except ImportError:
            from smbus import SMBus
        gauge = CW2015(SMBus(bus_no))
    except Exception as e:
        log.warning('CW2015 töltöttségmérő (0x62) nem érhető el: %s', e)
    if ext is None and gauge is None:
        log.warning('nincs UPS-adat – biztonságos leállás kikapcsolva')
        return None
    return PowerMonitor(ext, gauge)


def default_shutdown():
    r = subprocess.run(SHUTDOWN_CMD, check=False, capture_output=True, text=True)
    if r.returncode:
        log.error('a leállítás nem sikerült (%s) – sudoers: /etc/sudoers.d/ckocka (install.sh)', r.stderr.strip())


async def guard(cube, monitor, policy=None, shutdown=default_shutdown, interval=INTERVAL, goodbye=3.0):
    """A kocka mellett futó figyelő (brain.Cube.start indítja, ha van UPS)."""
    policy = policy or PowerPolicy()
    loop = asyncio.get_running_loop()
    while True:
        ext, soc, volt = await loop.run_in_executor(None, monitor.read)
        for act in policy.update(ext, soc):
            if act in ('charge_on', 'charge_off'):
                log.info('külső táp %s (%s %%)', 'BE – töltés közben alszik' if act == 'charge_on' else 'KI', soc)
                cube.set_charging(act == 'charge_on')
            elif act == 'warn':
                log.warning('akkumulátor: %.0f %% (%.2f V) – tedd töltőre', soc, volt or 0)
                cube.emit('battery', soc=round(soc), low=True)
            elif act == 'shutdown':
                log.warning('akkumulátor: %.1f %% külső táp nélkül – biztonságos leállás', soc)
                cube.emit('battery', soc=round(soc), shutdown=True)
                cube.battery_shutdown()
                await asyncio.sleep(goodbye)
                await loop.run_in_executor(None, shutdown)
                return
        await asyncio.sleep(interval)
