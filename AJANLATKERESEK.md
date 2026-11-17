# C-kocka – költségbecslés és ajánlatkérések (3 db prototípus)

> **Gyakorló anyag az AI-kihíváshoz – nem elküldött ajánlatkérések; az árak tájékoztató jellegűek, 2026-11-16 állapot.**

Alapok: [ELEKTRONIKA.md](ELEKTRONIKA.md) (modulok), [GYARTASI_TERV.md](GYARTASI_TERV.md) (alkatrészek, anyagok), [SZERELES.md](SZERELES.md) (kötőelemek), [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) (költséghatékony, kész, polcról levehető alkatrészek).

**Mit gyártunk házon belül:** SLS ház és tálca, FDM PETG/TPU alkatrészek, SLA gombsapkák, lézervágott akril és fa, CNC/lézer tetőlap. **Mit veszünk kívülről:** elektronikai modulok és apróságok, a tetőlap eloxálása (és esetleg az alapanyaga), PMMA, fa, gumilábak, kötőelemek, színezőfesték.

---

## 1. Összesítő költségbecslés (3 db)

### Jelölések és feltételezések
- **[O]** = az árat a bolt termék- vagy keresőoldalán néztem meg (2026-11-16).
- **[K]** = az ár webes keresési találatból származik, a bolt oldalát nem nyitottam meg (pl. mert a bolt nem engedte a lekérdezést). Rendelés előtt ellenőrizni kell.
- **[B]** = **becslés**, nem találtam rá konkrét árat. Ezek nem megnézett árak.
- **Minden ár nettó (ÁFA nélkül), forintban.** A külföldi bruttó árakból a helyi ÁFÁ-t levontam (DE 19%, NL 21%, CZ 21%, a magyar oldalon szereplő bruttó árból 27%).
- **Átváltás (feltételezés, nem napi árfolyam):** 1 EUR = 390 Ft, 1 USD = 340 Ft, 1 CZK = 15,5 Ft. Az aktuális MNB-árfolyamot rendeléskor be kell írni; a 2026. augusztusi hírek 360–370 Ft/EUR körüli szintet említettek, ezért a 390 Ft óvatos (inkább felfelé kerekítő) érték.
- A „Rendelt db” a 3 kockához szükséges mennyiség, ahol érdemes, kis tartalékkal vagy csomagmérettel.

