# A 2026-11-17-i költségdöntések (KOLTSEGOPTIMALIZALAS.md: E2, E3, E4, E6, M5, M10) átvezetése a modellbe – Fusion NÉLKÜL.
# Bemenet/kimenet: 3d/c-kocka.step, 3d/c-kocka.stl és a nyomtatási STL-ek (3d/nyomtatas/).
# A STEP-et szövegesen foltozzuk: a megváltozott testnél csak a MANIFOLD_SOLID_BREP héja cserélődik, így a szerkezet
# (gyökér, „Belso szerkezet (PETG)”, „Elektronika (vazlat)”), a testnevek és a színek megmaradnak. (Az OCC XCAF-írója
# ebben a változatban elveszítette a színeket és a módosított testek nevét.)
# Miért nem Fusion: a módosítás napján a Fusion nem futott (MCP: ECONNREFUSED). A .f3d ezért NEM változik; a változások
# listája a dxf/MEGJEGYZES.txt-ben van, hogy a Fusion-modellbe is át lehessen vezetni.
#
# Változások (világkoordináta, mm, Y fel, eleje +Z, a kocka alja y = 0):
#  1) E6 – Seeed ReSpeaker 2-Mics Pi HAT a Voice Bonnet helyén. Adatok a gyártó Eagle-fájljából („ReSpeaker 2-Mics Pi HAT.brd”,
#     v1.0): panel 65,0 × 30,0 mm (Pi Zero-méret, furatkép 58 × 23), MIC1/MIC2 felső hangnyílású MEMS mikrofon, a hangnyílás
#     a panel sarkától (3,05; 21,34) és (61,98; 21,34) mm-re, legmagasabb alkatrész a 6 × 6 × 5,0 mm-es gomb (K1).
#     BECSÜLT a v2.0-ra: a v2 koordinátáit a Seeed nem adja meg, csak azt, hogy a v1 és v2 lapkiosztása „lényegében azonos”.
#     A hangszóró-csatlakozó (J2) és a jack körül a tetőtartóig 3,9 mm, a szánig 5,4 mm hely van (ellenőrizve).
#     A HAT a Pi Zero fölött van (place_modules.py: közép x = 0, z = -4, hossztengely Z); a tüskesort a -X (bal) oldalra
#     tesszük, így a mikrofonok x = -6,34-nél, z = +25,46 (elöl) és z = -33,46 (hátul) vannak, a megmaradó (jobb, +X)
#     hangszórótól a lehető legtávolabb.
#     - Tetőlap: a régi 2 hasznos furat (x = 0, z = ±21) megszűnik, a 4 díszítő Ø1,6 marad, 2 új Ø1,6 a mikrofonok fölé.
#     - Ház: a hátsó mikrofon a 60 × 60-as tetőnyíláson kívül, a perem alá esik -> Ø2,0 hangfurat a peremen át.
#     - Tetőtartó: a régi Ø6 csatornák betömve; új csatorna elöl Ø6, hátul Ø3 (a tartó széle 2,5 mm-re van, 1 mm fal marad).
#     - Helyőrző: „ReSpeaker 2-Mics Pi HAT” doboz 30 × 7,6 × 65 (1,6 mm NYÁK + 6 mm alkatrész-magasság; a Grove-csatlakozók
#       magasságát a gyártói fájl nem adja meg, ezért felülbecsülve), a régi Bonnet alsó síkján.
#  2) E6/M10 – 1 hangszóró: a jobb (+X) oldali marad; a bal hangszóró és a bal rögzítőgyűrű kikerül (a bal rács szellőző).
#     A ház bal oldali 3 csavaroszlopa marad (betét nélkül), az SLS-ben nem kerül pénzbe.
#  3) M5 – a Ø60 EPDM gumitalp helyett 4 db öntapadós gumiláb (Ø10 × 3, AJANLATKERESEK.md 30. tétel) a diffúzor alján,
#     a 3 süllyesztett csavarfejtől (Ø5, r = 22) legalább 3 mm-re: (±20,5; 19,0) és (±17,5; -21,5).
#  4) E4 – általános USB-C panelhosszabbító: a falnyílás (9 × 3,2) marad; a tálca hátsó zsebe a fal mögött 32 mm szélesre nő
#     (y 5…9, 2,2 mm mély), ebbe ül a hosszabbító legfeljebb 30 mm széles, 2 mm vastag füle/pereme. A fület a tálca és a ház
#     fogja be (a tálca 4 csavarja), fülcsavar nem kell, mert a fülek furatképe gyártónként más.
#  5) E2/E3 – az AT42QT1010 érintőpanel kikerül (az érintést a XIAO érzékeli, az elektróda vezetéke a XIAO-ig megy);
#     a DRV2605L helyett kész rezgőmotor-modul (a helyőrző befoglaló mérete változatlan).
#
# Futtatás (egyszer, az eredeti STEP-ből; ismételt futtatás előtt: git checkout 3d/c-kocka.step):
#   %LOCALAPPDATA%\ckocka-cad\Scripts\python.exe tools\cost_pass_step.py
# Utána: tools\export_dxf_step.py "Tetolap" "Haz (SLS)" "Also talca (szan alap)", majd node tools/dxf_preview.js
import os
import re
import shutil
import sys
import tempfile

