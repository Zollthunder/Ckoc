# A videó robbantott ábrájához: a 90 mm-es modell minden teste külön STL-ben (mm, Y-fel) -> video/model_inside/
# + inside.json (név, fájl). Csak olvas és exportál, a modellt nem módosítja.
import adsk.core, adsk.fusion, os, json, re

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'video', 'model_inside')


def slug(s):
    s = s.lower()
    for a, b in (('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ö', 'o'), ('ő', 'o'), ('ú', 'u'), ('ü', 'u'), ('ű', 'u')):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    os.makedirs(OUT, exist_ok=True)
    em = design.exportManager
    bodies = [(b, '') for b in root.bRepBodies] + [(b, o.component.name) for o in root.occurrences for b in o.bRepBodies]
    out, used = [], set()
    for b, comp in bodies:
        if not b.isVisible:
            continue
        fn = slug(b.name)
        while fn in used:
            fn += '_2'
        used.add(fn)
        o = em.createSTLExportOptions(b, os.path.join(OUT, fn + '.stl'))
        o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
        o.isBinaryFormat = True
        em.execute(o)
        bb = b.boundingBox
        out.append({'name': b.name, 'comp': comp, 'file': fn + '.stl',
                    'center': [round((bb.minPoint.x + bb.maxPoint.x) * 5, 2), round((bb.minPoint.y + bb.maxPoint.y) * 5, 2),
                               round((bb.minPoint.z + bb.maxPoint.z) * 5, 2)]})
    with open(os.path.join(OUT, 'inside.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('%d test exportálva' % len(out))
