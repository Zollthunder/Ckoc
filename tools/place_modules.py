# Kész modulok helyőrzői a kocka belsejében ("Elektronika (vazlat)" komponens) + ütközésvizsgálat + kép.
# Egységek: cm, Y-fel tájolás; a kocka alja y=0, közepe (0, 4, 0), eleje +Z. Falvastagság feltételezve: 2,5 mm.
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'assets', 'fusion')
EL = 9.0                                         # kocka élhossza (TERVEZESI_ELVEK.md)
H = EL / 2
W = 0.25                                         # feltételezett falvastagság
INNER = (-H + W, H - W, W, EL - W, -H + W, H - W)  # belső tér: x, y, z határok
ZS = -0.4                                        # a fő stack kicsit hátrébb, hogy a kijelző mögött legyen hely
TOP = 8.63                                       # a tetőlap alatti perem alja belülről (2,5 mm-es perem)
BRACKET = (TOP - 0.3, TOP)                       # a nyomtatott tetőtartó (3 mm) a tetőperem alatt
STACK_GAP = 0.6                                  # tetőperem – Voice Bonnet: tetőtartó (3 mm) + 3 mm hely

# név, típus, közép (x, y, z), méret (x, y, z) vagy (átmérő, hossz, tengely), szín
MODULES = [
    ('Voice Bonnet (2 mikrofon + sztereo hang)', 'box', (0, TOP - STACK_GAP - 0.425, ZS), (3.0, 0.85, 6.5), (40, 160, 90)),
    ('Raspberry Pi Zero 2 W', 'box', (0, TOP - STACK_GAP - 0.85 - 0.85 - 0.3, ZS), (3.0, 0.6, 6.5), (30, 140, 60)),
    ('UPS + 18650 akku', 'box', (0, TOP - STACK_GAP - 0.85 - 0.85 - 0.6 - 0.3 - 1.05, ZS), (3.0, 2.1, 7.0), (60, 90, 200)),
    ('Kerek kijelzo 1.28" (GC9A01, kerek NYAK)', 'disc', (0, H, H - W - 0.2), (3.75, 0.4, 'z'), (20, 20, 30)),
    ('Mini kamera (OV5647, 8.5 mm)', 'box', (2.6, H, 3.98), (0.85, 0.85, 0.5), (200, 40, 40)),
    ('Hangszoro jobb – perem (40 mm)', 'cyl', (H - W - 0.15, H, 0), (4.0, 0.3, 'x'), (90, 90, 90)),
    ('Hangszoro jobb – test', 'cyl', (H - W - 0.3 - 0.65, H, 0), (3.0, 1.3, 'x'), (90, 90, 90)),
    ('Hangszoro bal – perem (40 mm)', 'cyl', (-(H - W - 0.15), H, 0), (4.0, 0.3, 'x'), (90, 90, 90)),
    ('Hangszoro bal – test', 'cyl', (-(H - W - 0.3 - 0.65), H, 0), (3.0, 1.3, 'x'), (90, 90, 90)),
    ('NeoPixel Ring 24 (66 mm)', 'ring', (0, W + 0.2, 0), (6.6, 5.25, 0.35), (230, 230, 230)),
    ('XIAO RP2040 (LED, gomb, IMU)', 'box', (0, 0.9 + 0.175, -0.3), (1.75, 0.35, 2.1), (40, 120, 40)),
    ('IMU (LSM6DS3TR-C)', 'box', (0, 0.9 + 0.15, -2.6), (2.5, 0.3, 1.8), (200, 120, 30)),
    ('Rezgo (DRV2605L + motor)', 'box', (0, 0.9 + 0.2, 2.0), (2.0, 0.4, 1.8), (150, 60, 160)),
    ('USB-C aljzat panel', 'box', (0, 1.0, -4.0), (1.4, 0.6, 0.4), (80, 80, 80)),
    ('Erintes (AT42QT1010)', 'box', (-2.75, BRACKET[0] - 0.08, 0), (1.2, 0.15, 1.5), (220, 200, 40)),
    ('Gomb 1 kapcsolo', 'box', (-2.75, BRACKET[0] - 0.225, 2.75), (0.6, 0.45, 0.6), (60, 60, 60)),
    ('Gomb 2 kapcsolo', 'box', (2.75, BRACKET[0] - 0.225, 2.75), (0.6, 0.45, 0.6), (60, 60, 60)),
    ('Gomb 3 kapcsolo', 'box', (2.75, BRACKET[0] - 0.225, -2.75), (0.6, 0.45, 0.6), (60, 60, 60)),
    ('Gomb 4 kapcsolo', 'box', (-2.75, BRACKET[0] - 0.225, -2.75), (0.6, 0.45, 0.6), (60, 60, 60)),
    # a valódi nyomtatott alkatrészek befoglaló dobozai – csak ellenőrzéshez (REF), testet nem hozunk létre
    ('REF Szan fedelzet (PETG)', 'box', (0, 0.775, -0.35), (5.6, 0.25, 6.9), None),
    ('REF Szan sin bal (PETG)', 'box', (-2.0, (0.9 + 6.8) / 2, -0.4), (0.3, 6.8 - 0.9, 6.0), None),
    ('REF Szan sin jobb (PETG)', 'box', (2.0, (0.9 + 6.8) / 2, -0.4), (0.3, 6.8 - 0.9, 6.0), None),
    ('REF Tetotarto lap (PETG)', 'box', (0, TOP - 0.15, 0), (7.2, 0.3, 7.2), None),
    ('REF Tetotarto oszlop JE (PETG)', 'box', (3.3, TOP - 0.45, 3.3), (0.5, 0.3, 0.5), None),
    ('REF Tetotarto oszlop JH (PETG)', 'box', (3.3, TOP - 0.45, -3.3), (0.5, 0.3, 0.5), None),
    ('REF Tetotarto oszlop BE (PETG)', 'box', (-3.3, TOP - 0.45, 3.3), (0.5, 0.3, 0.5), None),
    ('REF Tetotarto oszlop BH (PETG)', 'box', (-3.3, TOP - 0.45, -3.3), (0.5, 0.3, 0.5), None),
    ('REF Elolapi tarto (PETG)', 'box', (0, H, 3.55), (6.6, 6.0, 0.3), None),
]


