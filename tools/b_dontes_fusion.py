# „B döntés” (2026-11-17, KOMPATIBILITAS.md): az arcot a XIAO rajzolja, a XIAO USB-n (OTG) kapcsolódik a Pi-hez.
# A Fusion-modellben:
#  1) a hangszóró és a rögzítőgyűrűje a BAL rács mögé kerül (a jobb oldali testek tükrözve, majd törölve); a jobb rács szellőző;
#  2) OTG: ablak a jobb sínben a Pi micro-USB portjánál (y 48…65,7, z -0,6…10,4), a 90°-ban lefelé forduló micro-B dugó
#     helyőrzője (x 15,6…26, y 50…63,7, z 1,4…8,4), és a XIAO felőli 90°-ban felfelé forduló USB-C dugó helyőrzője;
#     a XIAO 90°-kal elforgatva (USB-C portja jobbra, +X), mert előre a rezgőmodul, hátra az USB-C hosszabbító állja el a dugó útját;
#  3) NeoDriver: a bal oldalon ütközne a hangszóróval -> a jobb sín külső oldalára, az IMU elé (z 0…25,4), 4 db M2,5 betéttel.
#     A bal sín korábbi NeoDriver-oszlopai és Qwiic-rése a szánon maradnak (betét nélkül, nem használt).
# BIZTONSÁG: mint a többi szkriptnél – a c-kocka.f3d ÚJ dokumentumként nyílik meg, minden lépés előtt ellenőrzi, hogy ez az
# aktív, a végén mentés nélkül bezárja, és visszaállítja az előtte aktív dokumentumot.
import adsk.core, adsk.fusion, os

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1
ND_OLD = 'NeoDriver (Adafruit 5766) - bal sin kulso oldala'
ND_NEW = 'NeoDriver (Adafruit 5766) - jobb sin kulso oldala'
ND_BOX = (22.5, 11.5, 0.0, 34.1, 36.9, 25.4)
ND_SCREWS = [(y, z) for y in (14.04, 26.74) for z in (2.54, 22.86)]
XIAO_OLD = 'XIAO RP2040 (LED, gomb, IMU)'
XIAO_NEW = 'XIAO RP2040 (LED, gomb, IMU, kijelzo) - USB-C jobbra'
XIAO_BOX = (-15.0, 9.0, -13.5, 6.0, 12.5, 4.0)
WINDOW = (18.4, 48.0, -0.6, 21.6, 65.7, 10.4)
PLUG_PI = ('OTG dugo: micro-B 90 fok lefele (Pi)', (15.6, 50.0, 1.4, 26.0, 63.7, 8.4))
PLUG_XIAO = ('OTG dugo: USB-C 90 fok felfele (XIAO)', (6.0, 9.5, -10.75, 14.5, 20.0, 1.25))
SPK = ['Hangszoro jobb – perem (40 mm)', 'Hangszoro jobb – test']
RING = 'Hangszoro rogzito jobb (PETG)'

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
        if not target:
            raise RuntimeError('nincs test: %s' % target_name)
        col = adsk.core.ObjectCollection.create()
        for b in add(comp, temps, name + ' (szerszám)'):
            col.add(b)
        ci = comp.features.combineFeatures.createInput(target, col)
        ci.operation = op
        ci.isKeepToolBodies = False
        comp.features.combineFeatures.add(ci).name = name
        log.append(name)

    def remove(comp, name):
        guard('törlés ' + name)
        b = comp.bRepBodies.itemByName(name)
        if not b:
            raise RuntimeError('nincs test: %s' % name)
        comp.features.removeFeatures.add(b)
        log.append('törölve: ' + name)

    def new_body(comp, b, name, look):
        guard(name)
        nb = add(comp, [box(*b)], name)[0]
        nb.name = name
        nb.appearance = look
        log.append('új test: ' + name)

    def mirror_left(comp, names):
        guard('tükrözés')
        col = adsk.core.ObjectCollection.create()
        for n in names:
            b = comp.bRepBodies.itemByName(n)
            if not b:
                raise RuntimeError('nincs test: %s' % n)
            col.add(b)
        before = set(b.entityToken for b in comp.bRepBodies)
        mi = comp.features.mirrorFeatures.createInput(col, comp.yZConstructionPlane)
        mf = comp.features.mirrorFeatures.add(mi)
        mf.name = 'Hangszoro a bal oldalra (tukrozes)'
        new = [b for b in comp.bRepBodies if b.entityToken not in before]
        if len(new) != len(names):
            raise RuntimeError('tükrözés: %d új test (%d kellett)' % (len(new), len(names)))
        for n in names:                                   # párosítás a befoglaló doboz tükörképe szerint
            src = comp.bRepBodies.itemByName(n).boundingBox
            for b in new:
                bb = b.boundingBox
                if abs(bb.minPoint.x + src.maxPoint.x) < 1e-4 and abs(bb.minPoint.y - src.minPoint.y) < 1e-4:
                    b.name = n.replace('jobb', 'bal')
        for n in names:
            remove(comp, n)

    if elek.bRepBodies.itemByName(XIAO_NEW):
        log.append('már átvezetve – csak exportálok')
    else:
        # 1) hangszóró balra
        mirror_left(elek, SPK)
        mirror_left(belso, [RING])
        # 3) NeoDriver a jobb sínre
        look = elek.bRepBodies.itemByName(ND_OLD).appearance
        remove(elek, ND_OLD)
        combine(belso, 'Szan (PETG)', [cyl_x(21.4, 22.5, y, z, 3.0) for y, z in ND_SCREWS], JOIN, 'Szan NeoDriver csavaroszlopok (jobb)')
        combine(belso, 'Szan (PETG)', [cyl_x(22.6, 17.5, y, z, 1.8) for y, z in ND_SCREWS], CUT, 'Szan NeoDriver betetfuratok (jobb)')
        new_body(elek, ND_BOX, ND_NEW, look)
        # 2) OTG: ablak a jobb sínben, dugók, XIAO elforgatva
        combine(belso, 'Szan (PETG)', [box(*WINDOW)], CUT, 'Szan jobb sin ablak (OTG dugo)')
        xl = elek.bRepBodies.itemByName(XIAO_OLD).appearance
        remove(elek, XIAO_OLD)
        new_body(elek, XIAO_BOX, XIAO_NEW, xl)
        usb_look = elek.bRepBodies.itemByName('USB-C panelhosszabbito (altalanos, fules)').appearance
        new_body(elek, PLUG_PI[1], PLUG_PI[0], usb_look)
        new_body(elek, PLUG_XIAO[1], PLUG_XIAO[0], usb_look)

    guard('export')
    em = design.exportManager
    d3 = os.path.join(ROOT, '3d')
    em.execute(em.createFusionArchiveExportOptions(os.path.join(d3, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(d3, 'c-kocka.step')))
    o = em.createSTLExportOptions(root, os.path.join(d3, 'c-kocka.stl'))
    o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(o)
    parts = {'Szan (PETG)': 'szan', 'Hangszoro rogzito bal (PETG)': 'hangszoro_rogzito_bal'}
    for bb in belso.bRepBodies:
        if bb.name in parts:
            o = em.createSTLExportOptions(bb, os.path.join(d3, 'nyomtatas', 'FDM_PETG', parts[bb.name] + '.stl'))
            o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            o.isBinaryFormat = True
            em.execute(o)
    log.append('exportálva: c-kocka.f3d, .step, .stl + szan, hangszoro_rogzito_bal STL')
