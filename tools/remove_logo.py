# A céglogó eltávolítása az élő C-kocka modellből (a logó két testének törlése), majd újraexport
import adsk.core, adsk.fusion, os

EXPORT_DIR = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d')


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz'):
        print('Az aktív dokumentum nem a C-kocka – nem módosítok semmit.')
        return
    removed = []
    for name in ('Logo keret', 'Logo teli'):
        b = root.bRepBodies.itemByName(name)
        if b:
            root.features.removeFeatures.add(b)
            removed.append(name)
    em = design.exportManager
    em.execute(em.createFusionArchiveExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.step')))
    stl = em.createSTLExportOptions(root, os.path.join(EXPORT_DIR, 'c-kocka.stl'))
    stl.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(stl)
    left = [b.name for b in root.bRepBodies if 'Logo' in b.name]
    print('Eltávolítva: %s · maradt logó test: %s · exportálva' % (removed, left))
