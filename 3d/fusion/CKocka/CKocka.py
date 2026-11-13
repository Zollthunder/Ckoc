# C-kocka – Fusion 360 generáló szkript
# Készítette: Zollo + Claude ("C")
# Futtatás: Fusion 360 -> UTILITIES -> Scripts and Add-Ins (Shift+S) -> CKocka -> Run
# Mértékegység: a Fusion API belül centiméterben számol (1.0 = 10 mm).

import adsk.core, adsk.fusion, traceback, math, os

EXPORT_DIR = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d')

# --- Méretek (cm) ---
EL = 9.0            # kocka élhossza (90 mm – a szerelhetőség miatt, lásd TERVEZESI_ELVEK.md)
LEKEREKITES = 0.9   # élek lekerekítése
TETO = 7.2          # alumínium tetőlap mérete
C_R = 2.2           # a C betű középsugara
C_T = 0.22          # a C betű fél vastagsága
C_RES = 72.0        # a C nyílása fokban (jobb oldalon)
MIC_R = 2.1         # mikrofonfuratok köre
RACS_R = 2.4        # hangszórórács sugara
RACS_LYUK = 0.10    # rácslyuk sugara
RACS_OSZTAS = 0.42  # rácslyukak távolsága
KIJELZO_R = 1.65    # kerek kijelző sugara (Ø 33 mm) a C belsejében
ARC_SZEM_X = 0.5    # szemek távolsága a középtől
ARC_SZEM_Y = 0.35   # szemek magassága
ARC_SZEM_R = 0.17   # szem sugara
ARC_SZAJ_Y = 0.15   # mosoly ívének középpontja
ARC_SZAJ_R = 0.75   # mosoly sugara
ARC_SZAJ_T = 0.07   # mosoly fél vastagsága
GOMB_R = 0.38       # hangeffekt-gombok sugara (Ø 7,6 mm)
GOMB_HELYEK = [(-2.75, -2.75), (2.75, -2.75), (2.75, 2.75), (-2.75, 2.75)]   # a tetőlap négy sarkában
ANDOR_GOMB = 0      # az "Andor" gomb (bal elöl): fa borítás, random faviccek
GOMB_SZINEK =[(255, 154, 60), (120, 230, 255), (140, 230, 170), (255, 110, 150)]  # narancs, türkiz, menta, rózsaszín
KAMERA_U = 2.6     # kamera helye: a C nyílásában (2,6 cm – 3 mm hely marad a kerek kijelzőpanel mellett)
KAMERA_R = 0.22     # kameralencse sugara (Ø 4,4 mm)
SAROK_SZIN = (255, 128, 32)   # a gumisarkok színe (narancs)
SAROK_VASTAG = 0.15 # gumisarkok vastagsága (ennyivel állnak ki)
LOGO_MAGASSAG = 3.6 # cégembléma magassága a hátlapon
LOGO_EMEL = 0.4     # a logó közepe ennyivel a hátlap közepe fölött
LOGO_V = 0.08       # logó betét vastagsága (fele kiáll)

# Céglogó (opcionális): a koordináták egy privát fájlban vannak (logo_coords.json), ami nem kerül fel a GitHubra.
# Ha a fájl nincs meg, a kocka hátlapja logó nélkül készül.
LOGO_BE = False   # céglogó csak akkor, ha a cég engedélyt adott (és megvan a privát koordinátafájl)
LOGO_KERET, LOGO_TELI = [], []
try:
    if not LOGO_BE:
        raise RuntimeError('logó kikapcsolva')
    import json as _json
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo_coords.json'), encoding='utf-8') as _f:
        _lc = _json.load(_f)
    LOGO_KERET = [tuple(p) for p in _lc['keret']]
    LOGO_TELI = [tuple(p) for p in _lc['teli']]
except Exception:
    pass

app = adsk.core.Application.get()
ui = app.userInterface


