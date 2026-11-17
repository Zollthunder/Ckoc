"""Diagnosztika a valódi kockán (a szolgáltatás leállítása után):

  sudo systemctl stop ckocka
  cd /opt/ckocka && python3 -m ckocka.diag power      # Pi-Ener-lite: külső táp (GPIO4), töltöttség, cellafeszültség

(A kijelzőt a XIAO hajtja, a Pi SPI-buszán nincs semmi: a ReSpeaker APA102 LED-jeit semmi nem zavarja, és a kocka
nem is használja őket.)
"""
import argparse, sys


def power(out=print, make_monitor=None):
    from . import power as pw
    mon = (make_monitor or pw.make_monitor)()
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
    sub.add_parser('power', help='Pi-Ener-lite: külső táp, töltöttség')
    p.parse_args(argv)
    return power()


if __name__ == '__main__':
    sys.exit(main())
