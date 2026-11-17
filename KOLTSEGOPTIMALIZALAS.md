# C-kocka – költségoptimalizálás (v0.1, megbeszélésre)

> **Gyakorló anyag az AI-kihíváshoz.** Semmit nem rendeltem, ajánlatkérést nem küldtem. Az árak tájékoztató **becslések** (2026-11-17), a kiindulás az [AJANLATKERESEK.md](AJANLATKERESEK.md) 3 db-os költségbecslése (**140 044 Ft/db nettó**, 10% tartalékkal; a Pi Zero 2 WH felárával együtt, lásd 7. fejezet).
> Ez a [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) 2. pontjában „külön költségoptimalizálási lépésként” későbbre hagyott kör.

## Hogyan olvasd
- **Megtakarítás/db:** nettó forint kockánként. Az első szám a **3 db-os prototípusra** vonatkozik, a második a **sorozatra (100 / 500 / 2000 db)**, ha ott eltér.
- **Munkaidő:** kb. **10 000 Ft/óra** (a [PIACI_TANULMANY.md](PIACI_TANULMANY.md) 1,5 órás, 35–40 €-s szerelési költségéből). Az AJANLATKERESEK.md csak az anyagot számolja, ezért a munkaidő-megtakarítást mindenhol külön jelölöm (**„mi:”**).
- **Átváltás:** 1 EUR = 390 Ft, 1 USD = 340 Ft (ugyanaz, mint az AJANLATKERESEK.md-ben).
- **Elvek oszlop:** ✅ összhangban van a tervezési elvekkel · ⚠️ **ütközik** egy elvvel vagy egy korábbi döntéssel. Ezt csak Zollo jóváhagyásával lehet bevezetni.
- **Kockázat:** alacsony / közepes / magas, és hogy mit kell kipróbálni.

