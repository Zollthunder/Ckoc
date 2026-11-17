"""Diagnosztika a valódi kockán (a szolgáltatás leállítása után):

  sudo systemctl stop ckocka
  python3 -m ckocka.diag spi-leds          # villognak-e a ReSpeaker APA102 LED-jei a kijelző SPI-forgalmától?
  python3 -m ckocka.diag power             # Pi-Ener-lite: külső táp (GPIO4), töltöttség, cellafeszültség

spi-leds – miért kell: a ReSpeaker 3 APA102 LED-je chip select nélkül ugyanazon az SPI0-n (MOSI GPIO10, SCLK GPIO11)
van, mint a kijelző (a kompatibilitás-ellenőrzés 1. pontja). Az APA102 minden órajelet „hall”: ha a kijelzőnek küldött adatban
32 nulla bit után 0b111xxxxx kezdetű bájtok jönnek (fekete képrész, majd világos), a LED-ek színt váltanak.
A teszt ezért szándékosan ilyen képeket küld (fekete–fehér csíkok, színátmenetek, zaj), és megkérdezi, mit láttál.
Ha villognak: a ReSpeaker felé menő 19-es és 23-as tüskét le kell választani a stacking tüskesorban (a 3 LED-re nincs
szükség, a 24-es fénygyűrű kiváltja). A kocka firmware-je ezeket a LED-eket soha nem vezérli.
"""
import argparse, sys, time

APA102_N = 3


def apa102_decode(stream, n=APA102_N, state=None):
    """Mit látna egy chip select nélküli APA102-lánc ebből a bájtfolyamból? (Egyszerűsített modell a tesztekhez:
    32 nulla bit = kezdőkeret, utána LED-enként 4 bájt: 0b111 + 5 bit fényerő, kék, zöld, piros.)
    Visszaad: a LED-ek utolsó (fényerő, r, g, b) állapota; None = nem kapott még adatot."""
    leds = list(state or [None] * n)
    zeros, i, k = 0, 0, None
    b = bytes(stream)
    while i < len(b):
        if k is None:
            zeros = zeros + 1 if b[i] == 0 else 0
            i += 1
            if zeros >= 4:
                k = 0
            continue
        if b[i] == 0:                                    # újabb nulla: még a kezdőkeret
            i += 1
            continue
        if b[i] >> 5 != 0b111 or i + 4 > len(b):
            k, zeros = None, 0
            continue
        gb, bl, gr, rd = b[i:i + 4]
        if k < n:
            leds[k] = (gb & 0x1F, rd, gr, bl)
        k += 1
        i += 4
        if k >= n:
            k, zeros = None, 0
    return leds


def patterns(size=240):
    """Kijelzőképek, amelyek az APA102-t leginkább „megszólítják” (Pillow-képek)."""
    from PIL import Image
    import random
    rnd = random.Random(1)
    out = []
    for color in ((255, 255, 255), (255, 0, 0), (0, 255, 0), (0, 0, 255)):
        img = Image.new('RGB', (size, size))
        for y in range(0, size, 16):                     # fekete és színes csíkok: nullák, majd 0xFF bájtok
            if (y // 16) % 2:
                img.paste(color, (0, y, size, y + 16))
        out.append(img)
    noise = Image.frombytes('RGB', (size, size), bytes(rnd.getrandbits(8) for _ in range(size * size * 3)))
    out.append(noise)
    grad = Image.linear_gradient('L').resize((size, size)).convert('RGB')
    out.append(grad)
    return out


def spi_leds(display, seconds=15.0, ask=input, out=print, blank=None):
    """A kijelzőre küldi a mintákat `seconds` ideig, majd megkérdezi, villogtak-e a ReSpeaker LED-jei.
    Visszatérési érték: 0 = rendben, 1 = villognak (teendő kell), 2 = nem tudni."""
    if blank:
        blank()
    out('Figyeld a ReSpeaker 3 kis LED-jét (a panel szélén) – %d másodpercig mintákat küldök a kijelzőre.' % seconds)
    imgs, t0, n = patterns(), time.monotonic(), 0
    while time.monotonic() - t0 < seconds:
        display.show(imgs[n % len(imgs)])
        n += 1
    out('%d kép elküldve.' % n)
    ans = (ask('Villogtak vagy színt váltottak a ReSpeaker LED-jei? (i/n) ') or '').strip().lower()
    if ans.startswith(('i', 'y')):
        out('PROBLÉMA: a kijelző SPI-forgalma vezérli az APA102 LED-eket.\n'
            '  Teendő: a stacking tüskesorban a ReSpeaker felé menő 19-es (MOSI) és 23-as (SCLK) tüske leválasztása.\n'
            '  A kocka a ReSpeaker LED-jeit nem használja, így ez semmit nem ront el.')
        return 1
    if ans.startswith('n'):
        out('Rendben: a ReSpeaker LED-jei nem reagálnak a kijelzőre.')
        return 0
    out('Nem egyértelmű válasz – futtasd újra.')
    return 2


def blank_apa102(bus=0, dev=1):
    """A ReSpeaker LED-jeinek kikapcsolása a teszt elején (spidev0.1), hogy ismert, sötét állapotból induljunk.
    Csak a diagnosztika használja; ha az eszköz nem érhető el, kihagyjuk."""
    try:
        import spidev
        spi = spidev.SpiDev()
        spi.open(bus, dev)
        spi.max_speed_hz = 1_000_000
        spi.writebytes([0] * 4 + [0xE0, 0, 0, 0] * APA102_N + [0xFF] * 4)
        spi.close()
    except Exception as e:
        print('(a ReSpeaker LED-jeit nem tudtam kikapcsolni: %s – nem baj)' % e)


def power(out=print):
    from . import power as pw
    mon = pw.make_monitor()
    if not mon:
        out('Nincs UPS-adat (GPIO4 és CW2015 sem olvasható).')
        return 2
    ext, soc, volt = mon.read()
    out('külső táp: %s   töltöttség: %s   cellafeszültség: %s' % (
        {True: 'VAN', False: 'nincs', None: '?'}[ext], '?' if soc is None else '%.1f %%' % soc,
        '?' if volt is None else '%.3f V' % volt))
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(prog='ckocka.diag', description='C-kocka diagnosztika a valódi hardveren')
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('spi-leds', help='a kijelző SPI-forgalma és a ReSpeaker APA102 LED-jei')
    s.add_argument('--seconds', type=float, default=15.0)
    s.add_argument('--no-blank', action='store_true', help='ne kapcsolja ki előbb a ReSpeaker LED-jeit')
    sub.add_parser('power', help='Pi-Ener-lite: külső táp, töltöttség')
    a = p.parse_args(argv)
    if a.cmd == 'power':
        return power()
    from . import hw_real
    disp = hw_real.make_display()
    if isinstance(disp, hw_real.NullDisplay):
        print('A kijelző nem érhető el – előbb: sudo sh firmware/pi/install.sh, majd újraindítás.')
        return 2
    return spi_leds(disp, a.seconds, blank=None if a.no_blank else blank_apa102)


if __name__ == '__main__':
    sys.exit(main())
