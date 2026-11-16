# Nézetenkénti DXF (elöl, felül, oldal + metszet) EGYETLEN alkatrészre – a tools/export_dxf.py egy-alkatrészes változata.
# Miért: az összes test egyszerre exportálva egyszer több mint egy órára lefagyasztotta a Fusiont (2026-11-13),
# ezért alkatrészenként futtatjuk, és minden futás után ellenőrizzük az időt.
# Használat: a PART változót a futtató írja át (lásd tools/export_dxf_parts.ps1 / fusion-mcp.js script).
import adsk.core, adsk.fusion, os, time

PART = 'Tetolap'
OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'dxf')


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    if not design or app.activeDocument.name != 'c-kocka':
        print('Nem a c-kocka az aktív dokumentum – nem csinálok semmit.')
        return
    root = design.rootComponent
    body = root.bRepBodies.itemByName(PART)
    if not body:
        print('Nincs ilyen test: %s' % PART)
        return
    t0 = time.time()
    name = body.name.lower().replace(' ', '_')
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    views = [('elol', root.xYConstructionPlane), ('felul', root.xZConstructionPlane), ('oldal', root.yZConstructionPlane)]
    done, errors = [], []
    for vname, plane in views:
        sk = root.sketches.add(plane)
        sk.isComputeDeferred = True
        try:
            try:
                sk.project2([e for e in body.edges], False)
            except Exception:
                sk.project2([body], False)
            sk.isComputeDeferred = False
            sk.saveAsDXF(os.path.join(d, '%s_%s.dxf' % (name, vname)))
            done.append(vname)
        except Exception as ex:
            errors.append('%s: %s' % (vname, ex))
        finally:
            sk.deleteMe()
    try:
        bb = body.boundingBox
        ci = root.constructionPlanes.createInput()
        ci.setByOffset(root.xYConstructionPlane, adsk.core.ValueInput.createByReal((bb.minPoint.z + bb.maxPoint.z) / 2))
        pl = root.constructionPlanes.add(ci)
        sk = root.sketches.add(pl)
        sk.isComputeDeferred = True
        sk.projectCutEdges(body)
        sk.isComputeDeferred = False
        sk.saveAsDXF(os.path.join(d, '%s_metszet.dxf' % name))
        done.append('metszet')
        sk.deleteMe()
        pl.deleteMe()
    except Exception as ex:
        errors.append('metszet: %s' % ex)
    print('%s: %s kész %.1f s alatt%s' % (PART, ', '.join(done), time.time() - t0, (' | hibák: ' + '; '.join(errors)) if errors else ''))
