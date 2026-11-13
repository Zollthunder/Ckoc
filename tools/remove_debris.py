# A héjazás után lebegő apró maradéktestek ("Haz (SLS) (n)") törlése – ezek a régi mikrofonfuratok aljai voltak
import adsk.core, adsk.fusion


def run(_context: str):
    root = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct).rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    gone = []
    for b in list(root.bRepBodies):
        if b.name.startswith('Haz (SLS) (') and b.volume < 0.5:
            gone.append(b.name)
            root.features.removeFeatures.add(b)
    print('Törölve: %d db (%s)' % (len(gone), ', '.join(gone)))
