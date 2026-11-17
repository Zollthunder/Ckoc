# -*- coding: utf-8 -*-
"""C-kocka – hőszámítás (teljesítménymérleg + egyszerű hőellenállás-modell).

Futtatás (a repo gyökeréből):   python tools/hokezeles.py
Csak a szabványos Python-könyvtárat használja. A méreteket a 3d/c-kocka.step fájlból olvassa
(csak olvasás, Fusion nélkül); ha a fájl nincs meg, a dokumentált értékekkel számol.

Minden feltevés itt, a PARAMÉTEREK részben van, forrással vagy indoklással. Az eredmény becslés:
a prototípuson mérni kell (vcgencmd measure_temp + egy hőmérő a cellán), és a modellt ahhoz igazítani.
Részletes magyarázat: HOKEZELES.md
"""
import math
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEP = os.path.join(ROOT, '3d', 'c-kocka.step')

# =============================================================================================
# 1. MÉRETEK A STEP-BŐL (testenkénti befoglaló doboz, mm; y = függőleges, z = előre)
# =============================================================================================


def step_bboxes(path):
    """Testenként a befoglaló doboz a STEP pontjaiból. Egyszerű, a Fusion-exporthoz elég."""
    txt = open(path, encoding='latin-1').read()
    ents = {int(m.group(1)): m.group(2)
            for m in re.finditer(r"#(\d+)=(.*?);\s*(?=#\d+=|ENDSEC)", txt, re.S)}
    pts = {}
    for k, v in ents.items():
        if v.startswith('CARTESIAN_POINT'):
            n = re.findall(r"[-\d.]+(?:E[-+]?\d+)?", v.split(',(', 1)[1])
            pts[k] = tuple(float(x) for x in n[:3])
    out = {}
    for k, v in ents.items():
        m = re.match(r"(?:MANIFOLD_SOLID_BREP|BREP_WITH_VOIDS)\('([^']*)'", v)
        if not m:
            continue
        seen, stack, acc = set(), [k], []
        while stack:
            e = stack.pop()
            if e in seen:
                continue
            seen.add(e)
            if e in pts:
                acc.append(pts[e])
                continue
            s = ents.get(e, '')
            if s.startswith(('AXIS2_PLACEMENT', 'DIRECTION')):
                continue
            stack.extend(int(x) for x in re.findall(r"#(\d+)", s))
        if acc:
            xs, ys, zs = zip(*acc)
            out[m.group(1)] = ((min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs)))
    return out


GEO = {  # tartalék értékek (DESIGN.md / GYARTASI_TERV.md), ha nincs STEP
    'el': 90.0, 'tetolap': 72.0, 'pi_teteje': 63.3, 'bonnet_alja': 71.8,
    'ups_teteje': 54.3, 'pi_alja': 57.3, 'forras': 'dokumentált értékek (STEP nem található)'}
if os.path.exists(STEP):
    bb = step_bboxes(STEP)
    try:
        h, t = bb['Haz (SLS)'], bb['Tetolap']
        pi, bon = bb['Raspberry Pi Zero 2 W'], bb['Voice Bonnet (2 mikrofon + sztereo hang)']
        ups = bb['UPS + 18650 akku']
        GEO.update(el=h[0][1] - h[0][0], tetolap=t[0][1] - t[0][0], pi_teteje=pi[1][1], pi_alja=pi[1][0],
                   bonnet_alja=bon[1][0], ups_teteje=ups[1][1], forras='3d/c-kocka.step')
    except KeyError as e:
        GEO['forras'] += f' (hiányzó test a STEP-ben: {e})'

L = GEO['el'] / 1000          # kockaél, m
R_EL = 0.009                  # élek lekerekítése, m (DESIGN.md: 9 mm)
FAL = 0.0025                  # SLS PA12 falvastagság, m (GYARTASI_TERV.md)
BELSO = L - 2 * FAL           # belső méret, m
TETO = GEO['tetolap'] / 1000  # alu tetőlap oldala, m
TETONYILAS = 0.060            # a ház tetején a 60×60-as nyílás a tetőlap alatt (GYARTASI_TERV.md)
TETOTARTO = 0.006             # PETG tetőtartó vastagsága (STEP: y 80,3–86,3)
TETO_LEGRES = 0.0025          # légrés a tetőtartó és a tetőlap közt (STEP: 86,3 → 88,8)
KEMENY_H = 0.075              # kéménymagasság: alsó szellőző (y≈2) → hátsó felső szellőző (y≈78), m

# Külső felületek a lekerekített kockán (sík lapok + negyedhengeres élek + nyolcadgömb sarkok)
_lap = (L - 2 * R_EL) ** 2
_el = math.pi / 2 * R_EL * (L - 2 * R_EL)
_sarok = 4 * math.pi * R_EL ** 2 / 8
A_TETO = _lap                                   # a felső sík lap = pont a 72×72-es alu tetőlap
A_ALJ = _lap                                    # az asztal felé néző sík alj
A_OLDAL = 4 * _lap + 12 * _el + 8 * _sarok      # oldalak + minden él és sarok (szabadon áll a levegőn)
A_OSSZ = A_TETO + A_ALJ + A_OLDAL
SKALA_BE = (BELSO / L) ** 2                     # belső felület ≈ külső × (85/90)²

