# Pontszonda (csak olvas): egy egyenes mentén mm-enként kiírja, melyik test tartalmazza a pontot
import adsk.core, adsk.fusion

# név -> (kezdőpont mm, irány tengely, tól, ig)
LINES = {
    'C sav (x=-22, y=45) z mentén': ((-22.0, 45.0, 0.0), 'z', 30.0, 47.0),
    'Gomb 1 tengely y mentén': ((-27.5, 0.0, 27.5), 'y', 74.0, 93.0),
    'Gomb 1 szél (x=-30.8) y mentén': ((-30.8, 0.0, 27.5), 'y', 84.0, 93.0),
    'Erinto kozep y mentén': ((0.0, 0.0, 0.0), 'y', 76.0, 92.0),
    'Kijelzo kozep z mentén': ((0.0, 45.0, 0.0), 'z', 34.0, 47.0),
    'USB-C (x=0, y=10) z mentén': ((0.0, 10.0, 0.0), 'z', -46.0, -35.0),
    'Talca csavar (39.5,?,29) y mentén': ((39.5, 0.0, 29.0), 'y', -1.0, 20.0),
}


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    bodies = [(b.name, b) for b in root.bRepBodies]
    for occ in root.occurrences:
        bodies += [(b.name, b) for b in occ.bRepBodies]
    out = []
    for title, (p0, ax, a, b) in LINES.items():
        out.append('== ' + title)
        prev, start = None, a
        v = a
        while v <= b + 1e-6:
            p = list(p0)
            p['xyz'.index(ax)] = v
            pt = adsk.core.Point3D.create(p[0] / 10, p[1] / 10, p[2] / 10)
            inside = [n for n, bd in bodies if bd.pointContainment(pt) in (0, 1)]
            key = ', '.join(inside) or '(levegő)'
            if key != prev:
                if prev is not None:
                    out.append('  %6.1f..%6.1f  %s' % (start, v - 0.25, prev))
                prev, start = key, v
            v += 0.25
        out.append('  %6.1f..%6.1f  %s' % (start, b, prev))
    print('\n'.join(out))
