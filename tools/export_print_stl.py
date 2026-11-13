# Nyomtatandó alkatrészek külön STL-ben (mm) – 3d/nyomtatas/<gép>/<alkatrész>.stl
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d', 'nyomtatas')
# test neve -> (alkönyvtár, fájlnév)
ROOT_PARTS = {
    'Haz (SLS)': ('SLS_PA12', 'haz'),
    'Also talca (szan alap)': ('SLS_PA12', 'also_talca'),
    'Gomb 1': ('SLA_gyanta', 'gombsapka_andor_alap'),
    'Gomb 2': ('SLA_gyanta', 'gombsapka_turkiz'),
    'Gomb 3': ('SLA_gyanta', 'gombsapka_menta'),
    'Gomb 4': ('SLA_gyanta', 'gombsapka_rozsaszin'),
}
for i in range(1, 9):
    ROOT_PARTS['Gumi sarok %d' % i] = ('FDM_TPU95A', 'gumisarok_%d' % i)
COMP_PARTS = {
    'Szan (PETG)': ('FDM_PETG', 'szan'),
    'Tetotarto (PETG)': ('FDM_PETG', 'tetotarto'),
    'Elolapi tarto (PETG)': ('FDM_PETG', 'elolapi_tarto'),
    'Hangszoro rogzito bal (PETG)': ('FDM_PETG', 'hangszoro_rogzito_bal'),
    'Hangszoro rogzito jobb (PETG)': ('FDM_PETG', 'hangszoro_rogzito_jobb'),
}


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    em = design.exportManager
    done = []

    def export(body, sub, fn):
        d = os.path.join(OUT, sub)
        os.makedirs(d, exist_ok=True)
        o = em.createSTLExportOptions(body, os.path.join(d, fn + '.stl'))
        o.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
        o.isBinaryFormat = True
        em.execute(o)
        done.append('%s/%s (%.1f cm3)' % (sub, fn, body.volume))

    for name, (sub, fn) in ROOT_PARTS.items():
        b = root.bRepBodies.itemByName(name)
        if b:
            export(b, sub, fn)
    for occ in root.occurrences:
        for b in occ.bRepBodies:
            if b.name in COMP_PARTS:
                export(b, *COMP_PARTS[b.name])
    print('%d STL: %s' % (len(done), ' | '.join(done)))