# =============================================================================================
# 2. PARAMÉTEREK (anyag, hőátadás, határértékek)
# =============================================================================================
K_PA12 = 0.22      # W/mK, SLS PA12 (gyártói adatlapok 0,14–0,3 között; a fal ellenállása így is kicsi)
K_PETG = 0.20      # W/mK
K_LEV = 0.026      # W/mK, levegő
EPS_FESTETT = 0.90  # festett / színezett PA12 emissziós tényezője
EPS_ELOX = 0.85     # eloxált alumínium (a nyers, fényes alu csak ~0,05 lenne!)
SIGMA = 5.67e-8
H_BE = 5.0          # W/m²K, belső levegő → fal: ~3 természetes konvekció + ~2 belső sugárzás
ASZTAL_RES = 0.0015  # a kocka alja és az asztal közt: gumitalp/gumisarok 1,5 mm
K_ASZTAL = 0.15      # fa / bútorlap, W/mK

# Határértékek
PI_FOJT = 80.0       # °C – a Pi Zero 2 W SoC-ja itt kezd fojtani (órajelet csökkent)
PI_CEL = 70.0        # °C – tervezési cél: 10 K tartalék a fojtásig
CELLA_TOLT = 45.0    # °C – Li-ion töltés felső határa (tipikus 18650 adatlap: 0…45 °C)
CELLA_CEL = 40.0     # °C – tervezési cél a cellára (öregedés: tartósan 40 °C fölött gyorsan öregszik)
CELLA_KISUT = 60.0   # °C – kisütés felső határa (tipikus adatlap)
PETG_TG = 75.0       # °C – a PETG szán/tartók üvegesedési hőmérséklete ~80 °C, 5 K tartalékkal

# Pi SoC: hőellenállás a SoC-tól a körülötte lévő levegőig (becslés, a prototípuson kalibrálni!)
R_PI_SZABAD = 15.0   # K/W – csupasz Zero 2 W szabad levegőn (3 W-on ~45 K melegedés: fojtás közelében, ahogy a tesztekben)
SZENDVICS = 1.3      # a Pi a UPS-panel (3 mm) és a Voice Bonnet (8,5 mm) közé szorul: rosszabb konvekció
BORDA = 0.75         # kis ragasztható alu hűtőborda (14×14×5 mm) a SoC-on: ~25 %-kal kisebb ellenállás
RETEG = 1.15         # rétegződés: a kocka tetején (Pi, Bonnet) a levegő ~15 %-kal melegebb az átlagnál
# Cella: saját hő + a közvetlenül alatta lévő UPS-panel veszteségének egy része
R_CELLA = 25.0       # K/W – cella + TPU bölcső → levegő (vezetéssel a panel felé is)
UPS_CSATOLAS = 0.25  # a UPS-panel veszteségének ekkora része jut a cellába

# Szellőzés (kéményhatás)
CD_SZOVET = 0.35     # kiömlési tényező keskeny (1,2 mm-es) rések vagy porvédő háló mögött (nyitott furatnál ~0,6)
RHO, CP, G = 1.16, 1007.0, 9.81

# Hőkapacitás (tranziens): tömeg × fajhő, J/K
HOKAPACITAS = {
    'SLS PA12 ház (79 g)': 0.079 * 1700, 'alsó tálca (~30 g PA12)': 0.030 * 1700,
    'PETG szán és tartók (~60 g)': 0.060 * 1200, 'alu tetőlap (28 g)': 0.028 * 900,
    '18650 cella (47 g)': 0.047 * 900, 'NYÁK-ok, modulok (~45 g)': 0.045 * 900,
    'hangszórók (2×12 g)': 0.024 * 600, 'gumisarkok, akril (~25 g)': 0.025 * 1500,
}
C_TH = sum(HOKAPACITAS.values())

# =============================================================================================
# 3. TELJESÍTMÉNYFELVÉTEL ÜZEMMÓDONKÉNT
# =============================================================================================
N_GYURU, N_C = 24, 7                 # NeoPixel Ring 24 + 7 LED-es S-szalag (firmware/xiao/code.py)
I_CSAT = 0.012                       # A/csatorna teljes kivezérlésnél (WS2812B/SK6812 adatlap ~12 mA)
I_CSAT_MAX = 0.020                   # A/csatorna – Adafruit-ökölszabály (60 mA/LED fehér), legrosszabb eset
I_NYUGALMI = 0.0008                  # A/LED akkor is, ha sötét (a WS2812 IC saját fogyasztása)
ETA_BOOST = 0.88                     # UPS-panel 3,7 → 5 V feszültségnövelő hatásfoka
ETA_ERSITO = 0.85                    # a WM8960 D-osztályú erősítő hatásfoka
I_TOLT, U_CELLA, ETA_TOLTO, R_BELSO = 1.0, 3.9, 0.90, 0.06   # töltés: 1 A, 3,9 V átlag, 90 %, 60 mΩ