### 1.1 Elektronika (kívülről)
| # | Tétel | Db/kocka | Rendelt db | Egységár (nettó) | Összesen (nettó) | Forrás / beszállító | Forrás dátuma |
|---|---|---|---|---|---|---|---|
| 1 | Raspberry Pi **Zero 2 WH** (gyárilag forrasztott tüskesorral) | 1 | 3 | 16,99 € ≈ 6 626 Ft | 19 878 Ft | Botland, 16,99 € nettó [K]; *alternatíva:* BerryBase (WH), welectron (W, 16,72 €), Hestore (W, 12 133 Ft [O]). **Döntés (2026-11-17): EU-s boltból** (KOLTSEGOPTIMALIZALAS.md, E1) | 2026-11-17 |
| 2 | ~~Tüskesor a Pi-hez~~ – a WH-ban gyárilag benne van (a saját forrasztás ütközne a „csatlakozók forrasztás helyett” elvvel) | – | – | – | 0 Ft | – | 2026-11-17 |
| 3 | **Seeed ReSpeaker 2-Mics Pi HAT** (107100001, 2 mikrofon, **mono** hangszórókimenet) – az Adafruit Voice Bonnet (#4757, kifutott) helyett | 1 | 3 | ~10 € ≈ 3 900 Ft | 11 700 Ft | DigiKey/Farnell 9–11 € nettó, Hackster 12,90 USD [K]. **Döntés (2026-11-17): ReSpeaker + 1 hangszóró** (KOLTSEGOPTIMALIZALAS.md, E6). **Ellenőrizve (2026-11-17):** a v2.0 kapcsolási rajza (2024-11-15) szerint a lapon **TPA2005D1** mono D-osztályú erősítő van (5 V-ról, 8 Ω-ra kb. 1,4 W), kimenete egy **2 tűs, 2,0 mm-es csatlakozón** (J2, A2001WF-02A, JST PH-kompatibilis), mellette 3,5 mm-es jack. Az erősítőt egy vezérlőjel (AMP_CTL) kapcsolja be. **Külön erősítőmodul nem kell.** | 2026-11-17 |
| 4 | UPS panel Pi Zeróhoz: Pi-Ener-lite (USB-C, töltöttségmérő, RTC) | 1 | 3 | 35 USD ≈ 11 900 Ft | 35 700 Ft | Tindie (gyártó, Kínából szállít; „6 left in stock”) [O] | 2026-11-16 |
| 5 | 18650 Li-ion cella, védett, 3000 mAh (KEEPPOWER ICR18650-3000P) | 1 | 3 | 4 932 Ft | 14 796 Ft | Hestore.hu, 100.442.96 [O] | 2026-11-16 |
| 6 | Kerek kijelző 1,28", GC9A01, 240×240, SPI | 1 | 3 | 8,70 € ≈ 3 393 Ft | 10 179 Ft | eu.robotshop.com, Elecrow modul, 10,45 € bruttó [K]; a „kerek NYÁK-os” kivitelt ellenőrizni | 2026-11-16 |
| 7 | Mini „spy” kameramodul OV5647, **Pi Zero (22 pólusú) szalagkábellel** – pl. **Arducam B006603** vagy **Pi Supply Spy Camera** (8,5 × 11,3 mm) | 1 | 3 | 5 000 Ft | 15 000 Ft | **becslés** [B] (Arducam mini modul ~10–11 USD [K]); a Kailap JAL-KH3-C20B-1B (OV5640) **nem jó**: DVP párhuzamos interfész, nem CSI | 2026-11-16 |
| 8 | Hangszóró, 8 Ω, 2 W (VISATON K 36 WP, **Ø36 mm**) | **1** | 3 | 2 132 Ft | 6 396 Ft | Hestore.hu, 100.357.67 [O]; **Döntés (2026-11-16): ez kerül be**, a rögzítőgyűrű Ø36-ra módosul; **(2026-11-17): kockánként 1 db (mono)** | 2026-11-17 |
| 9 | WS2812 LED-gyűrű, 24 LED, **Ø66 mm** (NeoPixel Ring 24-kompatibilis) | 1 | 3 | 3 429 Ft | 10 287 Ft | Hestore.hu, WS2812-RING24/66, 100.410.10 [O] | 2026-11-16 |
| 10 | S-alakú (síkban hajlítható) WS2812-es LED-szalag, 60 LED/m, ~110 mm/kocka | 0,11 m | **1 m** (3 kockához 0,33 m kell) | 2 500 Ft | 2 500 Ft | **becslés** [B]; **döntés (2026-11-17): 1 m-es kiszerelés**. A talált tekercsek 6 mm szélesek vagy SK6812 chipesek (pl. 5 m, ~17–22 USD [K]); pontos 5 mm/60 LED/m WS2812 ajánlatot nem találtam | 2026-11-16 |
| 11 | Seeed XIAO RP2040 **Pre-Soldered** (gyárilag forrasztott tüskesorral; az alapváltozat forrasztatlan, lásd KOMPATIBILITAS.md) | 1 | 3 | ~5,90 € ≈ 2 300 Ft | 6 900 Ft | **becslés** [B] az alapváltozat TME-ára (4,92 € nettó [K]) + felár | 2026-11-17 |
| 12 | IMU: Adafruit LSM6DS3TR-C, STEMMA QT (#4503) | 1 | 3 | 8,56 € ≈ 3 338 Ft | 10 014 Ft | Mouser / DigiKey EU, 8,46–8,59 € nettó [K] | 2026-11-16 |
| 13 | **Rezgőmotor-modul** (lapos ERM motor + tranzisztoros meghajtó egy kis panelen, 3 tűs csatlakozó), a XIAO PWM-kimenetéről – az Adafruit DRV2605L helyett | 1 | 3 | ~1 € ≈ 400 Ft | 1 200 Ft | **becslés** [B]; **döntés (2026-11-17)** (KOLTSEGOPTIMALIZALAS.md, E3) | 2026-11-17 |
| 14 | ~~Külön rezgőmotor~~ – a 13. tételben benne van | – | – | – | 0 Ft | – | 2026-11-17 |
| 15 | **1 MΩ-os ellenállás** az érintőelektródához (a XIAO RP2040 maga érzékel, CircuitPython `touchio`) – az Adafruit AT42QT1010 helyett; a gombok prototípus-lapjára kerül | 1 | 10 | 10 Ft | 100 Ft | **becslés** [B]; **döntés (2026-11-17)** (KOLTSEGOPTIMALIZALAS.md, E2) | 2026-11-17 |
| 16 | Nyomógomb 6×6 mm, THT (TACTS-6x6x7.3) | 4 | 20 | 22 Ft (10+ ár) | 440 Ft | Hestore.hu, 100.420.19 [O] | 2026-11-16 |
| 17 | STEMMA QT / Qwiic → **női Dupont-aljzatok**, 150 mm (Adafruit **4397**, IMU → XIAO tüskéi; a XIAO-n nincs Qwiic, KOMPATIBILITAS.md 5.) | 1 | 3 | ~1,03 € ≈ 402 Ft | 1 206 Ft | a Qwiic–Qwiic kábel ára (elektronicavoorjou.nl, 1,25 € bruttó [K], 2026-11-16) – a 4397 árát ellenőrizni [B] | 2026-11-17 |
| 18 | USB-C panelbe szerelhető hosszabbító, **általános, 10–15 cm** (az Adafruit #4218 helyett; a ház hátfalában, PETG szorítólappal – fül ≤ 31 × 2 mm, test ≤ 13 × 8 mm) | 1 | 3 | ~2 € ≈ 800 Ft | 2 400 Ft | **becslés** [B]; **döntés (2026-11-17)** (KOLTSEGOPTIMALIZALAS.md, E4) | 2026-11-17 |
| 19 | microSD kártya, 32 GB, A1 (a Pi rendszeréhez; az ELEKTRONIKA.md-ből hiányzik) | 1 | 3 | 3 000 Ft | 9 000 Ft | **becslés** [B] | – |
| 20 | CR1220 gombelem (a UPS panel RTC-jéhez, nincs a dobozban) | 1 | 3 | 300 Ft | 900 Ft | **becslés** [B] | – |
| 21 | M2,5 távtartó-készlet (11 mm) + csavarok a Pi/Bonnet stackhez | – | 1 készlet | 3 000 Ft | 3 000 Ft | **becslés** [B] | – |
| 22 | Kábelek, JST-SH/JST-PH csatlakozók, vezeték, prototípus-lap a gomboknak, öntapadós rézfólia | – | 3 készlet | 4 000 Ft | 12 000 Ft | **becslés** [B] | – |
| 22/b | **GPIO 1→2 elosztó panel** (pl. Micro Connectors RAS-GP02 / GeeekPi, 40 tűs, két apa tüskesor) a Pi és a ReSpeaker közé: az egyik soron a ReSpeaker, a másikon Dupont-kábellel a kijelző és a XIAO soros vonala (KOMPATIBILITAS.md, 2. pont) | 1 | 3 | ~5 € ≈ 2 000 Ft | 6 000 Ft | **becslés** [B] | 2026-11-17 |
| 22/c | **Adafruit NeoDriver** (I2C → NeoPixel meghajtó, STEMMA QT, 5 V-os kimenet, csavaros sorkapocs) a 31 WS2812 LED-hez, egy láncban; + 1 db STEMMA QT kábel (IMU → NeoDriver) | 1 | 3 | ~7,50 USD + 1 € ≈ 2 950 Ft | 8 850 Ft | **becslés** [B]; a cikkszámot (5766?) rendelés előtt ellenőrizni | 2026-11-17 |
| 22/d | ~~OTG kábel~~ – nem kell: a XIAO soros vonalon (UART) kapcsolódik a Pi-hez, Dupont-kábellel az elosztó panelről (a 22. tételben) | – | – | – | 0 Ft | – | 2026-11-17 |
| | **Elektronika összesen** | | | | **188 446 Ft** | | |

### 1.2 Kötőelemek (kívülről)
A [SZERELES.md](SZERELES.md) szerint kockánként (2026-11-17, M1: 3 féle csavar): 26 db M2,5 menetes betét, 13 db M2,5×8 süllyesztett fejű (DIN 7991), 17 db M2,5×6 hengeres fejű (DIN 912; ebből 8 a távtartókhoz), 4 db M2,5×14 hengeres fejű, 4 db M2,5×11 mm-es távtartó.

| # | Tétel | Db/kocka | Rendelt db | Egységár (nettó) | Összesen (nettó) | Forrás / beszállító | Forrás dátuma |
|---|---|---|---|---|---|---|---|
| 23 | M2,5 beolvasztható menetes betét, sárgaréz, M2,5×4 (ruthex, 70 db/csomag) | 25 | 2 csomag (140 db) | 2 739 Ft/csomag | 5 478 Ft | **becslés** [B] az M2-es ár alapján (3djake.hu, M2: 3 478 Ft bruttó/csomag [O]) | 2026-11-16 |
| 24 | M2,5 rozsdamentes (A2) csavarok, **3 féle** (DIN 7991: M2,5×8; DIN 912: M2,5×6, M2,5×14), 20–50 db-os csomagok | 25 | ~6 csomag | ~1 000 Ft/csomag | 6 000 Ft | **becslés** [B] (viszonyítás: Toolcraft M2,5×8, 20 db, 1 090 Ft bruttó az Árgép találata szerint [K]) | 2026-11-16 |
| | **Kötőelemek összesen** | | | | **11 478 Ft** | | |

### 1.3 Külső szolgáltatás és alapanyag
| # | Tétel | Db/kocka | Rendelt db | Egységár (nettó) | Összesen (nettó) | Forrás / beszállító | Forrás dátuma |
|---|---|---|---|---|---|---|---|
| 25 | Alumínium lemez EN AW-5754, 2 mm, 80×80 mm-re vágva (a 72×72-es tetőlaphoz, ráhagyással) | 1 | 4 (3 + 1 tartalék) | 181,63 €/m² → 4 db ≈ 4,65 € + 9,79 € feldolgozási díj ≈ 5 632 Ft | 5 632 Ft | metallshopper.de [O]; a 9,79 €-s díj jelentése az oldalon nem egyértelmű. Ha van házon belül maradék lemez, ez 0 Ft | 2026-11-16 |
| 26 | **Szemcseszórás + eloxálás** (fekete vagy natúr), 72×72×2 mm | 1 | 4 (3 + 1 tartalék) | – | 25 000 Ft | **becslés** [B]: kis tételnél a minimum (tétel-) díj határozza meg az árat; magyar eloxáló üzemi árat nem találtam | – |
| 27 | Opál PMMA (akril) 3 mm, kis tábla (C fénycsatorna, Ø66 diffúzor) | – | 1 tábla (500×250) | ≈ 2 550 Ft | 2 550 Ft | **becslés** cseh Hornbach-ár alapján (199 Kč bruttó, 500×250×3 mm opál [K]); magyar forintos árat nem találtam | 2026-11-16 |
| 28 | Opál PMMA 2 mm, kis tábla (érintőbetét Ø17,8) | – | 1 | 2 000 Ft | 2 000 Ft | **becslés** [B] | – |
| 29 | Bükk vagy tölgy, 2 mm (lemez/furnér; Andor fa betét Ø6,6) | – | 1 | 1 500 Ft | 1 500 Ft | **becslés** [B] (maradékból akár 0 Ft) | – |
| 30 | **Öntapadós gumiláb**, átlátszó (3M Bumpon-típus, ~Ø10 × 3 mm) – a Ø60-as EPDM gumitalp helyett | 4 | 16 | 50 Ft | 800 Ft | **becslés** [B]; **döntés (2026-11-17)** (KOLTSEGOPTIMALIZALAS.md, M5) | 2026-11-17 |
| 31 | Semleges (neutrális) szilikon, víztiszta | – | 1 tubus | 2 500 Ft | 2 500 Ft | **becslés** [B] | – |
| 32 | Ragasztó a TPU gumisarkokhoz | – | 1 | 2 000 Ft | 2 000 Ft | **becslés** [B] | – |
| 33 | **Mártásos színezés** házon belül: poliamidhoz való festék (fekete/grafit) + edény, szemcseszórás után – a szórófestés helyett | – | 1 készlet | 3 000 Ft | 3 000 Ft | **becslés** [B]; **döntés (2026-11-17)** (KOLTSEGOPTIMALIZALAS.md, M6) | 2026-11-17 |
| | **Külső szolgáltatás és alapanyag összesen** | | | | **44 982 Ft** | | |

### 1.4 Házon belüli gyártás anyagköltsége (gépidő és energia nélkül)
| # | Tétel | Anyag/kocka | Anyagár (nettó) | Kockánként | 3 db-ra | Forrás | Forrás dátuma |
|---|---|---|---|---|---|---|---|
| 34 | SLS PA12 por: felső ház (~79 g) + alsó tálca (~25 g, becslés); a por frissítése és vesztesége miatt kb. 2× alkatrésztömeggel számolva | ~0,2 kg | ~100 USD/kg ≈ 34 000 Ft/kg | 6 800 Ft | 20 400 Ft | Formlabs Nylon 12 és Sinterit PA12 Industrial: 999 USD / 10 kg [K]; a fogyás **becslés** | 2026-11-16 |
| 35 | PETG filament: szán, tetőtartó, előlapi tartó, 2 hangszóró-rögzítő (+ támasz) | ~100 g | ~4 000 Ft/kg nettó | 400 Ft | 1 200 Ft | Alza.hu, 4 120–5 770 Ft bruttó / kg [K]; a tömeg **becslés** | 2026-11-16 |
| 36 | TPU 95A filament: 8 gumisarok + akkubölcső | ~40 g | ~8 000 Ft/kg | 320 Ft | 960 Ft | **becslés** [B] | – |
| 37 | SLA gyanta: 4 gombsapka + támaszok | ~15 ml | ~62 Ft/ml | 930 Ft | 2 790 Ft | **becslés** [B] | – |
| | **Házon belüli anyag összesen** | | | **8 450 Ft** | **25 350 Ft** | | |

### 1.5 Szállítás (becslés)
| Beszállító | Becsült díj | Megjegyzés |
|---|---|---|
| Hestore (Pi, cellák, gyűrű, hangszórók, gombok) | 2 000 Ft | **becslés**; futárdíj |
| EU-s disztribútor (Mouser / DigiKey / TME: ReSpeaker, XIAO, IMU, rezgőmodul, Qwiic, USB-C) | 8 000 Ft | **becslés**; **döntés (2026-11-17, B1):** ami lehet, innen, egy csomagban; egy helyről rendelve egy bizonyos érték fölött gyakran ingyenes – ellenőrizni |
| Botland (Pi Zero 2 WH; a ReSpeaker az EU-s disztribútori rendelésben) | 3 000 Ft | **becslés** |
| Pi-Ener-lite (Tindie, Kínából) | 7 080 Ft | „from 9 USD” [O]; ~12 USD szállítás + vámkezelési díj **becslés**; az importÁFA a 27%-ban benne van |
| LED-szalag | 1 700 Ft | **becslés** |
| 3djake (menetes betétek) | 2 000 Ft | **becslés** |
| metallshopper.de (alu) | 5 850 Ft | **becslés** (~15 €) |
| Akril, fa (hazai bolt) | 3 000 Ft | **becslés** |
| Eloxáló üzem (oda-vissza futár) | 4 000 Ft | **becslés** |
| **Szállítás összesen** | **36 630 Ft** | |

### 1.6 Végösszeg
| | 3 db-ra | Kockánként |
|---|---|---|
| Elektronika | 188 446 Ft | 62 815 Ft |
| Kötőelemek | 11 478 Ft | 3 826 Ft |
| Külső szolgáltatás és alapanyag | 44 982 Ft | 14 994 Ft |
| Házon belüli anyag | 25 350 Ft | 8 450 Ft |
| Szállítás | 36 630 Ft | 12 210 Ft |
| **Részösszeg (nettó)** | **306 886 Ft** | **102 295 Ft** |
| Tartalék, 10% (árfolyam, hiányzó apróságok, selejt) | 30 689 Ft | 10 230 Ft |
| **Összesen nettó** | **337 575 Ft** | **112 525 Ft** |
| ÁFA 27% | 91 145 Ft | 30 382 Ft |
| **Összesen bruttó** | **428 720 Ft** | **142 907 Ft** |

**Az ÁFA kezelése:**
- A hazai boltok (Hestore) nettó árat mutatnak, erre jön a **27%-os ÁFA**.
- EU-s cégtől, **közösségi adószámmal** rendelve a külföldi ÁFA nem kerül a számlára (fordított adózás), a 27%-os magyar ÁFÁ-t a vevő vallja be. Ezért a táblázat minden tételt nettóban számol.
- EU-n kívülről (Tindie, Kína): **importÁFA (27%)** + vámkezelési díj, kis értékű csomagnál a futár vagy a posta szedi be. A kis értékű csomagokra vonatkozó uniós vámszabályok 2026-ban változtak, rendelés előtt ellenőrizni kell.
- Ha a vásárló ÁFA-levonásra jogosult, a valódi költség a **nettó** összeg; a bruttót a pénzügyi kerethez kell figyelembe venni.

**A három legdrágább tétel (3 db-ra, nettó):**
1. Pi-Ener-lite UPS panel – 35 700 Ft (+ szállítás és importÁFA; a kiváltását a 2026-11-17-i költségoptimalizálásnál elvetettük)
2. Raspberry Pi Zero 2 WH – 19 878 Ft (EU-s boltból)
3. 18650 cella – 14 796 Ft

Utánuk jön az eloxálás (~25 000 Ft, becslés) és az SLS por (~20 400 Ft, becslés).

*A 2026-11-17-i költségoptimalizálás jóváhagyott javaslatai ([KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md): E1, E2, E3, E4, E6, E9, M5, M6) már benne vannak a fenti táblázatokban. Előtte a végösszeg 420 133 Ft nettó volt (3 db).*

---

## 2. Ajánlatkérő e-mail-tervezetek

> Egyik sem lett elküldve. Feladó mindenhol: **[Név]**, **[e-mail]**. A szállítási cím helyén: **[szállítási cím]**. Kért ajánlatadási határidő: **2026-11-23**, kért szállítási határidő: **2026-12-11**.

### 2.1 Hazai elektronikai disztribútor (pl. Hestore-típusú alkatrészbolt)

**Tárgy:** Árajánlatkérés – Raspberry Pi és elektronikai alkatrészek, 3 db prototípushoz

Tisztelt Hölgyem / Uram!

Egy asztali eszköz 3 db-os prototípus-sorozatához kérünk árajánlatot az alábbi tételekre, készletinformációval és szállítási idővel:

| # | Tétel | Műszaki adat | Mennyiség |
|---|---|---|---|
| 1 | Raspberry Pi Zero 2 W (RPI-ZERO2-W) | 1 GHz, 512 MB RAM, Wi-Fi, BT 4.2; **gyárilag forrasztott tüskesorral (Zero 2 WH)** | 3 db |
| 2 | 18650 Li-ion cella, **védett** | ~3000 mAh, pl. ICR18650-3000P vagy egyenértékű, gomb- vagy laposfejű (kérjük, jelezze) | 3 db |
| 3 | WS2812 LED-gyűrű | 24 LED, külső átmérő **66 mm** (pl. WS2812-RING24/66) | 3 db |
| 4 | Hangszóró | kerek, **Ø36 mm**, 8 Ω, 2 W, legfeljebb 16 mm mély (VISATON K 36 WP vagy egyenértékű) | 3 db |
| 5 | Nyomógomb | 6×6 mm, THT, SPST-NO, kb. 7 mm magas | 20 db |
| 6 | microSD kártya | 32 GB, Class 10 / A1 | 3 db |
| 7 | CR1220 gombelem | 3 V | 3 db |
| 8 | Távtartó | M2,5, 11 mm, anya-anya (a csavarok a kötőelem-ajánlatból: M2,5×6 hengeres fejű) | 12 db |
| 9 | JST-SH (1,0 mm) és JST-PH (2,0 mm) előszerelt kábelek | 2–6 pólusú, 100–150 mm | kb. 20 db vegyesen |
| 10 | Prototípus-lap (forrasztható) | kb. 30×70 mm | 3 db |
| 11 | Ellenállás 1 MΩ | 0,25 W, THT | 10 db |
| 12 | Öntapadós gumiláb | átlátszó, kb. Ø10 × 3 mm (3M Bumpon-típus) | 16 db |

Kérjük, adja meg tételenként a nettó egységárat, a mennyiségi kedvezményt, a raktárkészletet (vagy a beszerzési időt), valamint a szállítási díjat. Ahol a kért típus nem elérhető, egyenértékű javaslatot is szívesen fogadunk.

Kért ajánlatadási határidő: 2026-11-23. Kért szállítás: 2026-12-11-ig.
Szállítási cím: [szállítási cím]

Köszönettel:
[Név]
[e-mail]

---

### 2.2 EU-s elektronikai disztribútor (pl. Mouser, DigiKey, TME, The Pi Hut, Pimoroni)

**Tárgy:** Árajánlatkérés – Adafruit és Seeed modulok, 3 db prototípushoz

Tisztelt Hölgyem / Uram!

3 db prototípushoz kérünk árajánlatot az alábbi modulokra, lehetőség szerint **egy szállítmányban**, közösségi adószámmal (fordított adózás):

| # | Tétel | Gyártói cikkszám / adat | Mennyiség |
|---|---|---|---|
| 1 | Seeed ReSpeaker 2-Mics Pi HAT | Seeed **107100001** – a **v2.0** változatot kérjük (TLV320AIC3104 kodek, TPA2005D1 hangszóró-erősítő) | 3 db |
| 2 | Seeed Studio XIAO RP2040 | Seeed **102010428** | 3 db |
| 3 | Adafruit LSM6DS3TR-C 6-DoF IMU, STEMMA QT | Adafruit **4503** | 3 db |
| 4 | Rezgőmotor-modul | lapos ERM motor + tranzisztoros meghajtó egy panelen, 3,3–5 V, 3 tűs csatlakozó (PWM-bemenet) | 3 db |
| 5 | STEMMA QT / Qwiic → női Dupont-aljzatok, 150 mm | Adafruit **4397** | 3 db |
| 6 | USB-C panelbe szerelhető hosszabbító | aljzat–dugó, **10–15 cm**, füles panelrögzítéssel; a fül legfeljebb 31 × 2 mm, a fül mögötti test legfeljebb 13 × 8 mm | 3 db |
| 7 | Kerek kijelző 1,28", GC9A01, 240×240, IPS, SPI | kerek NYÁK-os kivitel, Ø ~37,5 mm | 3 db |
| 8 | Mini kameramodul OV5647 | Raspberry Pi Zero-hoz (22 pólusú, 0,5 mm-es FPC kábellel), kamerafej ~8,5 × 11,3 mm, fix fókusz (pl. Arducam B006603 vagy Pi Supply Spy Camera) | 3 db |
| 9 | S-alakú (síkban hajlítható) címezhető LED-szalag | WS2812B vagy SK6812, 5 mm széles, 60 LED/m, 5 V | 1 m |
| 10 | Raspberry Pi Zero 2 WH | gyárilag forrasztott tüskesorral (összehasonlításhoz; ha olcsóbb, mint a webboltban) | 3 db |

Kérjük, adja meg tételenként a nettó egységárat EUR-ban, a raktárkészletet, a várható szállítási időt, az ingyenes szállítás értékhatárát és a szállítási díjat Magyarországra. Ha valamelyik tétel kifutott vagy nem rendelhető (különösen a ReSpeaker hangszórókimenete), kérjük, jelezze, és ha van, javasoljon helyettesítőt.

Kért ajánlatadási határidő: 2026-11-23. Kért szállítás: 2026-12-11-ig.
Szállítási cím: [szállítási cím]

Köszönettel:
[Név]
[e-mail]

*Megjegyzés: angol nyelvű beszállítónak angolra fordítva küldendő. A Pi-Ener-lite UPS panelt (Tindie) webshopból, közvetlenül a gyártótól kell rendelni; ott ajánlatkérés helyett csak a kiszállítási díjat és a készletet kell megerősíteni.*

---

### 2.3 Eloxáló üzem (magyar felületkezelő vállalkozás)

**Tárgy:** Árajánlatkérés – 4 db alumínium lap szemcseszórása és dekoratív eloxálása

Tisztelt Hölgyem / Uram!

Egy asztali eszköz látható tetőlapjához kérünk árajánlatot szemcseszórásra és eloxálásra:

| Adat | Érték |
|---|---|
| Alkatrész | sík tetőlap, **72 × 72 × 2 mm** |
| Anyag | **EN AW-5754** (AlMg3) vagy **EN AW-6082** – kérjük, javasolja, melyik ad egyenletesebb dekoratív felületet; ha jobb, más eloxálható minőséget is elfogadunk |
| Megmunkálás | lézervágott / CNC-mart, sorjázva, a sarkok R1 lekerekítéssel; furatok: 4 × Ø2,8 mm süllyesztett (M2,5), 4 × Ø8,2 mm, 1 × Ø18 mm, 6 × Ø1,6 mm |
| Előkezelés | **szemcseszórás** (pl. üveggyöngy, finom, matt), mindkét oldalon vagy legalább a felső oldalon |
| Eloxálás | dekoratív, kb. 15–20 µm, színezve és tömítve; **két változatot kérünk árazni: fekete és natúr (színtelen)** |
| Látszó felület | a felső oldal; az akasztási / érintkezési pont kérjük a hátoldalon vagy egy csavarfuratban legyen |
| Mennyiség | **3 db + 1 tartalék = 4 db** |
| Rajz | DXF (1:1, mm) mellékelve lesz |

Kérjük, írja meg:
- a darabárat és a **minimális tételdíjat** (ha van),
- hogy a szemcseszórást Önök végzik-e, vagy előre szórt darabot kérnek,
- vállalják-e az **alapanyag beszerzését és a vágást** is (ebben az esetben kérjük, külön árazza),
- az átfutási időt és az átadás módját (személyes vagy futár).

Kért ajánlatadási határidő: 2026-11-23. Kért elkészülés: 2026-12-11-ig.
Szállítási cím: [szállítási cím]

Köszönettel:
[Név]
[e-mail]

---

### 2.4 Kötőelem-kereskedő (csavar, menetes betét)

**Tárgy:** Árajánlatkérés – M2,5 rozsdamentes csavarok és beolvasztható menetes betétek

Tisztelt Hölgyem / Uram!

3D nyomtatott alkatrészek összeszereléséhez kérünk árajánlatot az alábbi kötőelemekre:

| # | Tétel | Szabvány / anyag | Mennyiség |
|---|---|---|---|
| 1 | Beolvasztható menetes betét, **M2,5**, hossz 3–4 mm, Ø3,6 mm-es furatba | sárgaréz, hőre beültethető (pl. ruthex M2,5×4 vagy egyenértékű) | 100 db |
| 2 | Süllyesztett fejű imbuszcsavar **M2,5×8** | ISO 10642 / DIN 7991, A2 rozsdamentes | 50 db |
| 3 | Hengeres fejű imbuszcsavar **M2,5×6** | ISO 4762 / DIN 912, A2 | 60 db |
| 4 | Hengeres fejű imbuszcsavar **M2,5×14** | ISO 4762 / DIN 912, A2 | 20 db |
| 5 | Távtartó **M2,5 × 11 mm**, anya-anya | sárgaréz vagy nikkelezett | 12 db |

A mennyiségek kis tartalékot tartalmaznak. Ha csak nagyobb csomagban árulják, kérjük, a legkisebb kiszerelést árazza. Fekete felületű (pl. fekete cinkezett vagy fekete rozsdamentes) változat a 2. tételből előnyt jelent, mert látszó felületre kerül.

Kérjük, adja meg a nettó árakat, a kiszerelést, a raktárkészletet és a szállítási díjat.

Kért ajánlatadási határidő: 2026-11-23. Kért szállítás: 2026-12-04-ig.
Szállítási cím: [szállítási cím]

Köszönettel:
[Név]
[e-mail]

---

### 2.5 Alapanyag-kereskedő (akril, fa, gumi, alumínium)

**Tárgy:** Árajánlatkérés – opál akril és fa lemez lézervágáshoz, kis mennyiség

Tisztelt Hölgyem / Uram!

Házon belüli lézervágáshoz kérünk árajánlatot az alábbi alapanyagokra:

| # | Tétel | Műszaki adat | Mennyiség |
|---|---|---|---|
| 1 | Öntött PMMA (akril), **opál** fehér, fényáteresztő (kb. 30–50%) | **3 mm**, lézervágható | 1 db, kb. 500 × 250 mm |
| 2 | Öntött PMMA, opál fehér | **2 mm** | 1 db, kb. 200 × 200 mm |
| 3 | Bükk vagy tölgy, tömör vagy furnérozott rétegelt lemez | **2 mm**, lézervágható | 1 db, kb. 100 × 100 mm |
| 4 | *Ha forgalmaznak:* alumíniumlemez **EN AW-5754** vagy **6082** | **2 mm**, védőfóliás, méretre vágva **80 × 80 mm** | 4 db |

Hulladék- és maradékdarabokat is szívesen veszünk, ha a méret megfelel. Kérjük, adja meg a nettó árat, a vágási díjat (ha van) és a szállítási vagy átvételi lehetőséget.

Kért ajánlatadási határidő: 2026-11-23. Kért szállítás: 2026-12-04-ig.
Szállítási cím: [szállítási cím]

Köszönettel:
[Név]
[e-mail]

---

## 3. Mire figyeljünk

### Minimális rendelési mennyiségek, kiszerelések
- **Hestore:** darabra is rendelhető, de 5+, 10+, 20+ ártörések vannak (pl. a 6×6-os gomb 50 Ft helyett 22 Ft 10+ db-nál). A Pi Zero 2 W-nél az 5+ ár 11 469 Ft, ezért **5 db rendelése** csak akkor érdemes, ha a tartalék kell.
- **Menetes betétek:** 70 db-os csomag; 78 db kell (3 × 26) + selejt, ezért 2 csomag.
- **LED-szalag:** jellemzően csak 1 m-es vagy 5 m-es tekercsben kapható; 3 kockához 0,33 m kell → **1 m-t rendelünk** (2026-11-17).
- **PMMA, fa:** egész tábla vagy minimum vágási méret; érdemes **maradékot** kérni.
- **Eloxálás:** kis darabszámnál a **minimális tételdíj** a döntő. Ha a 4 tetőlap mellé más eloxálandó munka is van, együtt olcsóbb. Ha a minimum díj nagyon magas, a natúr (színtelen) eloxálás vagy a festett/porszórt alu is szóba jöhet. **Döntés (2026-11-17, M8):** a prototípus tetőlapjai más eloxálandó munkával együtt menjenek. A 25 000 Ft-os becslés a legrosszabb esetet mutatja.

### Szállítási idők és beszerzési kockázatok
- **Hangpanel:** az Adafruit Voice Bonnet (4757) kifutott (BerryBase: „nem szállítható”, Botland: „Discontinued”, DigiKey: „Obsolete”). **Döntés (2026-11-17): Seeed ReSpeaker 2-Mics Pi HAT + 1 hangszóró (mono).** A v1 (WM8960) több boltban már kifutott (SparkFun, Core Electronics); a v2.0 TLV320AIC3104 kodekes. **Hangszórókimenet ellenőrizve (2026-11-17):** a v2.0 kapcsolási rajza (2024-11-15) szerint a lapon **TPA2005D1** mono D-osztályú erősítő van (5 V-ról, 8 Ω-ra kb. 1,4 W), kimenete egy **2 tűs, 2,0 mm-es csatlakozón** (J2, A2001WF-02A, JST PH-kompatibilis), mellette 3,5 mm-es jack. Az erősítőt egy vezérlőjel (AMP_CTL) kapcsolja be. **Külön erősítőmodul nem kell.** **Még ellenőrizni:** a mikrofonok helyét (a tetőlap furataihoz) és a magasságot a modellben; rendeléskor a v2.0-t kérni.
- **Pi-Ener-lite:** Kínából, a Tindie-n „6 left in stock”, kiküldés ~5 nap + nemzetközi szállítás (kb. 1–3 hét, **becslés**). Időben rendelni kell. Tartalék: Geekworm X306 (drágább, ~54 USD [K]) vagy DFRobot UPS HAT.
- **Raspberry Pi Zero 2 W(H):** a Botlandnél és a BerryBase-nél kevés darab látszik (2026-11-17), a Hestore-nál „az átlagosnál hosszabb szállítási idő”, a welectronnál „hamarosan raktáron”. Két helyről érdemes ajánlatot kérni.
- **Mini kamera:** az Adafruit 1937-es „spy” kamera saját leírása szerint **nem Pi Zero-kompatibilis** a szalagkábele miatt; Pi Zero (22 pólusú) kábeles OV5647 modul kell, pl. Arducam B006603 vagy Pi Supply Spy Camera (8,5 × 11,3 mm). A Kailap JAL-KH3-C20B-1B (OV5640) sem jó: DVP párhuzamos interfészű, autofókuszos, 25 pólusú csatlakozóval.
- **XIAO RP2040:** a Botland csak regisztrált cégeknek (B2B) ad el; a TME-nél és a Mouseren kapható.

### Kiváltható vagy olcsóbb alternatívák (a TERVEZESI_ELVEK.md szerint)
- **Pi Zero 2 WH EU-s boltból:** **átvezetve** (2026-11-17).
- **AT42QT1010 elhagyása (érintés a XIAO-n, `touchio`) és DRV2605L helyett rezgőmotor-modul:** **átvezetve** (2026-11-17). Az érintést a prototípuson ki kell próbálni a fém tetőlap alatt.
- **Adafruit-breakoutok helyett általános modulok** (LSM6DS3): olcsóbbak, de a STEMMA QT csatlakozó gyakran hiányzik (ez ütközik a „csatlakozó forrasztás helyett” elvvel). Prototípushoz maradjon az Adafruit.
- **LED-gyűrű:** a Hestore Ø66 mm-es WS2812-es gyűrűje (3 429 Ft) olcsóbb és itthon kapható; az eredeti Adafruit NeoPixel Ring 24 kb. 13–16 £ [K].
- **Hangszóró:** **eldöntve (2026-11-16):** a Ø36 mm-es VISATON K 36 WP kerül be, a PETG rögzítőgyűrű Ø36-ra módosul (a 3D modellben még átvezetendő).
- **USB-C hosszabbító:** **átvezetve** (2026-11-17): általános, 10–15 cm-es; 2026-11-17 óta a ház hátfalában, szorítólappal (a fülfurat-távolság mindegy), a 3 mm hely a modellben ellenőrizve.
- **Tetőlap alapanyaga:** ha házon belül van 2 mm-es alu maradék, az alapanyag és a szállítás (~11 500 Ft) megspórolható.
- **Felület:** **átvezetve** (2026-11-17): mártásos színezés a szórófestés helyett (~3 000 Ft / 3 db). Az élek kopását dobáspróbával ellenőrizni.
- **Gumitalp:** **átvezetve** (2026-11-17): 4 db kész öntapadós gumiláb a Ø60-as EPDM talp helyett.

### Eltérések, amiket tisztázni kell
- **Csavarméret:** **eldöntve (2026-11-16): mindenhol M2,5** (betétek Ø3,6-os furatba, a tetőlapon Ø2,8-es süllyesztett furat). A dokumentumok át vannak vezetve; a 3D modellben és a DXF-ekben még átvezetendő.
- **microSD kártya és CR1220 elem:** **felvéve** a beszerzési tervbe és az ELEKTRONIKA.md alkatrészlistájába (2026-11-16).
- **Gépidő, energia, munkaórák:** a házon belüli gyártásnál csak az anyagköltséget számoltam.
- **Árfolyam:** a 390 Ft/EUR és 340 Ft/USD feltételezés; rendeléskor az aktuális MNB-árfolyammal újra kell számolni.

### Források (2026-11-16)
- Hestore.hu – kereső: Pi Zero 2 W, 18650, hangszóró, WS2812-gyűrű, 6×6 gomb
- [BerryBase – Adafruit Voice Bonnet](https://www.berrybase.de/adafruit-voice-bonnet-fuer-raspberry-pi-zwei-lautsprecher-zwei-mikrophone)
- [Tindie – Pi-Ener-lite](https://www.tindie.com/products/rachel/pi-ener-litea-portable-power-platform-for-pi-zero/)
- [welectron – Raspberry Pi Zero 2 W](https://www.welectron.com/Raspberry-Pi-Zero-2-W_1)
- [3DJake – ruthex M2 menetes betét (az M2,5-ös ár ehhez viszonyított becslés)](https://www.3djake.com/ruthex/threaded-insert-m2-70-pieces)
- [metallshopper.de – alumínium lemez 2 mm](https://metallshopper.de/Aluminiumblech-2mm)
- Keresési találatok (az oldalt nem nyitottam meg): eu.robotshop.com (GC9A01 kijelző), tme.eu (XIAO RP2040), DigiKey/Mouser (LSM6DS3TR-C, AT42QT1010, Voice Bonnet állapota), RS Components (DRV2605L), elektronicavoorjou.nl (Qwiic kábel), opencircuit.shop (USB-C 4218), hornbach.cz (opál akril), alza.hu (PETG), formlabs.com és sinterit.com (PA12 por), botland.store (Voice Bonnet állapota), adafruit.com (1937 kamera kompatibilitása)
