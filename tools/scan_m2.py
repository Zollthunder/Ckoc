# Csak olvasó: aktív dokumentum + hengeres furatok sugár szerint testenként (M2 -> M2,5 átálláshoz)
import adsk.core, adsk.fusion
from collections import Counter


def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.activeDocument
    out = ['AKTIV: %s' % (doc.name if doc else None),
           'NYITOTT: ' + ', '.join(app.documents.item(i).name for i in range(app.documents.count))]
    design = adsk.fusion.Design.cast(app.activeProduct)
    if not design or not doc or not doc.name.lower().startswith('c-kocka'):
        out.append('NEM a C-kocka az aktív dokumentum – nem nézek bele.')
        print('\n'.join(out))
        return
    out.append('Tervezési mód: %s' % ('parametrikus' if design.designType == adsk.fusion.DesignTypes.ParametricDesignType else 'direkt'))
    out.append('Idővonal elemei: %d' % design.timeline.count)
    for comp in design.allComponents:
        for b in comp.bRepBodies:
            c = Counter()
            for f in b.faces:
                g = f.geometry
                if isinstance(g, adsk.core.Cylinder):
                    r = round(g.radius * 10, 2)  # mm
                    if r <= 2.0:
                        c[r] += 1
                elif isinstance(g, adsk.core.Cone):
                    c['kúp'] += 1
            interesting = {k: v for k, v in c.items() if k in (1.1, 1.6, 'kúp') or (isinstance(k, float) and 1.0 <= k <= 2.0)}
            if interesting:
                out.append('  %-28s %-30s %s' % (comp.name[:28], b.name[:30],
                           ', '.join('%s: %d' % ('R%.2f mm' % k if isinstance(k, float) else k, v) for k, v in sorted(interesting.items(), key=str))))
    print('\n'.join(out))