## Döntések (Zollo, 2026-11-17)
| Javaslat | Döntés | Átvezetve |
|---|---|---|
| E1 Pi Zero 2 WH EU-s boltból, E4 általános USB-C, E9 1 m LED-szalag | ✅ elfogadva | AJANLATKERESEK.md, ELEKTRONIKA.md |
| E2 érintés a XIAO-n, E3 rezgőmotor-modul | ✅ elfogadva (prototípuson kipróbálni) | AJANLATKERESEK.md, ELEKTRONIKA.md, SZERELES.md |
| M6 mártásos színezés | ✅ elfogadva | AJANLATKERESEK.md, GYARTASI_TERV.md |
| M5 gumilábak a gumitalp helyett | ✅ elfogadva | AJANLATKERESEK.md, GYARTASI_TERV.md, SZERELES.md |
| E6 ReSpeaker + 1 hangszóró (mono) – **elvi eltérés jóváhagyva** | ✅ elfogadva | AJANLATKERESEK.md, ELEKTRONIKA.md, GYARTASI_TERV.md, SZERELES.md. **Ellenőrizve (2026-11-17):** a v2.0 kapcsolási rajza szerint TPA2005D1 mono erősítő és 2 tűs, 2,0 mm-es hangszórócsatlakozó van a lapon → külön erősítő nem kell, a megtakarítás marad |
| S1/G5 saját NYÁK sorozatban – **elvi eltérés jóváhagyva** | ✅ 500 db fölött tervezhető | a prototípust nem érinti |
| E5 töltőmodul a Pi-Ener-lite helyett | ❌ elvetve, **marad a Pi-Ener-lite** | – |
| M2 kevesebb menetes betét | ❌ nem engedélyezve, maradnak a betétek | – |
| *A következő sorokban Zollo a döntést Claude-ra bízta („az optimalizálást rád bízom”, 2026-11-17). Elvvel ütköző javaslat nincs köztük.* | | |
| M1 közös csavarméret | ✅ elfogadva: 3 féle csavar marad. Süllyesztett fejűből csak M2,5×8 (tetőlap, USB-C szorítólap, diffúzor, szánlábak), hengeres fejűből M2,5×6 (előlap, hangszóró, IMU) és M2,5×14 (tálca). A diffúzornál és a szánlábaknál ~1 mm-rel mélyebb vakfurat kell | a 3D-munkamenet vezeti át (modell, SZERELES.md, AJANLATKERESEK.md) |
| M7 tetőlap: R1 sarok a DXF-ben, egy felfogás | ✅ elfogadva: ingyen van, és kiváltja a kézi sorjázást. A GYARTASI_TERV.md nyitott „R1 vagy sorjázás” kérdését is lezárja | a 3D-munkamenet vezeti át (DXF) |
| M8 eloxálás | ✅ prototípusnál: a 4 tetőlap **más eloxálandó munkával együtt** menjen (csak szervezés). ⏸ Sorozatnál az előeloxált lemez halasztva: a natúr vágott él más megjelenés, ezt a kész prototípuson érdemes megnézni | AJANLATKERESEK.md (megjegyzés) |
| B1 összevont rendelés | ✅ elfogadva: ami lehet, az EU-s disztribútortól egy csomagban | AJANLATKERESEK.md (megjegyzés) |
| B2 alu maradékból | ✅ elfogadva, ha van házon belül 2 mm-es **5754 vagy 6082** maradék. Ismeretlen ötvözetű maradék nem jó, mert foltos lesz az eloxálás | – (a költségvetésben a vásárolt lemez marad tartaléknak) |
| M3 bepattintható gumisarkok | ⏸ halasztva: a kocka dobálható, és ha a sarok dobáskor leesik, az a fő funkciót rontja. A prototípus ragasztott sarkokkal készül (az elv ezt kifejezetten engedi), a pattintós változat a dobáspróba után jöhet | – |
| M4 3 mm-es érintőbetét | ❌ most nem: az érintést a XIAO érzékeli (E2), és ez a fém tetőlap alatt még nincs kipróbálva. +1 mm-es betéttel két kockázat adódna össze, a megtakarítás pedig kb. 700 Ft/db | – |
| M10 bajonettes hangszórógyűrű | ❌ nem: 1 hangszóró maradt, így a megtakarítás kb. 500 Ft/db, és a hangszóró zöröghet | – |
| G1–G4, E7, E8, E10 (sorozat) | ✅ a sorozat tervébe felvéve (fészkelés az SLS-ben, porfrissítés, kábelköteg, automatikus teszt, közvetlen beszerzés). A prototípust nem érinti | – |

**Az új kiindulás:** az AJANLATKERESEK.md végösszege a döntések átvezetése után **319 982 Ft nettó / 3 db = 106 661 Ft/db** (előtte 140 044 Ft/db).

**Még nincs átvezetve (külön lépés kell hozzá):** a 3D modell és a DXF-ek (1 hangszórótartó, ReSpeaker-mikrofonfuratok a tetőlapon, gumitalp helyett gumilábak), a szerelési ábrák, a firmware (érintés `touchio`-val, rezgés PWM-mel, ReSpeaker hangpanel), valamint a weboldal és a videó szövegei.

---

## 1. Elektronika (a kockánkénti költség kb. 60%-a)

