# A mentett C-kocka modell megnyitása ÚJ dokumentumként (más nyitott dokumentumhoz nem nyúl)
import os, adsk.core, adsk.fusion

F3D = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d', 'c-kocka.f3d')


def run(_context: str):
    app = adsk.core.Application.get()
    if not os.path.exists(F3D):
        print('Nincs meg:', F3D)
        return
    opts = app.importManager.createFusionArchiveImportOptions(F3D)
    doc = app.importManager.importToNewDocument(opts)
    doc.name = 'c-kocka'
    print('Megnyitva: %s, aktív: %s' % (doc.name, app.activeDocument.name))
