# C-kocka – gyártási terv alkatrészenként (v0.1, megbeszélésre)

> A [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) szerint: szerszám nélkül, kész alkatrészekből, könnyen szerelhetően, költséghatékonyan.
> A 2D-s alkatrészekhez (lézer, vízvágás, marás) a DXF-eket a döntések után a **90 mm-es** modellből újraexportálom (a mostani `dxf/` mappa még a 80 mm-es változaté).

## Fontos új szempont a házhoz: a súly
A kocka **dobálható**. Egy alumínium ház nehéz és kemény, ami kockázatos egy eldobott tárgynál (asztal, monitor, kolléga 🙂):
- **90×90-es alumínium zártszelvény:** kereskedelemben **4 mm-es fallal** találtam (EN AW-6060/6063). Az oldalfalak így **kb. 330 g**-ot nyomnak, lapok és elektronika nélkül. 2 mm-es falú 90×90-est nem találtam, egyedi extrudálás pedig drága szerszám.
- **SLS / MJF nyomtatott PA12 nejlon ház:** **kb. 120 g**, szívós, rugalmas, ütésálló, **megtartja a lekerekített formát**, és **nem kell hozzá szerszám**. Kis sorozatban (1–100 db) ez a legolcsóbb út a lekerekített házhoz.

**Javaslatom ezért módosul:** a ház legyen **SLS/MJF PA12** (festve vagy festékkel színezve, matt grafit), és az **alumínium csak a tetőlap** legyen (sík lap, egyszerű megmunkálással). Így a „rádiuszos részek gyártása” kérdés is megoldódik szerszám nélkül.

## Alkatrészek és gyártási módjuk
| # | Alkatrész | Anyag | Gyártás | Rajz | Megjegyzés |
|---|---|---|---|---|---|
| 1 | **Ház** (5 oldal egyben, alul nyitott) | PA12 (SLS/MJF), szemcseszórt + mártással színezett (2026-11-17) | 3D nyomtatás (szolgáltató) | 3D (STEP) | benne nyomtatva: hangszórórács, C horony, kijelző- és kameraablak, menetes betétek helye; falvastagság 2,5 mm |
| 2 | **Alsó lap / szánalap** | PETG vagy PA12 | 3D nyomtatás | 3D | erre épül a belső szán; 4 csavarral rögzül a házhoz |
| 3 | **Belső szán** (alváz) | PETG (FDM) | 3D nyomtatás (házon belül is) | 3D | M2,5 menetes betétek a moduloknak |
| 4 | **Tetőlap** 72×72×2 mm | alumínium (EN AW-5754 vagy 6082) | **lézervágás vagy CNC marás** + eloxálás | **DXF** | furatok: 6 mikrofon, 4 gomb, Ø18 betét |
| 5 | **Érintőbetét** Ø17,8×2 mm | opál PMMA (akril) | **lézervágás** | **DXF** | belülről semleges szilikonnal körbe |
| 6 | **C fénycsatorna** | opál PMMA 3 mm | **lézervágás** | **DXF** | kívül síkban, 0,5 mm-rel a fal mögé nyúlik, belülről semleges szilikonnal körbe |
| 7 | **Alsó fénygyűrű-diffúzor** Ø66 | opál PMMA 3 mm | **lézervágás** | **DXF** | 3× M2,5 süllyesztett csavar a tálcához |
| 8 | ~~Kijelzőablak~~ | – | – | – | elhagyva: a kijelző 2,5 mm-re a fal mögött |
| 9 | **Gombsapkák** (4 db, szárral + gallérral) | gyanta (SLA) | 3D nyomtatás | 3D (STL) | 3 színes + az Andor-gomb alapja |
| 10 | **Andor fa betét** Ø6,6 × 2 | fa (bükk/tölgy) | **lézervágás** | **DXF** | préselve az SLA sapka tetejébe |
| 11 | **Gumisarkok** (8 db) | TPU 95A, narancs | 3D nyomtatás | 3D | ragasztva (az egyetlen ragasztás) |
| 12 | **Gumilábak** (4 db) | kész, öntapadós, átlátszó (3M Bumpon-típus) | vásárolt | — | a Ø60-as EPDM gumitalp helyett (2026-11-17, [KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md) M5); a diffúzorcsavarok közé |
| 13 | **Akkubölcső** | TPU | 3D nyomtatás | 3D | ütéscsillapítás |
| 14 | **Előlapi tartó** (kijelző + kamera + C LED-szalag) | PETG | 3D nyomtatás | 3D | egy csatlakozóval a főegységhez |
| 15 | **Tetőtartó** (gombok + elektróda) | PETG | 3D nyomtatás | 3D | egy csatlakozóval |
| 16 | **Kötőelemek** | M2,5 csavarok, menetes betétek | vásárolt | — | |

**Megjegyzés:** a 2D-s akril és fa alkatrészek (5, 6, 7, 8, 10) **egy lézervágott táblából** kijöhetnek, ami gyors és olcsó.

