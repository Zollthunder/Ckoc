# Nézetenkénti DXF-ek (elöl, felül, oldal + metszet) a 3d/c-kocka.step fájlból – Fusion NÉLKÜL.
# Miért: a Fusion „összes él vetítése” exportja a tálcánál és a háznál kétszer is lefagyott (2026-11-16),
# ezért ezt a két alkatrészt OpenCascade-del (OCP) vetítjük, és ezdxf-fel írjuk ki.
#
# Ugyanaz az elrendezés és koordináta-rendszer, mint a Fusionös tools/export_dxf_part.py kimeneténél:
#   dxf/<alkatrész>/<alkatrész>_elol.dxf    XY sík, +Z felől nézve    (DXF x = X,  y = Y)
#   dxf/<alkatrész>/<alkatrész>_felul.dxf   XZ sík, +Y felől nézve    (DXF x = X,  y = -Z)
#   dxf/<alkatrész>/<alkatrész>_oldal.dxf   YZ sík, +X felől nézve    (DXF x = -Z, y = Y)
#   dxf/<alkatrész>/<alkatrész>_metszet.dxf a test Z-irányú közepén átmenő XY metszet (x = X, y = Y)
# Mértékegység mm ($INSUNITS = 4), R2000-es DXF, mint a Fusionös fájlok.
# Eltérés a Fusionös kimenettől: a takart élek külön, szaggatott „REJTETT” rétegre kerülnek (a Fusion
# folytonos vonallal rajzolta őket), és a hengerek, lekerekítések körvonala (sziluett) is benne van.
#
# Futtatás (a venv a %LOCALAPPDATA% alatt van, nem a repóban):
#   uv venv %LOCALAPPDATA%\ckocka-cad  &&  uv pip install --python %LOCALAPPDATA%\ckocka-cad\Scripts\python.exe cadquery-ocp ezdxf matplotlib
#   %LOCALAPPDATA%\ckocka-cad\Scripts\python.exe tools\export_dxf_step.py [--png <mappa>] ["Test neve" ...]
# Utána: node tools/dxf_preview.js (SVG-k + dxf/index.html frissítése).
import argparse
import math
import os
import sys
import time

import ezdxf
from OCP.BRep import BRep_Tool
from OCP.BRepAdaptor import BRepAdaptor_Curve
from OCP.BRepAlgoAPI import BRepAlgoAPI_Section
from OCP.BRepBndLib import BRepBndLib
from OCP.Bnd import Bnd_Box
from OCP.GCPnts import GCPnts_QuasiUniformDeflection
from OCP.GeomAbs import GeomAbs_Circle, GeomAbs_Line
from OCP.HLRAlgo import HLRAlgo_Projector
from OCP.HLRBRep import HLRBRep_Algo, HLRBRep_HLRToShape
from OCP.STEPControl import STEPControl_Reader
from OCP.TopAbs import TopAbs_EDGE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS
from OCP.gp import gp_Ax2, gp_Dir, gp_Pln, gp_Pnt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STEP = os.path.join(ROOT, '3d', 'c-kocka.step')
OUT = os.path.join(ROOT, 'dxf')
DEFAULT_PARTS = ['Also talca (szan alap)', 'Haz (SLS)']

# nézet -> (nézési irány = a vetítősík normálisa a néző felé, a DXF x tengelye a térben)
VIEWS = {
    'elol': ((0, 0, 1), (1, 0, 0)),
    'felul': ((0, 1, 0), (1, 0, 0)),
    'oldal': ((1, 0, 0), (0, 0, -1)),
}
TOL = 1e-6
DEFLECTION = 0.01  # mm, görbék közelítése sokszögvonallal (ami nem egyenes és nem kör)


def load_solids(path):
    r = STEPControl_Reader()
    if r.ReadFile(path) != 1:
        sys.exit('Nem olvasható: %s' % path)
    r.TransferRoots()
    tr = r.WS().TransferReader()
    solids = {}
    ex = TopExp_Explorer(r.OneShape(), TopAbs_SOLID)
    while ex.More():
        s = ex.Current()
        ent = tr.EntityFromShapeResult(s, 1)
        if ent is not None:
            solids[ent.Name().ToCString()] = s
        ex.Next()
    return solids


