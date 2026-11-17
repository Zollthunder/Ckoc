# IMU és USB-C áthelyezése (Zollo jóváhagyása, 2026-11-17; lefuttatva 4 s alatt, az f3d/STEP/STL ebből van) a Fusion-modellben, majd F3D/STEP/STL export.
# 1) IMU (Adafruit 4503, gyártói Eagle-fájl: 25,4 × 17,8 mm, 2 db Ø2,5 furat a (2,54; 15,24) és (22,86; 15,24) pontban)
#    függőlegesen a szán JOBB sínjének KÜLSŐ oldalán (a belső oldalon a polc pereme miatt nem fér el):
#    NYÁK x 22,5…24,1, alkatrész-oldal kifelé (+X), y 11,5…29,3, z -33,5…-8,1. Rögzítés: 2 db M2,5×6 hengeres fejű csavar
#    a szánba olvasztott betétbe (Ø3,6, 5 mm mély), 1,1 mm-es csavaroszlopon (y = 26,74; z = -10,64 és -30,96).
#    A Qwiic kábel (50 mm, Adafruit 4399) az elülső csatlakozóból egy 7 × 6 mm-es sínrésen át megy a XIAO-hoz.
# 2) USB-C nyílás a ház hátfalában (közép y = 18, 9,4 × 3,6 mm); a régi nyílás az osztásvonalon és a tálca zsebei visszatöltve.
#    A hosszabbító füle (legfeljebb 31 × 2 mm, a mögötte lévő test legfeljebb 13 × 8 mm) egy PETG szorítólap és a fal közé
#    szorul; a lapot 2 db M2,5×8 süllyesztett csavar húzza a falhoz kívülről (x = ±19), a lap betéteibe. Így a rögzítés
#    nem függ a megvásárolt darab fülfurat-távolságától.
# BIZTONSÁG: a 3d/c-kocka.f3d-t ÚJ dokumentumként nyitja meg, minden lépés előtt ellenőrzi, hogy ez az aktív, a végén
# mentés nélkül bezárja, és visszaállítja az előtte aktív dokumentumot. Más dokumentumhoz nem nyúl.
import adsk.core, adsk.fusion, os

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1
NAME_IMU = 'IMU (LSM6DS3TR-C, Adafruit 4503) - jobb sin kulso oldala'
NAME_USB = 'USB-C panelhosszabbito (altalanos, fules)'
NAME_PLATE = 'USB-C szoritolap (PETG)'
IMU = (22.5, 11.5, -33.5, 27.1, 29.3, -8.1)
IMU_SCREWS = [(26.74, -10.64), (26.74, -30.96)]          # (y, z)
NOTCH = (16.9, 17.0, -5.0, 21.6, 24.0, 1.0)
USB_Y = 18.0
PLATE_SCREWS_X = (-19.0, 19.0)

