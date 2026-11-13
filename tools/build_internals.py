# Belső szerkezet a gyártható C-kockához (Y-fel, cm; alja y=0, eleje +Z):
#  - "Belso szerkezet (PETG)" komponens: szán (fedélzet + 2 sín + 2 polc), tetőtartó, előlapi tartó (C borda + távtartók)
#  - a SLS házhoz hozzáadva: 2 csavaroszlop elöl (előlapi tartó), 4 sarokoszlop (tálca rögzítése)
#  - a tálcához: 4 sarokoszlop csavarfurattal, fényablak a LED-gyűrű alatt (3 tartóbordával)
import adsk.core, adsk.fusion, math

EL, H, W, SPLIT, TOP = 9.0, 4.5, 0.25, 0.9, 8.63   # TOP: a tetőlap alatti perem alja (a zseb miatt 2,5 mm-es perem)
# a tálca csavarjai: a sarkoktól elhúzva, hogy a felragasztott gumisarkok ne takarják el őket (szervizelhetőség)
TRAY_SCREWS = [(sx * 3.95, sz * 2.9) for sx in (-1, 1) for sz in (-1, 1)]   # x=3,95: az oszlop a falba olvad
# hangszóró-rögzítő gyűrűk csavarjai (a rács középpontja körül, 25 mm sugáron)
SPK = [(H + 2.5 * math.sin(math.radians(t)), 2.5 * math.cos(math.radians(t))) for t in (0, 120, 240)]
# az előlapi tartó 4 csavarja a sarkok felé (a kamera és a C borda útjából)
FRONT = [(sx * 2.9, H + sy * 2.6) for sx in (-1, 1) for sy in (-1, 1)]
P = adsk.core.Point3D.create
V = adsk.core.Vector3D.create
UNION = adsk.fusion.BooleanTypes.UnionBooleanType
DIFF = adsk.fusion.BooleanTypes.DifferenceBooleanType
INTER = adsk.fusion.BooleanTypes.IntersectionBooleanType


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    haz, talca = root.bRepBodies.itemByName('Haz (SLS)'), root.bRepBodies.itemByName('Also talca (szan alap)')
    if not haz or not talca:
        print('Nem a gyártható C-kocka modell aktív.')
        return
    for occ in list(root.occurrences):
        if occ.component.name == 'Belso szerkezet (PETG)':
            occ.deleteMe()                      # a nyomtatott alkatrészeket újraépítjük
    housing_done = root.features.combineFeatures.itemByName('Haz oszlopok') is not None
    tbm = adsk.fusion.TemporaryBRepManager.get()

    def box(c, s):
        return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(P(*c), V(1, 0, 0), V(0, 1, 0), s[0], s[1], s[2]))

    def cyl_y(x, y0, y1, z, r):
        return tbm.createCylinderOrCone(P(x, y0, z), r, P(x, y1, z), r)

    def cyl_x(x0, x1, y, z, r):
        return tbm.createCylinderOrCone(P(x0, y, z), r, P(x1, y, z), r)

    def cyl_z(x, y, z0, z1, r):
        return tbm.createCylinderOrCone(P(x, y, z0), r, P(x, y, z1), r)

    def union(parts):
        a = parts[0]
        for p in parts[1:]:
            tbm.booleanOperation(a, p, UNION)
        return a

    def minus(a, tools):
        for t in tools:
            tbm.booleanOperation(a, t, DIFF)
        return a

    # ---------- szán: fedélzet (a LED-gyűrű fölött) + 2 sín + 2 polc a stacknek ----------
    deck = box((0, 0.775, -0.35), (5.6, 0.25, 6.9))
    rails = [box((sx * 2.0, (SPLIT + 6.8) / 2, -0.4), (0.3, 6.8 - SPLIT, 6.0)) for sx in (-1, 1)]
    ledges = [box((sx * 1.65, 2.83, -0.4), (0.4, 0.3, 6.0)) for sx in (-1, 1)]
    FEET = [(sx * 2.6, sz) for sx in (-1, 1) for sz in (-3.4, 2.9)]                          # a LED-gyűrűn kívül (≥ 3 mm)
    feet = [cyl_y(x, 0.25, 0.65, z, 0.3) for x, z in FEET]   # lábak a tálca aljára
    szan = union([deck] + rails + ledges + feet)
    minus(szan, [cyl_y(x, 0.2, 1.0, z, 0.14) for x, z in FEET])  # M2,5 csavarfuratok

    # ---------- tetőtartó: lap + 4 sarokoszlop (menetes betét a tetőlap-csavaroknak) ----------
    tt = union([box((0, TOP - 0.15, 0), (7.2, 0.3, 7.2))] +
               [cyl_y(sx * 3.3, TOP - 0.6, TOP - 0.3, sz * 3.3, 0.3) for sx in (-1, 1) for sz in (-1, 1)])   # Ø6 oszlop M2 betéthez
    holes = [cyl_y(sx * 2.75, TOP - 1.0, TOP + 0.1, sz * 2.75, 0.45) for sx in (-1, 1) for sz in (-1, 1)]   # gombsapkák
    holes += [cyl_y(0, TOP - 1.0, TOP + 0.1, sz * 2.1, 0.3) for sz in (-1, 1)]                               # mikrofon
    holes += [cyl_y(sx * 3.3, TOP - 1.0, TOP + 0.1, sz * 3.3, 0.16) for sx in (-1, 1) for sz in (-1, 1)]    # betétfurat M2
    minus(tt, holes)

    # ---------- előlapi tartó: lap + C borda a LED-szalagnak + 3 távtartó a kijelzőnek ----------
    fz0, fz1 = 3.4, 3.7
    ft = box((0, H, (fz0 + fz1) / 2), (6.6, 6.0, fz1 - fz0))
    rib = cyl_z(0, H, fz1, 3.9, 2.4)                                            # elöl: LED-szalag (1,5 mm) + akril perem (2 mm)
    tbm.booleanOperation(rib, cyl_z(0, H, fz1 - 0.1, 4.0, 2.0), DIFF)          # gyűrű (2,0 … 2,4 cm)
    a = math.radians(36)
    big = 10.0
    w1 = tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
        P(math.sin(a) * big / 2, H - math.cos(a) * big / 2, 3.8), V(math.cos(a), math.sin(a), 0), V(math.sin(a), -math.cos(a), 0), big * 2, big, 1.0))
    w2 = tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
        P(math.sin(a) * big / 2, H + math.cos(a) * big / 2, 3.8), V(math.cos(a), -math.sin(a), 0), V(math.sin(a), math.cos(a), 0), big * 2, big, 1.0))
    tbm.booleanOperation(w1, w2, INTER)                                         # ±36°-os ék a C nyílásánál
    tbm.booleanOperation(rib, w1, DIFF)
    posts = [cyl_z(1.55 * math.cos(math.radians(t)), H + 1.55 * math.sin(math.radians(t)), fz1, 3.85, 0.2) for t in (90, 210, 330)]
    cam = box((2.6, H, 3.95), (1.25, 1.25, 0.5))                                # kameratartó keret (8,5 mm-es modulhoz)
    tbm.booleanOperation(cam, box((2.6, H, 3.95), (0.87, 0.87, 0.7)), DIFF)
    ft = union([ft, rib, cam] + posts)
    minus(ft, [cyl_z(x, y, fz0 - 0.1, fz1 + 0.1, 0.14) for x, y in FRONT])   # rögzítő csavarok
    minus(ft, [cyl_z(0, H, fz0 - 0.1, fz1 + 0.1, 0.6)])                              # kábelátvezetés a kijelzőnek

    # ---------- komponens ----------
    occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    comp = occ.component
    comp.name = 'Belso szerkezet (PETG)'
    bf = comp.features.baseFeatures.add()
    bf.startEdit()
    clamps = []
    for sx in (-1, 1):                                                           # hangszóró-rögzítő gyűrűk
        r = cyl_x(sx * 3.7, sx * 3.95, H, 0, 2.8)
        tbm.booleanOperation(r, cyl_x(sx * 3.6, sx * 4.05, H, 0, 1.7), DIFF)
        for y, z in SPK:
            tbm.booleanOperation(r, cyl_x(sx * 3.6, sx * 4.05, y, z, 0.14), DIFF)
        clamps.append(r)
    for t in [szan, tt, ft] + clamps:
        comp.bRepBodies.add(t, bf)
    bf.finishEdit()
    bf.name = 'Belso szerkezet'
    for i, nm in enumerate(('Szan (PETG)', 'Tetotarto (PETG)', 'Elolapi tarto (PETG)', 'Hangszoro rogzito bal (PETG)', 'Hangszoro rogzito jobb (PETG)')):
        bf.bodies.item(i).name = nm
    orange = design.appearances.itemByName('CK gumi narancs')
    if orange:
        for b in comp.bRepBodies:
            b.appearance = orange

    if housing_done:
        print('Belső szerkezet újraépítve: %s' % ', '.join('%s %.1f cm3' % (b.name, b.volume) for b in comp.bRepBodies))
        return
    # ---------- ház: csavaroszlopok (beolvasztva) ----------
    ex = [cyl_z(x, y, fz1, H - W + 0.05, 0.35) for x, y in FRONT]                            # előlapi tartóhoz
    ex += [cyl_y(x, SPLIT, SPLIT + 1.5, z, 0.35) for x, z in TRAY_SCREWS]                 # tálcához
    ex += [cyl_x(sx * 3.95, sx * (H - W + 0.05), y, z, 0.3) for sx in (-1, 1) for y, z in SPK]  # hangszóró-gyűrűkhöz (a gyűrű elé ér)
    tools_h = [tbm.copy(e) for e in ex]
    # ---------- tálca: sarokoszlopok ----------
    cols = [cyl_y(x, W - 0.05, SPLIT, z, 0.35) for x, z in TRAY_SCREWS]

    bf2 = root.features.baseFeatures.add()
    bf2.startEdit()
    added = [root.bRepBodies.add(t, bf2) for t in tools_h + cols]
    bf2.finishEdit()
    bf2.name = 'Oszlopok'

    def combine(target_name, tool_bodies, op):
        col = adsk.core.ObjectCollection.create()
        for t in tool_bodies:
            col.add(t)
        ci = root.features.combineFeatures.createInput(root.bRepBodies.itemByName(target_name), col)
        ci.operation = op
        ci.isKeepToolBodies = False
        return root.features.combineFeatures.add(ci)

    tool_bodies = [bf2.bodies.item(i) for i in range(bf2.bodies.count)]
    combine('Haz (SLS)', tool_bodies[:len(tools_h)], adsk.fusion.FeatureOperations.JoinFeatureOperation).name = 'Haz oszlopok'
    combine('Also talca (szan alap)', tool_bodies[len(tools_h):], adsk.fusion.FeatureOperations.JoinFeatureOperation).name = 'Talca oszlopok'

    # ---------- furatok és fényablak (kivágás) ----------
    cut_h = [cyl_z(x, y, fz1 - 0.1, H - W - 0.05, 0.16) for x, y in FRONT]                         # menetes betét elöl
    cut_h += [cyl_y(x, SPLIT - 0.05, SPLIT + 1.2, z, 0.16) for x, z in TRAY_SCREWS]
    cut_h += [cyl_x(sx * 3.9, sx * 4.15, y, z, 0.16) for sx in (-1, 1) for y, z in SPK]           # menetes betétek (vakfurat)
    cut_t = [cyl_y(x, -0.1, SPLIT + 0.05, z, 0.14) for x, z in TRAY_SCREWS]  # M2,5 átmenő
    ring = cyl_y(0, -0.1, W + 0.05, 0, 3.25)
    tbm.booleanOperation(ring, cyl_y(0, -0.2, W + 0.2, 0, 2.7), DIFF)
    for t in (90, 210, 330):                                                                          # 3 tartóborda
        rad = math.radians(t)
        tbm.booleanOperation(ring, tbm.createBox(adsk.core.OrientedBoundingBox3D.create(
            P(3.0 * math.cos(rad), W / 2, 3.0 * math.sin(rad)), V(math.cos(rad), 0, math.sin(rad)), V(-math.sin(rad), 0, math.cos(rad)), 1.2, 0.4, 1.0)), DIFF)
    cut_t.append(ring)
    bf3 = root.features.baseFeatures.add()
    bf3.startEdit()
    for t in cut_h + cut_t:
        root.bRepBodies.add(t, bf3)
    bf3.finishEdit()
    bf3.name = 'Furatok es fenyablak'
    tb = [bf3.bodies.item(i) for i in range(bf3.bodies.count)]
    combine('Haz (SLS)', tb[:len(cut_h)], adsk.fusion.FeatureOperations.CutFeatureOperation).name = 'Haz menetes betet furatok'
    combine('Also talca (szan alap)', tb[len(cut_h):], adsk.fusion.FeatureOperations.CutFeatureOperation).name = 'Talca furatok + fenyablak'

    vols = ', '.join('%s %.1f cm3' % (b.name, b.volume) for b in comp.bRepBodies)
    print('Belső szerkezet kész: %s · ház %.1f cm3 · tálca %.1f cm3' % (
        vols, root.bRepBodies.itemByName('Haz (SLS)').volume, root.bRepBodies.itemByName('Also talca (szan alap)').volume))
