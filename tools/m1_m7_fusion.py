# M1 (közös csavarméret) és M7 (tetőlap R1 sarok) átvezetése a Fusion-modellben, majd F3D/STEP/STL export (2026-11-17; lefuttatva).
# M1: süllyesztett fejűből csak M2,5×8 (tetőlap, USB-C szorítólap, diffúzor, szánlábak). Ehhez:
#  - diffúzor (3 mm akril, alulról): a ×8 csúcsa y = 5,0-ig ér (a ×6-é 3,0-ig). A tálca 3 oszlopa 4,5 -> 6,3 mm magas, a
#    betétfurat (Ø3,6) 4 -> 5,6 mm mély (0,6 mm a csúcs alatt, 0,7 mm anyag fölötte). A szán fedélzete 6,5 mm-en kezdődik,
#    ezért fölötte Ø10-es kiszabadítás (oldalt is 2 mm): a (0; 22) oszlopnál átmenő, a sínek tövénél (±19,05; -11) 8,3 mm-ig (2 mm hely).
#  - szánlábak (alulról, a tálca 2,5 mm-es aljáén át): a ×8 csúcsa y = 8,0. A betétfurat (Ø3,6) eddig csak 3,7 mm mély volt
#    (a 4 mm-es betét sem fért be), most 5,0 mm (y 2,5…7,5); fölötte a meglévő Ø2,8-as furat a 9,0-es tetőig, a csúcs bent marad.
#  - USB-C szorítólap: a ×8 csúcsa z = -37,0 -> a Ø3,6-os betétfurat átmenő lesz (a lap 6 mm, mögötte ≥ 3 mm üres).
#  - tetőlap: már M2,5×8 volt, a csúcs a tetőtartó Ø3,6-os átmenő furatában marad (ellenőrizve).
# M7: a tetőlap 4 függőleges sarokéle R1 lekerekítést kap.
# BIZTONSÁG: mint a többi szkriptnél – a c-kocka.f3d ÚJ dokumentumként nyílik meg, minden lépés előtt ellenőrzi, hogy ez az
# aktív, a végén mentés nélkül bezárja, és visszaállítja az előtte aktív dokumentumot.
import adsk.core, adsk.fusion, os

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1
DIFF = [(0.0, 22.0), (19.053, -11.0), (-19.053, -11.0)]
LEGS = [(26.0, 29.0), (-26.0, 29.0), (26.0, -34.0), (-26.0, -34.0)]
PLATE_SCREWS = [(-19.0, 18.0), (19.0, 18.0)]
MARK = 'M1 diffuzor oszlop 6,3 mm'
RELIEF = 'M1 szan kiszabaditas Ø10 a diffuzor oszlopok folott'

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
    belso = next((o.component for o in root.occurrences if o.component.name.startswith('Belso')), None)
    if not belso:
        raise RuntimeError('hiányzik a Belso szerkezet komponens')
    tbm = adsk.fusion.TemporaryBRepManager.get()

    def cyl_y(x, z, r, y0, y1):
        return tbm.createCylinderOrCone(P(x * MM, y0 * MM, z * MM), r * MM, P(x * MM, y1 * MM, z * MM), r * MM)

    def cyl_z(x, y, r, z0, z1):
        return tbm.createCylinderOrCone(P(x * MM, y * MM, z0 * MM), r * MM, P(x * MM, y * MM, z1 * MM), r * MM)

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

    if root.features.combineFeatures.itemByName(MARK):
        log.append('már átvezetve – csak exportálok')
    else:
        # M1 – diffúzor: magasabb oszlop, mélyebb betétfurat, kiszabadítás a szánban
        combine(root, 'Also talca (szan alap)', [cyl_y(x, z, 3.0, 4.4, 6.3) for x, z in DIFF], JOIN, MARK)
        combine(root, 'Also talca (szan alap)', [cyl_y(x, z, 1.8, -0.1, 5.6) for x, z in DIFF], CUT,
                'M1 diffuzor betetfurat 5,6 mm')
        # M1 – szánlábak: 5 mm mély betétfurat
        combine(belso, 'Szan (PETG)', [cyl_y(x, z, 1.8, 2.4, 7.5) for x, z in LEGS], CUT, 'M1 szanlab betetfurat 5 mm')
        # M1 – USB-C szorítólap: átmenő betétfurat
        combine(belso, 'USB-C szoritolap (PETG)', [cyl_z(x, y, 1.8, -42.6, -36.4) for x, y in PLATE_SCREWS], CUT,
                'M1 szoritolap betetfurat atmeno')
        # M7 – tetőlap R1 a 4 függőleges sarokélen
        guard('tetőlap R1')
        plate = root.bRepBodies.itemByName('Tetolap')
        edges = adsk.core.ObjectCollection.create()
        for e in plate.edges:
            a, b = e.startVertex.geometry, e.endVertex.geometry
            if abs(abs(a.x) - 3.6) < 1e-4 and abs(abs(a.z) - 3.6) < 1e-4 and abs(a.x - b.x) < 1e-6 and abs(a.z - b.z) < 1e-6:
                edges.add(e)
        if edges.count != 4:
            raise RuntimeError('a tetőlap sarokéleiből %d van (4 kellett)' % edges.count)
        fi = root.features.filletFeatures.createInput()
        fi.addConstantRadiusEdgeSet(edges, adsk.core.ValueInput.createByReal(0.1), True)
        root.features.filletFeatures.add(fi).name = 'M7 tetolap R1 sarok'
        log.append('M7 tetőlap R1 (4 sarokél)')

    if not belso.features.combineFeatures.itemByName(RELIEF):
        # kiszabadítás a szánban a diffúzoroszlopok fölött: Ø10 (az oszlop Ø6 -> oldalt 2 mm), alatta 2 mm
        relief = [cyl_y(0.0, 22.0, 5.0, 6.4, 9.1)] + [cyl_y(x, z, 5.0, 6.4, 8.3) for x, z in DIFF[1:]]
        combine(belso, 'Szan (PETG)', relief, CUT, RELIEF)

    guard('export')
    em = design.exportManager
    d3 = os.path.join(ROOT, '3d')
    em.execute(em.createFusionArchiveExportOptions(os.path.join(d3, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(d3, 'c-kocka.step')))
    o = em.createSTLExportOptions(root, os.path.join(d3, 'c-kocka.stl'))
    o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(o)
    parts = {'Also talca (szan alap)': ('SLS_PA12', 'also_talca'), 'Szan (PETG)': ('FDM_PETG', 'szan'),
             'USB-C szoritolap (PETG)': ('FDM_PETG', 'usb_c_szoritolap')}
    for b in list(root.bRepBodies) + list(belso.bRepBodies):
        if b.name in parts:
            sub, fn = parts[b.name]
            o = em.createSTLExportOptions(b, os.path.join(d3, 'nyomtatas', sub, fn + '.stl'))
            o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            o.isBinaryFormat = True
            em.execute(o)
    log.append('exportálva: c-kocka.f3d, .step, .stl + also_talca, szan, usb_c_szoritolap STL')
