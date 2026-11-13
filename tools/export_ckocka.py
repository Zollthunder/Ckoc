# Az élő C-kocka modell exportálása (F3D, STEP, STL) a projekt 3d mappájába
import adsk.core, adsk.fusion, os

EXPORT_DIR = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d')


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not (root.bRepBodies.itemByName('Haz') or root.bRepBodies.itemByName('Haz (SLS)')):
        print('Az aktív dokumentum nem a C-kocka – nem exportálok.')
        return
    em = design.exportManager
    em.execute(em.createFusionArchiveExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.f3d')))
    em.execute(em.createSTEPExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.step')))
    stl = em.createSTLExportOptions(root, os.path.join(EXPORT_DIR, 'c-kocka.stl'))
    stl.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
    em.execute(stl)
    print('Exportálva: c-kocka.f3d, c-kocka.step, c-kocka.stl')