def illesztes(root, body, d=0.01, nev=None):
    """Lapos betét oldallapjait d-vel (cm) befelé tolja, hogy a nyílásban illesztési hézag legyen.
    A két legnagyobb sík lap (elő- és hátlap) marad, minden más (a kontúr) beljebb kerül."""
    sik = sorted([f for f in body.faces if adsk.core.Plane.cast(f.geometry)], key=lambda f: -f.area)[:2]
    oldal = [f for f in body.faces if f not in sik]
    feat = root.features.offsetFacesFeatures.add(root.features.offsetFacesFeatures.createInput(oldal, adsk.core.ValueInput.createByReal(-d)))
    feat.name = nev or (body.name + ' illesztes')
    return feat


def P(x, y, z):
    return adsk.core.Point3D.create(x, y, z)


def val(x):
    return adsk.core.ValueInput.createByReal(x)


def find_face(body, axis, value):
    """Sík lap keresése a test felületei közül a középpontja alapján."""
    for f in body.faces:
        if f.geometry.surfaceType != adsk.core.SurfaceTypes.PlaneSurfaceType:
            continue
        c = f.centroid
        v = {'x': c.x, 'y': c.y, 'z': c.z}[axis]
        if abs(v - value) < 1e-3:
            return f
    raise Exception('Nem találom a lapot: %s=%s' % (axis, value))


def offset_plane(root, base, dist):
    ci = root.constructionPlanes.createInput()
    ci.setByOffset(base, val(dist))
    return root.constructionPlanes.add(ci)


def sym_extrude(root, profiles, total, op, bodies=None, name=None):
    """Szimmetrikus kihúzás – így nem számít, merre néz a vázlat normálisa."""
    ext = root.features.extrudeFeatures
    ei = ext.createInput(profiles, op)
    ei.setSymmetricExtent(val(total), True)
    if bodies:
        ei.participantBodies = bodies
    f = ext.add(ei)
    if name:
        f.name = name
    return f


def all_profiles(sketch):
    coll = adsk.core.ObjectCollection.create()
    for p in sketch.profiles:
        coll.add(p)
    return coll


def small_profiles(sketch, max_area):
    """Csak a kis profilok (pl. lyukak) – ha a lap széle is bekerülne, azt kihagyja."""
    coll = adsk.core.ObjectCollection.create()
    for p in sketch.profiles:
        if p.areaProperties().area <= max_area:
            coll.add(p)
    return coll


def smallest_profile(sketch):
    return min(sketch.profiles, key=lambda p: p.areaProperties().area)


def rect(sketch, c, corner):
    sketch.sketchCurves.sketchLines.addCenterPointRectangle(
        sketch.modelToSketchSpace(c), sketch.modelToSketchSpace(corner))


def circle(sketch, c, r):
    sketch.sketchCurves.sketchCircles.addByCenterRadius(sketch.modelToSketchSpace(c), r)


def nearest_end(arc, pt):
    s, e = arc.startSketchPoint, arc.endSketchPoint
    return s if s.geometry.distanceTo(pt) < e.geometry.distanceTo(pt) else e


def find_appearance(lib, keywords):
    for kw in keywords:
        try:
            a = lib.appearances.itemByName(kw)
            if a:
                return a
        except:
            pass
    first = keywords[-1].split(' ')[0]
    for i in range(lib.appearances.count):
        a = lib.appearances.item(i)
        if first in a.name:
            return a
    return None


def set_appearance(design, body, keywords, name, rgb):
    try:
        lib = None
        for i in range(app.materialLibraries.count):
            l = app.materialLibraries.item(i)
            if 'Appearance' in l.name:
                lib = l
                break
        if not lib:
            return
        existing = design.appearances.itemByName(name)
        if not existing:
            base = find_appearance(lib, keywords)
            if not base:
                return
            existing = design.appearances.addByCopy(base, name)
            for i in range(existing.appearanceProperties.count if rgb else 0):
                cp = adsk.core.ColorProperty.cast(existing.appearanceProperties.item(i))
                if cp and not cp.isReadOnly and 'olor' in cp.name:
                    try:
                        cp.value = adsk.core.Color.create(rgb[0], rgb[1], rgb[2], 255)
                    except:
                        pass
        body.appearance = existing
    except:
        pass  # a megjelenés csak kozmetika, ne álljon meg miatta a szkript


