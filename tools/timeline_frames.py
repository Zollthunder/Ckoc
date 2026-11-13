# A modell felépülésének képkockái: az idővonal jelölőjét lépésenként előre mozgatja, és minden lépésnél képet ment.
# A végén visszaállítja az idővonalat és a láthatósági beállításokat.
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'video', 'fusion_build')
W, H = 1920, 1080


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz'):
        print('Az aktív dokumentum nem a C-kocka – nem csinálok semmit.')
        return
    os.makedirs(OUT, exist_ok=True)
    tl = design.timeline
    vp = app.activeViewport
    sk_on, cons_on = root.isSketchFolderLightBulbOn, root.isConstructionFolderLightBulbOn
    root.isSketchFolderLightBulbOn = False
    root.isConstructionFolderLightBulbOn = False
    P = adsk.core.Point3D.create
    V = adsk.core.Vector3D.create

    def set_cam(yup):
        cam = vp.camera
        if yup:
            cam.eye, cam.target, cam.upVector = P(17, 15, 23), P(0, 3.8, 0), V(0, 1, 0)
        else:  # a "felállítás" előtt a modell még Z-fel tájolású
            cam.eye, cam.target, cam.upVector = P(17, -23, 15), P(0, 0, 3.8), V(0, 0, 1)
        cam.isSmoothTransition = False
        cam.cameraType = adsk.core.CameraTypes.PerspectiveCameraType
        vp.camera = cam
        vp.refresh()

    move_idx = None
    for i in range(tl.count):
        if tl.item(i).name.startswith('Felallitas'):
            move_idx = i
    try:
        n = 0
        for i in range(1, tl.count + 1):
            tl.markerPosition = i
            set_cam(move_idx is None or i > move_idx)
            vp.saveAsImageFile(os.path.join(OUT, 'build_%03d.png' % i), W, H)
            n += 1
        print('%d képkocka mentve (%d idővonal elem), felállítás indexe: %s' % (n, tl.count, move_idx))
    finally:
        tl.moveToEnd()
        root.isSketchFolderLightBulbOn = sk_on
        root.isConstructionFolderLightBulbOn = cons_on