## Szerelési sorrend (a szán koncepcióval)
1. A szánra: UPS + akku (bölcső), Pi Zero 2 WH, ReSpeaker hangpanel, XIAO + IMU + rezgőmodul, LED-gyűrű a diffúzorral.
2. Előlapi tartóra: kijelző, kamera, C LED-szalag → egy kábel.
3. Tetőtartóra: 4 gomb, érintőelektróda → egy kábel.
4. **Kipróbálás a házon kívül**, minden csatlakoztatva.
5. Az előlapi tartót és a tetőtartót alulról a házba tenni, a tetőlapot a sapkákkal felülről rá, és 4 csavarral összefogni (részletesen: [SZERELES.md](SZERELES.md)).
6. A szánt alulról betolni, a csatlakozókat bedugni, és 4 csavarral rögzíteni.
7. A gumisarkokat felragasztani.

## Eldöntve (2026-11-13)
- **Házon belüli gépek:** CNC maró, lézervágó, FDM, SLA és **SLS** nyomtató → **minden alkatrész házon belül elkészülhet**.
- **Darabszám:** első körben **3 db** prototípus.
- **Felület:** eloxált alumínium, **szép és igényes** kivitel.

## Javaslat a házra (Claude véleménye)
**SLS PA12 ház + eloxált alumínium tetőlap** – „hibrid prémium”:
- a ház SLS-sel, házon belül, szerszám nélkül, a lekerekített formával együtt; **kb. 120 g**, így dobálva sem veszélyes,
- **igényes felület:** szemcseszórás + mélyfekete/grafit színezés (**2026-11-17: ez lett, mártással**; a festékréteg nem eszi meg a 0,1 mm-es illesztéseket), vagy alapozó + **soft-touch** festék; a C horony, a rács és az ablakok élei élesek maradnak,
- a **prémium érzetet** az **eloxált, szemcseszórt alumínium tetőlap** (CNC-marás vagy lézer, utána eloxálás) adja, a narancs gumisarkok kontrasztjával,
- miért nem teljes alumínium: a 90 mm-es zártszelvény csak 4 mm-es fallal kapható (~330 g, dobálva kemény), a tömbből mart ház pedig nagyon sok gépidő és nehéz – 3 darabhoz sem éri meg.
- Ha később sorozatban „teljes fém” megjelenés kell, újra elővesszük (pl. vékonyfalú mart héj vagy fröccsöntés + fém tetőlap).

## Megvalósítva a modellben (2026-11-13) – jóváhagyva: SLS ház + eloxált alu tetőlap
- **Kettéosztott ház:** a tömör kocka **9 mm magasan kettévágva**:
  - **felső ház (SLS PA12):** 2,5 mm-es fal, alul nyitott, **kb. 79 g**,
  - **alsó tálca:** lekerekített, felül nyitott, ez **a belső szán alapja**. Így a szán alulról, teljes szélességben (85 mm) betolható, és kívülről nem látszik az osztás.
- **Átmenő nyílások:** kijelzőablak (Ø33), kamera (Ø4,4, a C nyílásában), a C fénycsatorna, a két hangszórórács és a 60×60 mm-es tetőnyílás a tetőlap alatt.
- **Tetőlap rögzítése:** 4 db **M2,5-ös süllyesztett fejű csavar** a sarkokban. A csavarok átmennek a tetőlapon és a ház peremén, és a nyomtatott **tetőtartó** menetes betéteibe húznak, így a csavarok a tetőlapot, a ház peremét és a tetőtartót fogják össze. A tetőlap a sapkákkal felülről leemelhető; a tetőtartó (72 mm) csak alulról fér be/ki, mert a tetőnyílás 60 mm.
- **Belső szerkezet (helyőrzők):** a szán két sínje, a tetőtartó és az előlapi tartó. Az ütközés- és hézagvizsgálat szerint **mindenhol legalább 3 mm** hely van. Kivétel a kijelző és az előlapi tartó közti 1,5 mm, de ott a rögzítő távtartók vannak.
- A geometriát **14 pontos ellenőrzés** igazolta: üreges belső, átmenő nyílások, tömör falak és perem.

## Gyártási fájlok
- **3D:** `3d/c-kocka.step`, `.f3d`, `.stl` (90 mm-es, gyártható változat)
- **Vágási DXF-ek (1:1, mm):** [dxf/vagas/](dxf/vagas/):

| Fájl | Anyag | Gép |
|---|---|---|
| `tetolap_alu_2mm.dxf` (72×72) | alumínium 2 mm | CNC maró / lézer → szemcseszórás → eloxálás |
| `C_fenycsatorna_opal_akril_3mm.dxf` | opál akril 3 mm | lézer |
| `erintobetet_opal_akril_2mm.dxf` (Ø17,8) | opál akril 2 mm | lézer |
| `fenygyuru_diffuzor_opal_akril_3mm.dxf` (Ø66, 3 furat) | opál akril 3 mm | lézer |
| ~~`gumitalp_EPDM_1_5mm.dxf`~~ (Ø60, 3 lyuk) | – | **elhagyva** (2026-11-17): kész gumilábak |
| `Andor_fabetet_fa_2mm.dxf` (Ø6,6) | bükk/tölgy 2 mm | lézer |

