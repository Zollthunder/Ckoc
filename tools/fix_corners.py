# Élő modell: a 8 gumisarok narancs színt kap (a ház és a talp nem változik)
import adsk.core, adsk.fusion

SZIN = (255, 128, 32)


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz') or not root.bRepBodies.itemByName('Gumi sarok 1'):
        print('Az aktív dokumentum nem a C-kocka – nem módosítok semmit.')
        return
    a = design.appearances.itemByName('CK gumi narancs')
    if not a:
        a = design.appearances.addByCopy(design.appearances.itemByName('CK gumi'), 'CK gumi narancs')
        for i in range(a.appearanceProperties.count):
            cp = adsk.core.ColorProperty.cast(a.appearanceProperties.item(i))
            if cp and not cp.isReadOnly and 'olor' in cp.name:
                try:
                    cp.value = adsk.core.Color.create(SZIN[0], SZIN[1], SZIN[2], 255)
                except:
                    pass
    n = 0
    for i in range(1, 9):
        b = root.bRepBodies.itemByName('Gumi sarok %d' % i)
        if b:
            b.appearance = a
            n += 1
    print('%d sarok narancs lett' % n)