def bbox(shape):
    b = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape, b, False, False)
    p, q = b.CornerMin(), b.CornerMax()
    return (p.X(), p.Y(), p.Z()), (q.X(), q.Y(), q.Z())


def edges(shape):
    ex = TopExp_Explorer(shape, TopAbs_EDGE)
    while ex.More():
        yield TopoDS.Edge(ex.Current())
        ex.Next()


class Writer:
    """Él -> DXF elem. A to2d leképezi a 3D pontot a rajz síkjára; a kör tengelyének előjele dönti el az ív irányát."""

    def __init__(self, to2d, normal_sign):
        self.doc = ezdxf.new('R2000', units=4, setup=True)
        self.doc.header['$MEASUREMENT'] = 1
        self.doc.layers.add('REJTETT', color=8, linetype='DASHED')
        self.msp = self.doc.modelspace()
        self.to2d, self.normal_sign = to2d, normal_sign
        self.seen = set()
        self.n = 0

    def _key(self, *vals):
        k = tuple(round(v, 4) + 0.0 for v in vals)
        if k in self.seen:
            return False
        self.seen.add(k)
        return True

    def add(self, edge, layer='0'):
        c = BRepAdaptor_Curve(edge)
        u0, u1 = c.FirstParameter(), c.LastParameter()
        a, b = self.to2d(c.Value(u0)), self.to2d(c.Value(u1))
        t = c.GetType()
        if t == GeomAbs_Line:
            if math.dist(a, b) < 1e-4:
                return
            p, q = sorted([a, b])
            if self._key(0, *p, *q):
                self.msp.add_line(p, q, dxfattribs={'layer': layer})
                self.n += 1
            return
        if t == GeomAbs_Circle:
            circ = c.Circle()
            ax = circ.Axis().Direction()
            s = self.normal_sign(ax)
            if s is not None:  # a kör síkja párhuzamos a rajz síkjával -> valódi kör / ív
                cen, r = self.to2d(circ.Location()), circ.Radius()
                if abs(u1 - u0 - 2 * math.pi) < 1e-6:
                    if self._key(1, *cen, r):
                        self.msp.add_circle(cen, r, dxfattribs={'layer': layer})
                        self.n += 1
                    return
                angs = [math.degrees(math.atan2(p[1] - cen[1], p[0] - cen[0])) % 360 for p in (a, b)]
                if s < 0:
                    angs.reverse()
                if self._key(2, *cen, r, *angs):
                    # ív = egyszakaszos, domború (bulge) LWPOLYLINE, ahogy a Fusion is írja; így a
                    # tools/dxf_preview.js is pontos befoglaló méretet számol (az ARC-ot teljes körnek veszi)
                    sweep = (angs[1] - angs[0]) % 360 or 360
                    p0, p1 = [(cen[0] + r * math.cos(math.radians(t)), cen[1] + r * math.sin(math.radians(t))) for t in angs]
                    self.msp.add_lwpolyline([(*p0, 0, 0, math.tan(math.radians(sweep) / 4)), (*p1, 0, 0, 0)],
                                            format='xyseb', dxfattribs={'layer': layer})
                    self.n += 1
                return
        # minden más (élre látott kör, ellipszis, B-spline): sokszögvonal
        d = GCPnts_QuasiUniformDeflection(c, DEFLECTION, u0, u1)
        pts = [self.to2d(d.Value(i)) for i in range(1, d.NbPoints() + 1)] if d.IsDone() else [a, b]
        clean = [pts[0]]
        for p in pts[1:]:
            if math.dist(p, clean[-1]) > 1e-5:
                clean.append(p)
        if len(clean) < 2 or max(math.dist(clean[0], p) for p in clean) < 1e-4:
            return
        k = tuple(sorted([tuple(clean[0]), tuple(clean[-1])])) + (len(clean), round(sum(p[0] + p[1] for p in clean), 3))
        if self._key(3, *[x for p in k[:2] for x in p], *k[2:]):
            closed = math.dist(clean[0], clean[-1]) < 1e-5
            self.msp.add_lwpolyline(clean[:-1] if closed else clean, close=closed, dxfattribs={'layer': layer})
            self.n += 1