from OCP.BRep import BRep_Builder
from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut, BRepAlgoAPI_Fuse
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepExtrema import BRepExtrema_DistShapeShape
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeCylinder
from OCP.IFSelect import IFSelect_RetDone
from OCP.Interface import Interface_Static
from OCP.ShapeUpgrade import ShapeUpgrade_UnifySameDomain
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Reader, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopAbs import TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS, TopoDS_Compound
from OCP.gp import gp_Ax2, gp_Dir, gp_Pnt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STEP = os.path.join(ROOT, '3d', 'c-kocka.step')
STL_ALL = os.path.join(ROOT, '3d', 'c-kocka.stl')
PRINT = os.path.join(ROOT, '3d', 'nyomtatas')

MIC_X = -6.34
MIC_FRONT_Z, MIC_REAR_Z = 25.46, -33.46
OLD_MIC = [(0.0, 21.0), (0.0, -21.0)]
FEET = [(20.5, 19.0), (-20.5, 19.0), (17.5, -21.5), (-17.5, -21.5)]
FOOT_D, FOOT_H, DIFF_BOTTOM = 10.0, 3.0, -3.0
HAT = (-15.0, 71.8, -36.5, 15.0, 79.4, 28.5)            # x0, y0, z0, x1, y1, z1 (a Bonnet alsó síkja: y = 71,8)
USB_POCKET = (-16.0, 5.0, -42.5, 16.0, 9.5, -40.3)
USB_FLANGE = (-15.0, 5.2, -42.4, 15.0, 13.8, -40.4)

NAME_HAT = 'ReSpeaker 2-Mics Pi HAT (mikrofonhely v1 alapjan, v2-n becsult)'
NAME_VIB = 'Rezgomotor-modul (ERM, 3 tus)'
NAME_USB = 'USB-C panelhosszabbito (altalanos, fules)'


def cyl_y(x, z, r, y0, y1):
    return BRepPrimAPI_MakeCylinder(gp_Ax2(gp_Pnt(x, y0, z), gp_Dir(0, 1, 0)), r, y1 - y0).Shape()


def box(x0, y0, z0, x1, y1, z1):
    return BRepPrimAPI_MakeBox(gp_Pnt(x0, y0, z0), gp_Pnt(x1, y1, z1)).Shape()


def solids_of(shape):
    ex, out = TopExp_Explorer(shape, TopAbs_SOLID), []
    while ex.More():
        out.append(TopoDS.Solid(ex.Current()))
        ex.Next()
    return out


def clean(shape, what):
    u = ShapeUpgrade_UnifySameDomain(shape, True, True, False)
    u.Build()
    ss = solids_of(u.Shape())
    if len(ss) != 1 or not BRepCheck_Analyzer(ss[0]).IsValid():
        sys.exit('Hiba (%s): %d test / érvénytelen a művelet után' % (what, len(ss)))
    return ss[0]


def cut(shape, what, *tools):
    for t in tools:
        shape = BRepAlgoAPI_Cut(shape, t).Shape()
    return clean(shape, what)


def fuse(shape, what, *tools):
    for t in tools:
        shape = BRepAlgoAPI_Fuse(shape, t).Shape()
    return clean(shape, what)


