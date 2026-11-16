# Csak olvasó: hangszóró-gyűrű nyílása és a süllyesztések legnagyobb átmérője az M2,5 átállás után
import adsk.core, adsk.fusion


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    if app.activeDocument.name != 'c-kocka':
        print('Nem a c-kocka aktív.')
        return
    out = []
    comps = {c.name: c for c in design.allComponents}
    for nm in ('Hangszoro rogzito bal (PETG)', 'Hangszoro rogzito jobb (PETG)'):
        b = comps['Belso szerkezet (PETG)'].bRepBodies.itemByName(nm)
        rs = sorted({round(f.geometry.radius * 20, 2) for f in b.faces if isinstance(f.geometry, adsk.core.Cylinder)})
        out.append('%s: hengeres átmérők (mm) %s, térfogat %.2f cm3' % (nm, rs, b.volume))
    root = design.rootComponent
    for nm in ('Also talca (szan alap)', 'RGB fenygyuru'):
        b = root.bRepBodies.itemByName(nm)
        for f in b.faces:
            if isinstance(f.geometry, adsk.core.Cone):
                g = f.geometry
                ax = g.axis
                ax.normalize()
                ds = []
                for v in f.vertices:
                    p = v.geometry
                    d = g.origin.vectorTo(p)
                    along = d.dotProduct(ax)
                    ds.append(2 * (d.length ** 2 - along ** 2) ** 0.5 * 10)
                for e in f.edges:
                    if isinstance(e.geometry, adsk.core.Circle3D):
                        ds.append(e.geometry.radius * 20)
                out.append('%s kúp: Ø%.2f … Ø%.2f mm' % (nm, min(ds), max(ds)))
    hibak = []
    tl = design.timeline
    for i in range(tl.count):
        it = tl.item(i)
        if it.healthState != adsk.fusion.FeatureHealthStates.HealthyFeatureHealthState:
            hibak.append('%s (%s)' % (it.name, it.errorOrWarningMessage))
    out.append('Idővonal hibák/figyelmeztetések: %s' % (', '.join(hibak) if hibak else 'nincs'))
    print('\n'.join(out))
