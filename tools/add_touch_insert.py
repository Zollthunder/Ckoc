# Élő modell: a tetőlap közepén lévő érintőmélyedés helyére Ø18 mm-es szigetelt (műanyag) betét kerül.
# Az alumínium lapon átmenő furat + egy külön "Erinto betet" test (alatta lesz az érintőelektróda a tetőpanelen).
import adsk.core, adsk.fusion

R = 0.9          # betét sugara (cm) – Ø18 mm
PLATE_MID = 8.0  # a tetőlap közepe (Y-fel tájolásban y = 7,9 … 8,1)


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    plate = root.bRepBodies.itemByName('Tetolap')
    if not root.bRepBodies.itemByName('Haz') or not plate:
        print('Az aktív dokumentum nem a C-kocka – nem módosítok semmit.')
        return
    if root.bRepBodies.itemByName('Erinto betet'):
        print('A betét már megvan.')
        return
    bb = plate.boundingBox
    mid = (bb.minPoint.y + bb.maxPoint.y) / 2
    ci = root.constructionPlanes.createInput()
    ci.setByOffset(root.xZConstructionPlane, adsk.core.ValueInput.createByReal(mid))
    pl = root.constructionPlanes.add(ci)
    if pl.geometry.origin.y < 0:            # ha a sík normálisa lefelé mutat, fordított előjellel
        pl.deleteMe()
        ci = root.constructionPlanes.createInput()
        ci.setByOffset(root.xZConstructionPlane, adsk.core.ValueInput.createByReal(-mid))
        pl = root.constructionPlanes.add(ci)
    pl.name = 'Erinto betet sik'
    sk = root.sketches.add(pl)
    sk.name = 'Erinto betet'
    sk.sketchCurves.sketchCircles.addByCenterRadius(sk.modelToSketchSpace(adsk.core.Point3D.create(0, mid, 0)), R)
    ext = root.features.extrudeFeatures
    # 1) átmenő furat az alumínium lapon
    ei = ext.createInput(sk.profiles.item(0), adsk.fusion.FeatureOperations.CutFeatureOperation)
    ei.setSymmetricExtent(adsk.core.ValueInput.createByReal(0.3), True)
    ei.participantBodies = [plate]
    ext.add(ei).name = 'Erinto furat'
    # 2) a betét: ugyanolyan vastag, mint a lap, vele egy síkban
    ei = ext.createInput(sk.profiles.item(0), adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    ei.setSymmetricExtent(adsk.core.ValueInput.createByReal(bb.maxPoint.y - bb.minPoint.y), True)
    f = ext.add(ei)
    f.name = 'Erinto betet'
    body = f.bodies.item(0)
    body.name = 'Erinto betet'
    # megjelenés: matt, áttetsző fehér műanyag
    a = design.appearances.itemByName('CK betet')
    if not a:
        base = design.appearances.itemByName('CK RGB feny')
        a = design.appearances.addByCopy(base, 'CK betet')
        for i in range(a.appearanceProperties.count):
            cp = adsk.core.ColorProperty.cast(a.appearanceProperties.item(i))
            if cp and not cp.isReadOnly and 'olor' in cp.name:
                try:
                    cp.value = adsk.core.Color.create(236, 236, 232, 255)
                except:
                    pass
    body.appearance = a
    b2 = body.boundingBox
    print('Betét kész: y %.2f..%.2f, Ø %.1f mm' % (b2.minPoint.y, b2.maxPoint.y, (b2.maxPoint.x - b2.minPoint.x) * 10))
