# Szerelési útmutató képei: lépésenként csak az adott alkatrészek látszanak -> szereles/kepek/NN_*.png
# A láthatóságot és a kamerát a végén visszaállítja (a modell geometriája nem változik).
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'szereles', 'kepek')
P = adsk.core.Point3D.create
V = adsk.core.Vector3D.create
TRAY = ['Also talca', 'RGB fenygyuru', 'Gumitalp']
SLED = TRAY + ['Szan', 'NeoPixel', 'UPS', 'Raspberry', 'Voice Bonnet', 'XIAO', 'IMU', 'Rezgo', 'USB-C']
FRONT = ['Elolapi tarto', 'Kerek kijelzo', 'Mini kamera', 'C LED', 'Arc']
TOP = ['Tetotarto', 'kapcsolo', 'Erintes', 'Gomb', 'Andor', 'Tetolap', 'Erinto betet']
HOUSING = ['Haz (SLS)', 'C fenycsatorna', 'Hangszoro']
# (fájl, látható nevek (részlet), áttetsző nevek, szem, cél)
STEPS = [
    ('01_haz_elokeszites', HOUSING, ['Haz (SLS)'], P(-14, 9, -18), P(0, 4.5, 0)),
    ('02_talca_diffuzor', TRAY, [], P(12, -14, 14), P(0, 0, 0)),
    ('03_szan_elektronika', SLED, [], P(16, 12, 20), P(0, 3.5, 0)),
    ('04_eloegyseg', FRONT, [], P(9, 8, 22), P(0, 4.5, 3.8)),
    ('05_tetoegyseg', TOP, [], P(14, 17, 18), P(0, 8.6, 0)),
    ('06_haz_eloegyseg_hangszorok', HOUSING + FRONT, ['Haz (SLS)'], P(16, 9, 20), P(0, 4.5, 0)),
    ('07_teto_be', HOUSING + FRONT + TOP, ['Haz (SLS)'], P(16, 16, 20), P(0, 6, 0)),
    ('08_szan_alulrol', HOUSING + FRONT + TOP + SLED, ['Haz (SLS)'], P(16, 5, 22), P(0, 4.5, 0)),
    ('09_kesz', None, [], P(16, 13, 20), P(0, 4.5, 0)),
]


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    os.makedirs(OUT, exist_ok=True)
    bodies = list(root.bRepBodies)
    for occ in root.occurrences:
        bodies += list(occ.bRepBodies)
    saved = [(b, b.isLightBulbOn, b.opacity) for b in bodies]
    # vázlatok, vásznak (képek), segédsíkok, matricák elrejtése a képek idejére
    folders = [a for a in ('isSketchFolderLightBulbOn', 'isCanvasFolderLightBulbOn', 'isConstructionFolderLightBulbOn',
                           'isDecalFolderLightBulbOn', 'isOriginFolderLightBulbOn') if hasattr(root, a)]
    comps = [root] + [o.component for o in root.occurrences]
    saved_f = [(c, a, getattr(c, a)) for c in comps for a in folders if hasattr(c, a)]
    for c, a, _ in saved_f:
        setattr(c, a, False)
    vp = app.activeViewport
    cam0 = vp.camera
    done = []
    try:
        for fn, names, ghost, eye, target in STEPS:
            for b in bodies:
                b.isLightBulbOn = names is None or any(n in b.name for n in names)
                b.opacity = 0.25 if any(g == b.name for g in ghost) else 1.0
            cam = vp.camera
            cam.eye, cam.target, cam.upVector = eye, target, V(0, 1, 0)
            cam.isSmoothTransition = False
            vp.camera = cam
            vp.fit()
            vp.saveAsImageFile(os.path.join(OUT, fn + '.png'), 1200, 900)
            done.append(fn)
    finally:
        for b, on, op in saved:
            b.isLightBulbOn = on
            b.opacity = op
        vp.camera = cam0
        for c, a, v in saved_f:
            setattr(c, a, v)
    print('%d kép: %s' % (len(done), ', '.join(done)))
