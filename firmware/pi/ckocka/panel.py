"""A GC9A01 kerek kijelző a Linux mipi-dbi-spi meghajtójával (DRM -> /dev/fbN).

Miért nem a gyári `gc9a01` overlay: az a háttérvilágítást a GPIO18-ra teszi, az pedig a ReSpeaker I2S BCLK-ja.
A `mipi-dbi-spi` overlayben minden láb szabadon megadható (a kompatibilitás-ellenőrzés 1. pontja):

  jel     GPIO  tüske
  MOSI    10    19      (SPI0)
  SCLK    11    23      (SPI0)
  CS      8     24      (CE0)
  DC      25    22
  RST     27    13
  BL      22    –       (vagy fixen 3,3 V)

A meghajtó a panel inicializáló parancsait egy firmware-fájlból olvassa (/lib/firmware/gc9a01.bin). Ezt a fájlt
ez a modul állítja elő a gyártói init-sorozatból – így nem kell külső eszköz (mipi-dbi-cmd) a telepítéshez:

  python3 -m ckocka.panel --firmware /lib/firmware/gc9a01.bin     # az install.sh hívja
  python3 -m ckocka.panel --config                                 # a config.txt sorai

A ReSpeaker 3 APA102 LED-je chip select nélkül ugyanezen az SPI0-n van, ezért a kijelző forgalmától villoghatnak.
A firmware ezeket a LED-eket NEM használja; ellenőrzés a valódi panelen: python3 -m ckocka.diag spi-leds
"""
import argparse, sys

NAME = 'gc9a01'                     # a compatible első tagja = a firmware-fájl neve (/lib/firmware/gc9a01.bin)
PINS = {'dc': 25, 'reset': 27, 'backlight': 22, 'spi': 'spi0-0'}
SIZE = 240
SPEED_HZ = 40_000_000

# a gyártói referenciakód init-sorozata (parancs, paraméterek)
GC9A01_INIT = [
    (0xEF, []), (0xEB, [0x14]), (0xFE, []), (0xEF, []), (0xEB, [0x14]), (0x84, [0x40]), (0x85, [0xFF]), (0x86, [0xFF]),
    (0x87, [0xFF]), (0x88, [0x0A]), (0x89, [0x21]), (0x8A, [0x00]), (0x8B, [0x80]), (0x8C, [0x01]), (0x8D, [0x01]),
    (0x8E, [0xFF]), (0x8F, [0xFF]), (0xB6, [0x00, 0x20]), (0x36, [0x08]), (0x3A, [0x05]), (0x90, [0x08] * 4),
    (0xBD, [0x06]), (0xBC, [0x00]), (0xFF, [0x60, 0x01, 0x04]), (0xC3, [0x13]), (0xC4, [0x13]), (0xC9, [0x22]),
    (0xBE, [0x11]), (0xE1, [0x10, 0x0E]), (0xDF, [0x21, 0x0C, 0x02]),
    (0xF0, [0x45, 0x09, 0x08, 0x08, 0x26, 0x2A]), (0xF1, [0x43, 0x70, 0x72, 0x36, 0x37, 0x6F]),
    (0xF2, [0x45, 0x09, 0x08, 0x08, 0x26, 0x2A]), (0xF3, [0x43, 0x70, 0x72, 0x36, 0x37, 0x6F]),
    (0xED, [0x1B, 0x0B]), (0xAE, [0x77]), (0xCD, [0x63]), (0x70, [0x07, 0x07, 0x04, 0x0E, 0x0F, 0x09, 0x07, 0x08, 0x03]),
    (0xE8, [0x34]), (0x62, [0x18, 0x0D, 0x71, 0xED, 0x70, 0x70, 0x18, 0x0F, 0x71, 0xEF, 0x70, 0x70]),
    (0x63, [0x18, 0x11, 0x71, 0xF1, 0x70, 0x70, 0x18, 0x13, 0x71, 0xF3, 0x70, 0x70]),
    (0x64, [0x28, 0x29, 0xF1, 0x01, 0xF1, 0x00, 0x07]), (0x66, [0x3C, 0x00, 0xCD, 0x67, 0x45, 0x45, 0x10, 0x00, 0x00, 0x00]),
    (0x67, [0x00, 0x3C, 0x00, 0x00, 0x00, 0x01, 0x54, 0x10, 0x32, 0x98]), (0x74, [0x10, 0x85, 0x80, 0x00, 0x00, 0x4E, 0x00]),
    (0x98, [0x3E, 0x07]), (0x35, []), (0x21, []),
]
WAKE = [(0x11, []), ('delay', 120), (0x29, []), ('delay', 20)]     # kilépés alvásból, kijelző be