def read_named_solids(path):
    """Testnév (a MANIFOLD_SOLID_BREP neve, ahogy a fájlban áll) -> test. A komponensek helyzete egységmátrix."""
    r = STEPControl_Reader()
    if r.ReadFile(path) != IFSelect_RetDone:
        sys.exit('Nem olvasható: %s' % path)
    r.TransferRoots()
    tr = r.WS().TransferReader()
    out = {}
    for s in solids_of(r.OneShape()):
        ent = tr.EntityFromShapeResult(s, 1) or tr.EntityFromShapeResult(s.Located(TopLoc_Location()), 1)
        if ent is None:
            sys.exit('Névtelen test a STEP-ben')
        out[ent.Name().ToCString()] = s
    return out


def decode(n):
    """A STEP \\X2\\2013\\X0\\ kódolású nagykötőjelét az olvasó szó szerint adja vissza."""
    return n.replace('\\X2\\2013\\X0\\', '–')


# ---------------- STEP-foltozás ----------------
ENT = re.compile(r'#(\d+)\s*=\s*(.*?);\s*(?=#\d+\s*=|$)', re.S)
REF = re.compile(r'#(\d+)')


def parse(text):
    a = text.index('DATA;') + 5
    b = text.index('ENDSEC;', a)
    return text[:a], {int(m.group(1)): m.group(2).strip() for m in ENT.finditer(text[a:b])}, text[b:]


def shell_entities(solid):
    """Egy test önálló STEP-exportja -> (a héj azonosítója, a héjból elérhető entitások)."""
    tmp = os.path.join(tempfile.gettempdir(), 'ckocka_tmp.step')
    Interface_Static.SetCVal_s('write.step.unit', 'MM')
    w = STEPControl_Writer()
    w.Transfer(solid, STEPControl_AsIs)
    if w.Write(tmp) != IFSelect_RetDone:
        sys.exit('Nem írható: %s' % tmp)
    with open(tmp, encoding='latin-1') as f:
        _, ents, _ = parse(f.read())
    os.remove(tmp)
    brep = [b for b in ents.values() if b.startswith('MANIFOLD_SOLID_BREP')]
    if len(brep) != 1:
        sys.exit('Váratlan export: %d test' % len(brep))
    shell = int(REF.findall(brep[0])[-1])
    seen, todo = set(), [shell]
    while todo:
        i = todo.pop()
        if i not in seen:
            seen.add(i)
            todo += [int(r) for r in REF.findall(ents[i])]
    return shell, {i: ents[i] for i in seen}


