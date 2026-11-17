# C-kocka – hőkezelés (v0.2)

> Bírja-e hővel a 90 mm-es kocka a terhelést? Teljesítménymérleg üzemmódonként és egyszerű hőellenállás-modell 25 °C-os és 35 °C-os szobára.
> A számítást a [tools/hokezeles.py](tools/hokezeles.py) végzi (csak szabványos Python), a méreteket a `3d/c-kocka.step` fájlból olvassa. Minden szám ellenőrizhető és újraszámolható:
>
> ```
> python tools/hokezeles.py
> ```
>
> Ez **becslés**: a hibasávja körülbelül ±5–10 K (lásd [6. pont](#6-mennyire-bízhatunk-a-számokban)). A prototípuson mérni kell, és a modellt a mérésekhez kell igazítani ([8. pont](#8-mérés-a-prototípuson)).

## Röviden

1. **A mostani beállításokkal a kocka túlmelegszik.** Hallgatás közben, 25 °C-os szobában a becslés szerint a belső levegő ~62 °C, a Pi SoC ~92 °C (80 °C-on fojt), a cella ~65 °C.
2. **A fő hőforrás nem a Pi, hanem a 31 LED.** A firmware alap-fényereje 0,8. Ennél a LED-ek 2,4 W-ot fogyasztanak a 4,8 W-ból, vagyis a kocka belsejében keletkező hő felét.
3. **A ház anyaga alig számít.** A szűk keresztmetszet a belső levegő és a fal közti hőátadás, nem maga a fal. Egy alumínium zártszelvény ház csak ~1 K-nel lenne hűvösebb, a hővezető pad az alu tetőlaphoz pedig 0,3 K-t hoz. Ez nem éri meg.
4. **A javasolt csomag (D)** túlnyomórészt szoftveres, ezért ingyenes. Elemei: LED-korlát, a kamera csak pillantáskor fut, takarékos hallgatás, a Pi korlátja party alatt, töltés közben takarékmód. Ehhez jön 2 × 300 mm² szellőzőrés a ház hátoldalán (az SLS-nyomtatásban ingyen van), egy kész hűtőborda a SoC-on (~1 €), és 0,5 A-es töltés. Ezzel 25 °C-on a hétköznapi üzemmódok a határon belül maradnak.
5. **A töltés a kényes pont.** 35 °C-os szobában a cella egy zárt dobozban a töltés 45 °C-os határa fölé kerül. 25 °C-on ez akkor fordul elő, ha töltés közben party mód megy. Ezért **kötelező a hőmérséklet szerint leálló töltés** (NTC a cellán, JEITA-logika). Ez a UPS-panel kiválasztási feltétele (lásd [7.4](#74-töltés-a-cella-védelme)).
6. **Frissítés (v0.2): a Pi-Ener-lite fix 1 A-rel tölt**, nem állítható, így a D csomag 0,5 A-es töltése nem valósul meg. 1 A-rel a D csomag 25 °C-on a Pi-t határon belül tartja (≤ 71 °C), de a cellát nem. Hallgatás közben töltve a cella ~47 °C, party közben töltve ~53 °C, a határ 45 °C. **A legolcsóbb javítás: töltés közben a kocka alszik** (szoftver), és a szellőzőrés 2 × 600 mm²-re nő (az SLS-nyomtatásban ingyen van). Ezzel 25 °C-on a cella ~41 °C. Egy legfeljebb ~15 perces ébredés belefér. 35 °C-on így is ~51 °C a cella, ezért a hőmérséklet szerinti töltésleállítás továbbra is kell (lásd [7.5](#75-frissítés-fix-1-a-es-töltés-pi-ener-lite)).

## Fontos eltérés a feladat leírásától

A feladat alumínium zártszelvény házat említ, de a **jóváhagyott terv SLS PA12 ház + eloxált alu tetőlap**: [GYARTASI_TERV.md](GYARTASI_TERV.md), NAPLO 2026-11-13, a STEP-ben a test neve „Haz (SLS)”. A teljes alu házat a súly miatt vetettük el (~330 g, dobálva kemény). Az alapszámítás ezért az SLS házra készült, az alu zártszelvény a **B változatban** szerepel összehasonlításként.

## 1. Kiinduló adatok

| Adat | Érték | Forrás |
|---|---|---|
| Kockaél, élsugár | 90,0 mm, R9 | STEP („Haz (SLS)” befoglaló doboza), DESIGN.md |
| Külső felület | 443 cm² (oldalak + élek 340, tető 52, alj 52) | számolva a lekerekített kockára |
| Fal | SLS PA12, 2,5 mm | GYARTASI_TERV.md |
| Tető | eloxált alu, 72 × 72 mm; alatta 60 × 60-as nyílás, 6 mm-es PETG tetőtartó és 2,5 mm légrés | STEP (y 80,3–86,3 és 88,8) |
| Pi Zero 2 W helye | a UPS-panel fölött 3 mm-rel, a Voice Bonnet alatt 8,5 mm-rel („szendvics”) | STEP |
| Alj | 1,5 mm-re az asztal fölött (gumitalp, gumisarkok) | DESIGN.md, GYARTASI_TERV.md |
| LED-ek | 24-es gyűrű + 7 LED-es C-szalag, a fényerő alapértéke 0,8 | firmware/xiao/code.py, firmware/pi/ckocka/state.py |
| Kamera | folyamatosan fut, csak fejjel lefelé áll le (party alatt is fut) | firmware/pi/ckocka/hw_real.py, brain.py |
| Hőkapacitás | ~417 J/K (ház, szán, cella, NYÁK-ok stb.) | becsült tömegek × fajhő |

## 2. Teljesítményfelvétel üzemmódonként

Ezek a firmware alapbeállításai: LED-fényerő 0,8, WS2812 csatornánként 12 mA (adatlap). A „csúcs” sor terheléses próba: 4 mag 100 %-on, LED-ek 100 %-on, 20 mA-rel csatornánként, hangos zene, töltés.

| fogyasztó (W) | alvás | alvás + töltés | hallgatás | hallgatás + töltés | party | party + töltés | csúcs |
|---|---|---|---|---|---|---|---|
| Raspberry Pi Zero 2 W | 0,75 | 0,75 | 1,30 | 1,30 | 1,90 | 1,90 | 3,00 |
| Voice Bonnet (kodek, mikrofonok) | 0,05 | 0,05 | 0,06 | 0,06 | 0,06 | 0,06 | 0,06 |
| hangszórók (elektromos) + erősítő | – | – | – | – | 0,47 | 0,47 | 1,18 |
| kamera (OV5647) | – | – | 0,25 | 0,25 | 0,25 | 0,25 | 0,25 |
| kerek kijelző + háttérfény | 0,01 | 0,01 | 0,10 | 0,10 | 0,10 | 0,10 | 0,10 |
| XIAO RP2040 + IMU, rezgés, érintés | 0,11 | 0,11 | 0,11 | 0,11 | 0,11 | 0,11 | 0,11 |
| **LED-ek (31 db WS2812)** | 0,12 | 0,12 | **2,43** | **2,43** | 1,13 | 1,13 | 5,60 |
| UPS: feszültségnövelő + töltő vesztesége | 0,14 | 0,58 | 0,58 | 1,01 | 0,55 | 0,98 | 1,84 |
| cella saját hője (töltés) | – | 0,08 | – | 0,08 | – | 0,08 | 0,08 |
| **belső hő összesen** | **1,19** | **1,70** | **4,82** | **5,34** | **4,57** | **5,08** | **12,22** |

**A becslések háttere:**
- **Pi:** üresjárat Wi-Fivel ~0,6 W, aktív magonként ~+0,6 W, 4 mag 100 %-on ~3 W.
  - Hallgatás: ébresztőszó-figyelés + arcanimáció.
  - Party: zene dekódolása, Bluetooth, hangszínkép-animáció.
- **LED:** a firmware `hsv()` függvénye mindig telített színt ad.
  - A Sunny színénél (45°) a csatornák összege 1,75.
  - A gyűrű 0,85 × fényerővel, a C-szalag teljes fényerővel világít.
  - Party módban az ütemre villan, átlagosan ~0,45-ös szinten.
  - Sötét állapotban is fogyaszt LED-enként ~0,8 mA-t.
- **Minden elektromos teljesítmény a dobozban marad hőként** (konzervatív becslés). A hangszóró akusztikus hatásfoka < 1 %, és a LED-ek fényének nagy részét az opál akril is elnyeli.
- **Elektromos ellenőrzés:** a csúcs 5 V-os árama 2,06 A, a UPS-panel ~2,5 A-t tud, tehát belefér.
- **Mellékhaszon:** a LED-korláttal az akkus üzemidő hallgatás közben **2,0 óráról ~3,2 órára** nő, a D csomag összes szoftveres lépésével **~3,9 órára** (10,8 Wh-s cella, 90 %-a használható ki).

## 3. A hőmodell

```
 hőforrások ──► belső levegő ──┬─ belső konvekció + PA12 fal ─► oldalfalak (konvekció + sugárzás) ─► szoba   77 %
 (Pi, LED, ...)                ├─ PETG tetőtartó + 2,5 mm légrés ─► alu tetőlap ──────────────────► szoba   15 %
                               ├─ PA12 alj ─► 1,5 mm légrés ─► asztal (szétterülés a falapban) ───► szoba    8 %
                               └─ szellőzőrések (kéményhatás: alul be, felül ki) ──────────────────► szoba
 Pi SoC  = szoba + 1,15 × (belső levegő − szoba) + P_Pi × R_Pi     (a kocka tetején melegebb a levegő)
 cella   = belső levegő + (cella saját hője + a UPS-veszteség 25 %-a) × 25 K/W
```

- **Külső hőátadás:** természetes konvekció (lamináris korreláció, a felület hőmérsékletétől függ) + sugárzás. Az emissziós tényező festett PA12-n 0,9, eloxált alun 0,85. A nyers, fényes alu 0,05-ös értéke sokat rontana, ezért fontos az eloxálás.
- **Belső hőátadás:** 5 W/m²K (~3 konvekció + ~2 sugárzás). **Ez a modell legbizonytalanabb, és egyben a legfontosabb száma**, mert ez a szűk keresztmetszet. Az oldalfalakon a belső konvekció 7,0 K/W-ot ad, a 2,5 mm-es PA12 fal csak 0,3 K/W-ot.
- **A modell ellenőrzése:** a zárt SLS ház egyenértékű hőellenállása 7,6 K/W, vagyis k = 3,0 W/m²K a teljes felületre. Az elektronikai dobozok gyártói műanyag dobozra ~3,5 W/m²K-t adnak meg ökölszabályként, tehát a modell jó nagyságrendben van, és inkább óvatos.
- **A Pi SoC hőellenállása:** csupaszon, szabad levegőn ~15 K/W (3 W-on ~45 K melegedés, ez a nyilvános tesztekben mért fojtás közelében van). A szendvics miatt × 1,3, egy kis hűtőbordával × 0,75.
- **Szellőzés:** Q = C<sub>d</sub> · A · √(2 g H ΔT / T). H = 75 mm, C<sub>d</sub> = 0,35 (keskeny rések). A be- és kimenet sorba kapcsolódik.
- **Időállandó:** τ = R · C ≈ 45–53 perc. **A rövid csúcsok (egy válasz, egy dal) nem melegítik fel a kockát.** Az állandósult értékek a tartós üzemre vonatkoznak: egész napos hallgatás, egyórás party, 3–6 órás töltés.

## 4. Eredmények

**Határok és célok:**
- Pi: 80 °C-on fojt, a cél ≤ 70 °C.
- Cella töltés közben: ≤ 45 °C, a cél ≤ 40 °C.
- Cella kisütés közben: ≤ 60 °C, a cél ≤ 45 °C.
- Belső levegő: a cél ≤ 50 °C, a PETG szán miatt a határ 75 °C.

Jelek: ✅ a célon belül · ⚠️ a cél fölött, de a határon belül · ❌ a határ fölött. Minden érték °C-ban: belső levegő / Pi SoC / akkucella.

### A – a mostani terv (zárt SLS ház, LED 0,8, csupasz Pi)

| üzemmód | hő W | 25 °C-os szoba | 35 °C-os szoba |
|---|---|---|---|
| Alvás (kijelző és LED ki, ébresztőszó figyel) | 1,2 | 34 ✅ / 50 ✅ / 35 ✅ | 44 ✅ / 60 ✅ / 45 ⚠️ |
| Alvás + töltés (éjszakai töltés) | 1,7 | 38 ✅ / 55 ✅ / 44 ⚠️ | 48 ✅ / 65 ✅ / 54 ❌ |
| Hallgatás / készenlét | 4,8 | 62 ⚠️ / 92 ❌ / 65 ❌ | 71 ⚠️ / 102 ❌ / 75 ❌ |
| Hallgatás + töltés (asztalon, kábelen) | 5,3 | 65 ⚠️ / 97 ❌ / 74 ❌ | 75 ⚠️ / 106 ❌ / 83 ❌ |
| Beszéd + party-fények, zene | 4,6 | 60 ⚠️ / 102 ❌ / 63 ❌ | 69 ⚠️ / 111 ❌ / 73 ❌ |
| Party + töltés | 5,1 | 63 ⚠️ / 106 ❌ / 72 ❌ | 73 ⚠️ / 116 ❌ / 81 ❌ |
| Csúcs (terheléses próba) | 12,2 | 115 ❌ / 187 ❌ / 128 ❌ | 124 ❌ / 196 ❌ / 137 ❌ |

**B – alu zártszelvény ház:** minden érték csak **~1 K-nel** alacsonyabb, mint az A-nál (hallgatás, 25 °C: 61 / 91 / 64). Az alu fal hővezetése hiába jobb, mert a belső konvekció a szűk keresztmetszet.

**C – csak a szoftveres lépések, zárt ház:** hallgatás, 25 °C: 44 / 66 / 46. Party, 25 °C: 49 / **82** / 51. Party közben a Pi még fojtana.

### D – JAVASOLT: a szoftveres lépések + 2 × 300 mm² szellőző + hűtőborda a SoC-on + 0,5 A-es töltés

| üzemmód | hő W | 25 °C-os szoba | 35 °C-os szoba |
|---|---|---|---|
| Alvás | 1,2 | 33 ✅ / 46 ✅ / 34 ✅ | 43 ✅ / 55 ✅ / 44 ✅ |
| Alvás + töltés (éjszakai töltés) | 1,4 | 35 ✅ / 47 ✅ / 38 ✅ | 45 ✅ / 57 ✅ / 48 ❌ |
| Hallgatás / készenlét | 2,5 | 41 ✅ / 58 ✅ / 43 ✅ | 51 ⚠️ / 68 ✅ / 53 ⚠️ |
| Hallgatás + töltés (asztalon, kábelen) | 2,1 | 39 ✅ / 56 ✅ / 42 ⚠️ | 49 ✅ / 65 ✅ / 52 ❌ |
| Beszéd + party-fények, zene | 3,1 | 45 ✅ / 70 ✅ / 47 ⚠️ | 55 ⚠️ / 80 ⚠️ / 57 ⚠️ |
| Party + töltés | 3,0 | 45 ✅ / 69 ✅ / 49 ❌ | 54 ⚠️ / 79 ⚠️ / 58 ❌ |
| Csúcs (terheléses próba) | 7,5 | 69 ⚠️ / 119 ❌ / 79 ❌ | 78 ❌ / 129 ❌ / 88 ❌ |

**Hogyan értelmezzük a D táblázatot?**
- **25 °C-os szobában** minden hétköznapi üzemmód rendben van, egy kivétellel: party közben töltés. Ilyenkor a cella ~49 °C-ra melegszik (becslés). Ezt a hőmérséklet szerint leálló töltés kezeli: a töltés szünetel, a kocka közben USB-ről működik tovább.
- **35 °C-os szobában** a kocka működik: a Pi legfeljebb a fojtás határán van, a cella a kisütés 60 °C-os határán belül marad. **Tölteni viszont csak akkor tud, amikor lehűl.** Ezt nem lehet elkerülni: egy zárt dobozban a cella mindig legalább 10 K-nel melegebb a szobánál. A telefonok is így viselkednek.
- **A csúcs sor tartósan nem fordulhat elő.** A Pi 80 °C-on magától fojt, és a szoftveres őr (7.1) még előtte visszavesz. A sor csak azt mutatja meg, miért kell ez az őr.

### Mit hoz az egyes lépés külön? (25 °C; belső levegő / Pi / cella)

| lépés | hallgatás | hallgatás + töltés | party | party + töltés |
|---|---|---|---|---|
| A – mostani terv | 62 / 92 / 65 | 65 / 97 / 74 | 60 / 102 / 63 | 63 / 106 / 72 |
| csak LED ≤ 0,25 | 48 / 77 / 51 | 52 / 82 / 59 | 54 / 95 / 57 | 58 / 100 / 65 |
| C – minden szoftveres lépés | 44 / 66 / 46 | 43 / 66 / 49 | 49 / 82 / 51 | 50 / 84 / 57 |
| C + szellőző 2 × 300 mm² | 41 / 63 / 43 | 41 / 62 / 47 | 45 / 77 / 47 | 46 / 78 / 53 |
| C + hűtőborda | 44 / 62 / 46 | 43 / 61 / 49 | 49 / 74 / 51 | 50 / 76 / 57 |
| C + 0,5 A-es töltés | 44 / 66 / 46 | 41 / 63 / 45 | 49 / 82 / 51 | 48 / 81 / 53 |
| **D – mind együtt** | **41 / 58 / 43** | **39 / 56 / 42** | **45 / 70 / 47** | **45 / 69 / 49** |

**Mit mutat ez a táblázat?**
- A legnagyobb hatású lépés a **LED-korlát**: önmagában −14 K a belső levegőn.
- A **hűtőborda** a Pi-n segít, a **szellőző** mindhárom hőmérsékleten.
- A **0,5 A-es töltés** csak a cellán segít, és csak töltés közben.

**Felmelegedés hidegen bekapcsolva, party módban, 25 °C-on (D):**

| eltelt idő | belső levegő | Pi | cella |
|---|---|---|---|
| 10 perc | 29 °C | 52 °C | 31 °C |
| 30 perc | 35 °C | 58 °C | 37 °C |
| 60 perc | 40 °C | 64 °C | 42 °C |
| 120 perc | 44 °C | 68 °C | 46 °C |

Ugyanez az A változatban a 30. percben 40 / 79 / 43 °C: a Pi fél óra party után már a fojtás határán van.

## 5. A korlátok összevetése

| Korlát | A (mostani) | D (javasolt), 25 °C | D (javasolt), 35 °C |
|---|---|---|---|
| Pi SoC, fojtás 80 °C-on | ❌ hallgatás közben is | ✅ ≤ 70 °C | ⚠️ party közben a határon; a fojtás védi, csak lassabb lesz |
| Li-ion töltés, ≤ 45 °C | ❌ | ✅ / ⚠️; party + töltés: a töltés szünetel (NTC) | ❌ → csak hőmérséklet szerint leálló töltéssel |
| Li-ion kisütés, ≤ 60 °C | ❌ | ✅ | ✅ (53–57 °C) |
| PETG szán és tartók, ~75 °C | ⚠️ 25 °C-on 60–65 °C, 35 °C-on 69–75 °C: a határon | ✅ | ✅ |
| Kijelző, kamera, kodek (tipikusan 70–85 °C) | ⚠️ | ✅ | ✅ |

## 6. Mennyire bízhatunk a számokban?

Hallgatás, 35 °C (belső levegő / Pi / cella):

| feltevés | A | D |
|---|---|---|
| alapeset | 71 / 102 / 75 | 51 / 68 / 53 |
| belső hőátadás −30 % (3,5 W/m²K) | 81 / 113 / 85 | 54 / 72 / 56 |
| belső hőátadás +30 % (6,5 W/m²K) | 66 / 96 / 69 | 49 / 66 / 51 |
| LED 20 mA/csatorna (az Adafruit ökölszabálya) | 84 / 116 / 89 | 54 / 72 / 56 |
| Pi hőellenállása +30 % | 71 / 110 / 75 | 51 / 72 / 53 |

**A következtetés minden feltevés mellett ugyanaz.** Az A változat nem bírja, a D 25 °C-on igen. A pontos fokokat a prototípuson kell kimérni.

## 7. Javaslatok

A [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) szerint a sorrend: először ami ingyenes (szoftver), utána ami a meglévő gyártásban ingyen van (SLS-rések), és csak végül kész, olcsó alkatrész (borda). Ragasztás nincs, a szerelés nem lesz bonyolultabb.

### 7.1 Szoftveres korlátok (ingyenes, a legnagyobb hatású)

A firmware-t ebben a lépésben nem módosítottam, ezek a teendők:

1. **LED-teljesítménykorlát a XIAO-n** (`firmware/xiao/code.py`, `draw_leds()`):
   - Az app 0–100 %-os csúszkája a nyers 0–0,25 tartományt fedje le, ne a 0–1-et.
   - Kell egy **áramkorlát** is („automatic brightness limiter”, ahogy a WLED-ben): kiírás előtt összegezni a csatornákat, és ha a becsült áram meghaladná a 0,2 A-t (~1 W), arányosan visszaskálázni. Így a fehérhez közeli, 100 %-os „csúcs” állapot nem is jöhet létre.
   - A `state.py` alapértéke (`bright = 0.8`) is ehhez igazodjon.
2. **A kamera csak pillantáskor fusson:** most folyamatosan streamel (`LocalCamera.enable()` csak fejjel lefelé állítja le). A `look()` előtt induljon, utána álljon le. Ez **~0,2 W**.
3. **Takarékos hallgatás:**
   - Könnyű ébresztőszó-figyelő kell, amelyik egy mag töredékét használja.
   - Az arcot csak változáskor kell újrarajzolni, ne folyamatos képkockákkal.
   - Cél: a Pi hallgatás közben ~1,0 W legyen 1,3 helyett.
4. **Party alatt a Pi ≤ ~1,5 W:** a hangszínkép-animáció legfeljebb ~15 kép/s legyen, és party közben ne fusson arcfelismerés.
5. **Hőőr a Pi-n:** a Pi `/sys/class/thermal/thermal_zone0/temp`-ből olvassa a SoC hőmérsékletét.
   - **70 °C fölött:** LED-ek felére, animáció lassabbra, kamera szünetel.
   - **75 °C fölött:** a party-fények csak halványan, a hangerő legfeljebb 70 %.
   - A 80 °C-os hardveres fojtás így csak végső tartalék.
6. **Töltés közben takarékmód:** LED ≤ 0,08, a kamera szünetel. Egy töltés így is csak 3–6 óra.

### 7.2 Szellőzőrés: hol és mekkora

Kéményhatás kell: **alul be, felül ki**, a lehető legnagyobb magasságkülönbséggel (~75 mm). A belépő és a kilépő rés egyaránt legalább **300 mm²** legyen. A modell szerint 300 mm² ~3 K-t hoz a belső levegőn. Afölött már kicsi a nyereség: 600 mm²-nél ~5 K.

| | Hely | Kialakítás | Terület |
|---|---|---|---|
| **Kilépő** | a ház **hátoldalán, felül** (y ≈ 58–82 mm), középen, pont a Pi és a Bonnet hátsó vége mögött | 10 db vízszintes rés, 25 × 1,2 mm, 2,4 mm-es osztással | 300 mm² |
| **Belépő** | az alsó tálca hátsó falán, az USB-C két oldalán, **és** a tálca alján a négy sarokban (a gyűrűn kívül) | hátul 2 × 2 rés 20 × 1,2 mm (~100 mm²) + alul 4 × 6 db Ø3,5 furat (~230 mm²; az asztal és a kocka közti 1,5 mm-es résen kap levegőt) | ~330 mm² |

**Miért éppen itt?**
- **Hátul nem látszik:** az előlap, az oldalsó hangszórórácsok és a tető dizájnja változatlan marad. Az USB-C kábel is hátul van.
- **Nem a tetőn van:** felülről nem hullik por, és nem ömlik kávé a Bonnetre. A tető 6 furata és a gombok sem változnak.
- **A rések 1,2 mm szélesek:** az SLS ezt pontosan nyomtatja, és a keskeny rés akusztikailag is csillapít. Így nem kell háló vagy ragasztás, ami a tervezési elvek miatt fontos. Ha mégis kell porszűrő, egy belülről bepattintható, nyomtatott keretben üljön, ne ragasszuk.
- **Ingyen van:** a rések a ház SLS-modelljében keletkeznek, nincs külön megmunkálás. Egy 2,5 mm-es falon a résektől a ház nem gyengül számottevően, a dobálhatóság marad.
- **A modellbe nem építettem be**, mert a Fusionhöz nem nyúltam. A STEP szerint a hátfal belső oldalán ezeken a helyeken nincs alkatrész (a Pi hátsó vége 6 mm-re van a faltól). A beépítéskor ellenőrizni kell.

**Akusztikai kockázat:** a dobozban két hangszóró ül, és a rés szivárgást jelent a hangszórók mögötti térből. A keskeny rések csillapítanak, a hatást a prototípuson hallgatással ellenőrizni kell. Ha baj van, a kilépő rés mehet a tetőtartó fölé a tetőlap pereme alá rejtett résként is, ez viszont port gyűjt.

### 7.3 Hűtőborda és hővezető pad

- **Hűtőborda a Pi SoC-jára: igen.** Kész, kapható, ragasztható alu borda, kb. 14 × 14 mm, **legfeljebb 4 mm magas**, hővezető ragasztószalaggal (~1 €). Ez nem „ragasztás” a szerelés értelmében, hanem a borda gyári rögzítése, és a szerelés előtt kerül fel a Pi-re. A Pi és a Bonnet közt a modellben 8,5 mm van. A valódi tüskesorral ez ~2 mm-rel kevesebb lehet (lásd GYARTASI_TERV.md), ezért kell az alacsony borda. Hatása: party közben −8 K a SoC-on.
- **Hővezető pad az alu tetőlaphoz: nem.**
  - A Pi és az alu közt ott van a Bonnet, a 6 mm-es PETG tetőtartó és egy légrés.
  - A tetőtartó és a tetőlap közti 2,5 mm-es rés kitöltése 3 W/mK-s paddal 0,3 K-t hoz.
  - Az elméleti maximum, vagyis ha a levegő közvetlenül érné az alut, ugyanennyi.
  - A tető csak a hő 15 %-át viszi el, mert felülete kicsi (52 cm²), és belül ugyanúgy a konvekció korlátoz.
- **Alu zártszelvény ház hővezető padokkal:** a házban már nincs lényeges nyereség (−1 K). Pad csak akkor érne valamit, ha a hőforrások a falhoz érnének, de a Pi középen ül. A súly miatt ez az út egyébként is le van zárva.

### 7.4 Töltés: a cella védelme

1. **Kötelező: hőmérséklet szerint leálló töltés.** A UPS-panel töltője figyelje a cellát NTC-vel, és 45 °C fölött álljon le (JEITA). **Ez beszerzési feltétel:** a Pi-Ener-lite és a Geekworm X306 adatlapján ellenőrizni kell, hogy van-e NTC-bemenete. Ezt most nem tudtam ellenőrizni. Ha nincs, másik panelt kell választani. A védett 18650-es cella védőáramköre csak túláram és túl alacsony vagy magas feszültség ellen véd, hőmérséklet ellen nem.
2. ~~0,5 A-es töltőáram~~: a Pi-Ener-lite-on nem állítható, fix 1 A (lásd [7.5](#75-frissítés-fix-1-a-es-töltés-pi-ener-lite)).
3. **Hőmérő a cellán** (ajánlott, olcsó):
   - Egy kész STEMMA QT / Qwiic hőmérőpanel, például TMP117 vagy MCP9808, a meglévő I2C láncra fűzve, a TPU bölcsőhöz szorítva.
   - Ezzel a Pi látja a cella hőmérsékletét: 43 °C fölött takarékmódba kapcsol, és az appban jelzi, hogy „túl meleg a töltéshez”.
   - Tartalékként az IMU (LSM6DS3TR-C) beépített hőmérője is használható, de az pontatlan, és lent ül, a cellától távol.

### 7.5 Frissítés: fix 1 A-es töltés (Pi-Ener-lite)

**Új adatok (2026-11-17):**
- A Pi-Ener-lite kézikönyve (User Manual V1.0) szerint a töltőáram **fix 1 A @ 5 V**, a kimenet 2,5 A @ 5,1 V, és a lap töltés közben is táplál.
- A LED-ek fényerőkorlátja ≤ 30 %, a számításban ezért 0,30 szerepel a 0,25 helyett.
- A kockában 1 hangszóró maradt. A számítás konzervatívan a régi hangszóróteljesítménnyel fut; a különbség csak party közben számít, és kicsi.
- A USB-C a hátfalba került, ezért az alsó beszívó rések a hátfal aljára és a tálca sarkaiba kerülnek. A kéményhatáshoz csak a be- és kimenet közti magasság számít, ez nem változik.

A számítás: `tools/hokezeles.py`, 9. szakasz, valamint az E és F változat a 2. szakaszban. A táblázatban a cella hőmérséklete áll °C-ban, zárójelben a Pi-é. A határ töltéskor 45 °C, a cél 40 °C.

| változat | 25 °C: alvás + töltés | hallgatás + töltés | party + töltés | 35 °C: alvás + töltés | hallgatás + töltés |
|---|---|---|---|---|---|
| D – 0,5 A (a Pi-Ener-lite-tal nem lehet) | 37,7 ✅ (47) | 42,2 ⚠️ (56) | 48,6 ❌ (69) | 47,6 ❌ (57) | 52,1 ❌ (65) |
| **E – D, de 1 A, LED ≤ 0,30** | 42,1 ⚠️ (49) | **46,6 ❌** (57) | **52,9 ❌** (71) | 52,0 ❌ (59) | 56,5 ❌ (67) |
| E + töltéskor a Pi ≤ 1,0 W party alatt | 42,1 ⚠️ (49) | 46,6 ❌ (57) | 49,2 ❌ (60) | 52,0 ❌ (59) | 56,5 ❌ (67) |
| E + szellőző 2 × 600 mm² | 40,9 ⚠️ (48) | 44,8 ⚠️ (55) | 50,1 ❌ (68) | 50,8 ❌ (58) | 54,7 ❌ (65) |
| E + szellőző 2 × 900 mm² | 39,9 ✅ (47) | 43,4 ⚠️ (54) | 48,2 ❌ (66) | 49,9 ❌ (57) | 53,4 ❌ (64) |
| E + töltés közben alszik | 42,1 ⚠️ (49) | 42,1 ⚠️ (49) | 42,1 ⚠️ (49) | 52,0 ❌ (59) | 52,0 ❌ (59) |
| **F – E + 2 × 600 mm² + töltés közben alszik** | **40,9 ⚠️** (48) | **40,9 ⚠️** (48) | **40,9 ⚠️** (48) | 50,8 ❌ (58) | 50,8 ❌ (58) |

**Miért a cella a gond, és nem a Pi?** 1 A-es töltésnél a töltő vesztesége (~0,43 W) közvetlenül a cella alatt keletkezik, a cella saját Joule-hője pedig ~0,08 W. Ez a belső levegőhöz képest ~+4,5 K-t ad a cellán. A Pi 1 A-rel is ≤ 71 °C marad, mert a töltés közbeni takarékmód (LED ≤ 0,08, a kamera szünetel) a többlethő nagy részét ellensúlyozza.

**A legolcsóbb, a tervezési elvekkel összhangban lévő javítás (F):**
1. **Töltés közben alszik a kocka.** Ez szoftveres változtatás, ingyenes. A kijelző és a LED kikapcsol, a kamera leáll, a Pi alvó módba vált, az ébresztőszóra viszont felébred. Az ébresztés nem gond: a kocka hőidőállandója ~38 perc, ezért egy rövid ébredés alig melegít. 25 °C-on:

   | party töltés közben | cella |
   |---|---|
   | 5 perc | ~42 °C |
   | 15 perc | ~44 °C |
   | 30 perc | ~46 °C |

   A szoftver ezért 15 perc után, vagy ha a cellahőmérő 43 °C-ot mér, visszaküldi alvó módba. A töltés ~3 óra (2,6 Ah, 1 A), éjszaka vagy asztalon alvás közben ez kényelmesen lefut.
2. **2 × 600 mm² szellőzőrés 2 × 300 helyett.** Az SLS-nyomtatásban ez is ingyenes, és nem kell hozzá ragasztás.
   - **Kimenet:** 20 db 25 × 1,2 mm-es rés a hátfal tetején, 2 sorban. A második hangszóró helyén maradt rács ebbe beszámítható.
   - **Bemenet:** a hátfal alján rések, valamint a tálca 4 sarkában 6–6 db Ø3,5 mm-es furat. A furatok összesen ~230 mm²-t adnak, a maradékot a rések adják.
   - A hétköznapi (nem töltés közbeni) üzemmódokban ez 2 K-t hoz.
3. **Önmagában egyik lépés sem elég, de együtt igen.**
   - A szigorúbb CPU-korlát (Pi ≤ 1,0 W) csak party közben segít, ott is csak 3–4 K-t.
   - Önmagában a nagyobb szellőző sem elég: még 2 × 900 mm²-rel is 48 °C a cella party + töltés közben, és ekkora rés a 90 mm-es kocka hátfalán már a merevséget és a megjelenést rontja.

**35 °C-os szobában egyik szoftveres megoldás sem elég:** a cella alvás közben töltve is ~51 °C. Ezért a [7.4](#74-töltés-a-cella-védelme) 1. pontja (hőmérséklet szerint leálló töltés) továbbra is kötelező. Ha a Pi-Ener-lite-nak nincs NTC-bemenete, a cellahőmérő (TMP117 vagy MCP9808, ~5 €) alapján a szoftver csak a terhelést tudja csökkenteni, a fix 1 A-es töltést leállítani nem. Ilyenkor két lehetőség van:
- a USB-C táp útjába kész, kapcsolható terheléskapcsoló-modul kerül, amelyet a XIAO vezérel;
- vagy egyszerűen nincs töltés nagy melegben: az app szól, hogy „túl meleg a töltéshez, húzd ki”.

Ezt a döntést a beszerzés előtt meg kell hozni.

## 8. Mérés a prototípuson

A modell két legbizonytalanabb paramétere a belső hőátadás (`H_BE`) és a Pi hőellenállása (`R_PI_SZABAD`). Mindkettőt 3 mérésből lehet kalibrálni:

1. **Mérőeszközök:**
   - Pi: `vcgencmd measure_temp` és `vcgencmd get_throttled`, percenként naplózva.
   - Egy hőelem a cellán, egy pedig a kocka belsejében, a levegőben.
   - Egy USB-s teljesítménymérő a táplálásban.
2. **Mérések:** hallgatás 2 órán át, party 1 órán át, hallgatás + töltés, mindegyik zárt házzal, ismert szobahőmérsékleten.
3. **Kalibrálás:** a mért belső levegőből `H_BE` adódik, a mért SoC-hőmérsékletből `R_PI_SZABAD`. Ezeket beírva a `tools/hokezeles.py` újraszámolja az összes változatot.
4. **Hallgatási próba:** a szellőzőrések akusztikai hatását egy ugyanolyan, rés nélküli házzal kell összevetni.

## Felhasznált feltevések (összefoglaló)

Minden paraméter forrással vagy indoklással a [tools/hokezeles.py](tools/hokezeles.py) 2. és 3. részében található. A fontosabbak:
- PA12: 0,22 W/mK
- Emissziós tényező: PA12 0,9, eloxált alu 0,85
- Belső hőátadás: 5 W/m²K
- WS2812: 12 mA/csatorna (legrosszabb esetben 20), sötétben 0,8 mA/LED
- UPS feszültségnövelő hatásfoka 88 %, töltő hatásfoka 90 %, töltőáram 1 A (D: 0,5 A; a Pi-Ener-lite-on fix 1 A, ezért E és F 1 A-rel számol)
- Pi: 0,75 / 1,3 / 1,9 / 3,0 W (alvás / hallgatás / party / csúcs)
- Cella határai: töltés 0–45 °C, kisütés −20…60 °C (tipikus 18650-es adatlap)
