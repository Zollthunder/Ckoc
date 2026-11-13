# Szerelhetőségi javítások (2026-11-13, Zollo döntései alapján) – a folyamat utolsó lépése:
#   run_ckocka -> manufacturable -> remove_debris -> build_internals -> place_modules -> apply_fixes
# 1) Gombsapkák szárral és gallérral (SLA): a fej a tetőlap furatában, a gallér a tetőlap alatt tartja,
#    a szár leér a kapcsolóig. A ház peremébe Ø10,6 kiszabadítás a gallérnak.
#    Andor-gomb: SLA alap + préselt fa betét (Ø6,6 × 2 mm) a sapka tetején.
# 2) C fénycsatorna 3 mm opál akril, 0,5 mm-rel a fal mögött, belülről semleges szilikonnal körbe (perem nélkül).
# 3) S-alakú (síkban hajlítható) WS2812 LED-szalag a C bordáján (helyőrző az Elektronika komponensben).
# 4) Kijelzőablak elhagyva: a kijelző 2,5 mm-re a fal mögött, a fal védi. Az arc-matricák a kijelző üvegére kerülnek.
# 5) Alsó diffúzor 3 db M2 süllyesztett csavarral a tálcához (menetes betét a tálca oszlopaiban),
#    a gumitalpon Ø5 lyuk a csavarfejeknél.
# 6) Szán rögzítése a tálcához: alulról 4 db M2 süllyesztett csavar, a szán lábaiban menetes betét.
# Többször futtatható: ami kész, azt kihagyja. Y-fel, cm; alja y=0, eleje +Z.
import adsk.core, adsk.fusion, math

H, W = 4.5, 0.25
CAP = dict(head_r=0.38, head=(8.9, 9.2), collar_r=0.48, collar=(8.8, 8.9), stem_r=0.175, stem=(8.34, 8.8))
LIP_R, LIP_Y = 0.53, (8.62, 8.9)       # kiszabadítás a ház peremében (Ø10,6)
ANDOR_R, ANDOR_Y = 0.33, (9.0, 9.2)    # fa betét Ø6,6 × 2 mm
DIFF_SCREWS = [(2.2 * math.cos(math.radians(t)), 2.2 * math.sin(math.radians(t))) for t in (90, 210, 330)]
P = adsk.core.Point3D.create
V = adsk.core.Vector3D.create
UNION = adsk.fusion.BooleanTypes.UnionBooleanType
DIFF = adsk.fusion.BooleanTypes.DifferenceBooleanType
INTER = adsk.fusion.BooleanTypes.IntersectionBooleanType
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation


