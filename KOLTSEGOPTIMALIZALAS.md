# C-kocka – költségoptimalizálás (v0.1, megbeszélésre)

> **Gyakorló anyag az AI-kihíváshoz.** Semmit nem rendeltem, ajánlatkérést nem küldtem. Az árak tájékoztató **becslések** (2026-11-17), a kiindulás az [AJANLATKERESEK.md](AJANLATKERESEK.md) 3 db-os költségbecslése (**139 137 Ft/db nettó**, 10% tartalékkal).
> Ez a [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) 2. pontjában „külön költségoptimalizálási lépésként” későbbre hagyott kör.

## Hogyan olvasd
- **Megtakarítás/db:** nettó forint kockánként. Az első szám a **3 db-os prototípusra** vonatkozik, a második a **sorozatra (100 / 500 / 2000 db)**, ha ott eltér.
- **Munkaidő:** kb. **10 000 Ft/óra** (a [PIACI_TANULMANY.md](PIACI_TANULMANY.md) 1,5 órás, 35–40 €-s szerelési költségéből). Az AJANLATKERESEK.md csak az anyagot számolja, ezért a munkaidő-megtakarítást mindenhol külön jelölöm (**„mi:”**).
- **Átváltás:** 1 EUR = 390 Ft, 1 USD = 340 Ft (ugyanaz, mint az AJANLATKERESEK.md-ben).
- **Elvek oszlop:** ✅ összhangban van a tervezési elvekkel · ⚠️ **ütközik** egy elvvel vagy egy korábbi döntéssel. Ezt csak Zollo jóváhagyásával lehet bevezetni.
- **Kockázat:** alacsony / közepes / magas, és hogy mit kell kipróbálni.

---

## 1. Elektronika (a kockánkénti költség kb. 60%-a)

