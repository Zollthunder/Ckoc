# A 2026-11-17-i költségdöntések átvezetése a Fusion-modellbe (c-kocka.f3d), majd F3D/STEP/STL export.
# ÁLLAPOT (2026-11-17): még NEM futtatva – a Fusion foglalt volt; csak Zollo jelzése után indítható.
# Ugyanazok a változások, mint a tools/cost_pass_step.py-ban (ott a részletes indoklás), csak parametrikusan, a Fusionben.
# BIZTONSÁG: a 3d/c-kocka.f3d fájlt ÚJ dokumentumként nyitja meg, minden lépés előtt ellenőrzi, hogy ez az aktív
# dokumentum, és a végén bezárja (mentés nélkül), majd visszaállítja az előtte aktív dokumentumot. Más dokumentumhoz nem nyúl.
# A munkakönyvtár: CKOCKA_ROOT környezeti változó, alapból ~/Desktop/klódakszing.
import adsk.core, adsk.fusion, os, math

ROOT = os.environ.get('CKOCKA_ROOT') or os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing')
F3D = os.path.join(ROOT, '3d', 'c-kocka.f3d')
MM = 0.1                                               # Fusion API: cm
MIC_X, MIC_FRONT_Z, MIC_REAR_Z = -6.34, 25.46, -33.46
OLD_MIC = [(0.0, 21.0), (0.0, -21.0)]
FEET = [(20.5, 19.0), (-20.5, 19.0), (17.5, -21.5), (-17.5, -21.5)]
FOOT_D, FOOT_H, DIFF_BOTTOM = 10.0, 3.0, -3.0
HAT = (-15.0, 71.8, -36.5, 15.0, 79.4, 28.5)
USB_POCKET = (-16.0, 5.0, -42.5, 16.0, 9.5, -40.3)
USB_FLANGE = (-15.0, 5.2, -42.4, 15.0, 13.8, -40.4)
NAME_HAT = 'ReSpeaker 2-Mics Pi HAT (mikrofonhely v1 alapjan, v2-n becsult)'
NAME_VIB = 'Rezgomotor-modul (ERM, 3 tus)'
NAME_USB = 'USB-C panelhosszabbito (altalanos, fules)'

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
    log = ['megnyitva új dokumentumként: %s (előtte aktív: %s)' % (doc.name, prev.name if prev else '-')]
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
    if design.designType != adsk.fusion.DesignTypes.ParametricDesignType:
        raise RuntimeError('nem parametrikus dokumentum')
    occ = {o.component.name.split(' ')[0]: o.component for o in root.occurrences}
    belso, elek = occ.get('Belso'), occ.get('Elektronika')
    if not belso or not elek:
        raise RuntimeError('hiányzik a Belso szerkezet / Elektronika komponens')
    if elek.bRepBodies.itemByName(NAME_HAT):
        log.append('már átvezetve – csak exportálok')
    else:
        tbm = adsk.fusion.TemporaryBRepManager.get()

        def cyl(x, z, r, y0, y1):
            return tbm.createCylinderOrCone(P(x * MM, y0 * MM, z * MM), r * MM, P(x * MM, y1 * MM, z * MM), r * MM)

        def box(x0, y0, z0, x1, y1, z1):
            c = P((x0 + x1) / 2 * MM, (y0 + y1) / 2 * MM, (z0 + z1) / 2 * MM)
            return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(c, V(1, 0, 0), V(0, 1, 0),
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

        # 1) mikrofonok
        combine(root, 'Tetolap', [cyl(x, z, 1.2, 89.0, 91.0) for x, z in OLD_MIC], JOIN, 'Tetolap regi mikrofonfurat betomve')
        combine(root, 'Tetolap', [cyl(MIC_X, z, 0.8, 88.5, 91.5) for z in (MIC_FRONT_Z, MIC_REAR_Z)], CUT,
                'Tetolap ReSpeaker mikrofonfuratok')
        combine(root, 'Haz (SLS)', [cyl(MIC_X, MIC_REAR_Z, 1.0, 85.0, 89.5)], CUT, 'Haz hatso mikrofon hangfurat')
        combine(belso, 'Tetotarto (PETG)', [cyl(x, z, 3.4, 83.3, 86.3) for x, z in OLD_MIC], JOIN,
                'Tetotarto regi csatorna betomve')
        combine(belso, 'Tetotarto (PETG)', [cyl(MIC_X, MIC_FRONT_Z, 3.0, 83.0, 86.6), cyl(MIC_X, MIC_REAR_Z, 1.5, 83.0, 86.6)],
                CUT, 'Tetotarto ReSpeaker csatornak')
        old = elek.bRepBodies.itemByName('Voice Bonnet (2 mikrofon + sztereo hang)')
        app_hat = old.appearance if old else None
        remove(elek, 'Voice Bonnet (2 mikrofon + sztereo hang)')
        guard('ReSpeaker')
        hat = add(elek, [box(*HAT)], 'ReSpeaker helyorzo')[0]
        hat.name = NAME_HAT
        if app_hat:
            hat.appearance = app_hat
        # 2) bal hangszóró és gyűrű
        for b in [b.name for b in elek.bRepBodies if b.name.startswith('Hangszoro bal')]:
            remove(elek, b)
        remove(belso, 'Hangszoro rogzito bal (PETG)')
        # 3) gumitalp -> gumilábak
        remove(root, 'Gumitalp')
        guard('gumilábak')
        look = root.bRepBodies.itemByName('Erinto betet').appearance
        for i, b in enumerate(add(root, [cyl(x, z, FOOT_D / 2, DIFF_BOTTOM - FOOT_H, DIFF_BOTTOM) for x, z in FEET],
                                 'Gumilabak (ontapados)'), 1):
            b.name = 'Gumilab %d' % i
            b.appearance = look
        log.append('4 gumiláb')
        # 4) USB-C
        combine(root, 'Also talca (szan alap)', [box(*USB_POCKET)], CUT, 'Talca USB-C zseb (altalanos hosszabbito)')
        combine(elek, 'USB-C aljzat panel', [box(*USB_FLANGE)], JOIN, 'USB-C fül helyorzo')
        elek.bRepBodies.itemByName('USB-C aljzat panel').name = NAME_USB
        # 5) érintőpanel ki, rezgőmodul átnevezve
        remove(elek, 'Erintes (AT42QT1010)')
        elek.bRepBodies.itemByName('Rezgo (DRV2605L + motor)').name = NAME_VIB
        log.append('átnevezve: ' + NAME_VIB + ', ' + NAME_USB)

    # export
    guard('export')
    em = design.exportManager
    d3 = os.path.join(ROOT, '3d')
    em.execute(em.createFusionArchiveExportOptions(os.path.join(d3, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(d3, 'c-kocka.step')))
    o = em.createSTLExportOptions(root, os.path.join(d3, 'c-kocka.stl'))
    o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(o)
    parts = {'Haz (SLS)': ('SLS_PA12', 'haz'), 'Also talca (szan alap)': ('SLS_PA12', 'also_talca'),
             'Tetotarto (PETG)': ('FDM_PETG', 'tetotarto')}
    bodies = list(root.bRepBodies) + [b for c in (belso, elek) for b in c.bRepBodies]
    for b in bodies:
        if b.name in parts:
            sub, fn = parts[b.name]
            o = em.createSTLExportOptions(b, os.path.join(d3, 'nyomtatas', sub, fn + '.stl'))
            o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            o.isBinaryFormat = True
            em.execute(o)
    log.append('exportálva: c-kocka.f3d, .step, .stl + haz, also_talca, tetotarto STL')
