# Gyártható ház a C-kocka élő modelljén (Y-fel tájolás, cm; a kocka alja y=0, eleje +Z, él 9 cm):
#  1) a tömör ház kettévágása y = 0,9 cm-nél: felső SLS-ház + alsó lekerekített tálca (a szán alapja)
#  2) héjazás 2,5 mm-es falra (a felső alul nyitott, a tálca felül nyitott)
#  3) átmenő nyílások: kijelző, kamera, C fénycsatorna, hangszórórácsok, tetőnyílás, tetőlap-csavarok
import adsk.core, adsk.fusion, math, traceback

EL, H, WALL, SPLIT = 9.0, 4.5, 0.25, 0.9
C_R, C_T, C_GAP = 2.2, 0.22, 72.0
KIJ_R, KAM_U, KAM_R = 1.65, 2.6, 0.22
RACS_R, RACS_LYUK, RACS_OSZTAS = 2.4, 0.10, 0.42
TOP_OPEN = 3.0          # a tetőnyílás fél mérete (60 × 60 mm)
SCREW = (3.3, 0.11)     # tetőlap-csavarok helye (±3,3 cm) és furatsugara (M2)

P = adsk.core.Point3D.create
val = adsk.core.ValueInput.createByReal


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    haz = root.bRepBodies.itemByName('Haz')
    if not haz or not root.bRepBodies.itemByName('Tetolap'):
        print('Nem a C-kocka (vagy már átalakított) dokumentum aktív – nem módosítok semmit.')
        return
    log = []
    feats = root.features

    def plane_y(y):
        ci = root.constructionPlanes.createInput()
        ci.setByOffset(root.xZConstructionPlane, val(y))
        pl = root.constructionPlanes.add(ci)
        if abs(pl.geometry.origin.y - y) > 1e-6:          # ha a sík normálisa fordított
            pl.deleteMe()
            ci = root.constructionPlanes.createInput()
            ci.setByOffset(root.xZConstructionPlane, val(-y))
            pl = root.constructionPlanes.add(ci)
        return pl

    def face(body, axis, value):
        for f in body.faces:
            if f.geometry.surfaceType == adsk.core.SurfaceTypes.PlaneSurfaceType:
                c = f.centroid
                if abs({'x': c.x, 'y': c.y, 'z': c.z}[axis] - value) < 1e-3:
                    return f
        raise Exception('nincs sík lap: %s=%s' % (axis, value))

    def cut(sk, profiles, depth, bodies, name):
        ei = feats.extrudeFeatures.createInput(profiles, adsk.fusion.FeatureOperations.CutFeatureOperation)
        ei.setSymmetricExtent(val(depth), True)
        ei.participantBodies = bodies
        f = feats.extrudeFeatures.add(ei)
        f.name = name
        return f

    def all_prof(sk, max_area=None):
        col = adsk.core.ObjectCollection.create()
        for p in sk.profiles:
            if max_area is None or p.areaProperties().area <= max_area:
                col.add(p)
        return col

    # 1) kettévágás
    pl = plane_y(SPLIT)
    pl.name = 'Haz osztosik'
    si = feats.splitBodyFeatures.createInput(haz, pl, True)
    feats.splitBodyFeatures.add(si).name = 'Haz kettevagas'
    upper = lower = None
    for b in root.bRepBodies:
        if b.name.startswith('Haz'):
            if b.boundingBox.maxPoint.y > EL - 0.01:
                upper = b
            else:
                lower = b
    upper.name, lower.name = 'Haz (SLS)', 'Also talca (szan alap)'
    log.append('kettévágva')

    # 2) héjazás
    for body, y, nm in ((upper, SPLIT, 'Haz hejazas'), (lower, SPLIT, 'Talca hejazas')):
        col = adsk.core.ObjectCollection.create()
        col.add(face(body, 'y', y))
        shi = feats.shellFeatures.createInput(col, False)
        shi.insideThickness = val(WALL)
        feats.shellFeatures.add(shi).name = nm
    upper = root.bRepBodies.itemByName('Haz (SLS)')
    log.append('héjazva 2,5 mm')

    # 2b) a héjazás a régi sekély bemélyedések (rács, kijelző, C, kamera, USB) mögött befelé álló bütyköket hagy:
    #     ezeket lemarjuk, hogy a belső fal sík legyen (a modulok és tartók a falra ülhessenek)
    tbm = adsk.fusion.TemporaryBRepManager.get()
    flat = [tbm.createCylinderOrCone(P(0, H, H - WALL), 3.1, P(0, H, H - WALL - 1.5), 3.1)]                    # elöl
    flat += [tbm.createCylinderOrCone(P(sx * (H - WALL), H, 0), 2.9, P(sx * (H - WALL - 1.5), H, 0), 2.9) for sx in (-1, 1)]  # oldalt
    flat.append(tbm.createBox(adsk.core.OrientedBoundingBox3D.create(P(0, 1.0, -(H - WALL) + 0.4), adsk.core.Vector3D.create(1, 0, 0),
                                                                     adsk.core.Vector3D.create(0, 1, 0), 2.0, 1.4, 0.8)))      # hátul (USB)
    bfx = feats.baseFeatures.add()
    bfx.startEdit()
    for t in flat:
        root.bRepBodies.add(t, bfx)
    bfx.finishEdit()
    bfx.name = 'Belso sikfal szerszamok'
    for target, idx in (('Haz (SLS)', range(bfx.bodies.count)), ('Also talca (szan alap)', [bfx.bodies.count - 1])):
        tools = adsk.core.ObjectCollection.create()
        for i in idx:                       # a tálcát csak a hátsó (USB) szerszám éri
            tools.add(bfx.bodies.item(i))
        ci = feats.combineFeatures.createInput(root.bRepBodies.itemByName(target), tools)
        ci.operation = adsk.fusion.FeatureOperations.CutFeatureOperation
        ci.isKeepToolBodies = True
        feats.combineFeatures.add(ci).name = 'Belso sikfal ' + target
    for i in range(bfx.bodies.count - 1, -1, -1):
        feats.removeFeatures.add(bfx.bodies.item(i))
    upper = root.bRepBodies.itemByName('Haz (SLS)')
    log.append('belső bütykök lemarva')

    # 3a) elöl: kijelzőablak, kamera, C nyílás – átmenő
    sk = root.sketches.addWithoutEdges(face(upper, 'z', H))
    sk.name = 'Elolap nyilasok'
    sp = lambda x, y: sk.modelToSketchSpace(P(x, y, H))
    sk.sketchCurves.sketchCircles.addByCenterRadius(sp(0, H), KIJ_R)
    sk.sketchCurves.sketchCircles.addByCenterRadius(sp(KAM_U, H), KAM_R)
    arcs = sk.sketchCurves.sketchArcs
    a1, a2 = math.radians(C_GAP / 2), math.radians(360 - C_GAP / 2)
    fp = lambda r, a: sp(r * math.cos(a), H + r * math.sin(a))
    Ro, Ri = C_R + C_T, C_R - C_T
    o = arcs.addByThreePoints(fp(Ro, a1), fp(Ro, math.pi), fp(Ro, a2))
    i_ = arcs.addByThreePoints(fp(Ri, a1), fp(Ri, math.pi), fp(Ri, a2))

    def near(arc, pt):
        s, e = arc.startSketchPoint, arc.endSketchPoint
        return s if s.geometry.distanceTo(pt) < e.geometry.distanceTo(pt) else e
    for a, sg in ((a1, -1), (a2, 1)):
        mid = sp(C_R * math.cos(a) + sg * (-math.sin(a)) * C_T, H + C_R * math.sin(a) + sg * math.cos(a) * C_T)
        arcs.addByThreePoints(near(o, fp(Ro, a)), mid, near(i_, fp(Ri, a)))
    cut(sk, all_prof(sk), 2.0, [upper], 'Elolap atmeno nyilasok')
    log.append('elöl: kijelző, kamera, C átmenő')

    # 3b) oldalt: hangszórórácsok – átmenő
    for side, x in (('jobb', H), ('bal', -H)):
        sk = root.sketches.addWithoutEdges(face(upper, 'x', x))
        sk.name = 'Racs atmeno ' + side
        n = int(RACS_R / RACS_OSZTAS)
        for i in range(-n, n + 1):
            for j in range(-n, n + 1):
                zz = i * RACS_OSZTAS
                yy = j * RACS_OSZTAS + (RACS_OSZTAS / 2 if i % 2 else 0)
                if zz * zz + yy * yy <= RACS_R * RACS_R:
                    sk.sketchCurves.sketchCircles.addByCenterRadius(sk.modelToSketchSpace(P(x, H + yy, zz)), RACS_LYUK)
        cut(sk, all_prof(sk, math.pi * RACS_LYUK ** 2 * 1.5), 2.0, [upper], 'Racs atmeno ' + side)
    log.append('rácsok átmenő')

    # 3c) felül: tetőnyílás (60×60) a tetőlap alatt + 4 csavarfurat a tetőlapon és a peremen
    pl = plane_y(EL - 0.12)
    pl.name = 'Teto nyilas sik'
    sk = root.sketches.add(pl)
    sk.name = 'Teto nyilas'
    sk.sketchCurves.sketchLines.addCenterPointRectangle(sk.modelToSketchSpace(P(0, EL - 0.12, 0)),
                                                        sk.modelToSketchSpace(P(TOP_OPEN, EL - 0.12, TOP_OPEN)))
    cut(sk, all_prof(sk), 0.6, [upper], 'Teto nyilas')
    sk = root.sketches.add(pl)
    sk.name = 'Tetolap csavarok'
    for sx in (-1, 1):
        for sz in (-1, 1):
            sk.sketchCurves.sketchCircles.addByCenterRadius(sk.modelToSketchSpace(P(sx * SCREW[0], EL - 0.12, sz * SCREW[0])), SCREW[1])
    cut(sk, all_prof(sk), 1.0, [upper, root.bRepBodies.itemByName('Tetolap')], 'Tetolap csavarfuratok')
    log.append('tetőnyílás + 4 csavarfurat')

    vol = upper.volume
    print('Kész: %s · SLS ház térfogata %.0f cm3 (PA12 kb. %.0f g)' % (', '.join(log), vol, vol * 1.0))