| # | Jelenlegi | Javasolt | Megtakarítás/db (3 db → sorozat) | Kockázat | Elvek |
|---|---|---|---|---|---|
| **E1** | Pi Zero 2 W a Hestore-tól, 12 133 Ft | Ugyanaz EU-s webboltból (welectron 16,72 € ≈ 6 521 Ft), sorozatnál hivatalos disztribútortól | **−5 600** → −5 000 | alacsony: készlet („hamarosan raktáron”) | ✅ |
| **E2** | AT42QT1010 érintőpanel (2 005 Ft) + vezetékek | A XIAO RP2040 maga érzékeli az érintést (CircuitPython `touchio`), csak egy 1 MΩ-os lehúzó ellenállás kell | **−2 000** → −1 700; egy modullal és egy kábellel kevesebb | közepes: az alu tetőlap közelsége ronthatja az érzékenységet → prototípuson kipróbálni; tartalék: az AT42QT1010 visszatehető | ⚠️ enyhén: az ellenállást forrasztani kell. A gomboknak úgyis van forrasztott prototípus-lapja, ezért oda kerül, külön forrasztási lépés nem kell |
| **E3** | DRV2605L haptikus vezérlő (3 654 Ft) + rezgőmotor (800 Ft) + 1 Qwiic kábel | Kész rezgőmotor-modul (motor + tranzisztor egy kis panelen, 3 tűs, ~1 € ≈ 400 Ft), a XIAO PWM-kimenetéről hajtva | **−4 400** → −3 000 | alacsony–közepes: elvész a DRV2605L hatáskönyvtára. A „Ne zavarj” jelzéshez a PWM-mel adagolt rezgés elég | ✅ kész modul, tüskesoros csatlakozóval (Dupont/JST), forrasztás nélkül |
| **E4** | Adafruit 4218 USB-C panelhosszabbító, 30 cm (5 168 Ft) | Általános, rövid (10–15 cm), panelbe szerelhető USB-C hosszabbító (~2 € ≈ 800 Ft), ugyanúgy a tálca peremén | **−4 400** | alacsony: a fül és a furatkép más lehet → a tálca peremén ellenőrizni, hogy meglegyen a **3 mm** hely | ✅ |
| **E5** | Pi-Ener-lite UPS (35 USD ≈ 11 900 Ft) + kínai szállítás és importÁFA (≈ 2 360 Ft/db) + CR1220 elem | Kész 18650-es töltő-/feszültségnövelő modul USB-C-vel (~2,5–3 €) + **MAX17048** töltöttségmérő **STEMMA QT** panel (~6 €) a meglévő Qwiic láncon + 18650-es tartó. Óra (RTC) helyett idő NTP-ről, Wi-Fin | **−10 900** → −8 500 (2000 db-nál a saját panelbe olvad, lásd S1) | **közepes–magas:** a powerbank-chipek kis terhelésnél lekapcsolhatnak, töltő bedugásakor tápletörés jöhet, és nincs vezérelt leállás (SD-kártya-sérülés veszélye). **Egy kockán prototípusként ki kell próbálni**, és ha nem válik be, marad a Pi-Ener-lite | ✅ kész modulok. Ellenőrizni: az akku alulról kivehető maradjon, a szán polcát át kell rajzolni, és meg kell maradnia a 3 mm helynek |
| **E6** | Adafruit Voice Bonnet (8 997 Ft, **kifutott**) + 2 hangszóró | **Seeed ReSpeaker 2-Mics Pi HAT** (~10 € ≈ 3 900 Ft, szintén WM8960) **+ 1 hangszóró** (mono). A második rács maradhat díszként | **−7 400** (mi: −500) → −6 000 | közepes: más a mikrofonok helye (a tetőlap 2 hasznos furata és a DXF változik), ellenőrizni kell a magasságot, és mono lesz a hang | ⚠️ **ütközik a 2026-11-16-i döntéssel** („a Voice Bonnet marad”) és a sztereó kimenettel. Érv mellette: 90 mm-es hangszórótávolságnál a sztereó hatás gyakorlatilag nem hallható, sorozatban pedig a Bonnet úgysem kapható |
| **E7** | Kerek GC9A01 kijelző (~3 400 Ft) és OV5647 mini kamera (~5 000 Ft) EU-s boltból | 100 db-tól közvetlenül ázsiai gyártótól/nagykertől (kijelző ~3,5 €, kamera ~6 €) | 3 db-nál nem éri meg → −2 000 (100) / −4 000 (500, 2000) | közepes: minőségszórás, eltérő lábkiosztású változatok → bejövő ellenőrzés kell (ez munkaidő) | ✅ |
| **E8** | Adafruit LSM6DS3TR-C IMU (3 338 Ft) | Más gyártó Qwiic/STEMMA QT csatlakozós LSM6DS3 (vagy hasonló) panelje | 3 db-nál nem éri meg → −1 800 (500-tól) | alacsony | ✅ csak Qwiic csatlakozós panel jöhet szóba. A tüskesoros, forrasztandó olcsó panelek **ütköznek** a „csatlakozó forrasztás helyett” elvvel, ezért nem javaslom őket |
| **E9** | S-alakú LED-szalag 5 m-es tekercsben (7 500 Ft) | 1 m-es kiszerelés (~2 500 Ft), 3 kockához 0,33 m kell | **−1 700** → 0 | alacsony | ✅ |
| **E10** | microSD 32 GB (becslés: 3 000 Ft) | Márkás A1 kártya tételben, a rendszert egyszerre több kártyára írva | 3 db-nál 0 → −1 500 (100-tól) | alacsony | ✅ |

**Nem javaslom (megvizsgáltam):**
- **A XIAO RP2040 elhagyása** (minden a Pi-re kerülne): ~2 000 Ft/db lenne a megtakarítás. Viszont elvész a valós idejű LED- és gombkezelés, a GPIO-kat ütköztetni kellene a hangpanellel és a kijelzővel, és a kész XIAO-szoftvert újra kellene írni. Nem éri meg.
- **XIAO RP2040 + IMU → XIAO nRF52840 Sense** (beépített IMU-val): nem olcsóbb, csak egy modullal kevesebb.
- **Kisebb LED-gyűrű:** a Ø66-os diffúzor és a fényhatás miatt nem éri meg.

---

## 2. Mechanika, kötőelemek, anyagok

