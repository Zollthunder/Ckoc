# Szerelhetőségi áttekintés (csak olvas): minden test befoglaló mérete mm-ben + a kulcs-illeszkedések
import adsk.core, adsk.fusion


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    out = []

    def bb(b, prefix=''):
        x = b.boundingBox
        out.append('%-38s x %6.1f..%6.1f  y %6.1f..%6.1f  z %6.1f..%6.1f  V=%.2f cm3' % (
            prefix + b.name, x.minPoint.x * 10, x.maxPoint.x * 10, x.minPoint.y * 10, x.maxPoint.y * 10,
            x.minPoint.z * 10, x.maxPoint.z * 10, b.volume))
    for b in root.bRepBodies:
        bb(b)
    for occ in root.occurrences:
        for b in occ.bRepBodies:
            bb(b, occ.component.name[:10] + '/')
    print('\n'.join(out))
