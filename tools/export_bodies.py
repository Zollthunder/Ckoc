# A C-kocka minden testének külön STL exportja a weboldalhoz és a videóhoz (web/model/<név>.stl)
import adsk.core, adsk.fusion, os, json

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'web', 'model')


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz'):
        print('Az aktív dokumentum nem a C-kocka – nem exportálok.')
        return
    os.makedirs(OUT, exist_ok=True)
    em = design.exportManager
    lista = []
    for b in root.bRepBodies:
        fn = b.name.lower().replace(' ', '_') + '.stl'
        opt = em.createSTLExportOptions(b, os.path.join(OUT, fn))
        opt.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
        opt.isBinaryFormat = True
        em.execute(opt)
        lista.append({'name': b.name, 'file': fn, 'appearance': b.appearance.name if b.appearance else ''})
    with open(os.path.join(OUT, 'bodies.json'), 'w', encoding='utf-8') as f:
        json.dump(lista, f, ensure_ascii=False, indent=1)
    print('%d test exportálva' % len(lista))