| # | Jelenlegi | Javasolt | Megtakarítás/db (3 db → sorozat) | Kockázat | Elvek |
|---|---|---|---|---|---|
| **M1** | 4 féle csavar + távtartó: M2,5×6 és ×8 süllyesztett, M2,5×6 és ×14 hengeres fejű | **3 féle:** minden süllyesztett csavar M2,5×8 (tetőlap, diffúzor, szánláb), hengeres fejűből M2,5×6 (előlap, hangszóró) és M2,5×14 (tálca). A ×8-as csavarnak a diffúzornál és a szánlábnál ~1 mm-rel mélyebb vakfurat kell a betét alatt; a nyomtatott alkatrészen ez nem kerül semmibe | **−300** → −100, és **nem lehet összekeverni** a csavarokat (szerelési hiba) | alacsony: a modellben ellenőrizni a furatmélységeket | ✅ |
| **M2** | 25 db beolvasztott M2,5 betét kockánként | Betét csak oda, ahol **szerviz miatt bontunk** (tetőtartó 4, tálca–ház 4 = 8 db). A ritkán bontott 17 helyen (előlap 4, hangszóró 6, diffúzor 3, szánláb 4) **műanyagba való menetformáló csavar**, közvetlenül a nyomtatott furatba | **−700** (mi: −950) | közepes: sokszori szerelésnél kiszakadhat a menet (a műanyagba menetformáló csavarok kb. 5–10 bontást bírnak); új csavartípus jön be (ellentétes M1-gyel) | ⚠️ **ütközik** a „Csavarok ragasztás helyett (**M2,5-ös menetes betétek**)” elvvel, amely kifejezetten betétet ír |
| **M3** | 8 TPU gumisarok **ragasztva** | Bepattintható TPU sarok: gombafejű csap a sarokban, a SLS házban hozzá furat (nyomtatáskor, ingyen) | **−700** (mi: −800) → −800; nincs ragasztó és várakozás, a sarok cserélhető | közepes: dobáskor kiugorhat → csap visszahajló fejjel; a csap a ház belsejébe is benyúlik, ezért a sarkokban ellenőrizni a **3 mm** helyet (ott vannak a tálcaoszlopok) | ✅ jobban illik az elvekhez, mint a ragasztás (a ragasztás itt csak engedett kivétel) |
| **M4** | Érintőbetét külön 2 mm-es opál akrilból (külön tábla, 2 000 Ft) | 3 mm-es opál akril, **ugyanabból a táblából**, mint a C és a diffúzor. Alul 1 mm-rel kilóg, ugyanúgy, mint a C, így a szilikon jobban megfogja | **−700** → ~0, de egy alapanyaggal kevesebb | alacsony: az elektróda 1 mm-rel távolabb kerül (ezt E2-vel együtt kell kipróbálni); ellenőrizni a helyet a tetőtartó felett | ✅ |
| **M5** | Ø60 EPDM gumitalp (lemez + lézer- vagy vízvágás) | 3–4 db **kész, öntapadós, átlátszó gumiláb** (3M Bumpon-típus, ~50 Ft/db), a diffúzorcsavarok közé | **−800** → −300; egy vágási művelettel kevesebb, és több fény jut át az alsó gyűrűn | alacsony: alulról nézve más lesz a kinézet | ✅ kész alkatrész |
| **M6** | SLS ház **festése** (alapozó + matt grafit / soft-touch szórófesték, ~4 000 Ft/db + maszkolás, száradás) | **Mártásos színezés** (fekete/grafit, a PA12-höz való festékfürdő), szemcseszórás után | **−3 000** (mi: −2 500) → −3 000 | alacsony–közepes: csak sötét szín jöhet szóba, kevésbé „soft-touch”, a kopott éleken kivilágosodhat → dobáspróba. **Előny:** a festékréteg nem eszi meg a C horony 0,1 mm-es hézagát és a betétek furatait | ✅ (a 2026-11-13-i javaslat ezt eleve alternatívaként felsorolta) |
| **M7** | Tetőlap: vágás, külön süllyesztés, kézi sorjázás, R1 sarok kézzel | **R1 sarok a DXF kontúrjában**. Prototípusnál CNC-marás lapból, **egy felfogásban** (kontúr, furatok, süllyesztés egy programban, tartófülekkel vagy vákuumasztalon). Sorozatnál lézervágás táblából, egymás mellé rendezve, utána **egy egyszerű süllyesztő készülék** (satupofa + 2 illesztőcsap, 4–8 lap felfogásonként) | mi: **−800** → −500 | alacsony | ✅ a készülék olcsó, nem drága szerszám |
| **M8** | Eloxálás kis tételben (becslés: 25 000 Ft / 4 db, a minimális tételdíj miatt) | Prototípusnál **más eloxálandó munkához csatolva** (megosztott tételdíj). 500 db-tól: **előeloxált lemezből vágva**, a látszó élen CNC-élletöréssel (fényes alu fazon díszként), így nincs külső eloxálás és oda-vissza szállítás | **−5 000** → −300…−600 | közepes: az előeloxált lemez vágott élei natúr alumíniumok (beltéren nem korrodál); a kinézet más | ⚠️ **egyeztetni:** a „szép, igényes, eloxált” döntés (2026-11-13) teljesül, de a natúr él más megjelenés |
| **M9** | Szilikon kötése 24 óra, szerelés közben | Sorozatnál a C és az érintőbetét beültetése **a teljes tételen egy nappal előbb**, külön munkalépésként | 0 Ft, de nem áll a szerelés | alacsony | ✅ (a semleges szilikon marad, Zollo döntése) |
| **M10** | Hangszóró-rögzítő gyűrű 3 csavarral, oldalanként | Bajonettzáras gyűrű, a SLS házba nyomtatott fogakkal (ha E6 miatt csak 1 hangszóró marad, akkor csak egy) | **−500** (mi: −700) | közepes: hangos zenénél zöröghet → rugalmas TPU alátét | ✅ (nem ragasztás); szervizben is bontható |

