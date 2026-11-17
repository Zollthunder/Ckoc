# Adafruit NeoDriver (5766, I2C -> NeoPixel) a szán BAL sínjének külső oldalán (2026-11-17, KOMPATIBILITAS.md 4.).
# Gyártói Eagle-fájl (Adafruit-NeoDriver-STEMMA-QT-PCB): 25,4 × 25,4 mm, 4 db Ø2,5 furat a (2,54 | 22,86; 2,54 | 15,24)
# pontokban, a felső élen 3,5 mm-es sorkapcsok (3P + 2P), a két oldalélen STEMMA QT.
# Elhelyezés (Y fel, eleje +Z): NYÁK x -22,5…-24,1, alkatrész-oldal kifelé (-X), y 11,5…36,9 (sorkapcsok felül, a vezeték
# felfelé lép ki), z -24…1,4 (a Qwiic csatlakozók előre és hátra néznek). 4 db M2,5×6 hengeres fejű csavar a sínbe olvasztott
# betétekbe, 1,1 mm-es csavaroszlopokon. Qwiic kábelrés a bal sínben elöl (y 12…16,5, z 4…10), a szintillesztő/LED-lánc felé.
# BIZTONSÁG: mint a többi szkriptnél – a c-kocka.f3d ÚJ dokumentumként nyílik meg, minden lépés előtt ellenőrzi, hogy ez az
# aktív, a végén mentés nélkül bezárja, és visszaállítja az előtte aktív dokumentumot.
import adsk.core, adsk.fusion, os

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1
NAME = 'NeoDriver (Adafruit 5766) - bal sin kulso oldala'
BOARD = (-34.1, 11.5, -24.0, -22.5, 36.9, 1.4)          # NYÁK + sorkapocs (kb. 10 mm) befoglaló doboza
SCREWS = [(y, z) for y in (14.04, 26.74) for z in (-21.46, -1.14)]
NOTCH = (-21.6, 12.0, 4.0, -16.9, 16.5, 10.0)

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

    def pt(x, y, z):
        return P(x * MM, y * MM, z * MM)

    def box(x0, y0, z0, x1, y1, z1):
        return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            pt((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), V(1, 0, 0), V(0, 1, 0),
            (x1 - x0) * MM, (y1 - y0) * MM, (z1 - z0) * MM))

    def cyl_x(x0, x1, y, z, r):
        return tbm.createCylinderOrCone(pt(x0, y, z), r * MM, pt(x1, y, z), r * MM)

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

    if elek.bRepBodies.itemByName(NAME):
        log.append('már átvezetve – csak exportálok')
    else:
        combine(belso, 'Szan (PETG)', [cyl_x(-22.5, -21.4, y, z, 3.0) for y, z in SCREWS], JOIN, 'Szan NeoDriver csavaroszlopok')
        combine(belso, 'Szan (PETG)', [cyl_x(-22.6, -17.5, y, z, 1.8) for y, z in SCREWS], CUT, 'Szan NeoDriver betetfuratok (M2,5)')
        combine(belso, 'Szan (PETG)', [box(*NOTCH)], CUT, 'Szan bal Qwiic kabelres')
        guard('NeoDriver')
        look = elek.bRepBodies.itemByName('IMU (LSM6DS3TR-C, Adafruit 4503) - jobb sin kulso oldala').appearance
        b = add(elek, [box(*BOARD)], 'NeoDriver helyorzo')[0]
        b.name = NAME
        b.appearance = look
        log.append('új test: ' + NAME)

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
