# Vágási DXF-ek a 2D-s alkatrészekhez (lézer / CNC / vízvágás), a 90 mm-es modellből – dxf/vagas/
# Csak a vágáshoz szükséges nézet: a lapos alkatrész kontúrja és furatai, 1:1, mm.
import adsk.core, adsk.fusion, os

OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', 'dxf', 'vagas')
# test neve -> (fájlnév, nézet, anyag)
PARTS = {
    'Tetolap': ('tetolap_alu_2mm', 'felul', 'alumínium 2 mm – CNC/lézer + eloxálás'),
    'C fenycsatorna': ('C_fenycsatorna_opal_akril_3mm', 'elol', 'opál akril 3 mm – lézer'),

    'Erinto betet': ('erintobetet_opal_akril_2mm', 'felul', 'opál akril 2 mm – lézer'),
    'RGB fenygyuru': ('fenygyuru_diffuzor_opal_akril_3mm', 'felul', 'opál akril 3 mm – lézer'),
    'Gumitalp': ('gumitalp_EPDM_1_5mm', 'felul', 'EPDM gumi 1,5 mm – vízvágás/lézer'),
    'Andor fa betet': ('Andor_fabetet_fa_2mm', 'felul', 'fa (bükk/tölgy) 2 mm – lézer, préselve az SLA sapkába'),
}


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    os.makedirs(OUT, exist_ok=True)
    planes = {'elol': root.xYConstructionPlane, 'felul': root.xZConstructionPlane}
    done, notes = [], []
    for body_name, (fn, view, material) in PARTS.items():
        b = root.bRepBodies.itemByName(body_name)
        if not b:
            notes.append('nincs: ' + body_name)
            continue
        sk = root.sketches.add(planes[view])
        sk.isComputeDeferred = True   # gyorsítás: nem számol újra minden vetített élnél
        try:
            # csak a nézetre merőleges legnagyobb sík lap élei -> minden kontúr egyszer (nincs dupla vágás)
            axis = {'elol': 2, 'felul': 1}[view]
            best = None
            for fc in b.faces:
                pl = adsk.core.Plane.cast(fc.geometry)
                if pl and abs(pl.normal.asArray()[axis]) > 0.999 and (best is None or fc.area > best.area):
                    best = fc
            sk.project2([e for e in (best.edges if best else b.edges)], False)
            sk.isComputeDeferred = False
            sk.saveAsDXF(os.path.join(OUT, fn + '.dxf'))
            bb = b.boundingBox
            done.append('%s (%s) – %.1f × %.1f × %.1f mm' % (fn, material, (bb.maxPoint.x - bb.minPoint.x) * 10,
                                                          (bb.maxPoint.y - bb.minPoint.y) * 10, (bb.maxPoint.z - bb.minPoint.z) * 10))
        finally:
            sk.deleteMe()
    with open(os.path.join(OUT, 'OLVASSEL.txt'), 'w', encoding='utf-8') as f:
        f.write('C-kocka – vágási DXF-ek (90 mm-es modell), mértékegység: mm, lépték 1:1\n\n')
        f.write('\n'.join(done) + '\n')
        f.write('\nMegjegyzések:\n'
                '- Minden kontúr egyszer szerepel (nincs dupla vágás), zárt, mm-ben. Ellenőrzés: node tools/dxf_check.js\n'
                '- Tetőlap: 4 db Ø2,2 furat M2 süllyesztett fejű csavarhoz -> felülről 90°-os süllyesztés Ø4,2-re (a DXF ezt nem tartalmazza).\n'
                '- Diffúzor: 3 db Ø2,2 furat M2 süllyesztett csavarhoz -> ALULRÓL 90°-os süllyesztés Ø4,4-re. A gumitalp Ø5 lyukai a csavarfejek fölé esnek.\n'
                '- A betétek (C, érintőbetét) körben 0,1 mm-rel kisebbek a nyílásnál (illesztési hézag);\n'
                '  lézernél a vágásrést (kerf) ne kompenzáld kifelé.\n'
                '- Rögzítés: a C és az érintőbetét belülről SEMLEGES (neutrális) szilikonnal körbe. Ecetszagú (acetoxi) szilikont ne – repeszti az akrilt.\n')
    print('%d DXF: %s %s' % (len(done), ' | '.join(done), ' '.join(notes)))
