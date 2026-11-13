# Képek a ház belsejéről: alulról ferdén (a tálca és a modulok elrejtve), és egy metszetszerű nézet
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'assets', 'fusion')


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nincs átalakított ház.')
        return
    hide = [b for b in root.bRepBodies if b.name in ('Also talca (szan alap)', 'Gumitalp', 'RGB fenygyuru') or b.name.startswith('Gumi sarok')]
    occs = [o for o in root.occurrences]
    for b in hide:
        b.isLightBulbOn = False
    for o in occs:
        o.isLightBulbOn = False
    vp = app.activeViewport
    cam = vp.camera
    P, V = adsk.core.Point3D.create, adsk.core.Vector3D.create
    cam.eye, cam.target, cam.upVector = P(11, -12, 14), P(0, 4.5, 0), V(0, 1, 0)
    cam.isSmoothTransition = False
    vp.camera = cam
    vp.refresh()
    vp.saveAsImageFile(os.path.join(OUT, 'haz_alulrol.png'), 1400, 1000)
    for b in hide:
        b.isLightBulbOn = True
    for o in occs:
        o.isLightBulbOn = True
    tl = design.timeline
    bad = [tl.item(i).name for i in range(tl.count) if tl.item(i).healthState != adsk.fusion.FeatureHealthStates.HealthyFeatureHealthState]
    print('Idővonal: %d elem, hibás: %s' % (tl.count, bad or 'nincs'))