- Minden alkatrész 4 nézete (elöl, felül, oldal, metszet): [dxf/](dxf/), előnézet: `dxf/index.html`

## Ellenőrzés (2026-11-13) – DXF-ek és szerelhetőség

**DXF-ek:** mind a 9 vágórajz mm-ben van, zárt kontúrú, és most már minden kontúr **csak egyszer** szerepel (korábban a lapos alkatrészek alsó és felső éle is benne volt → a lézer kétszer vágott volna). Ellenőrző: `node tools/dxf_check.js`.

**Javítva:**
- a C fénycsatorna, az érintőbetét és a kijelzőablak **pontosan akkora volt, mint a nyílás** (0 mm hézag) → most körben 0,1 mm-rel kisebbek (C: 44,0 mm, betét: Ø17,8, ablak: Ø32,8),
- a gyorsabb DXF-exporthoz a vázlatok számítása halasztott (a régi export ~30 percig tartott).

**Rendben:** tetőlap furatai (4× Ø2,2 csavar, 4× Ø8,2 gomb a Ø7,6 sapkához, Ø18 érintés, 6× Ø1,6 mikrofon), a mikrofonok hangútja (2026-11-17 óta a ReSpeaker két mikrofonja fölé: elöl Ø6, hátul Ø3 csatorna a tetőtartóban, hátul Ø2 furat a ház peremén), USB-C az osztásvonalon (a tálcával együtt lefelé kicsúszik), a hangszórók és a tálcacsavarok hozzáférése.

**Beépítve Zollo döntése alapján** ([tools/apply_fixes.py](tools/apply_fixes.py), a folyamat utolsó lépése):
1. **Gombsapkák:** SLA sapka **szárral és gallérral**. A fej Ø7,6 a tetőlap Ø8,2-es furatában ül, 1 mm-rel kiáll. A Ø9,6-os gallér a tetőlap alatt tartja a sapkát. A Ø3,5-ös szár 0,1 mm-re van a kapcsoló tetejétől. A ház peremében Ø10,6-os kiszabadítás van a gallérnak. **Andor-gomb:** ugyanilyen SLA alap, a tetejébe préselve egy **Ø6,6 × 2 mm-es fa betét** (`Andor_fabetet_fa_2mm.dxf`).
2. **A C fénye:** **S-alakú, síkban hajlítható WS2812 szalag** (5 mm széles, ~110 mm, 6–7 LED). Az előlapi tartó C bordáján fekszik.
3. **Kijelzőablak:** elhagyva. A kijelző üvege 2,5 mm-re van a homlokfal mögött, a fal védi.
4. **Alsó diffúzor:** 3 db **M2,5 süllyesztett fejű csavar** (r = 22 mm, 120°-onként), a tálcában Ø7-es oszlop M2,5 menetes betéttel (Ø3,6-os furat). A gumitalpon Ø5-ös lyuk van a csavarfejeknél. Csak a gumitalp öntapadós.

5. **C-akril és érintőbetét:** **semleges (neutrális) szilikonnal**, belülről körbe. A szilikon rugalmas, így dobáskor elnyeli az ütést, és késsel kivágható, ha cserélni kell. A C 3 mm-es, kívül egy síkban van a fallal, belül 0,5 mm-rel kilóg, hogy a szilikon megfogja. Ecetszagú (acetoxi) szilikont nem szabad használni, mert repeszti az akrilt, és korrodálja az elektronikát.

**Apróság / ellenőrizni a valódi alkatrészen:**
- a Pi és a hangpanel közt a modellben 13 mm van, a szabványos tüskesor 11 mm → a valóságban 2 mm-rel több hely marad a tetőtartó alatt,
- **ReSpeaker 2-Mics Pi HAT (2026-11-17, átvezetve):** a mikrofonok helye a gyártó Eagle-fájljából (a panel sarkától 3,05 / 61,98 × 21,34 mm). A tüskesor a bal (−X) oldalon, így a tetőlap 2 hasznos furata x = −6,34-nél, z = +25,46 és −33,46-nál van; a hátsó a 60 × 60-as tetőnyíláson kívül esik, ezért a ház peremén Ø2 hangfurat van. Magasság: 1,6 mm NYÁK + legfeljebb 6 mm alkatrész (gomb 5,0 mm) → a tetőtartóig **3,9 mm** hely marad (+2 mm a rövidebb tüskesor miatt). **Ha a HAT-ot fordítva tesszük fel, a furatok nem esnek a mikrofonok fölé.**
- a tetőlap sarkai élesek (72×72) – eloxálás előtt sorjázni, vagy R1 lekerekítés.
