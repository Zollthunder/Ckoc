# C-kocka – elektronika (első javaslat, v0.1)

> Koncepciószintű terv a gyárthatóság felé. Az alkatrészek valós, kapható típusok, de **a pontos választás a lent felsorolt döntéseken múlik**. Árakat szándékosan nem írtam: ezeket egy beszállítói árajánlat alapján érdemes rögzíteni.

## Referencia: Espressif ESP32-S3-BOX-3
A kocka „agyához” van egy kész, nyílt kapcsolási rajzú fejlesztőkártya, ami nagyjából ugyanezt tudja: ESP32-S3, kijelző, két mikrofon **ES7210** ADC-vel, hangszóró **ES8311** kodekkel, **ICM-42670-P** mozgásérzékelő. A prototípus első lépése lehet egy ilyen kártya. A saját NYÁK később erre a kapcsolásra épülhet.

## Blokkvázlat
```
            USB-C ──► töltő + akkuvédelem ──► 1S Li-ion akku
                              │
                         3,3 V táp (buck-boost)
                              │
 ┌──────────────── ESP32-S3 (WROOM-1, 16 MB flash / 8–16 MB PSRAM) ────────────────┐
 │  SPI ──► 1,28" kerek IPS kijelző (GC9A01, 240×240)                              │
 │  DVP ──► kamera (OV2640)                       GPIO ──► kamera-jelzőfény         │
 │  I2S ──► audio ADC (ES7210) ◄── MEMS mikrofonok (2–4 db)                         │
 │  I2S ──► audio DAC/erősítő ──► 2× hangszóró (sztereó)                            │
 │  I2C ──► IMU (ICM-42670-P) · rezgésvezérlő (DRV2605L) ──► LRA rezgőmotor         │
 │  RMT ──► címezhető RGB LED-ek: C betű + alsó gyűrű                               │
 │  touch ──► tetőérintő · GPIO ──► 4 gomb                                          │
 │  I2S + UART ◄──► klasszikus ESP32 (BT: A2DP zene + HFP kihangosító)              │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

## Alkatrészlista (BOM) – első kör
| # | Funkció | Javasolt alkatrész | Megjegyzés |
|---|---|---|---|
| 1 | Processzor, Wi-Fi, BLE | **ESP32-S3-WROOM-1-N16R8** modul | hangfelismerés (ESP-SR), visszhangszűrés, kamera, kijelző; nincs klasszikus Bluetooth |
| 1b | Bluetooth-hang | **ESP32-WROOM-32E** modul (második chip) | A2DP zene + HFP kihangosító; I2S + UART az S3 felé |
| 2 | Kijelző | **1,28" kerek IPS, GC9A01, 240×240**, SPI | látható terület **Ø 32,4 mm**, ez pont kitölti a modell Ø 33 mm-es ablakát. A modul külső mérete gyártónként 35–40 mm. |
| 3 | Kamera | **OV2640** (2 MP, DVP, FPC-s modul) | ESP32-S3-mal bevált páros; a Ø 4,4 mm-es lencsefurat mögé kerül, mellé egy jelzőfény |
| 4 | Mikrofon ADC | **ES7210** (4 csatornás) | ESP32-S3-BOX-3-ban is ez van; a 4. csatorna a visszhangszűrés referenciajele |
| 5 | Mikrofonok | **3 db MEMS mikrofon** | a 6 tetőfuratból minden második mögött; ESP-SR-rel |
| 6 | Hang kimenet | **ES8311** kodek + erősítő, vagy 2× **MAX98357A** (I2S, 3 W) | sztereóhoz két csatorna kell; az ES8311 monó |
| 7 | Hangszórók | 2× **40 mm-es, 4 Ω, 3 W** teljes sávú mikrohangszóró | az oldalsó rács Ø 48 mm, a 40 mm-es befér; a kocka belseje zárt dobozként jó rezonátortér |
| 8 | Mozgásérzékelő | **ICM-42670-P** (vagy BMI270) | dobás, rázás, tájolás (fejjel lefelé némítás) |
| 9 | Rezgés | **DRV2605L** vezérlő + **LRA** (pl. Ø 8 mm-es érme alakú) | finom, „telefonos” rezgés a Ne zavarj módhoz |
| 10 | RGB fények | címezhető LED-ek, pl. **SK6812 MINI-E** / **WS2812B-2020** | C betű: kb. 20 LED, alsó gyűrű: kb. 24 LED; áramfelvétel korlátozás kell |
| 11 | Gombok | 4× SMD nyomógomb (6×6 mm) + a gombsapkák a tetőlapon | az Andor-gomb sapkája fából |
| 12 | Érintőfelület | ESP32-S3 kapacitív bemenet + réz elektróda a tetőpanelen | Ø18 mm-es műanyag betét alatt |
| 13 | Táp | **USB-C** (CC-ellenállásokkal) | 5 V / max. 2 A |
| 14 | Akku | **18650 Li-ion (kb. 3000 mAh, védett)** + töltő (BQ25895 / BQ24074) + NTC + töltöttségmérő (MAX17048) | TPU bölcsőben, a kocka alján középen |
| 15 | Feszültség | 3,3 V buck-boost (pl. TPS63020) | akkuról és USB-ről is |

## Panelek elrendezése (első ötlet)
- **Főpanel** (kb. 60×60 mm, 4 rétegű): ESP32-S3, audio, táp, IMU – vízszintesen a kocka közepén.
- **Előlapi panel**: kijelző, kamera, a C betű LED-jei – a kijelző mögött, a C íve mentén.
- **Tetőpanel**: mikrofonok, 4 gomb, érintőelektróda – a tetőlap alatt.
- **Alsó LED-gyűrű**: kerek panel a gumitalp fölött.
- A panelek között FPC-kábelek vagy csatlakozók; a hangszórók az oldalfalakon, saját rögzítéssel.

## Eldöntve (2026-11-13)
- **Kiegészítő NYÁK-ok** használhatók, ahol szükséges (előlapi, tető-, LED-gyűrű panel stb.).
- **A kocka mérete növelhető**, ha az elektronika nem fér el a 80 mm-es házban.
- **Hangulatfelismerés: egyszerűsítve.** Az ESP32-S3 csak arcfelismerést és egyszerű jeleket figyel (van-e ott valaki, mosolyog-e, régóta ül-e a gép előtt, napszak). A „felvidítás” ezekre az egyszerű jelekre reagál, nem kell hozzá külön AI-gyorsító.
- **Bluetooth-kihangosító és BT-hangszóró: kell, második chippel.** Erre egy **klasszikus ESP32 modul** (pl. **ESP32-WROOM-32E**) kerül a panelre, csak Bluetooth-hangra:
  - **A2DP** (zene a telefonról → kocka hangszórói, party mód) és **HFP kihangosító** szerep (telefonhívások),
  - **I2S**-en kapcsolódik az ESP32-S3-hoz: a hívás hangját az S3 kapja meg, és ott fut a visszhangszűrés (AEC) a mikrofonjelen, a tiszta jelet pedig az S3 visszaküldi a BT-chipnek; zenénél az S3 keveri a kocka saját hangjaival,
  - **UART**-on vezérli az S3 (párosítás, hívás fogadása, hívó neve a kijelzőre),
  - előny: ugyanaz a gyártó és fejlesztőkörnyezet (ESP-IDF / ESP-ADF), egy firmware-csapat kezeli.
  - Alternatíva, ha kapható: **ESP32-S31**, ami egy chipben tudja az S3 képességeit és a klasszikus Bluetooth-t.
- **Akkus kivitel (a dobáshoz).** Javaslat:
  - **cella:** 1 db **18650-es Li-ion cella** (kb. 3000 mAh, védőáramkörös). Dobálható tárgyba a **hengeres, acélházas cella** biztonságosabb, mint a lapos LiPo, mert nehezebben deformálódik és szúródik ki,
  - **rögzítés:** a kocka alján, középen, egy **TPU-ból nyomtatott, rugalmas bölcsőben**. Így a súlypont alacsony, és a cellát a ház egyik fala sem nyomja ütéskor,
  - **töltés:** USB-C, töltő IC áramút-kezeléssel (pl. **BQ25895** vagy **BQ24074**), így USB-ről akkor is működik, ha az akku lemerült; **NTC**-vel hőfigyelés,
  - **töltöttségmérő:** **MAX17048**, a kijelzőn és az appban látszik az akkuszint,
  - **becsült üzemidő:** átlagos használatnál kb. 200–300 mA fogyasztással **10–15 óra** (ez becslés, a prototípuson mérni kell),
  - **biztonság:** a mozgásérzékelő naplózza a nagy ütéseket; nagyon erős ütés után a kocka figyelmeztethet. Sorozatgyártásnál az akkus termékhez **UN38.3** (szállítás) és **IEC 62133** (akkubiztonság) megfelelőség kell.
- **Mikrofonok: 3 db** digitális MEMS mikrofon a tetőpanelen, a 6 furatból minden második mögött (a többi 3 furat dizájnelem marad). Az **ES7210** 4 csatornájából 3 a mikrofonoké, a 4. a visszhangszűrés referenciajele. Az Espressif hangfeldolgozása (ESP-SR) 2–3 mikrofonra van felkészítve.
- **Érintőfelület: Ø18 mm-es szigetelt műanyag betét** a tetőlap közepén (a Fusion-modellben már benne van). Alatta a tetőpanelen egy **réz érintőelektróda** az ESP32-S3 kapacitív bemenetére kötve; a betét áttetsző, így alulról egy LED meg is világíthatja (némítás jelzése).
- **Bonyolult formájú alkatrészek** (pl. belső tartók, fénycsatornák, hangszórókamrák) **3D nyomtatással vagy SLS-sel** készülhetnek.

## Még nyitott döntések
1. ~~Bluetooth-kihangosító és BT-hangszóró~~ → **eldöntve: második chip (klasszikus ESP32)**, lásd fent.
2. ~~Akku vagy csak USB?~~ → **eldöntve: akkus (18650-es cella, TPU bölcsőben)**, lásd fent.
3. ~~Mikrofonok száma~~ → **eldöntve: 3 db**, lásd fent.
4. ~~„Felismer és felvidít” kamera-funkció~~ → **eldöntve: egyszerűsített változat** (lásd fent).
5. ~~Érintőfelület az alumínium tetőn~~ → **eldöntve: szigetelt betét**, lásd fent.
6. **Ház anyaga és gyártása:** prototípus 3D nyomtatással (PETG/ABS), sorozatban fröccsöntés; a gumisarkok TPU-ból nyomtathatók vagy szilikonból önthetők.

## Következő lépések (a döntések után)
1. Prototípus egy ESP32-S3-BOX-3 kártyával + LED-szalaggal + hangszórókkal → a funkciók gyors kipróbálása.
2. Blokkvázlat véglegesítése, alkatrész-kiválasztás beszállítói elérhetőséggel.
3. Kapcsolási rajz és NYÁK (pl. KiCad), a panelek méretét a Fusion-modellbe visszaillesztve.
4. A ház belső kialakítása: rögzítőcsonkok, hangszóró-kamrák, akkutartó.
