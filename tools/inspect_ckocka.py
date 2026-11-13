# Csak olvasó ellenőrző szkript: aktív dokumentum, testek, megjelenések, idővonal hibák
import adsk.core, adsk.fusion


def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.activeDocument
    design = adsk.fusion.Design.cast(app.activeProduct)
    out = ['DOKUMENTUM: %s' % (doc.name if doc else None)]
    if not design:
        print('\n'.join(out + ['Nincs aktív terv.']))
        return
    root = design.rootComponent
    out.append('TESTEK (%d):' % root.bRepBodies.count)
    for b in root.bRepBodies:
        bb = b.boundingBox
        app_name = b.appearance.name if b.appearance else '-'
        out.append('  %-18s %-14s  x[%.2f..%.2f] y[%.2f..%.2f] z[%.2f..%.2f]  vol=%.2f cm3  visible=%s' % (
            b.name, app_name, bb.minPoint.x, bb.maxPoint.x, bb.minPoint.y, bb.maxPoint.y,
            bb.minPoint.z, bb.maxPoint.z, b.volume, b.isVisible))
    hibak = []
    tl = design.timeline
    for i in range(tl.count):
        item = tl.item(i)
        try:
            if item.healthState != adsk.fusion.FeatureHealthStates.HealthyFeatureHealthState:
                hibak.append('  %s: %s %s' % (item.name, item.healthState, item.errorOrWarningMessage))
        except:
            pass
    out.append('IDŐVONAL: %d elem, %d hiba/figyelmeztetés' % (tl.count, len(hibak)))
    out += hibak
    print('\n'.join(out))