**Az elvek miatt drágább, de így marad:**
- **Pi Zero 2 WH (gyárilag beforrasztott tüskesorral)** a fej nélküli Pi + 150 Ft-os tüskesor helyett. Az AJANLATKERESEK.md 2. tétele forrasztást feltételez, ez ütközne a „csatlakozók forrasztás helyett” elvvel. Kb. +1 €/db, de így tiszta.
- **Fröccsöntött ház:** 5000 db felett olcsóbb, de **ütközik** a „nincs drága szerszám” elvvel. 2000 db-ig a házon belüli SLS marad.
- **Teljes alumínium ház:** nehéz (~330 g, dobálva veszélyes) és drága, a 2026-11-13-i döntés szerint nem jön szóba.

---

## 3. Gyártás és szerelés sorozatnagyság szerint

| # | Lépés | Javaslat | 100 db | 500 db | 2000 db | Kockázat | Elvek |
|---|---|---|---|---|---|---|---|
| **G1** | SLS-nyomtatás | **Fészkelés:** a 9 mm-es tálca a ház üregébe kerül a nyomtatási térben (SLS-nél nem kell támasz), így egy építésbe kb. kétszer annyi kocka fér. 500 db-tól a PETG belső alkatrészek (szán, tartók) is mehetnek SLS-be, a házak üregeibe → nincs FDM-gépidő és támaszeltávolítás | −1 500 (gépidő, becslés) | −2 000 | −2 500 | közepes: a fészkelt részekből nehezebb kiszedni a port; a részek közt legalább 2–3 mm hézag kell, különben összeolvadnak | ✅ |
| **G2** | SLS-por | A por frissítési arányát a géphez kell beállítani (a 3 db-os becslés kétszeres anyagigénnyel számol, ez tételben kb. 1,3–1,5×) | −2 000 | −2 000 | −2 000 | alacsony | ✅ (nem változtatás, csak pontosabb számolás) |
| **G3** | Kábelezés | Előre gyártott kábelköteg (JST-SH/PH, kész hosszra) a vezetékek helyben vágása és krimpelése helyett | mi: −1 000 | −1 500 | −1 500 | alacsony | ✅ |
| **G4** | Kipróbálás a házon kívül (6. lépés) | Egy „arany” tesztkábel-készlet + automatikus tesztprogram a Pi-n (a szimulátor tesztjeire építve), ami végigkapcsol mindent, és kiírja, mi jó és mi nem | mi: −800 | −800 | −800 | alacsony | ✅ |
| **G5** | Gomb- és csatlakozólap | Kis, **passzív összekötő panel** (JST-aljzatok, a 4 gomb, az érintés ellenállása egy lapon) a forrasztott prototípus-lap helyett, NYÁK-gyártótól (~1 €/db 500 db-nál) | – | mi: −3 000 | −3 000 | alacsony | ⚠️ **ütközik** az ELEKTRONIKA.md „saját NYÁK nélkül” céljával és a „kész alkatrészek” elvvel. Szerszám nem kell hozzá (gyártótól rendelt NYÁK, nem saját maratás) |
| **S1** | Elektronika | **Saját alappanel** a Pi Zero 2 W (vagy CM) modul mellé: hang (kodek + erősítő), töltés + töltöttségmérés, LED-meghajtás, mikrovezérlő, IMU egy lapon. A rádiós rész az előtanúsított Pi modulon marad | nem éri meg | −10 000 (a fejlesztési költség, kb. 2–4 M Ft becslés, ráosztva) | **−20 000** | magas: fejlesztési idő, tesztelés, CE/RED | ⚠️ **ütközik** a „kész alkatrészek” elvvel. A [PIACI_TANULMANY.md](PIACI_TANULMANY.md) szerint viszont 1000 db fölött ez a legnagyobb költségcsökkentő lépés, és a kifutott Voice Bonnet miatt valós gyártásnál amúgy is kellene |