def hsv_osszeg(hue):
    """A firmware hsv() függvénye teljes telítettséggel: R+G+B csatornák összege v egységben."""
    h = (hue % 360) / 60
    f = h - int(h)
    return 1 + (f if int(h) % 2 == 0 else 1 - f)     # pl. Sunny (45°): 1,75; tiszta sárga (60°): 2,0


def led_W(mod, fenyero, hue=45, i_csat=None):
    """LED-ek elektromos teljesítménye (W, 5 V) a firmware/xiao/code.py draw_leds() logikája szerint."""
    i_csat = I_CSAT if i_csat is None else i_csat
    nyug = (N_GYURU + N_C) * I_NYUGALMI * 5
    if mod == 'ki':
        return nyug
    if mod == 'allando':               # ring: 0,85·b, C-szalag: b
        ertek = hsv_osszeg(hue) * fenyero * (N_GYURU * 0.85 + N_C)
    elif mod == 'party':               # ütemre villan 1,0-ról 0,35-re ~0,1–0,2 s alatt → átlag ≈ 0,45; a színek forognak → átlag 1,5
        ertek = 1.5 * fenyero * 0.45 * (N_GYURU + N_C)
    else:
        raise ValueError(mod)
    return nyug + ertek * i_csat * 5


def teljesitmeny(mod, fenyero=0.8, pi_party=None, takarek=False, pi_hallg=None, kamera=None, i_tolt=None):
    """Visszaad: (5 V-os fogyasztók dict, a dobozban keletkező összes hő W, az akkuból/USB-ről felvett W, pi_W, cella_hő, ups_veszteseg).
    pi_party: szoftveres felső korlát a Pi-re party módban (W); takarek: töltés közben LED ≤ 0,08 és a kamera szünetel;
    pi_hallg: a Pi hallgatás közben (W), ha takarékos ébresztőszó-figyelő és csak változáskor rajzolt arc fut;
    kamera: a kamera átlagos teljesítménye (W), ha két „pillantás” közt leáll; i_tolt: töltőáram (A)."""
    # Pi Zero 2 W: üresjárat Wi-Fivel ~0,6 W, magonként ~+0,6 W, 4 mag 100 % ~3 W.
    # A kamera a firmware-ben folyamatosan fut (hw_real.py: LocalCamera csak fejjel lefelé áll le), party alatt is.
    M = {  # Pi, hangszóró (elektromos), kamera, kijelző, LED-mód + hue, töltés
        'alvas':          dict(pi=0.75, spk=0.0, cam=0.0, kij=0.01, led=('ki', 0), tolt=False),
        'alvas_tolt':     dict(pi=0.75, spk=0.0, cam=0.0, kij=0.01, led=('ki', 0), tolt=True),
        'hallgatas':      dict(pi=1.30, spk=0.0, cam=0.25, kij=0.10, led=('allando', 45), tolt=False),
        'hallgatas_tolt': dict(pi=1.30, spk=0.0, cam=0.25, kij=0.10, led=('allando', 45), tolt=True),
        'party':          dict(pi=1.90, spk=0.40, cam=0.25, kij=0.10, led=('party', 0), tolt=False),
        'party_tolt':     dict(pi=1.90, spk=0.40, cam=0.25, kij=0.10, led=('party', 0), tolt=True),
        'csucs':          dict(pi=3.00, spk=1.00, cam=0.25, kij=0.10, led=('allando', 60), tolt=True),
    }[mod]
    f = 1.0 if mod == 'csucs' and fenyero == 0.8 else fenyero   # csúcs: 100 %-os fényerő, legrosszabb szín
    ic = I_CSAT_MAX if mod == 'csucs' else None
    if pi_party is not None and mod.startswith('party'):
        M['pi'] = min(M['pi'], pi_party)
    if pi_hallg is not None and mod.startswith('hallgatas'):
        M['pi'] = min(M['pi'], pi_hallg)
    if kamera is not None and mod != 'csucs':
        M['cam'] = min(M['cam'], kamera)
    if takarek and M['tolt'] and mod != 'csucs':
        f, M['cam'] = min(f, 0.08), 0.0
    i_t = I_TOLT if i_tolt is None or mod == 'csucs' else i_tolt
    p5 = {
        'Raspberry Pi Zero 2 W': M['pi'],
        'Voice Bonnet (kodek, mikrofonok)': 0.05 if mod.startswith('alvas') else 0.06,
        'hangszórók (elektromos)': M['spk'],
        'erősítő-veszteség': M['spk'] * (1 / ETA_ERSITO - 1),
        'kamera (OV5647)': M['cam'],
        'kerek kijelző + háttérfény': M['kij'],
        'XIAO RP2040': 0.10,
        'LED-ek (31 db WS2812)': led_W(M['led'][0], f, M['led'][1], ic),
        'IMU, rezgés, érintés': 0.01,
    }
    s5 = sum(p5.values())
    ups = s5 * (1 / ETA_BOOST - 1)
    cella = 0.0
    felvett = s5 / ETA_BOOST
    if M['tolt']:
        p_cella = i_t * U_CELLA
        ups += p_cella * (1 / ETA_TOLTO - 1)
        cella = i_t ** 2 * R_BELSO + 0.02 * i_t       # Joule-hő + kis reverzibilis hő
        felvett += p_cella / ETA_TOLTO
    # Szinte minden hővé válik a dobozban (a hangszóró akusztikus hatásfoka < 1 %, a LED fényének nagy
    # részét az opál akril is elnyeli) → konzervatívan minden elektromos teljesítmény belső hő.
    ho = s5 + ups + cella
    return p5, ho, felvett, M['pi'], cella, ups


