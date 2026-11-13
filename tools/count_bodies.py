# Csak olvasó: testek száma komponensenként és a nem látható testek listája
import adsk.core, adsk.fusion


def run(_context: str):
    root = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct).rootComponent
    out = ['gyökér: %d test' % root.bRepBodies.count]
    hidden = [b.name for b in root.bRepBodies if not b.isVisible]
    for occ in root.occurrences:
        out.append('%s: %d test (látható: %s)' % (occ.component.name, occ.bRepBodies.count, occ.isVisible))
        hidden += ['%s/%s' % (occ.component.name, b.name) for b in occ.bRepBodies if not b.isVisible]
    out.append('nem látható: %s' % (hidden or 'nincs'))
    print('\n'.join(out))
