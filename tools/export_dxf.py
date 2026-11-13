# Minden alkatrész DXF-be: 3 nézet (elöl, felül, oldal) + 1 metszet a test közepén.
# Ideiglenes vázlatokat hoz létre, exportálja őket, majd törli – a modell idővonala nem változik.
# Kimenet: dxf/<alkatrész>/<alkatrész>_<nézet>.dxf
import adsk.core, adsk.fusion, os, traceback

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'dxf')


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    if not (root.bRepBodies.itemByName('Haz') or root.bRepBodies.itemByName('Haz (SLS)')):
        print('Az aktív dokumentum nem a C-kocka – nem csinálok semmit.')
        return
    os.makedirs(OUT, exist_ok=True)
    # Y-fel tájolás: elölnézet = XY sík, felülnézet = XZ sík, oldalnézet = YZ sík
    views = [('elol', root.xYConstructionPlane), ('felul', root.xZConstructionPlane), ('oldal', root.yZConstructionPlane)]
    done, errors = 0, []
    for body in root.bRepBodies:
        if not body.isVisible:
            continue
        name = body.name.lower().replace(' ', '_')
        d = os.path.join(OUT, name)
        os.makedirs(d, exist_ok=True)
        for vname, plane in views:
            sk = root.sketches.add(plane)
            sk.isComputeDeferred = True   # gyorsítás: nem számol újra minden vetített élnél
            try:
                try:
                    sk.project2([e for e in body.edges], False)   # a test összes éle a síkra vetítve (lyukak, hornyok is)
                except Exception:
                    sk.project2([body], False)                    # tartalék: csak a körvonal
                sk.isComputeDeferred = False
                sk.saveAsDXF(os.path.join(d, '%s_%s.dxf' % (name, vname)))
                done += 1
            except Exception as ex:
                errors.append('%s/%s: %s' % (name, vname, ex))
            finally:
                sk.deleteMe()
        # metszet a test közepén (elölnézeti irányban)
        try:
            bb = body.boundingBox
            zc = (bb.minPoint.z + bb.maxPoint.z) / 2
            ci = root.constructionPlanes.createInput()
            ci.setByOffset(root.xYConstructionPlane, adsk.core.ValueInput.createByReal(zc))
            pl = root.constructionPlanes.add(ci)
            sk = root.sketches.add(pl)
            sk.isComputeDeferred = True   # gyorsítás: nem számol újra minden vetített élnél
            sk.projectCutEdges(body)
            sk.isComputeDeferred = False
            sk.saveAsDXF(os.path.join(d, '%s_metszet.dxf' % name))
            done += 1
            sk.deleteMe()
            pl.deleteMe()
        except Exception as ex:
            errors.append('%s/metszet: %s' % (name, ex))
    print('%d DXF kész a(z) %s mappában. Hibák: %d %s' % (done, OUT, len(errors), '; '.join(errors[:5])))