# =============================================================================================
# 4. HŐELLENÁLLÁS-HÁLÓZAT: belső levegő → falak → szoba (+ kéményhatás, ha van szellőző)
# =============================================================================================


def h_kulso(ts, ta, irany, eps, jell):
    """Természetes konvekció (lamináris, levegő) + sugárzás, W/m²K."""
    dt = max(ts - ta, 0.01)
    c = {'fuggoleges': 1.42, 'felfele': 1.32}[irany]
    tk, ak = ts + 273.15, ta + 273.15
    return c * (dt / jell) ** 0.25 + eps * SIGMA * (tk ** 2 + ak ** 2) * (tk + ak)


def felulet_aram(t_be, ta, R_be, A_ki, irany, eps, jell, asztal=False):
    """Egy fal hőárama adott belső hőmérsékletnél: a külső felület hőmérsékletét felezéssel keresi."""
    lo, hi = ta, t_be
    for _ in range(60):
        ts = (lo + hi) / 2
        q_be = (t_be - ts) / R_be
        if asztal:   # 1,5 mm légrés (vezetés + sugárzás) + szétterülési ellenállás a falapban
            h_res = K_LEV / ASZTAL_RES + 4 * EPS_FESTETT * SIGMA * (ta + 273.15) ** 3
            R_ki = 1 / (h_res * A_ki) + 1 / (4 * K_ASZTAL * math.sqrt(A_ki / math.pi))
            q_ki = (ts - ta) / R_ki
        else:
            q_ki = (ts - ta) * A_ki * h_kulso(ts, ta, irany, eps, jell)
        if q_be > q_ki:
            lo = ts
        else:
            hi = ts
    return q_be


def falak(haz='SLS'):
    """A falak belső ellenállásai (belső konvekció + fal) és külső adatai."""
    if haz == 'SLS':
        k_fal, t_fal, eps_old = K_PA12, FAL, EPS_FESTETT
    else:  # 90×90-es alu zártszelvény, 4 mm fal, eloxálva (GYARTASI_TERV.md: ezt vetettük el a súly miatt)
        k_fal, t_fal, eps_old = 200.0, 0.004, EPS_ELOX
    a_old_be = A_OLDAL * SKALA_BE
    oldal = dict(R_be=1 / (H_BE * a_old_be) + t_fal / (k_fal * a_old_be), A_ki=A_OLDAL,
                 irany='fuggoleges', eps=eps_old, jell=L)
    # Tető: a 60×60-as nyíláson át (PETG tetőtartó + légrés), és a perem körül (PA12 fal) jut a hő az alu tetőlapba
    a_ny = TETONYILAS ** 2
    a_perem = BELSO ** 2 - a_ny
    g_ny = 1 / (1 / (H_BE * a_ny) + TETOTARTO / (K_PETG * a_ny) + TETO_LEGRES / (K_LEV * a_ny))
    g_perem = 1 / (1 / (H_BE * a_perem) + t_fal / (k_fal * a_perem))
    teto = dict(R_be=1 / (g_ny + g_perem), A_ki=A_TETO, irany='felfele', eps=EPS_ELOX, jell=TETO / 4)
    a_alj_be = A_ALJ * SKALA_BE
    alj = dict(R_be=1 / (H_BE * a_alj_be) + FAL / (K_PA12 * a_alj_be), A_ki=A_ALJ, irany='fuggoleges',
               eps=EPS_FESTETT, jell=L, asztal=True)
    return {'oldalfalak + élek': oldal, 'tető (alu lap)': teto, 'alj (asztalon)': alj}