def bbox(m):
    _, kind, c, s, _ = m
    if kind == 'box':
        return [c[0] - s[0] / 2, c[0] + s[0] / 2, c[1] - s[1] / 2, c[1] + s[1] / 2, c[2] - s[2] / 2, c[2] + s[2] / 2]
    if kind == 'disc':  # tengely z irányban (kerek kijelző)
        return [c[0] - s[0] / 2, c[0] + s[0] / 2, c[1] - s[0] / 2, c[1] + s[0] / 2, c[2] - s[1] / 2, c[2] + s[1] / 2]
    if kind == 'cyl':   # tengely x irányban
        return [c[0] - s[1] / 2, c[0] + s[1] / 2, c[1] - s[0] / 2, c[1] + s[0] / 2, c[2] - s[0] / 2, c[2] + s[0] / 2]
    return [c[0] - s[0] / 2, c[0] + s[0] / 2, c[1] - s[2] / 2, c[1] + s[2] / 2, c[2] - s[0] / 2, c[2] + s[0] / 2]


def disc_clear(m1, m2):
    """Kerek kijelző és egy doboz: a doboz legközelebbi pontja a kör középpontjától nagyobb-e a sugárnál."""
    d, bx = (m1, m2) if m1[1] == 'disc' else (m2, m1)
    c, r = d[2], d[3][0] / 2
    b = bbox(bx)
    nx = min(max(c[0], b[0]), b[1]); ny = min(max(c[1], b[2]), b[3])
    return ((nx - c[0]) ** 2 + (ny - c[1]) ** 2) ** 0.5 > r


def gap(a, b):
    """Két befoglaló doboz közti legkisebb távolság (cm); 0, ha átfednek."""
    d = [max(0.0, max(a[i], b[i]) - min(a[i + 1], b[i + 1])) for i in (0, 2, 4)]
    return (d[0] ** 2 + d[1] ** 2 + d[2] ** 2) ** 0.5