class StepPatch:
    def __init__(self, path):
        with open(path, encoding='latin-1') as f:
            self.head, self.ents, self.tail = parse(f.read())
        self.next = max(self.ents) + 1
        self.brep = {}
        for i, b in self.ents.items():
            m = re.match(r"MANIFOLD_SOLID_BREP\('([^']*)',#(\d+)\)$", b)
            if m:
                self.brep[decode(m.group(1))] = i
        self.root_types = {self.kind(i) for i in self.unreferenced()}

    def kind(self, i):
        return re.match(r'\(?\s*([A-Z_0-9]+)', self.ents[i]).group(1)

    def unreferenced(self):
        used = {int(r) for b in self.ents.values() for r in REF.findall(b)}
        return [i for i in self.ents if i not in used]

    def owners(self, i, prefix):
        pat = re.compile(r'#%d\b' % i)
        return [k for k, b in self.ents.items() if b.startswith(prefix) and pat.search(b)]

    def _splice(self, solid):
        shell, sub = shell_entities(solid)
        remap = {i: self.next + k for k, i in enumerate(sorted(sub))}
        self.next += len(sub)
        for i, b in sub.items():
            self.ents[remap[i]] = REF.sub(lambda m: '#%d' % remap[int(m.group(1))], b)
        return remap[shell]

    def replace(self, name, solid, new_name=None):
        i = self.brep[name]
        self.ents[i] = "MANIFOLD_SOLID_BREP('%s',#%d)" % (new_name or name, self._splice(solid))

    def rename(self, name, new_name):
        i = self.brep[name]
        self.ents[i] = re.sub(r"^MANIFOLD_SOLID_BREP\('[^']*'", "MANIFOLD_SOLID_BREP('%s'" % new_name, self.ents[i])

    def delete(self, name):
        i = self.brep[name]
        for k in self.owners(i, 'STYLED_ITEM') + [i]:
            pat = re.compile(r'#%d\b' % k)
            for o in [o for o, b in self.ents.items() if o != k and pat.search(b)]:
                b = re.sub(r'#%d\s*,\s*' % k, '', self.ents[o])
                self.ents[o] = re.sub(r',\s*#%d\b' % k, '', b)
            del self.ents[k]

    def add(self, name, solid, like):
        """Új test a `like` testtel azonos reprezentációban és stílussal."""
        j = self.brep[like]
        nid = self.next
        self.next += 1
        self.ents[nid] = "MANIFOLD_SOLID_BREP('%s',#%d)" % (name, self._splice(solid))
        rep = self.owners(j, 'ADVANCED_BREP_SHAPE_REPRESENTATION')[0]
        self.ents[rep] = re.sub(r'#%d\b' % j, '#%d,#%d' % (j, nid), self.ents[rep], count=1)
        sty = self.owners(j, 'STYLED_ITEM')[0]
        sid = self.next
        self.next += 1
        self.ents[sid] = re.sub(r'#%d\)$' % j, '#%d)' % nid, self.ents[sty])
        pres = self.owners(sty, 'MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION')[0]
        self.ents[pres] = re.sub(r'#%d\b' % sty, '#%d,#%d' % (sty, sid), self.ents[pres], count=1)
        self.brep[name] = nid

    def save(self, path):
        """Az árva entitások (a lecserélt héjak) törlése, majd írás."""
        roots = [i for i in self.unreferenced() if self.kind(i) in self.root_types]
        seen, todo = set(), list(roots)
        while todo:
            i = todo.pop()
            if i not in seen:
                seen.add(i)
                todo += [int(r) for r in REF.findall(self.ents[i])]
        dropped = len(self.ents) - len(seen)
        body = ''.join('#%d=%s;\n' % (i, self.ents[i]) for i in sorted(seen))
        with open(path, 'w', encoding='latin-1', newline='\n') as f:
            f.write(self.head + '\n' + body + self.tail)
        return len(seen), dropped


def stl(shape, path, lin=0.01, ang=0.2):
    BRepMesh_IncrementalMesh(shape, lin, False, ang, True)
    wr = StlAPI_Writer()
    wr.ASCIIMode = False
    tmp = os.path.join(tempfile.gettempdir(), 'ckocka_tmp.stl')   # az OCC nem kezeli az ékezetes útvonalat
    if not wr.Write(shape, tmp):
        sys.exit('Nem írható: %s' % path)
    shutil.move(tmp, path)