def kemeny_W(dt, ta, a_be, a_ki):
    """Kéményhatás: a meleg belső levegő felül kiáramlik, alul hideg jön be. W."""
    if a_be <= 0 or a_ki <= 0 or dt <= 0:
        return 0.0
    a_eff = 1 / math.sqrt(1 / a_be ** 2 + 1 / a_ki ** 2)
    v = math.sqrt(2 * G * KEMENY_H * dt / (ta + 273.15))
    return RHO * CP * CD_SZOVET * a_eff * v * dt


def belso_homerseklet(p, ta, haz='SLS', szell_mm2=0.0, reszletes=False):
    """Állandósult belső (átlagos) léghőmérséklet P watt hőnél. szell_mm2: be- ÉS kimenet területe külön-külön."""
    F = falak(haz)
    a = szell_mm2 * 1e-6

    def eloszt(t_be):
        q = {n: felulet_aram(t_be, ta, **f) for n, f in F.items()}
        q['szellőzés (kéményhatás)'] = kemeny_W(t_be - ta, ta, a, a)
        return q
    lo, hi = ta, ta + 300
    for _ in range(60):
        mid = (lo + hi) / 2
        if sum(eloszt(mid).values()) < p:
            lo = mid
        else:
            hi = mid
    return (mid, eloszt(mid)) if reszletes else mid


# =============================================================================================
# 5. VÁLTOZATOK ÉS KIÉRTÉKELÉS
# =============================================================================================
MODOK = [('alvas', 'Alvás (kijelző és LED ki, ébresztőszó figyel)'),
         ('alvas_tolt', 'Alvás + töltés (éjszakai töltés)'),
         ('hallgatas', 'Hallgatás / készenlét (arc, LED állandó)'),
         ('hallgatas_tolt', 'Hallgatás + töltés (asztalon, kábelen)'),
         ('party', 'Beszéd + party-fények, zene'),
         ('party_tolt', 'Party + töltés'),
         ('csucs', 'Csúcs: 4 mag 100 %, LED 100 % fehérhez közeli, hangos zene, töltés')]

VALTOZATOK = {
    'A': dict(nev='A – mostani terv: zárt SLS ház, alu tető, LED 0,8 (firmware-alap), csupasz Pi',
              haz='SLS', szell=0, fenyero=0.8, borda=False),
    'B': dict(nev='B – mint A, de 90×90-es alu zártszelvény ház (összehasonlítás)',
              haz='ALU', szell=0, fenyero=0.8, borda=False),
    'C': dict(nev='C – csak szoftver (zárt ház): LED ≤ 0,25; kamera csak pillantáskor; takarékos hallgatás (Pi 1,0 W); '
                  'party alatt Pi ≤ 1,5 W; töltés közben LED ≤ 0,08, kamera szünetel',
              haz='SLS', szell=0, fenyero=0.25, borda=False, pi_party=1.5, takarek=True, pi_hallg=1.0, kamera=0.05),
    'D': dict(nev='D – (eredeti javaslat) C + 2×300 mm² szellőző (alul be, hátul felül ki) + hűtőborda a SoC-on + 0,5 A-es töltés',
              haz='SLS', szell=300, fenyero=0.25, borda=True, pi_party=1.5, takarek=True, pi_hallg=1.0, kamera=0.05,
              i_tolt=0.5),
    # 2026-11-17: a Pi-Ener-lite kézikönyve szerint a töltőáram fix 1 A (nem állítható) → a D 0,5 A-es töltése nem
    # valósul meg. A LED-korlát a kompatibilitás-ellenőrzés szerint ≤ 30 % (a 31 LED tápja közvetlenül a UPS-ről).
    'E': dict(nev='E – D a Pi-Ener-lite-tal: fix 1 A-es töltés, LED ≤ 0,30 (szoftver + 2×300 mm² + borda)',
              haz='SLS', szell=300, fenyero=0.30, borda=True, pi_party=1.5, takarek=True, pi_hallg=1.0, kamera=0.05,
              i_tolt=1.0),
    'F': dict(nev='F – JAVASOLT a Pi-Ener-lite-hoz: E + 2×600 mm² szellőző + töltés közben alszik a kocka '
                  '(kijelző, LED ki; ébresztőszóra felébred)',
              haz='SLS', szell=600, fenyero=0.30, borda=True, pi_party=1.5, takarek=True, pi_hallg=1.0, kamera=0.05,
              i_tolt=1.0, tolt_alvas=True),
}


def kiertekel(v, mod, ta):
    if v.get('tolt_alvas') and mod in ('hallgatas_tolt', 'party_tolt'):
        mod = 'alvas_tolt'       # töltés közben a szoftver alvó módba teszi a kockát (rövid ébredés: lásd 9. pont)
    p5, ho, felvett, pi_w, cella_w, ups_w = teljesitmeny(mod, v['fenyero'], v.get('pi_party'), v.get('takarek', False),
                                                         v.get('pi_hallg'), v.get('kamera'), v.get('i_tolt'))
    t_be = belso_homerseklet(ho, ta, v['haz'], v['szell'])
    dt = t_be - ta
    r_pi = R_PI_SZABAD * SZENDVICS * (BORDA if v['borda'] else 1.0)
    t_pi = ta + RETEG * dt + pi_w * r_pi
    t_cella = t_be + (cella_w + UPS_CSATOLAS * ups_w) * R_CELLA
    return dict(ho=ho, felvett=felvett, t_be=t_be, t_pi=t_pi, t_cella=t_cella, toltes=mod.endswith('tolt') or mod == 'csucs')