---

## 4. Beszerzés (prototípus)

| # | Jelenlegi | Javasolt | Megtakarítás/db (3 db) | Kockázat | Elvek |
|---|---|---|---|---|---|
| **B1** | 9 külön szállítás (36 750 Ft) | A Voice Bonnet (vagy E6), a LED-szalag és a kötőelemek **egy EU-s disztribútortól**, a többi modullal együtt (ingyenes szállítási határ fölött). E5 esetén a Tindie-s import is kiesik (azt E5-nél számoltam) | **−2 300** | alacsony | ✅ |
| **B2** | Alu lemez a metallshopper.de-ről + szállítás (11 482 Ft) | Házon belüli 2 mm-es maradék lemezből | **−3 800** | alacsony: az ötvözetet ellenőrizni (az eloxáláshoz 5754 vagy 6082 kell, ismeretlen maradék helyett) | ✅ |

---

## 5. Összesítés

### 5.1 Prototípus (3 db)
| | Ft/db (nettó) |
|---|---|
| Kiindulás (AJANLATKERESEK.md, 10% tartalékkal) | 139 137 |
| Az elvekkel összhangban lévő javaslatok anyagmegtakarítása (E1, E2, E3, E4, E5, E9, M1, M4, M5, M6, M8, B1, B2) | **kb. −45 000** |
| + a jóváhagyást igénylő javaslatok (E6, M2) | kb. −8 000 |
| Munkaidő-megtakarítás (M2, M3, M6, M7, kevesebb modul bekötése) | kb. −30–35 perc, ≈ −5 500 |
| **Optimalizált prototípus, anyag (a 10% tartalékkal együtt)** | **kb. 90 000 Ft/db** (a jóváhagyást igénylőkkel kb. 81 000) |

A legnagyobb tétel (E5) a legkockázatosabb is: ha nem válik be, a megtakarítás kb. 11 000 Ft-tal kisebb. A pontos számokhoz a valódi ajánlatok kellenek (lásd AJANLATKERESEK.md).

### 5.2 Elektronika 100 db-nál, optimalizálva (becslés)
| Tétel | Ft/db |
|---|---|
| Pi Zero 2 W (WH) | 6 000 |
| ReSpeaker 2-Mics HAT (E6) / Voice Bonnet helyett | 3 900 |
| Töltőmodul + MAX17048 + tartó (E5) | 2 500 |
| 18650 cella | 3 500 |
| Kijelző + kamera (E7) | 3 700 |
| 1 hangszóró (E6) | 1 500 |
| LED-gyűrű + C szalag | 2 900 |
| XIAO RP2040 + IMU + rezgőmodul (E3) | 4 600 |
| Gombok, Qwiic, USB-C (E4), microSD, kábelköteg | 5 300 |
| **Összesen** | **kb. 34 000 Ft ≈ 87 €** |

A PIACI_TANULMANY.md 100 db-ra **~120 €** elektronikával és **~185 €** önköltséggel számol. Az optimalizálással az elektronika kb. **−33 €**, a mechanika és a szerelés (M6, M7, G1–G4) kb. **−8 €** → **kb. 145–150 €/db** önköltség. Így a 299 €-s limitált árnál (235 € nettó) a bruttó árrés **~21%-ról ~37%-ra** nő. *(CE nélkül, ahogy a PIACI_TANULMANY.md is a 100 db-os sorozatot.)*