def run(context):
    try:
        doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        design.designType = adsk.fusion.DesignTypes.ParametricDesignType
        root = design.rootComponent
        feats = root.features
        NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
        CUT = adsk.fusion.FeatureOperations.CutFeatureOperation
        h = EL / 2.0

        def B(name):  # testek friss lekérése név alapján (a hivatkozás így nem avul el)
            return root.bRepBodies.itemByName(name)

        # 1) Ház: 8x8x8 cm-es kocka (z = 0..8)
        sk = root.sketches.add(root.xYConstructionPlane)
        sk.name = 'Haz alap'
        rect(sk, P(0, 0, 0), P(h, h, 0))
        ext = feats.extrudeFeatures.addSimple(sk.profiles.item(0), val(EL), NEW)
        ext.name = 'Haz'
        haz = ext.bodies.item(0)
        haz.name = 'Haz'

        # 2) Élek lekerekítése
        edges = adsk.core.ObjectCollection.create()
        for e in haz.edges:
            edges.add(e)
        fi = feats.filletFeatures.createInput()
        try:
            fi.edgeSetInputs.addConstantRadiusEdgeSet(edges, val(LEKEREKITES), True)
        except:
            fi.addConstantRadiusEdgeSet(edges, val(LEKEREKITES), True)
        feats.filletFeatures.add(fi).name = 'Lekerekites'

        # 3) Alumínium tetőlap: zseb a házba + külön test
        top = offset_plane(root, root.xYConstructionPlane, EL)
        top.name = 'Teto sik'
        sk = root.sketches.add(top)
        sk.name = 'Tetolap'
        rect(sk, P(0, 0, EL), P(TETO / 2, TETO / 2, EL))
        sym_extrude(root, sk.profiles.item(0), 0.24, CUT, [B('Haz')], 'Tetolap zseb')
        teto = sym_extrude(root, sk.profiles.item(0), 0.20, NEW, None, 'Tetolap').bodies.item(0)
        teto.name = 'Tetolap'

        # 4) Mikrofonfuratok (6 db körben)
        sk = root.sketches.add(top)
        sk.name = 'Mikrofonok'
        for i in range(6):
            a = math.radians(90 + i * 60)
            circle(sk, P(MIC_R * math.cos(a), MIC_R * math.sin(a), EL), 0.08)
        sym_extrude(root, all_profiles(sk), 0.5, CUT, [B('Tetolap'), B('Haz')], 'Mikrofon furatok')

        # 5) Érintőfelület: Ø18 mm-es szigetelt (műanyag) betét a tetőlap közepén
        #    – az alumínium lapon a kapacitív érintés nem működne, ezért a betét alatt lesz az elektróda
        top2 = offset_plane(root, root.xYConstructionPlane, EL + 0.1)
        top2.name = 'Tetolap felso sik'
        sk = root.sketches.add(top)
        sk.name = 'Erinto betet'
        circle(sk, P(0, 0, EL), 0.9)
        sym_extrude(root, sk.profiles.item(0), 0.3, CUT, [B('Tetolap')], 'Erinto furat')
        sk2 = root.sketches.add(top)          # a betét 0,1 mm-rel kisebb sugarú, hogy illesztési hézag legyen
        sk2.name = 'Erinto betet (illesztett)'
        circle(sk2, P(0, 0, EL), 0.89)
        sym_extrude(root, sk2.profiles.item(0), 0.2, NEW, None, 'Erinto betet').bodies.item(0).name = 'Erinto betet'

        # 5b) 4 programozható hangeffekt-gomb a tetőlap sarkaiban
        for i, (gx, gy) in enumerate(GOMB_HELYEK):
            sk = root.sketches.add(top2)
            sk.name = 'Gomb %d' % (i + 1)
            circle(sk, P(gx, gy, EL + 0.1), GOMB_R + 0.03)   # zseb kis hézaggal
            sym_extrude(root, sk.profiles.item(0), 0.6, CUT, [B('Tetolap')], 'Gomb %d furat' % (i + 1))   # átmenő: a sapka szára a kapcsolóig ér
            sk2 = root.sketches.add(top2)
            sk2.name = 'Gomb %d sapka' % (i + 1)
            circle(sk2, P(gx, gy, EL + 0.1), GOMB_R)
            sym_extrude(root, sk2.profiles.item(0), 0.2, NEW, None, 'Gomb %d' % (i + 1)).bodies.item(0).name = 'Gomb %d' % (i + 1)

        # 6) Előlap: világító C betű (horony a házba + fénycsatorna test)
        front = find_face(B('Haz'), 'y', -h)
        sk = root.sketches.addWithoutEdges(front)
        sk.name = 'C betu'
        arcs = sk.sketchCurves.sketchArcs
        a1 = math.radians(C_RES / 2)
        a2 = math.radians(360 - C_RES / 2)

        def fp(r, a):  # pont az előlapon (u = jobbra, v = fel)
            return P(r * math.cos(a), -h, h + r * math.sin(a))

        def sp(pt):
            return sk.modelToSketchSpace(pt)

        Ro, Ri = C_R + C_T, C_R - C_T
        outer = arcs.addByThreePoints(sp(fp(Ro, a1)), sp(fp(Ro, math.pi)), sp(fp(Ro, a2)))
        inner = arcs.addByThreePoints(sp(fp(Ri, a1)), sp(fp(Ri, math.pi)), sp(fp(Ri, a2)))
        for a, sgn in ((a1, -1), (a2, 1)):
            cu = C_R * math.cos(a) + sgn * (-math.sin(a)) * C_T
            cv = C_R * math.sin(a) + sgn * (math.cos(a)) * C_T
            mid = sp(P(cu, -h, h + cv))
            so = nearest_end(outer, sp(fp(Ro, a)))
            si = nearest_end(inner, sp(fp(Ri, a)))
            arcs.addByThreePoints(so, mid, si)
        prof = smallest_profile(sk)
        sym_extrude(root, prof, 0.30, CUT, [B('Haz')], 'C horony')
        feny = sym_extrude(root, prof, 0.24, NEW, None, 'C fenycsatorna').bodies.item(0)
        feny.name = 'C fenycsatorna'
        illesztes(root, feny)                    # 0,1 mm hézag körben a C horonyban

        # 6b) Kerek kijelző a C belsejében, rajta a mosolygós arc
        sk = root.sketches.addWithoutEdges(find_face(B('Haz'), 'y', -h))
        sk.name = 'Kijelzo'
        circle(sk, P(0, -h, h), KIJELZO_R)
        sym_extrude(root, smallest_profile(sk), 0.4, CUT, [B('Haz')], 'Kijelzo zseb')
        sym_extrude(root, smallest_profile(sk), 0.2, NEW, None, 'Kijelzo').bodies.item(0).name = 'Kijelzo'
        illesztes(root, B('Kijelzo'))            # 0,1 mm hézag körben a kijelzőnyílásban

        kf = find_face(B('Kijelzo'), 'y', -h - 0.1)   # a kijelző üveg előlapja
        sk = root.sketches.addWithoutEdges(kf)
        sk.name = 'Arc'
        ky = -h - 0.1

        def kp(u, v):  # pont a kijelzőn (u = jobbra, v = fel, a kijelző közepéhez képest)
            return sk.modelToSketchSpace(P(u, ky, h + v))

        for su in (-1, 1):  # szemek
            sk.sketchCurves.sketchCircles.addByCenterRadius(kp(su * ARC_SZEM_X, ARC_SZEM_Y), ARC_SZEM_R)
        # mosoly: ív alakú sáv lekerekített végekkel
        ka = sk.sketchCurves.sketchArcs
        cu0, cv0, R, t = 0.0, ARC_SZAJ_Y, ARC_SZAJ_R, ARC_SZAJ_T
        s1, s2 = math.radians(205), math.radians(335)
        sm = (s1 + s2) / 2

        def ap(r, a):
            return kp(cu0 + r * math.cos(a), cv0 + r * math.sin(a))

        o = ka.addByThreePoints(ap(R + t, s1), ap(R + t, sm), ap(R + t, s2))
        i_ = ka.addByThreePoints(ap(R - t, s1), ap(R - t, sm), ap(R - t, s2))
        for a, d in ((s1, (math.sin(s1), -math.cos(s1))), (s2, (-math.sin(s2), math.cos(s2)))):
            mid = kp(cu0 + R * math.cos(a) + d[0] * t, cv0 + R * math.sin(a) + d[1] * t)
            ka.addByThreePoints(nearest_end(o, ap(R + t, a)), mid, nearest_end(i_, ap(R - t, a)))
        arc_f = sym_extrude(root, all_profiles(sk), 0.03, NEW, None, 'Arc')
        for i in range(arc_f.bodies.count):   # 2 szem + mosoly = 3 külön test
            arc_f.bodies.item(i).name = 'Arc' if i == 0 else 'Arc %d' % (i + 1)

        # 6c) Kamera a C nyílásában (jobb oldalt, a C "szájában")
        sk = root.sketches.addWithoutEdges(find_face(B('Haz'), 'y', -h))
        sk.name = 'Kamera'
        circle(sk, P(KAMERA_U, -h, h), KAMERA_R)
        sym_extrude(root, smallest_profile(sk), 0.4, CUT, [B('Haz')], 'Kamera furat')
        sym_extrude(root, smallest_profile(sk), 0.16, NEW, None, 'Kamera').bodies.item(0).name = 'Kamera'

        # 7) Hangszórórács mindkét oldalon
        for side, x in (('jobb', h), ('bal', -h)):
            face = find_face(B('Haz'), 'x', x)
            sk = root.sketches.addWithoutEdges(face)
            sk.name = 'Hangszoro racs ' + side
            n = int(RACS_R / RACS_OSZTAS)
            for i in range(-n, n + 1):
                for j in range(-n, n + 1):
                    y = i * RACS_OSZTAS
                    z = j * RACS_OSZTAS + (RACS_OSZTAS / 2 if i % 2 else 0)
                    if y * y + z * z <= RACS_R * RACS_R:
                        circle(sk, P(x, y, h + z), RACS_LYUK)
            sym_extrude(root, small_profiles(sk, math.pi * RACS_LYUK ** 2 * 1.5), 0.4, CUT, [B('Haz')], 'Hangszoro racs ' + side)

        # 8) USB-C aljzat hátul
        back = find_face(B('Haz'), 'y', h)
        sk = root.sketches.addWithoutEdges(back)
        sk.name = 'USB-C'
        rect(sk, P(0, h, 1.0), P(0.45, h, 1.16))
        sym_extrude(root, smallest_profile(sk), 1.2, CUT, [B('Haz')], 'USB-C aljzat')

        # --- Segédek a "szabad formájú" testekhez (gömb, henger, doboz) ---
        tbm = adsk.fusion.TemporaryBRepManager.get()
        V = adsk.core.Vector3D.create
        UNION = adsk.fusion.BooleanTypes.UnionBooleanType
        INTERSECT = adsk.fusion.BooleanTypes.IntersectionBooleanType

        def add_temp(items, feature_name):
            """Ideiglenes testek felvétele a modellbe egy 'Base Feature'-ben. items: [(test, név), ...]"""
            bf = root.features.baseFeatures.add()
            bf.startEdit()
            for tb, _ in items:
                root.bRepBodies.add(tb, bf)
            bf.finishEdit()
            bf.name = feature_name
            for i in range(bf.bodies.count):
                bf.bodies.item(i).name = items[i][1] if i < len(items) else feature_name

        def cyl(p1, p2, r):
            return tbm.createCylinderOrCone(p1, r, p2, r)

        def box(center, ld, wd, l, w, hh):
            return tbm.createBox(adsk.core.OrientedBoundingBox3D.create(center, ld, wd, l, w, hh))

        # 9) RGB fénygyűrű a ház alatt + gumitalp
        add_temp([(cyl(P(0, 0, -0.3), P(0, 0, 0), 3.3), 'RGB fenygyuru'),
                  (cyl(P(0, 0, -0.45), P(0, 0, -0.3), 3.0), 'Gumitalp')], 'Fenygyuru es talp')

        # 10) Gumírozott sarkak: a lekerekítésnél kicsit nagyobb gömbsüvegek a 8 sarokban
        k = h - LEKEREKITES
        sarkak = []
        n = 0
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    n += 1
                    c = P(sx * k, sy * k, h + sz * k)
                    gomb = tbm.createSphere(c, LEKEREKITES + SAROK_VASTAG)
                    kocka = box(P(c.x + sx * 0.35, c.y + sy * 0.35, c.z + sz * 0.35),
                                V(1, 0, 0), V(0, 1, 0), 1.7, 1.7, 1.7)
                    tbm.booleanOperation(gomb, kocka, INTERSECT)
                    sarkak.append((gomb, 'Gumi sarok %d' % n))
        add_temp(sarkak, 'Gumi sarkak')
        # a gumisarok csak kívül legyen: a ház térfogatát kivonjuk belőle (különben belelógna a házba)
        for i in range(1, 9):
            tools = adsk.core.ObjectCollection.create()
            tools.add(B('Haz'))
            ci = root.features.combineFeatures.createInput(B('Gumi sarok %d' % i), tools)
            ci.operation = adsk.fusion.FeatureOperations.CutFeatureOperation
            ci.isKeepToolBodies = True
            root.features.combineFeatures.add(ci).name = 'Gumi sarok %d csak kivul' % i
        # a tetőlap fölötti hasáb kivágása a felső sarkokból: a tetőlap így a gumik leszedése nélkül levehető
        prism = box(P(0, 0, EL + 1.0), V(1, 0, 0), V(0, 1, 0), TETO + 0.1, TETO + 0.1, 2.4)
        add_temp([(prism, 'Tetolap hasab')], 'Tetolap hasab')
        for i in range(1, 9):
            tools = adsk.core.ObjectCollection.create()
            tools.add(B('Tetolap hasab'))
            ci = root.features.combineFeatures.createInput(B('Gumi sarok %d' % i), tools)
            ci.operation = adsk.fusion.FeatureOperations.CutFeatureOperation
            ci.isKeepToolBodies = True
            root.features.combineFeatures.add(ci).name = 'Gumi sarok %d tetolap kivagas' % i
        root.features.removeFeatures.add(B('Tetolap hasab'))

        # 11) Cégembléma a hátlapon (kiemelkedő alumínium betét) – csak ha megvannak a privát koordináták
        if LOGO_KERET and LOGO_TELI:
            LS = LOGO_MAGASSAG / 150.0  # a logó kb. 150 px magas a 200 px-es képen

            def lp(px, py):  # képpont -> pont a hátlapon (hátulról nézve jobbra = -X)
                u = (px - 101) * LS
                v = -(py - 101) * LS
                return P(-u, h, h + LOGO_EMEL + v)

            # a) körvonalas rész: vastag vonalak dobozokból + kerek csatlakozások
            pts = [lp(*q) for q in LOGO_KERET]
            w = 8 * LS
            keret = None
            for i in range(len(pts)):
                a, b = pts[i], pts[(i + 1) % len(pts)]
                dx, dz = b.x - a.x, b.z - a.z
                L = math.hypot(dx, dz)
                parts = [cyl(P(a.x, h - LOGO_V / 2, a.z), P(a.x, h + LOGO_V / 2, a.z), w / 2)]
                if L > 1e-4:
                    parts.append(box(P((a.x + b.x) / 2, h, (a.z + b.z) / 2),
                                     V(dx / L, 0, dz / L), V(dz / L, 0, -dx / L), L, w, LOGO_V))
                for pb in parts:
                    if keret is None:
                        keret = pb
                    else:
                        tbm.booleanOperation(keret, pb, UNION)
            add_temp([(keret, 'Logo keret')], 'Logo keret')

            # b) teli rész: zárt sokszög vázlatból kihúzva
            back = find_face(B('Haz'), 'y', h)
            sk = root.sketches.addWithoutEdges(back)
            sk.name = 'Logo teli'
            lines = sk.sketchCurves.sketchLines
            spts = [sk.modelToSketchSpace(lp(*q)) for q in LOGO_TELI]
            first = prev = None
            for i in range(len(spts)):
                a = prev.endSketchPoint if prev else spts[0]
                b = spts[i + 1] if i < len(spts) - 1 else first.startSketchPoint
                ln = lines.addByTwoPoints(a, b)
                first = first or ln
                prev = ln
            sym_extrude(root, smallest_profile(sk), LOGO_V, NEW, None, 'Logo teli').bodies.item(0).name = 'Logo teli'

        # 12) Megjelenések (színek)
        set_appearance(design, B('Haz'), ['Plastic - Matte (Black)', 'Plastic - Matte', 'Plastic'], 'CK grafit', (42, 45, 51))
        for nev in ('Tetolap', 'Logo keret', 'Logo teli'):
            if B(nev) is None:
                continue
            set_appearance(design, B(nev), ['Aluminum - Satin', 'Aluminum - Brushed', 'Aluminum'], 'CK aluminium', (201, 204, 209))
        for nev in ('C fenycsatorna', 'RGB fenygyuru'):
            set_appearance(design, B(nev), ['Plastic - Translucent Matte (White)', 'Plastic - Translucent', 'Plastic'], 'CK RGB feny', (255, 154, 60))
        for i, rgb in enumerate(GOMB_SZINEK):
            if i == ANDOR_GOMB:  # az "Andor" gomb: valódi fa borítás a faviccekhez
                set_appearance(design, B('Gomb %d' % (i + 1)), ['Wood - Oak', 'Oak', 'Wood - Walnut', 'Wood'], 'CK Andor fa', None)
                continue
            set_appearance(design, B('Gomb %d' % (i + 1)), ['Plastic - Glossy (White)', 'Plastic - Glossy', 'Plastic'], 'CK gomb %d' % (i + 1), rgb)
        for nev in ('Kijelzo', 'Kamera'):
            set_appearance(design, B(nev), ['Plastic - Glossy (Black)', 'Glass - Smoked', 'Plastic'], 'CK kijelzo', (12, 14, 18))
        set_appearance(design, B('Erinto betet'), ['Plastic - Translucent Matte (White)', 'Plastic - Matte (White)', 'Plastic'], 'CK betet', (236, 236, 232))
        for nev in ('Arc', 'Arc 2', 'Arc 3'):
            set_appearance(design, B(nev),['Plastic - Translucent Matte (White)', 'Plastic - Translucent', 'Plastic'], 'CK arc', (120, 230, 255))
        set_appearance(design, B('Gumitalp'), ['Rubber - Black', 'Rubber', 'Plastic'], 'CK gumi', (20, 20, 22))
        for nev in ['Gumi sarok %d' % i for i in range(1, 9)]:   # narancs "ütköző" sarkok
            set_appearance(design, B(nev), ['Rubber - Black', 'Rubber', 'Plastic'], 'CK gumi narancs', SAROK_SZIN)

        # 11) Ha a Fusion "Y felfelé" módban van, forgassuk fel a modellt
        try:
            orient = app.preferences.generalPreferences.defaultModelingOrientation
            yup = orient == adsk.core.DefaultModelingOrientations.YUpModelingOrientation
        except:
            yup = False
        if yup:
            bodies = adsk.core.ObjectCollection.create()
            for b in root.bRepBodies:
                bodies.add(b)
            m = adsk.core.Matrix3D.create()
            m.setToRotation(-math.pi / 2, adsk.core.Vector3D.create(1, 0, 0), P(0, 0, 0))
            mf = feats.moveFeatures
            try:
                mi = mf.createInput2(bodies)
                mi.defineAsFreeMove(m)
            except:
                mi = mf.createInput(bodies, m)
            mf.add(mi).name = 'Felallitas (Y fel)'

        app.activeViewport.fit()

        # 12) Export: STEP, STL, F3D
        os.makedirs(EXPORT_DIR, exist_ok=True)
        em = design.exportManager
        em.execute(em.createSTEPExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.step')))
        stl = em.createSTLExportOptions(root, os.path.join(EXPORT_DIR, 'c-kocka.stl'))
        stl.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
        em.execute(stl)
        em.execute(em.createFusionArchiveExportOptions(os.path.join(EXPORT_DIR, 'c-kocka.f3d')))

        if not os.environ.get('CKOCKA_SILENT'):
            ui.messageBox('Kész a C-kocka!\n\nExportálva ide:\n' + EXPORT_DIR +
                      '\n(c-kocka.step, c-kocka.stl, c-kocka.f3d)', 'C-kocka')
    except:
        if os.environ.get('CKOCKA_SILENT'):   # MCP-ről futtatva ne nyisson ablakot, hanem adja vissza a hibát
            raise
        ui.messageBox('Hiba történt:\n{}'.format(traceback.format_exc()), 'C-kocka')
