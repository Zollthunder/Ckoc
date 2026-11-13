# Javítás az élő C-kocka modellen: az arc mindhárom teste kapja meg a 'CK arc' megjelenést és rendes nevet
import adsk.core, adsk.fusion


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz') or not root.bRepBodies.itemByName('Arc'):
        print('Az aktív dokumentum nem a C-kocka – nem módosítok semmit.')
        return
    app_arc = design.appearances.itemByName('CK arc')
    arc = root.bRepBodies.itemByName('Arc')
    bb = arc.boundingBox
    out = []
    n = 2
    for b in root.bRepBodies:
        # az arc többi teste: ugyanabban a vékony rétegben (kijelző előtt) lévő névtelen testek
        if b.name.startswith('Body') and abs(b.boundingBox.minPoint.z - bb.minPoint.z) < 1e-3 \
                and abs(b.boundingBox.maxPoint.z - bb.maxPoint.z) < 1e-3:
            old = b.name
            b.name = 'Arc %d' % n
            n += 1
            if app_arc:
                b.appearance = app_arc
            out.append('%s -> %s' % (old, b.name))
    print('Javítva: ' + (', '.join(out) if out else 'nem találtam javítanivalót'))