### 5.3 Melyik javaslat melyik sorozatnál
| Javaslat | 3 db | 100 db | 500 db | 2000 db |
|---|---|---|---|---|
| E1, E4, E9, B1, B2, M1, M4, M5 (beszerzés, egyszerű cserék) | ✅ | ✅ | ✅ | ✅ |
| E2, E3, E5 (kevesebb vagy olcsóbb modul) | 1 kockán kipróbálni | ✅ | ✅ | S1-be olvad |
| E6 (ReSpeaker + mono) | döntés kell | ✅ (a Bonnet nem kapható) | ✅ | S1-be olvad |
| E7, E8, E10 (közvetlen forrás) | – | ✅ | ✅ | ✅ |
| M6 (színezés), M7 (egy felfogás) | ✅ | ✅ | ✅ | ✅ |
| M8 (előeloxált lemez) | csatolt eloxálás | csatolt eloxálás | ✅ | ✅ |
| G1–G4 (fészkelés, kábelköteg, teszt) | – | ✅ | ✅ | ✅ |
| G5 (passzív összekötő panel) | – | – | döntés kell | döntés kell |
| S1 (saját alappanel) | – | – | döntés kell | ✅ ha jóváhagyva |

---

## 6. Rangsor: top 5

A sorrend a **megtakarítás × megvalósíthatóság × elvekkel való összhang** alapján. Elvvel ütköző javaslat nincs a top 5-ben.

1. **E5 – UPS panel helyett kész töltőmodul + Qwiic töltöttségmérő:** kb. **−10 900 Ft/db**, és kiesik a kínai import is. A legnagyobb tétel, de a legkockázatosabb: **egy prototípus-kockán** ki kell próbálni (alvó terhelés, töltő bedugása, leállás). Ha nem válik be, marad a Pi-Ener-lite.
2. **E1 + B1 + B2 – beszerzési csomag:** a Pi máshonnan, összevont EU-s rendelés, alu maradékból: kb. **−11 700 Ft/db**. Nincs tervezési változás, kockázat gyakorlatilag nincs.
3. **E2 + E3 – két modul kevesebb** (érintés a XIAO-n, egyszerű rezgőmodul): kb. **−6 400 Ft/db**, két modullal és egy kábellel kevesebb, rövidebb bekötés. Az érintést M4-gyel együtt kell kipróbálni a fém tetőlap alatt.
4. **M6 – mártásos színezés festés helyett:** kb. **−5 500 Ft/db** anyagban és munkaidőben. Ráadásul a festékréteg nem rontja el a 0,1 mm-es illesztéseket. Dobáspróbával ellenőrizni az élek kopását.
5. **E4 – általános USB-C hosszabbító:** **−4 400 Ft/db**, gyakorlatilag kockázat nélkül, csak a tálca peremén a furatképet kell igazítani.

**A top 5 után, döntést igényel:**
- **M8 eloxálás** (prototípusnál csatolás más munkához, kb. −5 000 Ft/db; sorozatban előeloxált lemez, natúr éllel – a kinézet miatt egyeztetni).
- **E6 ReSpeaker + 1 hangszóró** (−7 400 Ft/db, de felülírja a 2026-11-16-i döntést; sorozatnál a Bonnet kifutása miatt amúgy is kell).
- **S1 saját alappanel** 2000 db-nál (kb. −20 000 Ft/db, ütközik a „kész alkatrészek” elvvel).

---

## 7. Észrevételek más dokumentumokban (nem javítottam, csak jelzem)
- **SZERELES.md:** a hengeres fejű csavaroknál „ISO 7380 / DIN 912” szerepel, de az ISO 7380 lencsefejű, a DIN 912 hengeres fejű (imbusz). Az AJANLATKERESEK.md DIN 912-t (ISO 4762) kér. Egyet kell választani; a lencsefejű alacsonyabb és általában olcsóbb is.
- **AJANLATKERESEK.md, 2. tétel:** a fej nélküli Pi + tüskesor forrasztást jelent → helyette a Pi Zero 2 WH (lásd a 2. fejezet végét).
- **ELEKTRONIKA.md:** a modultáblázat E2, E3, E4, E5 és E6 elfogadása esetén módosul; a tetőlap mikrofonfuratai E6 esetén a DXF-ben is.