def run(_context: str):
    design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
    root = design.rootComponent
    if not root.bRepBodies.itemByName('Haz (SLS)'):
        print('Nem a gyártható C-kocka modell aktív.')
        return
    tbm = adsk.fusion.TemporaryBRepManager.get()
    log = []

    def cyl_y(x, y0, y1, z, r):
        return tbm.createCylinderOrCone(P(x, y0, z), r, P(x, y1, z), r)

    def cone_y(x, y0, r0, y1, r1, z):
        return tbm.createCylinderOrCone(P(x, y0, z), r0, P(x, y1, z), r1)

    def add_bodies(comp, temps, name):
        bf = comp.features.baseFeatures.add()
        bf.startEdit()
        for t in temps:
            comp.bRepBodies.add(t, bf)
        bf.finishEdit()
        bf.name = name
        return [bf.bodies.item(i) for i in range(bf.bodies.count)]

    def combine(target, tools, op, name):
        col = adsk.core.ObjectCollection.create()
        for t in tools:
            col.add(t)
        ci = root.features.combineFeatures.createInput(target, col)
        ci.operation = op
        ci.isKeepToolBodies = False
        root.features.combineFeatures.add(ci).name = name

    def done(name):
        return root.features.combineFeatures.itemByName(name) or root.features.baseFeatures.itemByName(name) \
            or root.features.removeFeatures.itemByName(name) or root.features.moveFeatures.itemByName(name) \
            or root.features.offsetFacesFeatures.itemByName(name)

    # ---------- 1) gombsapkák ----------
    if not done('Gombsapkak (szar + gallerral)'):
        caps, info = [], []
        for i in range(1, 5):
            old = root.bRepBodies.itemByName('Gomb %d' % i)
            bb = old.boundingBox
            x, z = (bb.minPoint.x + bb.maxPoint.x) / 2, (bb.minPoint.z + bb.maxPoint.z) / 2
            cap = cyl_y(x, CAP['head'][0], CAP['head'][1], z, CAP['head_r'])
            tbm.booleanOperation(cap, cyl_y(x, CAP['collar'][0], CAP['collar'][1] + 0.001, z, CAP['collar_r']), UNION)
            tbm.booleanOperation(cap, cyl_y(x, CAP['stem'][0], CAP['stem'][1] + 0.001, z, CAP['stem_r']), UNION)
            if i == 1:                                     # Andor: zseb a fa betétnek
                tbm.booleanOperation(cap, cyl_y(x, ANDOR_Y[0], ANDOR_Y[1] + 0.1, z, ANDOR_R), DIFF)
            caps.append(cap)
            info.append((old.appearance, x, z))
        andor_x, andor_z = info[0][1], info[0][2]
        rm = [root.bRepBodies.itemByName('Gomb %d' % i) for i in range(1, 5)]
        for b in rm:
            root.features.removeFeatures.add(b)
        new = add_bodies(root, caps + [cyl_y(andor_x, ANDOR_Y[0], ANDOR_Y[1], andor_z, ANDOR_R)], 'Gombsapkak (szar + gallerral)')
        for i, b in enumerate(new[:4]):
            b.name = 'Gomb %d' % (i + 1)
            b.appearance = info[i][0]
        new[4].name = 'Andor fa betet'
        new[4].appearance = info[0][0]
        # kiszabadítás a ház peremében a gallérnak
        reliefs = add_bodies(root, [cyl_y(x, LIP_Y[0], LIP_Y[1], z, LIP_R) for _, x, z in info], 'Gomb galler kiszabaditas')
        combine(root.bRepBodies.itemByName('Haz (SLS)'), reliefs, CUT, 'Haz gomb kiszabaditas')
        log.append('gombsapkák: fej Ø7,6, gallér Ø9,6, szár Ø3,5 (%.1f mm hosszú), perem-kiszabadítás Ø10,6' % ((CAP['stem'][1] - CAP['stem'][0]) * 10))

    # ---------- 2) C fénycsatorna: 3 mm opál akril, 0,5 mm-rel a fal mögé nyúlik, kívül síkban ----------
    #    Rögzítés: semleges szilikon belülről körbe (a fal mögötti 0,5 mm-es részre), perem nem kell.
    if not done('C fenycsatorna 3 mm (szilikonhoz)'):
        c = root.bRepBodies.itemByName('C fenycsatorna')
        pl = [f for f in c.faces if adsk.core.Plane.cast(f.geometry) and abs(adsk.core.Plane.cast(f.geometry).normal.z) > 0.999]
        front = max(pl, key=lambda f: f.pointOnFace.z)
        back = min(pl, key=lambda f: f.pointOnFace.z)
        zf, zb = front.pointOnFace.z, back.pointOnFace.z
        ofs = root.features.offsetFacesFeatures
        ofs.add(ofs.createInput([front], adsk.core.ValueInput.createByReal(H - 0.0 - zf))).name = 'C fenycsatorna elol sikban'
        c = root.bRepBodies.itemByName('C fenycsatorna')
        back = min([f for f in c.faces if adsk.core.Plane.cast(f.geometry) and abs(adsk.core.Plane.cast(f.geometry).normal.z) > 0.999],
                   key=lambda f: f.pointOnFace.z)
        ofs.add(ofs.createInput([back], adsk.core.ValueInput.createByReal(zb - (H - 0.3)))).name = 'C fenycsatorna 3 mm (szilikonhoz)'
        bb = root.bRepBodies.itemByName('C fenycsatorna').boundingBox
        log.append('C fénycsatorna: z %.1f..%.1f mm (3 mm, 0,5 mm a fal mögött)' % (bb.minPoint.z * 10, bb.maxPoint.z * 10))

    # ---------- 3) S-alakú LED-szalag a C bordán ----------
    el = [o for o in root.occurrences if o.component.name.startswith('Elektronika')]
    if el and not el[0].component.bRepBodies.itemByName('C LED (S-szalag, WS2812)'):
        comp = el[0].component
        z0, z1 = 3.9, 4.08                                 # a borda homloklapján fekszik (FPC + LED 1,8 mm)
        band = tbm.createCylinderOrCone(P(0, H, z0), 2.45, P(0, H, z1), 2.45)
        tbm.booleanOperation(band, tbm.createCylinderOrCone(P(0, H, z0 - 0.1), 1.95, P(0, H, z1 + 0.1), 1.95), DIFF)
        L, a = 10.0, math.radians(40)                      # a C nyílása (kamera felé, +X) ±40°-ban kimarad
        u1, v1 = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
        u2, v2 = (math.cos(-a), math.sin(-a)), (math.sin(a), math.cos(a))
        b1 = tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            P(u1[0] * L / 2 - v1[0] * L / 2, H + u1[1] * L / 2 - v1[1] * L / 2, (z0 + z1) / 2), V(u1[0], u1[1], 0), V(v1[0], v1[1], 0), L, L, 1))
        b2 = tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            P(u2[0] * L / 2 + v2[0] * L / 2, H + u2[1] * L / 2 + v2[1] * L / 2, (z0 + z1) / 2), V(u2[0], u2[1], 0), V(v2[0], v2[1], 0), L, L, 1))
        tbm.booleanOperation(b1, b2, INTER)
        tbm.booleanOperation(band, b1, DIFF)
        add_bodies(comp, [band], 'C LED S-szalag')[0].name = 'C LED (S-szalag, WS2812)'
        log.append('S-szalag a C bordán (r19,5–24,5 mm, z 39,0–40,8 mm)')

    # ---------- 4) kijelzőablak elhagyása ----------
    win = root.bRepBodies.itemByName('Kijelzo')
    if win:
        arcs = [b for b in root.bRepBodies if b.name.startswith('Arc')]
        shift = 4.25 - min(b.boundingBox.minPoint.z for b in arcs)      # a kijelző üvegére (z = 42,5 mm)
        root.features.removeFeatures.add(win).name = 'Kijelzoablak elhagyva'
        col = adsk.core.ObjectCollection.create()
        for b in arcs:
            col.add(b)
        mi = root.features.moveFeatures.createInput2(col)
        mi.defineAsTranslateXYZ(adsk.core.ValueInput.createByReal(0), adsk.core.ValueInput.createByReal(0),
                                adsk.core.ValueInput.createByReal(shift), True)
        root.features.moveFeatures.add(mi).name = 'Arc a kijelzo uvegere'
        log.append('kijelzőablak törölve, arc-matricák %.1f mm-rel hátrébb' % (shift * 10))

    # ---------- 5) diffúzor csavarozása ----------
    if not done('Talca diffuzor oszlopok'):
        talca = root.bRepBodies.itemByName('Also talca (szan alap)')
        cols = add_bodies(root, [cyl_y(x, W - 0.05, W + 0.2, z, 0.3) for x, z in DIFF_SCREWS], 'Diffuzor oszlopok')
        combine(talca, cols, JOIN, 'Talca diffuzor oszlopok')
        holes_t = [cyl_y(x, -0.05, 0.4, z, 0.16) for x, z in DIFF_SCREWS]                      # M2 menetes betét Ø3,2 × 4
        holes_d = []
        for x, z in DIFF_SCREWS:                                                                 # Ø2,2 + 90°-os süllyesztés
            h = cyl_y(x, -0.35, 0.05, z, 0.11)
            tbm.booleanOperation(h, cone_y(x, -0.31, 0.22, -0.2, 0.11, z), UNION)
            holes_d.append(h)
        holes_g = [cyl_y(x, -0.55, -0.25, z, 0.25) for x, z in DIFF_SCREWS]                    # Ø5 a gumitalpon
        ht = add_bodies(root, holes_t, 'Diffuzor csavar furatok (talca)')
        combine(talca, ht, CUT, 'Talca diffuzor furatok')
        hd = add_bodies(root, holes_d, 'Diffuzor csavar furatok (diffuzor)')
        combine(root.bRepBodies.itemByName('RGB fenygyuru'), hd, CUT, 'Diffuzor furatok')
        hg = add_bodies(root, holes_g, 'Diffuzor csavar furatok (gumitalp)')
        combine(root.bRepBodies.itemByName('Gumitalp'), hg, CUT, 'Gumitalp furatok')
        log.append('diffúzor: 3× M2 süllyesztett csavar r22 mm-en, tálcaoszlop Ø6 (2,5 mm magas), gumitalpon Ø5 lyuk')

    # ---------- 6) szán rögzítése a tálcához: alulról 4 db M2 süllyesztett csavar a szán lábaiba ----------
    #    (a lábakban M2 menetes betét; a csavarok a diffúzoron és a gumitalpon kívül vannak -> alulról elérhetők)
    FEET = [(sx * 2.6, sz) for sx in (-1, 1) for sz in (-3.4, 2.9)]
    pet = [o for o in root.occurrences if o.component.name.startswith('Belso szerkezet')]
    if pet and not pet[0].component.features.combineFeatures.itemByName('Szan labak menetes betet'):
        comp = pet[0].component
        szan = comp.bRepBodies.itemByName('Szan (PETG)')
        ins = add_bodies(comp, [cyl_y(x, 0.2, 0.62, z, 0.16) for x, z in FEET], 'Szan lab betetfuratok')
        col = adsk.core.ObjectCollection.create()
        for t in ins:
            col.add(t)
        ci = comp.features.combineFeatures.createInput(szan, col)
        ci.operation = CUT
        ci.isKeepToolBodies = False
        comp.features.combineFeatures.add(ci).name = 'Szan labak menetes betet'
        holes = []
        for x, z in FEET:
            h = cyl_y(x, -0.1, 0.3, z, 0.12)                                  # Ø2,4 átmenő
            tbm.booleanOperation(h, cone_y(x, -0.01, 0.23, 0.11, 0.11, z), UNION)   # alulról 90°-os süllyesztés
            holes.append(h)
        th = add_bodies(root, holes, 'Szan csavar furatok (talca)')
        combine(root.bRepBodies.itemByName('Also talca (szan alap)'), th, CUT, 'Talca szan furatok')
        log.append('szán: 4× M2 süllyesztett csavar alulról a lábakba (menetes betét Ø3,2)')

    print(' | '.join(log) if log else 'minden javítás már kész')
