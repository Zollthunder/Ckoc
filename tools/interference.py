# Csak olvasó: a Fusion saját interferencia-vizsgálata az összes valódi testen (ház, tálca, lapok, nyomtatott részek, modulok)
import adsk.core, adsk.fusion


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    col = adsk.core.ObjectCollection.create()
    n = 0
    for b in root.bRepBodies:
        if b.isVisible:
            col.add(b)
            n += 1
    for occ in root.occurrences:
        for b in occ.bRepBodies:      # proxy testek a komponensekből
            col.add(b)
            n += 1
    ii = design.createInterferenceInput(col)
    ii.areCoincidentFacesIncluded = False
    res = design.analyzeInterference(ii)
    rows = []
    for r in res:
        try:
            vol = r.interferenceBody.volume * 1000.0     # cm3 -> mm3
        except Exception:
            vol = -1
        rows.append((vol, r.entityOne.name, r.entityTwo.name))
    rows.sort(reverse=True)
    out = ['%d test vizsgálva, %d átfedés' % (n, len(rows))]
    out += ['  %8.2f mm3  %s  <->  %s' % r for r in rows[:40]]
    print('\n'.join(out))
