# M2 -> M2,5 átállás és Ø36 mm-es hangszóró (2026-11-16) – a C-kocka gyártható modelljén, az idővonal végére tett
# "Offset Faces" (felületeltolás) műveletekkel, így bármikor visszavonható (az idővonalon törölhető).
#  A) menetes betét furatok  Ø3,2 -> Ø3,6  (szán, tetőtartó, alsó tálca, ház)
#  B) átmenő csavarfuratok   Ø2,2 -> Ø2,8  (tetőlap, ház pereme, diffúzor + süllyesztés)
#  C) tálca lábcsavarjai     Ø2,4 -> Ø2,8  (+ süllyesztés)
#  D) hangszóró-rögzítő gyűrű belső nyílása Ø34 -> Ø30 (a Ø36 mm-es VISATON K 36 WP peremére szorít)
import adsk.core, adsk.fusion

GROUPS = [
    # (komponens, test, sugár mm, kúpokkal?, eltolás cm, várt furatszám)
    ('Belso szerkezet (PETG)', 'Szan (PETG)', 1.6, False, -0.02, 4),
    ('Belso szerkezet (PETG)', 'Tetotarto (PETG)', 1.6, False, -0.02, 4),
    (None, 'Also talca (szan alap)', 1.6, False, -0.02, 3),
    (None, 'Haz (SLS)', 1.6, False, -0.02, 14),
    (None, 'Tetolap', 1.1, False, -0.03, 4),
    (None, 'Haz (SLS)', 1.1, False, -0.03, 4),
    (None, 'RGB fenygyuru', 1.1, True, -0.03, 3),
    (None, 'Also talca (szan alap)', 1.2, True, -0.02, 4),
    ('Belso szerkezet (PETG)', 'Hangszoro rogzito bal (PETG)', 17.0, False, 0.2, 1),
    ('Belso szerkezet (PETG)', 'Hangszoro rogzito jobb (PETG)', 17.0, False, 0.2, 1),
]


def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.activeDocument
    design = adsk.fusion.Design.cast(app.activeProduct)
    if not design or doc.name != 'c-kocka':
        print('Nem a c-kocka az aktív dokumentum – kilépek.')
        return
    root = design.rootComponent
    if root.features.offsetFacesFeatures.itemByName('M25 Haz (SLS) R1.6'):
        print('Már átvezetve – kilépek.')
        return
    comps = {c.name: c for c in design.allComponents}
    plan, log = [], []
    for cname, bname, r_mm, cones, dist, expect in GROUPS:
        comp = comps[cname] if cname else root
        body = comp.bRepBodies.itemByName(bname)
        if not body:
            print('HIBA: nincs ilyen test: %s' % bname)
            return
        faces = [f for f in body.faces if isinstance(f.geometry, adsk.core.Cylinder) and abs(f.geometry.radius * 10 - r_mm) < 0.01]
        if len(faces) != expect:
            print('HIBA: %s R%.1f: %d furat, várt %d – semmit nem módosítok.' % (bname, r_mm, len(faces), expect))
            return
        if cones:
            faces += [f for f in body.faces if isinstance(f.geometry, adsk.core.Cone)]
        plan.append((comp, bname, r_mm, dist, faces))
    for comp, bname, r_mm, dist, faces in plan:
        inp = comp.features.offsetFacesFeatures.createInput(faces, adsk.core.ValueInput.createByReal(dist))
        feat = comp.features.offsetFacesFeatures.add(inp)
        feat.name = 'M25 %s R%.1f' % (bname, r_mm)
        log.append('%-32s R%.1f mm: %d felület, eltolás %+.1f mm' % (bname, r_mm, len(faces), dist * 10))
    print('\n'.join(log))
