# Csak olvasó pontvizsgálat a gyártható házon (BENT = anyagban, KINT = levegőben)
import adsk.core, adsk.fusion

TESTS = [
    ('Haz (SLS)', (0, 4.5, 0), 'KINT', 'belül üreges'),
    ('Haz (SLS)', (4.39, 6.5, 3.0), 'BENT', 'oldalfal tömör (rács mellett)'),
    ('Haz (SLS)', (0, 4.5, 4.4), 'KINT', 'kijelzőablak átmenő'),
    ('Haz (SLS)', (2.6, 4.5, 4.4), 'KINT', 'kamerafurat átmenő'),
    ('Haz (SLS)', (-2.2, 4.5, 4.4), 'KINT', 'C nyílás átmenő'),
    ('Haz (SLS)', (0, 7.2, 4.4), 'BENT', 'előlap tömör a C fölött'),
    ('Haz (SLS)', (4.4, 4.5, 0), 'KINT', 'rácslyuk átmenő (jobb)'),
    ('Haz (SLS)', (-4.4, 4.5, 0), 'KINT', 'rácslyuk átmenő (bal)'),
    ('Haz (SLS)', (0, 8.8, 0), 'KINT', 'tetőnyílás'),
    ('Haz (SLS)', (3.3, 8.8, 0), 'BENT', 'tetőperem (lap alatt)'),
    ('Haz (SLS)', (3.3, 8.8, 3.3), 'KINT', 'csavarfurat a peremen'),
    ('Tetolap', (3.3, 9.0, 3.3), 'KINT', 'csavarfurat a tetőlapon'),
    ('Also talca (szan alap)', (0, 0.1, 0), 'BENT', 'tálca alja tömör'),
    ('Also talca (szan alap)', (0, 0.6, 0), 'KINT', 'tálca belül üres'),
    ('Tetolap', (2.75, 9.0, 2.75), 'KINT', 'gombfurat átmenő a tetőlapon'),
    ('Tetolap', (0, 9.0, 0), 'KINT', 'érintőbetét-furat átmenő'),
    ('Haz (SLS)', (0, 7.3, 4.15), 'KINT', 'sík belső fal elöl (nincs bütyök)'),
    ('Haz (SLS)', (0, 7.3, 4.35), 'BENT', 'előlap fala tömör'),
    ('Haz (SLS)', (4.15, 4.5, -2.6), 'KINT', 'sík belső fal oldalt (nincs bütyök)'),
    ('Also talca (szan alap)', (3.95, 0.1, 2.9), 'KINT', 'tálcacsavar furata átmenő'),
    ('Also talca (szan alap)', (4.15, 0.6, 2.9), 'BENT', 'tálca sarokoszlop tömör'),
    ('Haz (SLS)', (3.95, 1.6, 2.9), 'KINT', 'menetes betét furata a házban'),
    ('Haz (SLS)', (3.68, 1.6, 2.9), 'BENT', 'ház csavaroszlopa tömör'),
    ('Also talca (szan alap)', (3.0, 0.1, 0), 'KINT', 'fényablak a LED-gyűrű alatt'),
    ('Also talca (szan alap)', (0, 0.1, 3.0), 'BENT', 'fényablak tartóbordája'),
]


def run(_context: str):
    root = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct).rootComponent
    names = {0: 'BENT', 1: 'FELÜLETEN', 2: 'KINT'}
    out, bad = [], 0
    for body, p, want, label in TESTS:
        b = root.bRepBodies.itemByName(body)
        got = names.get(b.pointContainment(adsk.core.Point3D.create(*p)), '?') if b else 'nincs test'
        ok = got == want
        bad += 0 if ok else 1
        out.append('%s %-30s várt: %-4s kapott: %s' % ('OK ' if ok else 'HIBA', label, want, got))
    # gumisarkok: egyik se lógjon a ház belsejébe, és ne takarja a tetőlap sarkát / a tálcacsavarokat
    total = len(TESTS)
    for i in range(1, 9):
        b = root.bRepBodies.itemByName('Gumi sarok %d' % i)
        bb = b.boundingBox
        sx = 1 if bb.maxPoint.x > 0 else -1
        sz = 1 if bb.maxPoint.z > 0 else -1
        top = bb.maxPoint.y > 4.5
        checks = [((sx * 3.9, 8.0 if top else 1.4, sz * 3.9), 'nem lóg a házba')]
        if top:
            checks.append(((sx * 3.55, 9.05, sz * 3.55), 'nem takarja a tetőlapot'))
        else:
            checks.append(((sx * 3.95, -0.05, sz * 2.9), 'nem takarja a tálcacsavart'))
        for p, label in checks:
            total += 1
            got = names.get(b.pointContainment(adsk.core.Point3D.create(*p)), '?')
            ok = got == 'KINT'
            bad += 0 if ok else 1
            out.append('%s Gumi sarok %d: %-24s kapott: %s' % ('OK ' if ok else 'HIBA', i, label, got))
    print('\n'.join(out) + '\n%d/%d rendben' % (total - bad, total))