P = adsk.core.Point3D.create
V = adsk.core.Vector3D.create
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation
DIFF = adsk.fusion.BooleanTypes.DifferenceBooleanType
INTER = adsk.fusion.BooleanTypes.IntersectionBooleanType
UNION = adsk.fusion.BooleanTypes.UnionBooleanType


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
    if not belso or not elek:
        raise RuntimeError('hiányzik a Belso szerkezet / Elektronika komponens')
    tbm = adsk.fusion.TemporaryBRepManager.get()

    def pt(x, y, z):
        return P(x * MM, y * MM, z * MM)

    def box(x0, y0, z0, x1, y1, z1):
        return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            pt((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), V(1, 0, 0), V(0, 1, 0),
            (x1 - x0) * MM, (y1 - y0) * MM, (z1 - z0) * MM))

    def cyl(p0, p1, r0, r1=None):
        return tbm.createCylinderOrCone(pt(*p0), r0 * MM, pt(*p1), (r1 if r1 is not None else r0) * MM)

    def bool_(a, b, op):
        tbm.booleanOperation(a, b, op)
        return a

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

    def replace(comp, old_name, temp, new_name):
        guard(new_name)
        old = comp.bRepBodies.itemByName(old_name)
        if not old:
            raise RuntimeError('nincs test: %s' % old_name)
        look = old.appearance
        comp.features.removeFeatures.add(old)
        b = add(comp, [temp], new_name)[0]
        b.name = new_name
        b.appearance = look
        log.append('csere: %s -> %s' % (old_name, new_name))
        return b

    if belso.bRepBodies.itemByName(NAME_PLATE):
        log.append('már átvezetve – csak exportálok')
    else:
        # ---- 1) IMU a jobb sín külső oldalán ----
        combine(belso, 'Szan (PETG)', [cyl((21.4, y, z), (22.5, y, z), 3.0) for y, z in IMU_SCREWS], JOIN,
                'Szan IMU csavaroszlopok')
        combine(belso, 'Szan (PETG)', [cyl((22.6, y, z), (17.5, y, z), 1.8) for y, z in IMU_SCREWS], CUT,
                'Szan IMU betetfuratok (M2,5)')
        combine(belso, 'Szan (PETG)', [box(*NOTCH)], CUT, 'Szan Qwiic kabelres')
        replace(elek, 'IMU (LSM6DS3TR-C)', box(*IMU), NAME_IMU)

        # ---- 2) USB-C a ház hátfalában ----
        # régi nyílás (osztásvonal) és a tálca zsebei visszatöltve: a tálca eredeti lekerekítése (R9 kívül, R6,5 belül)
        ring = bool_(cyl((-16.0, 9.0, -36.0), (16.0, 9.0, -36.0), 9.0), cyl((-16.1, 9.0, -36.0), (16.1, 9.0, -36.0), 6.5), DIFF)
        fill = bool_(box(-16.0, 2.6, -45.0, 16.0, 9.0, -36.0), ring, INTER)
        combine(root, 'Also talca (szan alap)', [fill], JOIN, 'Talca USB-C zseb visszatoltve')
        combine(root, 'Haz (SLS)', [box(-4.5, 9.0, -45.0, 4.5, 11.6, -42.5)], JOIN, 'Haz regi USB-C nyilas visszatoltve')
        cuts = [box(-4.7, USB_Y - 1.8, -45.5, 4.7, USB_Y + 1.8, -42.0)]
        for x in PLATE_SCREWS_X:                                   # Ø2,8 átmenő + 90°-os süllyesztés Ø5,0-re kívül
            cuts.append(cyl((x, USB_Y, -45.5), (x, USB_Y, -42.0), 1.4))
            cuts.append(cyl((x, USB_Y, -45.01), (x, USB_Y, -43.75), 2.51, 1.25))
        combine(root, 'Haz (SLS)', cuts, CUT, 'Haz USB-C nyilas a hatfalban (y 18)')
        plate = box(-22.0, 12.0, -42.5, 22.0, 24.0, -36.5)
        bool_(plate, box(-15.5, 11.0, -42.6, 15.5, 25.0, -40.3), DIFF)          # zseb a fülnek (2,2 mm)
        bool_(plate, box(-6.5, 14.0, -43.0, 6.5, 22.0, -36.0), DIFF)            # ablak a hosszabbító testének
        for x in PLATE_SCREWS_X:
            bool_(plate, cyl((x, USB_Y, -42.6), (x, USB_Y, -37.5), 1.8), DIFF)  # betétfurat Ø3,6, 5 mm
        guard('szorítólap')
        pb = add(belso, [plate], 'USB-C szoritolap')[0]
        pb.name = NAME_PLATE
        pb.appearance = belso.bRepBodies.itemByName('Szan (PETG)').appearance
        log.append('új test: ' + NAME_PLATE)
        usb = box(-15.0, 12.0, -42.5, 15.0, 24.0, -40.5)
        bool_(usb, box(-6.0, 14.5, -40.5, 6.0, 21.5, -18.4), UNION)
        bool_(usb, box(-4.5, USB_Y - 1.6, -45.0, 4.5, USB_Y + 1.6, -42.5), UNION)
        replace(elek, NAME_USB, usb, NAME_USB)

    guard('export')
    em = design.exportManager
    d3 = os.path.join(ROOT, '3d')
    em.execute(em.createFusionArchiveExportOptions(os.path.join(d3, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(d3, 'c-kocka.step')))
    o = em.createSTLExportOptions(root, os.path.join(d3, 'c-kocka.stl'))
    o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(o)
    parts = {'Haz (SLS)': ('SLS_PA12', 'haz'), 'Also talca (szan alap)': ('SLS_PA12', 'also_talca'),
             'Szan (PETG)': ('FDM_PETG', 'szan'), NAME_PLATE: ('FDM_PETG', 'usb_c_szoritolap')}
    for b in list(root.bRepBodies) + list(belso.bRepBodies):
        if b.name in parts:
            sub, fn = parts[b.name]
            o = em.createSTLExportOptions(b, os.path.join(d3, 'nyomtatas', sub, fn + '.stl'))
            o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            o.isBinaryFormat = True
            em.execute(o)
    log.append('exportálva: c-kocka.f3d, .step, .stl + haz, also_talca, szan, usb_c_szoritolap STL')