def overlap(a, b):
    return all(min(a[i + 1], b[i + 1]) - max(a[i], b[i]) > 0.01 for i in (0, 2, 4))


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    if not (root.bRepBodies.itemByName('Haz') or root.bRepBodies.itemByName('Haz (SLS)')):
        print('Az aktív dokumentum nem a C-kocka – nem csinálok semmit.')
        return
    # korábbi helyőrzők törlése
    for occ in list(root.occurrences):
        if occ.component.name == 'Elektronika (vazlat)':
            occ.deleteMe()
    occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    comp = occ.component
    comp.name = 'Elektronika (vazlat)'
    tbm = adsk.fusion.TemporaryBRepManager.get()
    P, V = adsk.core.Point3D.create, adsk.core.Vector3D.create
    bf = comp.features.baseFeatures.add()
    bf.startEdit()
    CREATE = [m for m in MODULES if m[4] is not None]   # a REF elemek csak az ellenőrzéshez kellenek
    for m in CREATE:
        name, kind, c, s, col = m
        if kind == 'box':
            tb = tbm.createBox(adsk.core.OrientedBoundingBox3D.create(P(*c), V(1, 0, 0), V(0, 1, 0), s[0], s[1], s[2]))
        elif kind == 'disc':
            tb = tbm.createCylinderOrCone(P(c[0], c[1], c[2] - s[1] / 2), s[0] / 2, P(c[0], c[1], c[2] + s[1] / 2), s[0] / 2)
        elif kind == 'cyl':
            tb = tbm.createCylinderOrCone(P(c[0] - s[1] / 2, c[1], c[2]), s[0] / 2, P(c[0] + s[1] / 2, c[1], c[2]), s[0] / 2)
        else:
            tb = tbm.createCylinderOrCone(P(c[0], c[1] - s[2] / 2, c[2]), s[0] / 2, P(c[0], c[1] + s[2] / 2, c[2]), s[0] / 2)
            hole = tbm.createCylinderOrCone(P(c[0], c[1] - s[2], c[2]), s[1] / 2, P(c[0], c[1] + s[2], c[2]), s[1] / 2)
            tbm.booleanOperation(tb, hole, adsk.fusion.BooleanTypes.DifferenceBooleanType)
        comp.bRepBodies.add(tb, bf)
    bf.finishEdit()
    bf.name = 'Modulok'
    base_app = design.appearances.itemByName('CK grafit')
    for i, m in enumerate(CREATE):
        b = bf.bodies.item(i)
        b.name = m[0]
        a = design.appearances.itemByName('EL ' + m[0])
        if not a and base_app:
            a = design.appearances.addByCopy(base_app, 'EL ' + m[0])
            for k in range(a.appearanceProperties.count):
                cp = adsk.core.ColorProperty.cast(a.appearanceProperties.item(k))
                if cp and not cp.isReadOnly and 'olor' in cp.name:
                    try:
                        cp.value = adsk.core.Color.create(m[4][0], m[4][1], m[4][2], 255)
                    except:
                        pass
        if a:
            b.appearance = a
    # ütközésvizsgálat (befoglaló dobozokkal) és belső tér ellenőrzés
    report = []
    boxes = [(m[0], bbox(m)) for m in MODULES]
    for i in range(len(boxes)):
        n, b = boxes[i]
        out = [INNER[0] - b[0], b[1] - INNER[1], INNER[2] - b[2], b[3] - INNER[3], INNER[4] - b[4], b[5] - INNER[5]]
        if max(out) > 0.01:
            report.append('KILÓG a belső térből: %s (%.1f mm)' % (n, max(out) * 10))
        for j in range(i + 1, len(boxes)):
            if overlap(b, boxes[j][1]) and not ({MODULES[i][1], MODULES[j][1]} == {'disc', 'box'} and disc_clear(MODULES[i], MODULES[j])):
                report.append('ÜTKÖZÉS: %s <-> %s' % (n, boxes[j][0]))
    # szűk helyek: a 3 mm-nél (szerelési cél) kisebb hézagok listája
    tight = []
    for i in range(len(boxes)):
        n, b = boxes[i]
        wall = min(b[0] - INNER[0], INNER[1] - b[1], b[2] - INNER[2], INNER[3] - b[3], b[4] - INNER[4], INNER[5] - b[5])
        if wall < 0.3:
            tight.append('%s – fal: %.1f mm' % (n, wall * 10))
        for j in range(i + 1, len(boxes)):
            g = gap(b, boxes[j][1])
            if ('PETG' in n or 'PETG' in boxes[j][0]) and g < 0.1 and not overlap(b, boxes[j][1]):
                continue   # rögzítési felület: a modul a nyomtatott tartón ül (szándékos érintkezés)
            if 0 < g < 0.3 or (g == 0 and not overlap(b, boxes[j][1])):
                tight.append('%s – %s: %.1f mm' % (n, boxes[j][0], g * 10))
    # képek: a ház és a tető áttetszővé téve
    saved = {}
    for nm in ('Haz', 'Haz (SLS)', 'Also talca (szan alap)', 'Tetolap', 'Erinto betet', 'Kijelzo', 'C fenycsatorna'):
        bd = root.bRepBodies.itemByName(nm)
        if bd:
            saved[nm] = bd.opacity
            bd.opacity = 0.12
    vp = app.activeViewport
    cam = vp.camera
    for fname, eye in (('modulok_iso.png', P(16, 13, 20)), ('modulok_elol.png', P(0.01, 4, 26)), ('modulok_oldal.png', P(26, 4.5, 0.01))):
        cam.eye, cam.target, cam.upVector = eye, P(0, 3.8, 0), V(0, 1, 0)
        cam.isSmoothTransition = False
        vp.camera = cam
        vp.refresh()
        vp.saveAsImageFile(os.path.join(OUT, fname), 1400, 1000)
    for nm, op in saved.items():
        root.bRepBodies.itemByName(nm).opacity = op
    print('Helyőrzők: %d · %s || SZŰK (< 3 mm): %s' % (len(MODULES), ' | '.join(report) if report else 'nincs ütközés, minden belefér', ' | '.join(tight) if tight else 'nincs'))
