# Javítás a b_dontes_fusion.py után (2026-11-17), a távolságvizsgálat alapján:
#  - a Pi micro-B dugója nem lefelé, hanem ELŐRE fordul (90°, oldalra kivezetett): lefelé 0,6 mm-re lett volna a UPS-től.
#    Új helyőrző: x 15,6…24, y 56,7…63,7, z 1,4…16; a sínablak y 54,7…65,7, z -0,6…18 (az ablak alsó, már nem kellő része
#    visszatöltve). A kábel a sín előtt (z > 27) fut le, a NeoDriver előtt, majd a fedélzet fölött a XIAO-hoz.
#  - a XIAO USB-C dugójának feje a XIAO lapjának síkjából a fedélzet alá lóg -> kivágás a szán fedélzetében
#    (x 4…16,5, z -12,75…3,25, átmenő); a dugó helyőrzője y 7,85…20.
# BIZTONSÁG: mint a többi szkriptnél – a c-kocka.f3d ÚJ dokumentumként nyílik meg, minden lépés előtt ellenőrzi, hogy ez az
# aktív, a végén mentés nélkül bezárja, és visszaállítja az előtte aktív dokumentumot.
import adsk.core, adsk.fusion, os

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1
OLD_PI = 'OTG dugo: micro-B 90 fok lefele (Pi)'
NEW_PI = ('OTG dugo: micro-B 90 fok elore (Pi)', (15.6, 56.7, 1.4, 24.0, 63.7, 16.0))
XIAO_PLUG = ('OTG dugo: USB-C 90 fok felfele (XIAO)', (6.0, 7.85, -10.75, 14.5, 20.0, 1.25))
REFILL = (18.5, 48.0, -0.6, 21.5, 54.7, 10.4)        # a régi ablak alsó része (a sín itt x 18,5…21,5)
WINDOW = (18.4, 54.7, -0.6, 21.6, 65.7, 18.0)
DECK_NOTCH = (4.0, 6.4, -12.75, 16.5, 9.1, 3.25)

P = adsk.core.Point3D.create
V = adsk.core.Vector3D.create
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation


def run(_context: str):
    app = adsk.core.Application.get()
    prev = app.activeDocument
    if not os.path.exists(F3D):
        print('Nincs meg:', F3D)
        return
    doc = app.importManager.importToNewDocument(app.importManager.createFusionArchiveImportOptions(F3D))
    log = ['megnyitva új dokumentumként (előtte aktív: %s)' % (prev.name if prev else '-')]
    try:
        work(app, doc, log)
    except Exception as e:
        log.append('HIBA: %s' % e)
    finally:
        try:
            doc.close(False)
            log.append('C-kocka dokumentum bezárva mentés nélkül')
        except Exception as e:
            log.append('bezárás sikertelen: %s' % e)
        if prev:
            try:
                prev.activate()
                log.append('visszaállítva: %s' % prev.name)
            except Exception:
                pass
    print('\n'.join(log))


def work(app, doc, log):
    design = adsk.fusion.Design.cast(doc.products.itemByProductType('DesignProductType'))
    root = design.rootComponent

    def guard(step):
        if app.activeDocument != doc or not root.bRepBodies.itemByName('Haz (SLS)'):
            raise RuntimeError('nem a C-kocka az aktív dokumentum (%s) – leállítva' % step)

    guard('kezdés')
    occ = {o.component.name.split(' ')[0]: o.component for o in root.occurrences}
    belso, elek = occ.get('Belso'), occ.get('Elektronika')
    tbm = adsk.fusion.TemporaryBRepManager.get()

    def box(x0, y0, z0, x1, y1, z1):
        return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            P((x0 + x1) / 2 * MM, (y0 + y1) / 2 * MM, (z0 + z1) / 2 * MM), V(1, 0, 0), V(0, 1, 0),
            (x1 - x0) * MM, (y1 - y0) * MM, (z1 - z0) * MM))

    def add(comp, temps, name):
        bf = comp.features.baseFeatures.add()
        bf.startEdit()
        for t in temps:
            comp.bRepBodies.add(t, bf)
        bf.finishEdit()
        bf.name = name
        return [bf.bodies.item(i) for i in range(bf.bodies.count)]

    def combine(comp, target_name, temps, op, name):
        guard(name)
        target = comp.bRepBodies.itemByName(target_name)
        col = adsk.core.ObjectCollection.create()
        for b in add(comp, temps, name + ' (szerszám)'):
            col.add(b)
        ci = comp.features.combineFeatures.createInput(target, col)
        ci.operation = op
        ci.isKeepToolBodies = False
        comp.features.combineFeatures.add(ci).name = name
        log.append(name)

    def replace(name_old, spec):
        guard(spec[0])
        old = elek.bRepBodies.itemByName(name_old)
        if not old:
            raise RuntimeError('nincs test: %s' % name_old)
        look = old.appearance
        elek.features.removeFeatures.add(old)
        b = add(elek, [box(*spec[1])], spec[0])[0]
        b.name = spec[0]
        b.appearance = look
        log.append('csere: %s -> %s' % (name_old, spec[0]))

    if elek.bRepBodies.itemByName(NEW_PI[0]):
        log.append('már átvezetve – csak exportálok')
    else:
        combine(belso, 'Szan (PETG)', [box(*REFILL)], JOIN, 'Szan jobb sin ablak also resze visszatoltve')
        combine(belso, 'Szan (PETG)', [box(*WINDOW)], CUT, 'Szan jobb sin ablak (OTG dugo elore)')
        combine(belso, 'Szan (PETG)', [box(*DECK_NOTCH)], CUT, 'Szan fedelzet kivagas (XIAO USB-C dugo)')
        replace(OLD_PI, NEW_PI)
        replace(XIAO_PLUG[0], XIAO_PLUG)

    guard('export')
    em = design.exportManager
    d3 = os.path.join(ROOT, '3d')
    em.execute(em.createFusionArchiveExportOptions(os.path.join(d3, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(d3, 'c-kocka.step')))
    o = em.createSTLExportOptions(root, os.path.join(d3, 'c-kocka.stl'))
    o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(o)
    for bb in belso.bRepBodies:
        if bb.name == 'Szan (PETG)':
            o = em.createSTLExportOptions(bb, os.path.join(d3, 'nyomtatas', 'FDM_PETG', 'szan.stl'))
            o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            o.isBinaryFormat = True
            em.execute(o)
    log.append('exportálva: c-kocka.f3d, .step, .stl + szan STL')