def main():
    S = read_named_solids(STEP)
    P = StepPatch(STEP)
    if set(P.brep) != set(S):
        sys.exit('A STEP-szöveg és az olvasó testnevei eltérnek')
    if NAME_HAT in S:
        sys.exit('A STEP már módosítva van (git checkout 3d/c-kocka.step az újrafuttatáshoz)')
    print('Beolvasva: %d test' % len(S))

    def need(n):
        if n not in S:
            sys.exit('Hiányzó test: %s' % n)
        return S[n]

    new = {}            # (új) név -> új test
    renamed = {}        # régi név -> új név
    # 1) mikrofonok
    s = fuse(need('Tetolap'), 'tetőlap', *[cyl_y(x, z, 1.2, 89.0, 91.0) for x, z in OLD_MIC])
    new['Tetolap'] = cut(s, 'tetőlap', *[cyl_y(MIC_X, z, 0.8, 88.5, 91.5) for z in (MIC_FRONT_Z, MIC_REAR_Z)])
    new['Haz (SLS)'] = cut(need('Haz (SLS)'), 'ház', cyl_y(MIC_X, MIC_REAR_Z, 1.0, 85.0, 89.5))
    s = fuse(need('Tetotarto (PETG)'), 'tetőtartó', *[cyl_y(x, z, 3.4, 83.3, 86.3) for x, z in OLD_MIC])
    new['Tetotarto (PETG)'] = cut(s, 'tetőtartó', cyl_y(MIC_X, MIC_FRONT_Z, 3.0, 83.0, 86.6),
                                  cyl_y(MIC_X, MIC_REAR_Z, 1.5, 83.0, 86.6))
    need('Voice Bonnet (2 mikrofon + sztereo hang)')
    renamed['Voice Bonnet (2 mikrofon + sztereo hang)'] = NAME_HAT
    new[NAME_HAT] = box(*HAT)
    # 4) USB-C
    new['Also talca (szan alap)'] = cut(need('Also talca (szan alap)'), 'tálca', box(*USB_POCKET))
    renamed['USB-C aljzat panel'] = NAME_USB
    new[NAME_USB] = fuse(need('USB-C aljzat panel'), 'USB-C', box(*USB_FLANGE))
    # 5) rezgőmodul: csak átnevezés
    renamed['Rezgo (DRV2605L + motor)'] = NAME_VIB
    # 2), 3), 5) törlések
    gone = [n for n in S if n.startswith('Hangszoro bal')] + ['Hangszoro rogzito bal (PETG)', 'Gumitalp',
                                                              'Erintes (AT42QT1010)']
    for n in gone:
        need(n)
    feet = {'Gumilab %d' % i: cyl_y(x, z, FOOT_D / 2, DIFF_BOTTOM - FOOT_H, DIFF_BOTTOM)
            for i, (x, z) in enumerate(FEET, 1)}

    final = {}          # megjelenítési név -> test
    for n, s in S.items():
        if n not in gone:
            nn = renamed.get(n, n)
            final[decode(nn)] = new.get(nn, s)
    final.update(feet)

    print('\nLegkisebb távolságok (mm) a megváltozott és új testekről (0 = érintkezik; csak a 4 mm alattiak):')
    for n in [decode(k) for k in new] + list(feet):
        res = []
        for o, t in final.items():
            if o == n:
                continue
            try:
                d = BRepExtrema_DistShapeShape(final[n], t)
                if d.IsDone() and d.Value() < 4.0:
                    res.append('%s %.2f' % (o, d.Value()))
            except Exception:
                res.append('%s ?' % o)
        print('  %-50s %s' % (n, '; '.join(res) or 'mindentől ≥ 4'))

    # mely testek a gyökérben vannak (a c-kocka.stl csak ezeket tartalmazza, mint a Fusion exportja)
    root_rep = P.owners(P.brep['Haz (SLS)'], 'ADVANCED_BREP_SHAPE_REPRESENTATION')[0]
    root_ids = {int(r) for r in REF.findall(P.ents[root_rep])}
    root_names = [renamed.get(n, n) for n, i in P.brep.items() if i in root_ids and n not in gone]

    for n, s in new.items():
        old = next((k for k, v in renamed.items() if v == n), n)
        P.replace(old, s, n)
    P.rename('Rezgo (DRV2605L + motor)', NAME_VIB)
    for n in gone:
        P.delete(n)
    for n, s in feet.items():
        P.add(n, s, like='Erinto betet')       # opál akril színe: világos, az „átlátszó gumi” helyett
    kept, dropped = P.save(STEP)
    print('\nSTEP írva: %d entitás (%d árva törölve)' % (kept, dropped))

    b, comp = BRep_Builder(), TopoDS_Compound()
    b.MakeCompound(comp)
    for n in root_names:
        b.Add(comp, final[decode(n)])
    for s in feet.values():
        b.Add(comp, s)
    stl(comp, STL_ALL, 0.05, 0.3)
    stl(new['Haz (SLS)'], os.path.join(PRINT, 'SLS_PA12', 'haz.stl'))
    stl(new['Also talca (szan alap)'], os.path.join(PRINT, 'SLS_PA12', 'also_talca.stl'))
    stl(new['Tetotarto (PETG)'], os.path.join(PRINT, 'FDM_PETG', 'tetotarto.stl'))
    left = os.path.join(PRINT, 'FDM_PETG', 'hangszoro_rogzito_bal.stl')
    if os.path.exists(left):
        os.remove(left)
    print('c-kocka.stl (%d test), haz/also_talca/tetotarto STL írva; hangszoro_rogzito_bal.stl törölve'
          % (len(root_names) + len(feet)))


if __name__ == '__main__':
    main()