def jel(ertek, cel, hatar):
    return '✅' if ertek <= cel else ('⚠️' if ertek <= hatar else '❌')


def main():
    print('C-kocka – hőszámítás (tools/hokezeles.py)\n')
    print(f'Méretek forrása: {GEO["forras"]}')
    print(f'  kockaél {GEO["el"]:.1f} mm, alu tetőlap {GEO["tetolap"]:.1f} mm, '
          f'Pi teteje → Bonnet alja {GEO["bonnet_alja"] - GEO["pi_teteje"]:.1f} mm, '
          f'UPS teteje → Pi alja {GEO["pi_alja"] - GEO["ups_teteje"]:.1f} mm')
    print(f'  külső felület: összesen {A_OSSZ * 1e4:.0f} cm² (oldalak+élek {A_OLDAL * 1e4:.0f}, '
          f'tető {A_TETO * 1e4:.0f}, alj {A_ALJ * 1e4:.0f})')
    print(f'  hőkapacitás ≈ {C_TH:.0f} J/K\n')

    # --- teljesítménymérleg
    print('## 1. Teljesítménymérleg (W) – firmware-alap fényerő 0,8; LED 12 mA/csatorna')
    fej = ['fogyasztó'] + [m for m, _ in MODOK]
    sorok = {}
    tot = {}
    for m, _ in MODOK:
        p5, ho, felvett, *_r, ups = teljesitmeny(m)
        for k, w in p5.items():
            sorok.setdefault(k, {})[m] = w
        sorok.setdefault('UPS: boost + töltő veszteség', {})[m] = ups
        sorok.setdefault('cella saját hője (töltés)', {})[m] = _r[1]
        tot[m] = (ho, felvett)
    print('| ' + ' | '.join(fej) + ' |')
    print('|' + '---|' * len(fej))
    for k, d in sorok.items():
        print(f'| {k} | ' + ' | '.join(f'{d[m]:.2f}' for m, _ in MODOK) + ' |')
    print('| **belső hő összesen** | ' + ' | '.join(f'**{tot[m][0]:.2f}**' for m, _ in MODOK) + ' |')
    print('| felvett (akku vagy USB) | ' + ' | '.join(f'{tot[m][1]:.2f}' for m, _ in MODOK) + ' |')
    print('\nAkkus üzemidő (10,8 Wh cella, 90 % kihasználható):')
    for m in ('alvas', 'hallgatas', 'party'):
        for f in (0.8, 0.25):
            _, _, felvett, *_ = teljesitmeny(m, f)
            print(f'  {m:10s} LED {f:.2f}: {felvett:.2f} W → {10.8 * 0.9 / felvett:4.1f} óra')
    _, _, felvett, *_ = teljesitmeny('csucs')
    print(f'  csúcs 5 V-os áram: {(felvett - I_TOLT * U_CELLA / ETA_TOLTO) * ETA_BOOST / 5:.2f} A '
          f'(a UPS-panel ~2,5 A-t tud)\n')

    # --- hőmérsékletek
    print('## 2. Állandósult hőmérsékletek (°C): belső levegő / Pi SoC / akkucella')
    print(f'Korlátok: Pi fojt {PI_FOJT:.0f} (cél ≤ {PI_CEL:.0f}), cella töltés ≤ {CELLA_TOLT:.0f} '
          f'(cél ≤ {CELLA_CEL:.0f}), kisütés ≤ {CELLA_KISUT:.0f} (cél ≤ 45), belső levegő cél ≤ 50, PETG ≤ {PETG_TG:.0f}')
    print('Jelek: ✅ a célon belül · ⚠️ a cél fölött, de a határon belül · ❌ a határ fölött')
    for vk, v in VALTOZATOK.items():
        print(f'\n### {v["nev"]}')
        print('| üzemmód | hő W | 25 °C: levegő / Pi / cella | 35 °C: levegő / Pi / cella |')
        print('|---|---|---|---|')
        for m, nev in MODOK:
            cells = []
            for ta in (25, 35):
                r = kiertekel(v, m, ta)
                chat = CELLA_TOLT if r['toltes'] else CELLA_KISUT
                ccel = CELLA_CEL if r['toltes'] else 45.0
                cells.append(f'{r["t_be"]:.0f} {jel(r["t_be"], 50, PETG_TG)} / {r["t_pi"]:.0f} '
                             f'{jel(r["t_pi"], PI_CEL, PI_FOJT)} / {r["t_cella"]:.0f} {jel(r["t_cella"], ccel, chat)}')
            print(f'| {nev} | {kiertekel(v, m, 25)["ho"]:.1f} | ' + ' | '.join(cells) + ' |')

    # --- hőáram-megoszlás
    print('\n## 3. Merre megy a hő? (A változat, hallgatás, 25 °C)')
    _, ho, *_ = teljesitmeny('hallgatas')
    t, q = belso_homerseklet(ho, 25, 'SLS', 0, reszletes=True)
    for n, w in q.items():
        print(f'  {n:28s} {w:5.2f} W ({w / ho * 100:3.0f} %)')
    print(f'  egyenértékű hőellenállás (zárt SLS): {(t - 25) / ho:.1f} K/W  →  '
          f'k = {ho / ((t - 25) * A_OSSZ):.1f} W/m²K (ipari ökölszabály műanyag dobozra: ~3,5)')
    for haz in ('SLS', 'ALU'):
        F = falak(haz)
        print(f'  {haz}: belső konvekció + fal ellenállása: ' +
              ', '.join(f'{n} {f["R_be"]:.1f} K/W' for n, f in F.items()))

    # --- szellőző méretezés
    print('\n## 4. Szellőző mérete (be- és kimenet külön-külön, keskeny résekkel) – C/D szoftverbeállítás, hallgatás, 35 °C')
    _, ho, *_ = teljesitmeny('hallgatas', 0.25, pi_hallg=1.0, kamera=0.05)
    for a in (0, 100, 200, 300, 400, 600):
        t, q = belso_homerseklet(ho, 35, 'SLS', a, reszletes=True)
        print(f'  {a:4d} mm²: belső levegő {t:5.1f} °C, ebből a szellőzés {q["szellőzés (kéményhatás)"]:.2f} W visz el')

    # --- tranziens
    print('\n## 5. Időállandó: hidegen bekapcsolva (25 °C) mennyi idő alatt melegszik fel party módban?')
    for vk in ('A', 'D'):
        v = VALTOZATOK[vk]
        r1 = kiertekel(v, 'party', 25)
        R_eff = (r1['t_be'] - 25) / r1['ho']
        tau = R_eff * C_TH
        print(f'  {vk}: τ ≈ {tau / 60:.0f} perc (R ≈ {R_eff:.1f} K/W, C ≈ {C_TH:.0f} J/K); végérték: levegő '
              f'{r1["t_be"]:.0f}, Pi {r1["t_pi"]:.0f}, cella {r1["t_cella"]:.0f} °C')
        for perc in (10, 30, 60, 120):
            m = math.exp(-perc * 60 / tau)       # a Pi saját melegedése 1–2 perc alatt beáll, csak a levegő késik
            dl = (r1['t_be'] - 25) * m
            print(f'      {perc:3d} perc: levegő ≈ {r1["t_be"] - dl:.0f} °C, Pi ≈ {r1["t_pi"] - RETEG * dl:.0f} °C, '
                  f'cella ≈ {r1["t_cella"] - dl:.0f} °C')

    # --- érzékenység
    print('\n## 6. Érzékenység (A és D változat, hallgatás, 35 °C) – mennyire bízhatunk a számban?')
    global H_BE, I_CSAT, R_PI_SZABAD
    alap = (H_BE, I_CSAT, R_PI_SZABAD)
    for cimke, hb, ic, rp in [('alapeset', 5.0, 0.012, 15.0), ('belső h −30 % (3,5)', 3.5, 0.012, 15.0),
                              ('belső h +30 % (6,5)', 6.5, 0.012, 15.0), ('LED 20 mA/csatorna', 5.0, 0.020, 15.0),
                              ('Pi R +30 %', 5.0, 0.012, 19.5)]:
        H_BE, I_CSAT, R_PI_SZABAD = hb, ic, rp
        ra = kiertekel(VALTOZATOK['A'], 'hallgatas', 35)
        rd = kiertekel(VALTOZATOK['D'], 'hallgatas', 35)
        print(f'  {cimke:22s} A: levegő {ra["t_be"]:3.0f} / Pi {ra["t_pi"]:3.0f} / cella {ra["t_cella"]:3.0f}   '
              f'D: levegő {rd["t_be"]:3.0f} / Pi {rd["t_pi"]:3.0f} / cella {rd["t_cella"]:3.0f}')
    H_BE, I_CSAT, R_PI_SZABAD = alap

    # --- hővezető pad
    print('\n## 7. Hővezető pad az alu tetőlaphoz? (D változat, hallgatás, 35 °C)')
    global TETOTARTO, TETO_LEGRES, K_LEV
    mentes = (TETOTARTO, TETO_LEGRES, K_LEV)
    r = kiertekel(VALTOZATOK['D'], 'hallgatas', 35)
    print(f'  mostani: 6 mm PETG tetőtartó + 2,5 mm légrés az alu lap alatt → belső levegő {r["t_be"]:.1f} °C')
    K_LEV = 3.0                                   # a 2,5 mm-es légrést 3 W/mK-s gap pad tölti ki
    r = kiertekel(VALTOZATOK['D'], 'hallgatas', 35)
    print(f'  2,5 mm gap pad (3 W/mK) a tetőtartó és a tetőlap közt → belső levegő {r["t_be"]:.1f} °C')
    K_LEV = mentes[2]
    TETOTARTO, TETO_LEGRES = 0.0, 0.0
    r = kiertekel(VALTOZATOK['D'], 'hallgatas', 35)
    print(f'  elméleti határ: a belső levegő közvetlenül éri az alu lapot → belső levegő {r["t_be"]:.1f} °C')
    TETOTARTO, TETO_LEGRES, K_LEV = mentes

    # --- lépésenként
    print('\n## 8. Mit hoz az egyes lépés külön? (25 °C; levegő / Pi / cella)')
    lepesek = [('A – mostani terv', VALTOZATOK['A']),
               ('csak LED ≤ 0,25', dict(VALTOZATOK['A'], fenyero=0.25)),
               ('C – minden szoftveres lépés', VALTOZATOK['C']),
               ('C + szellőző 2×300 mm²', dict(VALTOZATOK['C'], szell=300)),
               ('C + hűtőborda', dict(VALTOZATOK['C'], borda=True)),
               ('C + 0,5 A-es töltés', dict(VALTOZATOK['C'], i_tolt=0.5)),
               ('D – mind együtt', VALTOZATOK['D'])]
    print('| lépés | hallgatás | hallgatás + töltés | party | party + töltés |')
    print('|---|---|---|---|---|')
    for cimke, v in lepesek:
        cellak = []
        for m in ('hallgatas', 'hallgatas_tolt', 'party', 'party_tolt'):
            r = kiertekel(v, m, 25)
            cellak.append(f'{r["t_be"]:.0f} / {r["t_pi"]:.0f} / {r["t_cella"]:.0f}')
        print(f'| {cimke} | ' + ' | '.join(cellak) + ' |')

    # --- töltés fix 1 A-rel (Pi-Ener-lite)
    print('\n## 9. Töltés fix 1 A-rel (Pi-Ener-lite): mi tartja a cellát 45 °C alatt? (cella °C; Pi °C zárójelben)')
    E = VALTOZATOK['E']
    opciok = [('D – 0,5 A (a Pi-Ener-lite-tal nem lehet)', VALTOZATOK['D']),
              ('E – D, de 1 A, LED ≤ 0,30', E),
              ('E + töltéskor Pi ≤ 1,0 W party alatt', dict(E, pi_party=1.0)),
              ('E + szellőző 2×600 mm²', dict(E, szell=600)),
              ('E + szellőző 2×900 mm²', dict(E, szell=900)),
              ('E + töltés közben alszik', dict(E, tolt_alvas=True)),
              ('F – E + 2×600 mm² + töltés közben alszik', VALTOZATOK['F'])]
    print('| változat | 25 °C: alvás+töltés | hallgatás+töltés | party+töltés | 35 °C: alvás+töltés | hallgatás+töltés |')
    print('|---|---|---|---|---|---|')
    for cimke, v in opciok:
        cellak = []
        for ta, modok in ((25, ('alvas_tolt', 'hallgatas_tolt', 'party_tolt')), (35, ('alvas_tolt', 'hallgatas_tolt'))):
            for m in modok:
                r = kiertekel(v, m, ta)
                cellak.append(f'{r["t_cella"]:.1f} {jel(r["t_cella"], CELLA_CEL, CELLA_TOLT)} ({r["t_pi"]:.0f})')
        print(f'| {cimke} | ' + ' | '.join(cellak) + ' |')
    # Mennyit melegít egy rövid ébredés alvó töltés közben? (τ-modell: a levegő késik, a cella követi)
    F = VALTOZATOK['F']
    r0 = kiertekel(F, 'alvas_tolt', 25)
    r1 = kiertekel(dict(F, tolt_alvas=False), 'party_tolt', 25)
    tau = (r1['t_be'] - 25) / r1['ho'] * C_TH
    for perc in (5, 15, 30):
        d = (r1['t_cella'] - r0['t_cella']) * (1 - math.exp(-perc * 60 / tau))
        print(f'  F, 25 °C: {perc:2d} perc party töltés közben → cella ≈ {r0["t_cella"] + d:.1f} °C '
              f'(alvásból {r0["t_cella"]:.1f}, végérték {r1["t_cella"]:.1f}; τ ≈ {tau / 60:.0f} perc)')
    print(f'  töltési idő: ~2,6 Ah-s cella, 1 A → ~3 óra (a CV-szakasszal együtt)')


if __name__ == '__main__':
    main()