| # | Jelenlegi | Javasolt | Megtakarítás/db (3 db → sorozat) | Kockázat | Elvek |
|---|---|---|---|---|---|
| **E1** | Pi Zero 2 W a Hestore-tól (12 133 Ft) + WH felár (975 Ft) | **Pi Zero 2 WH** EU-s webboltból (pl. Botland 16,99 € nettó ≈ 6 626 Ft [K]; a fej nélküli W a welectronnál 16,72 €), sorozatnál hivatalos disztribútortól | **−6 500** → −5 000 | alacsony: készlet (a boltok kevés darabot mutatnak, több helyről kell ajánlat) | ✅ (gyárilag forrasztott tüskesor) |
| **E2** | AT42QT1010 érintőpanel (2 005 Ft) + vezetékek | A XIAO RP2040 maga érzékeli az érintést (CircuitPython `touchio`), csak egy 1 MΩ-os lehúzó ellenállás kell | **−2 000** → −1 700; egy modullal és egy kábellel kevesebb | közepes: az alu tetőlap közelsége ronthatja az érzékenységet → prototípuson kipróbálni; tartalék: az AT42QT1010 visszatehető | ⚠️ enyhén: az ellenállást forrasztani kell. A gomboknak úgyis van forrasztott prototípus-lapja, ezért oda kerül, külön forrasztási lépés nem kell |
| **E3** | DRV2605L haptikus vezérlő (3 654 Ft) + rezgőmotor (800 Ft) + 1 Qwiic kábel | Kész rezgőmotor-modul (motor + tranzisztor egy kis panelen, 3 tűs, ~1 € ≈ 400 Ft), a XIAO PWM-kimenetéről hajtva | **−4 400** → −3 000 | alacsony–közepes: elvész a DRV2605L hatáskönyvtára. A „Ne zavarj” jelzéshez a PWM-mel adagolt rezgés elég | ✅ kész modul, tüskesoros csatlakozóval (Dupont/JST), forrasztás nélkül |
| **E4** | Adafruit 4218 USB-C panelhosszabbító, 30 cm (5 168 Ft) | Általános, rövid (10–15 cm), panelbe szerelhető USB-C hosszabbító (~2 € ≈ 800 Ft), ugyanúgy a tálca peremén | **−4 400** | alacsony: a fül és a furatkép más lehet → a tálca peremén ellenőrizni, hogy meglegyen a **3 mm** hely | ✅ |
| **E5** | Pi-Ener-lite UPS (35 USD ≈ 11 900 Ft) + kínai szállítás és importÁFA (≈ 2 360 Ft/db) + CR1220 elem | Kész 18650-es töltő-/feszültségnövelő modul USB-C-vel (~2,5–3 €) + **Adafruit MAX17048** (#5580) töltöttségmérő **STEMMA QT** panel (DigiKey: ~5,1 € nettó [K]) a meglévő Qwiic láncon + 18650-es tartó. Óra (RTC) helyett idő NTP-ről, Wi-Fin | **−11 000** → −8 500 (2000 db-nál a saját panelbe olvad, lásd S1) | **magas:** (1) a powerbank-chipek kis terhelésnél lekapcsolhatnak, töltő bedugásakor tápletörés jöhet, és nincs vezérelt leállás (SD-kártya-sérülés veszélye); (2) **töltőáram:** a hőkezelési vizsgálat (HOKEZELES.md, a thermal ágon) **0,5 A-es töltést** javasol, az IP5306-os modulok viszont alapból ~2,1 A-rel, a TP4056-osok 1 A-rel töltenek, és az állításhoz SMD-ellenállást kell cserélni (forrasztás). Csak gyárilag ≤ 0,5–1 A-es modul jöhet szóba, ilyet még nem találtam. **Egy kockán ki kell próbálni**, és ha nem válik be, marad a Pi-Ener-lite | ✅ kész modulok. Ellenőrizni: az akku alulról kivehető maradjon, a szán polcát át kell rajzolni, és meg kell maradnia a 3 mm helynek |
| **E6** | Adafruit Voice Bonnet (8 997 Ft, **kifutott**) + 2 hangszóró | **Seeed ReSpeaker 2-Mics Pi HAT** (~10 € ≈ 3 900 Ft, szintén WM8960) **+ 1 hangszóró** (mono). A második rács maradhat díszként | **−7 400** (mi: −500) → −6 000 | közepes–magas: (1) a **v1 több boltban már kifutott** (SparkFun, Core Electronics), a Seeed kiadott egy **v2**-t, ennek a kodekjét és a méreteit újra ellenőrizni kell; (2) ~~a hangszórókimenet mono-e~~ – **ellenőrizve:** a v2.0-n TPA2005D1 mono D-osztályú erősítő, 2 tűs, 2,0 mm-es csatlakozó; (3) más a mikrofonok helye (a tetőlap 2 hasznos furata és a DXF változik), ellenőrizni kell a magasságot | ⚠️ **ütközik a 2026-11-16-i döntéssel** („a Voice Bonnet marad”) és a sztereó kimenettel. Érv mellette: 90 mm-es hangszórótávolságnál a sztereó hatás gyakorlatilag nem hallható, sorozatban pedig a Bonnet úgysem kapható |
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
- **Pi Zero 2 WH (gyárilag beforrasztott tüskesorral)** a fej nélküli Pi + 150 Ft-os tüskesor helyett: kb. +2,5 €/db nettó. **Átvezetve** az AJANLATKERESEK.md-be (2026-11-17). E1-gyel együtt a WH így is olcsóbb, mint a mostani Hestore-ár.
- **Hűtőborda a Pi SoC-ján** (~1 €/db) és **0,5 A-es töltés:** a hőkezelési vizsgálat (HOKEZELES.md, a thermal ágon, még nincs a main-en) javasolja. A borda +400 Ft/db, még nincs benne az AJANLATKERESEK.md-ben. A 0,5 A-es töltés E5-nél szűkíti a választható modulokat.
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
| Kiindulás (AJANLATKERESEK.md, 10% tartalékkal, WH-felárral) | 140 044 |
| Az elvekkel összhangban lévő, alacsony–közepes kockázatú javaslatok anyagmegtakarítása (E1, E2, E3, E4, E9, M1, M4, M5, M6, M8, B1, B2) | **kb. −35 000** |
| + E5 (töltőmodul; elvileg rendben, de magas kockázat) | kb. −11 000 |
| + a jóváhagyást igénylő javaslatok (E6, M2) | kb. −8 000 |
| Munkaidő-megtakarítás (M2, M3, M6, M7, kevesebb modul bekötése) | kb. −30–35 perc, ≈ −5 500 |
| **Optimalizált prototípus, anyag (a 10% tartalékkal együtt)** | **kb. 102 000 Ft/db** E5 nélkül · **kb. 90 000** E5-tel · kb. 81 000 a jóváhagyást igénylőkkel is |

A hőkezelés miatti hűtőborda (+400 Ft/db) ebben még nincs benne. A pontos számokhoz a valódi ajánlatok kellenek (lásd AJANLATKERESEK.md).

### 5.2 Elektronika 100 db-nál, optimalizálva (becslés)
| Tétel | Ft/db |
|---|---|
| Pi Zero 2 W (WH) | 6 000 |
| ReSpeaker 2-Mics HAT (E6) / Voice Bonnet helyett | 3 900 |
| Pi-Ener-lite UPS panel + import (E5 elvetve, 2026-11-17) | 11 200 |
| 18650 cella | 3 500 |
| Kijelző + kamera (E7) | 3 700 |
| 1 hangszóró (E6) | 1 500 |
| LED-gyűrű + C szalag | 2 900 |
| XIAO RP2040 + IMU + rezgőmodul (E3) | 4 600 |
| Gombok, Qwiic, USB-C (E4), microSD, kábelköteg | 5 300 |
| Kompatibilitás miatt (KOMPATIBILITAS.md): GPIO-elosztó panel, NeoDriver + Qwiic kábel, forrasztott XIAO | 4 000 |
| **Összesen** | **kb. 46 700 Ft ≈ 120 €** |

A PIACI_TANULMANY.md 100 db-ra **~120 €** elektronikával és **~185 €** önköltséggel számol. A döntések után (E5 elvetve, a Pi-Ener-lite marad) az elektronika **±0 €** (a megtakarítást a kompatibilitási kiegészítők elviszik), a mechanika és a szerelés (M6, M7, G1–G4) kb. **−8 €** → **kb. 175–180 €/db** önköltség. Így a 299 €-s limitált árnál (235 € nettó) a bruttó árrés **~21%-ról ~24–25%-ra** nő. *(Az E5-tel ~37% lett volna; frissítve 2026-11-17.)* *(CE nélkül, ahogy a PIACI_TANULMANY.md is a 100 db-os sorozatot.)*

### 5.4 Mennyibe kerül most egy C-kocka? (2026-11-17, minden döntés után)
Nettó (ÁFA nélkül), 1 EUR = 390 Ft. Minden szám **becslés**.

| | **Prototípus (3 db-os tétel)** | **100 db-os limitált széria** |
|---|---|---|
| Anyag és vásárolt alkatrész (szállítással, 10% tartalékkal) | 112 500 Ft ([AJANLATKERESEK.md](AJANLATKERESEK.md), a kompatibilitási kiegészítőkkel) | ~46 700 Ft elektronika + ~10 700 Ft ház és mechanika (a PIACI_TANULMANY.md 35 €-ja, a mártásos színezéssel csökkentve) |
| Hűtőborda a Pi-n (HOKEZELES.md) | 400 Ft | 400 Ft |
| Szerelés | ~1 óra ≈ 10 000 Ft (a 1,5 óra helyett: színezés, kevesebb modul, R1 sarok) | ~45 perc ≈ 7 500 Ft (kábelköteg, teszt-szkript) |
| Házon belüli gépidő (SLS, CNC/lézer, FDM, SLA) | ~5 000–15 000 Ft *(gépóradíj nélkül nem pontosítható)* | benne a ház és mechanika sorban |
| Csomagolás, garancia | – | ~3 100 Ft |
| **Önköltség** | **~128 000–138 000 Ft ≈ 330–355 €** | **~68 000–70 000 Ft ≈ 175–180 €** |

**Haszon a 100 db-os szériánál** (a PIACI_TANULMANY.md ára: **299 € bruttó** ≈ 116 600 Ft, ebből nettó 235 € ≈ 91 700 Ft):
- **Közvetlen eladás (saját webshop, céges ajándék):** kb. **22 000–24 000 Ft (55–60 €) haszon darabonként**, ~24–25% bruttó árrés → 100 db-on kb. **2,3 millió Ft**.
- **Webáruházon át (−20%):** a gyártóhoz kb. 73 300 Ft jut → kb. **3 000–5 000 Ft (~10 €) / db**, ~4–6% → vékony, ebben a darabszámban nem éri meg.
- **CE/RED nincs benne (~8–15 e€, a kiberbiztonsági követelményekkel inkább a felső sáv).** 100 db-ra ráosztva ez darabonként 80–150 € lenne, és az egész hasznot elvinné. **Fontos javítás (2026-11-17):** az EU szabályai szerint a kereskedelmi tevékenység keretében *ingyen* átadott termék (céges ajándék) is „forgalmazásnak” számít, ezért ehhez is CE kell. CE nélkül csak a belső kipróbálásra szánt prototípus és a „nem kapható” jelöléssel kiállított darab mehet. A 100 db-os számítás így csak akkor áll meg, ha a CE költségét nagyobb darabszám (1000+) vagy magasabb ár viseli. Jogi ellenőrzés kell.

**A prototípus** önköltsége (~133 000 Ft) nagyjából a piaci ár kétszerese, ezért eladásra nem alkalmas, csak bemutatásra és kipróbálásra. Ha mégis árazni kellene: 30%-os árréssel kb. **190 000 Ft nettó ≈ 240 000 Ft bruttó** lenne.

### 5.5 CE-állapot alkatrészenként (2026-11-17, webes keresés, [K])
**A lényeg:** az alkatrészek CE-jelölése nem öröklődik a termékre. A kész C-kockát egészként kell vizsgálni (EMC, biztonság, rádió, kiberbiztonság), és erről a gyártó nyilatkozik. A beszállítói dokumentumok azért fontosak, mert csökkentik a vizsgálatot (főleg a rádiós részét), és kellenek a műszaki dokumentációhoz (RoHS, akku).

| Alkatrész | Megfelelőségi dokumentum | Megjegyzés |
|---|---|---|
| Raspberry Pi Zero 2 W(H) | ✅ **EU-megfelelőségi nyilatkozat a RED alapján** (Raspberry Pi Ltd; [Mouser-másolat](https://www.mouser.com/catalog/additional/Raspberry_Pi_EU_DoC_Raspberry_Pi_Zero_2.pdf), hivatalos: [Raspberry Pi approvals](https://pip.raspberrypi.com/categories/594-approvals)) | a legfontosabb: előtanúsított rádiós modul, a rádiós vizsgálat jó része erre építhet |
| Seeed XIAO RP2040 | ⚠️ valószínű: a Seeed adatlapja CE-tanúsítványt linkel a 102010428-ra (nem nyitottam meg), a Plus változatra van EMC CE-dokumentum ([Seeed](https://files.seeedstudio.com/Seeed_Certificate/documents_certificate/100059977-CE.pdf)) | nincs rajta rádió |
| Seeed ReSpeaker 2-Mics Pi HAT v2.0 | ❓ nem találtam | a Seeed tanúsítvány-archívumában vagy a beszállítótól kérni |
| Pi-Ener-lite UPS | ❌ semmilyen CE-említést nem találtam ([Tindie](https://www.tindie.com/products/rachel/pi-ener-litea-portable-power-platform-for-pi-zero/)); kis gyártó, Kínából | **a leggyengébb pont:** töltő + akku, a biztonsági vizsgálatnál ez lesz a legkényesebb. Sorozatban a saját alappanel (S1) megoldja |
| Adafruit LSM6DS3TR-C IMU | ❓ az Adafruit CE-ről nem nyilatkozik, egyes termékekre RoHS-tanúsítványt ad | fejlesztői panel |
| GC9A01 kijelző, OV5647 kamera | ❓ általános, gyártói dokumentum nélkül | sorozatban dokumentált beszállító kell |
| 18650 cella (KeepPower, védett) | ❓ ellenőrizni: az akkurendelet szerint a cellának is megfelelőségi dokumentum és jelölés kell, a szállításhoz UN38.3 | a beszállítótól kérni |
| Hangszóró, LED-gyűrű, LED-szalag, gombok, kábelek, rezgőmodul, USB-C hosszabbító | – (alkatrészek, önmagukban általában nem CE-kötelesek) | **RoHS-nyilatkozat** kell mindegyikről |

**Teendő a CE előtt:** a hivatalos Pi-nyilatkozat letöltése, RoHS- és REACH-nyilatkozat minden beszállítótól, a cella dokumentumai (akkurendelet, UN38.3), és a Pi-Ener-lite gyártójától nyilatkozat kérése. Ha nem ad, sorozatban helyette dokumentált töltőpanel vagy saját alappanel (S1) kell.

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

*(2026-11-17-i frissítés: a webes ellenőrzés után E5 kockázata magasra nőtt a töltőáram miatt, ezért az 1. helyről az 5.-re került.)*

1. **E1 + B1 + B2 – beszerzési csomag:** Pi Zero 2 WH EU-s boltból, összevont EU-s rendelés, alu maradékból: kb. **−12 600 Ft/db**. Nincs tervezési változás, kockázat gyakorlatilag nincs.
2. **E2 + E3 – két modul kevesebb** (érintés a XIAO-n, egyszerű rezgőmodul): kb. **−6 400 Ft/db**, két modullal és egy kábellel kevesebb, rövidebb bekötés. Az érintést M4-gyel együtt kell kipróbálni a fém tetőlap alatt.
3. **M6 – mártásos színezés festés helyett:** kb. **−5 500 Ft/db** anyagban és munkaidőben. Ráadásul a festékréteg nem rontja el a 0,1 mm-es illesztéseket. Dobáspróbával ellenőrizni az élek kopását.
4. **E4 – általános USB-C hosszabbító:** **−4 400 Ft/db**, gyakorlatilag kockázat nélkül, csak a tálca peremén a furatképet kell igazítani.
5. **E5 – UPS panel helyett kész töltőmodul + Qwiic töltöttségmérő:** kb. **−11 000 Ft/db**, és kiesik a kínai import is. A legnagyobb tétel, de a legkockázatosabb: olyan modul kell, amely gyárilag legfeljebb 0,5–1 A-rel tölt (hőkezelés), és **egy prototípus-kockán** ki kell próbálni (alvó terhelés, töltő bedugása, leállás). Ha nem válik be, marad a Pi-Ener-lite.

**A top 5 után, döntést igényel:**
- **M8 eloxálás** (prototípusnál csatolás más munkához, kb. −5 000 Ft/db; sorozatban előeloxált lemez, natúr éllel – a kinézet miatt egyeztetni).
- **E6 ReSpeaker + 1 hangszóró** (−7 400 Ft/db, de felülírja a 2026-11-16-i döntést; sorozatnál a Bonnet kifutása miatt amúgy is kell).
- **S1 saját alappanel** 2000 db-nál (kb. −20 000 Ft/db, ütközik a „kész alkatrészek” elvvel).

---

## 7. Javítások más dokumentumokban
**Javítva (2026-11-17):**
- **SZERELES.md:** a hengeres fejű csavaroknál „ISO 7380 / DIN 912” szerepelt, de az ISO 7380 lencsefejű, a DIN 912 hengeres fejű (imbusz). Most „ISO 4762 / DIN 912”, egyezően az AJANLATKERESEK.md-vel. *(Ha a lencsefejű kell, mert alacsonyabb és olcsóbb, az döntés, lásd lent.)*
- **AJANLATKERESEK.md, 2. tétel:** a fej nélküli Pi + tüskesor forrasztást jelentett → helyette a **Pi Zero 2 WH** felára (+2 925 Ft / 3 db), és az e-mail-tervezetben is a WH szerepel. Az összesítő újraszámolva: **420 133 Ft nettó / 3 db (140 044 Ft/db)**.

**Döntés után módosul:**
- **ELEKTRONIKA.md:** a modultáblázat E2, E3, E4, E5 és E6 elfogadása esetén; a tetőlap mikrofonfuratai E6 esetén a DXF-ben is.
- **3D modell és DXF-ek:** M1 (furatmélységek), M3 (sarokfuratok), M4 (3 mm-es betét), M7 (R1 sarok), M10 (bajonett). A Fusion MCP most nem érhető el, és a DXF-eket a dxf-step munkamenet exportálja újra, ezért ezekhez nem nyúltam.

## Források (webes ellenőrzés, 2026-11-17, [K])
- Pi Zero 2 WH árak: [Botland](https://botland.store/rpi-zero-modules-and-kits/25407-raspberry-pi-zero-2-wh-512mb-ram-wifi-bt-42-with-header-5056561800011.html), [BerryBase](https://www.berrybase.de/en/raspberry-pi-zero-2-wh), [welectron (W)](https://www.welectron.com/RPi-Pico/PC/Raspberry-Pi-Zero-2-W_1)
- MAX17048: [DigiKey 5580](https://www.digikey.hu/en/products/detail/adafruit-industries-llc/5580/16719287), [The Pi Hut](https://thepihut.com/products/adafruit-max17048-lipoly-liion-fuel-gauge-and-battery-monitor-stemma-jst-ph-qt-qwiic)
- ReSpeaker 2-Mics Pi HAT: [Seeed wiki](https://wiki.seeedstudio.com/ReSpeaker_2_Mics_Pi_HAT/), [SparkFun (kivezetve)](https://www.sparkfun.com/seeed-studio-respeaker-2-mics-pi-hat.html)
- Töltőmodulok töltőárama: [IP5306 (done.land)](https://done.land/components/power/powersupplies/battery/chargers/charge-discharge/ip5306/pb0a/), [TP4056 + boost (Electropeak)](https://electropeak.com/tp4056-18650-li-ion-usb-type-c-battery-charger-discharger-module-with-boost-converter)
- ReSpeaker 2-Mics Pi HAT v2.0 kapcsolási rajza (2024-11-15, KiCad): [files.seeedstudio.com](https://files.seeedstudio.com/wiki/ReSpeaker_2_Mics_Pi_HAT/202004059_ReSpeaker-2-Mics-Pi-HAT-V2.0_SCH_PDF_241121.pdf) – U1 TLV320AIC3104, U6 TPA2005D1 (SPK+/SPK−), J2 A2001WF-02A, J5 3,5 mm-es jack; [v2 telepítési útmutató](https://wiki.seeedstudio.com/respeaker_2_mics_pi_hat_raspberry_v2/) (`dtoverlay=respeaker-2mic-v2_0`)