def project(shape, view):
    (n, x) = VIEWS[view]
    ax2 = gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(*n), gp_Dir(*x))
    algo = HLRBRep_Algo()
    algo.Add(shape)
    algo.Projector(HLRAlgo_Projector(ax2))
    algo.Update()
    algo.Hide()
    hs = HLRBRep_HLRToShape(algo)
    # a HLR eredmény már a vetítősík saját koordinátáiban van (x, y, 0)
    w = Writer(lambda p: (p.X() + 0.0, p.Y() + 0.0), lambda d: 1 if d.Z() > 1 - TOL else (-1 if d.Z() < -1 + TOL else None))
    groups = [('0', [hs.VCompound(), hs.Rg1LineVCompound(), hs.OutLineVCompound()]),
              ('REJTETT', [hs.HCompound(), hs.Rg1LineHCompound(), hs.OutLineHCompound()])]
    for layer, comps in groups:
        for comp in comps:
            if comp is None or comp.IsNull():
                continue
            for e in edges(comp):
                w.add(e, layer)
    return w


def section(shape):
    (_, _, z0), (_, _, z1) = bbox(shape)
    zm = (z0 + z1) / 2
    sec = BRepAlgoAPI_Section(shape, gp_Pln(gp_Pnt(0, 0, zm), gp_Dir(0, 0, 1)), False)
    sec.ComputePCurveOn1(False)
    sec.Approximation(False)
    sec.Build()
    w = Writer(lambda p: (p.X() + 0.0, p.Y() + 0.0), lambda d: 1 if d.Z() > 1 - TOL else (-1 if d.Z() < -1 + TOL else None))
    for e in edges(sec.Shape()):
        w.add(e)
    return w, zm


def render_png(dxf_path, png_path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from ezdxf.addons.drawing import Frontend, RenderContext
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
    from ezdxf.addons.drawing.config import Configuration, BackgroundPolicy, ColorPolicy
    doc = ezdxf.readfile(dxf_path)
    fig = plt.figure(figsize=(8, 8), dpi=150)
    axx = fig.add_axes([0, 0, 1, 1])
    cfg = Configuration(background_policy=BackgroundPolicy.WHITE, color_policy=ColorPolicy.BLACK)
    Frontend(RenderContext(doc), MatplotlibBackend(axx), config=cfg).draw_layout(doc.modelspace(), finalize=True)
    fig.savefig(png_path, facecolor='white')
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('parts', nargs='*', default=DEFAULT_PARTS)
    ap.add_argument('--step', default=STEP)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--png', help='ide rajzol PNG-előnézetet minden DXF-ből')
    a = ap.parse_args()
    t0 = time.time()
    solids = load_solids(a.step)
    print('STEP beolvasva (%d test) %.1f s' % (len(solids), time.time() - t0))
    for part in a.parts:
        if part not in solids:
            sys.exit('Nincs ilyen test a STEP-ben: %s (van: %s)' % (part, ', '.join(sorted(solids))))
        shape = solids[part]
        name = part.lower().replace(' ', '_')
        d = os.path.join(a.out, name)
        os.makedirs(d, exist_ok=True)
        lo, hi = bbox(shape)
        print('%s: %.1f × %.1f × %.1f mm' % (part, hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))
        jobs = [(v, lambda v=v: (project(shape, v), None)) for v in VIEWS] + [('metszet', lambda: section(shape))]
        for view, fn in jobs:
            t = time.time()
            w, extra = fn()
            path = os.path.join(d, '%s_%s.dxf' % (name, view))
            w.doc.saveas(path)
            print('  %-8s %4d elem  %.1f s%s' % (view, w.n, time.time() - t, '  (Z = %.2f)' % extra if extra is not None else ''))
            if a.png:
                os.makedirs(a.png, exist_ok=True)
                render_png(path, os.path.join(a.png, '%s_%s.png' % (name, view)))
    print('Kész, %.1f s' % (time.time() - t0))


if __name__ == '__main__':
    main()