# A panel-mipi-dbi firmware formátuma (Linux: drivers/gpu/drm/tiny/panel-mipi-dbi.c):
#   15 bájt: "MIPI DBI" + 7 nulla, 1 bájt verzió (1), majd parancsonként: parancs, paraméterszám, paraméterek;
#   várakozás: 0x00 parancs 1 paraméterrel (ezredmásodperc).
MAGIC = b'MIPI DBI' + bytes(7)


def firmware_bin(init=GC9A01_INIT, wake=WAKE):
    out = bytearray(MAGIC + b'\x01')
    for cmd, data in list(init) + list(wake):
        if cmd == 'delay':
            out += bytes([0x00, 1, min(255, int(data))])
        else:
            if not 0 < cmd <= 0xFF or len(data) > 255:
                raise ValueError('hibás parancs: %r' % (cmd,))
            out += bytes([cmd, len(data)]) + bytes(data)
    return bytes(out)


def parse_firmware(blob):
    """A firmware_bin fordítottja (a tesztekhez): [(parancs, [paraméterek]) vagy ('delay', ms)]."""
    if blob[:15] != MAGIC or blob[15] != 1:
        raise ValueError('nem panel-mipi-dbi firmware')
    i, out = 16, []
    while i < len(blob):
        cmd, n = blob[i], blob[i + 1]
        data = list(blob[i + 2:i + 2 + n])
        if len(data) != n:
            raise ValueError('csonka parancs a %d. bájtnál' % i)
        out.append(('delay', data[0]) if cmd == 0 else (cmd, data))
        i += 2 + n
    return out


def config_lines(pins=PINS, backlight=True):
    """A config.txt sorai (Raspberry Pi kernel overlays/README, mipi-dbi-spi)."""
    lines = ['dtparam=spi=on',
             'dtoverlay=mipi-dbi-spi,%s,speed=%d' % (pins['spi'], SPEED_HZ),
             'dtparam=compatible=%s\\0panel-mipi-dbi-spi' % NAME,
             'dtparam=width=%d,height=%d,width-mm=33,height-mm=33' % (SIZE, SIZE),
             'dtparam=reset-gpio=%d,dc-gpio=%d' % (pins['reset'], pins['dc'])]
    if backlight:
        lines.append('dtparam=backlight-gpio=%d' % pins['backlight'])
    return lines


def main(argv=None):
    p = argparse.ArgumentParser(prog='ckocka.panel', description='GC9A01 a mipi-dbi-spi meghajtóval')
    p.add_argument('--firmware', metavar='FÁJL', help='az init-firmware írása (pl. /lib/firmware/gc9a01.bin)')
    p.add_argument('--config', action='store_true', help='a config.txt sorainak kiírása')
    p.add_argument('--no-backlight', action='store_true', help='a háttérfény fixen 3,3 V-on (nincs BL-láb)')
    a = p.parse_args(argv)
    if a.firmware:
        with open(a.firmware, 'wb') as f:
            f.write(firmware_bin())
    if a.config:
        print('\n'.join(config_lines(backlight=not a.no_backlight)))
    if not (a.firmware or a.config):
        p.print_help()
    return 0


if __name__ == '__main__':
    sys.exit(main())
