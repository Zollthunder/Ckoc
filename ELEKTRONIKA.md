# C-kocka – elektronika (v0.2: kész modulokból)

> Cél: **minél több kész, kapható modul**, saját NYÁK nélkül, amennyire csak lehet. A modulok helyét a Fusion-modellben helyőrző testekkel ellenőriztük: **minden elfér a 90 mm-es kockában, ütközés nélkül, és mindenhol legalább 3 mm hely marad** a szereléshez (a falvastagságot 2,5 mm-re feltételezve; lásd [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md)).
> Az árak a későbbi **költségoptimalizálás** lépésben kerülnek ide, beszállítói ajánlatok alapján. Az előző, ESP32-alapú terv: [ELEKTRONIKA_v0.1_ESP32.md](ELEKTRONIKA_v0.1_ESP32.md).

![Modulok a kocka belsejében](assets/fusion/modulok_iso.png)

## Miért Raspberry Pi Zero 2 W (és nem ESP32)?
Az ESP32-S3-as tervhez a Bluetooth-kihangosítás miatt **egy második chip** és sok saját NYÁK kellett volna. A **Raspberry Pi Zero 2 W** ezzel szemben:
- **beépítve tud klasszikus Bluetooth-t** (A2DP zene + HFP kihangosító) és Wi-Fit → **nem kell második chip**,
- Linuxot futtat: a hangfeldolgozás, a kamerakép elemzése és a kijelző-animációk sokkal könnyebben megírhatók,
- köré **kész kiegészítő panelek** kaphatók (hang, akku), pontosan illeszkedő méretben (65 × 30 mm).

**Kockázat, amit a prototípuson ki kell próbálni:** a Bluetooth-kihangosító (HFP) a Pi-n működik, de a beállítása trükkös (PipeWire/BlueZ, a mikrofon útvonala). Ha nem válik be, tartalék: egy kész USB-s Bluetooth-hangmodul.

## Modulok
| # | Funkció | Kész modul | Méret | Megjegyzés |
|---|---|---|---|---|
| 1 | Agy, Wi-Fi, Bluetooth | **Raspberry Pi Zero 2 W** | 65 × 30 mm | 4 magos, klasszikus BT + BLE |
| 2 | Hang: 2 mikrofon + **mono** hangszóró-kimenet | **Seeed ReSpeaker 2-Mics Pi HAT** | 65 × 30 mm | a Pi tetejére dugható; **2 mikrofon** a tetőfuratok alatt (a helyük más, mint a Voice Bonneten → a tetőlap 2 hasznos mikrofonfuratát igazítani). Az Adafruit Voice Bonnet kifutott; **döntés: 2026-11-17** ([KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md), E6). **v2.0** (TLV320AIC3104 kodek): a kapcsolási rajz szerint TPA2005D1 mono erősítő van rajta (~1,4 W / 8 Ω, 5 V-ról), 2 tűs, 2,0 mm-es hangszórócsatlakozóval; külön erősítő nem kell. Raspberry Pi OS-en a `respeaker-2mic-v2_0` overlay kell |
| 3 | Akku + töltés + táp | **18650-es UPS panel Pi Zeróhoz** (pl. **Pi-Ener-lite**: USB-C, töltöttségmérő, RTC; vagy **Geekworm X306**) | Pi Zero méret + 18650 cella | rugós érintkezőkkel a Pi alá; kb. 2,5 A kimenet |
| 4 | Akku cella | **18650 Li-ion, védett, ~3000 mAh** | Ø 18,6 × 65 mm | TPU bölcsőben |
| 5 | Kerek kijelző | **1,28" kerek IPS, GC9A01, 240×240, kerek NYÁK-os változat** | Ø 37,5 mm | látható terület Ø 32,4 mm; SPI |
| 6 | Kamera | **mini „spy” kameramodul, OV5647, Pi Zero (22 pólusú, 0,5 mm) szalagkábellel**, pl. **Arducam B006603** vagy **Pi Supply Spy Camera** | kamerafej kb. 8,5 × 8,5 – 8,5 × 11,3 mm | a nagy Pi kameramodul nem fér el a kijelző mellett. Az Adafruit 1937 kábele nem Pi Zero-s; a Kailap JAL-KH3-C20B-1B (OV5640) DVP párhuzamos interfészű, ezért egyik sem jó |
| 7 | Hangszóró | **1× VISATON K 36 WP, Ø36 mm, 8 Ω, 2 W** teljes sávú hangszóró | Ø 36 mm | a hangpanel mono kimenetére; a 40 mm-es helyett (döntés: 2026-11-16), a rögzítőgyűrű Ø36-ra módosul. **2026-11-17: 1 db** (90 mm-es kockán a sztereó hatás nem hallható); a másik oldal rácsa szellőzőként marad |
| 8 | Alsó fénygyűrű | **NeoPixel Ring 24** (WS2812) | **Ø 66 mm** – pont a modell gyűrűjének mérete | |
| 9 | C betű fénye | **S-alakú (síkban hajlítható) WS2812 LED-szalag**, 5 mm széles – a sima szalag síkban nem hajlik C alakba | kb. 110 mm (6–7 LED, 60 LED/m) | az előlapi tartó C bordáján fekszik, előtte az opál akril C |
| 10 | „Kisegítő” mikrovezérlő | **Seeed XIAO RP2040** | 21 × 17,5 mm | LED-ek, gombok, IMU, rezgés valós időben; USB-n vagy UART-on a Pi-hez |
| 11 | Mozgásérzékelő | **LSM6DS3TR-C** (vagy hasonló) I2C panel, STEMMA QT / Qwiic csatlakozóval | ~25 × 18 mm | dobás, rázás, tájolás |
| 12 | Rezgés | **Kész rezgőmotor-modul** (lapos ERM motor + tranzisztoros meghajtó, 3 tűs csatlakozó) | kicsi | „Ne zavarj” jelzések; a XIAO PWM-kimenetéről. A DRV2605L helyett (2026-11-17, E3) |
| 13 | Érintés | **A XIAO RP2040 maga érzékel** (CircuitPython `touchio`) + rézfólia elektróda a Ø18 mm-es műanyag betét alatt + 1 MΩ lehúzó ellenállás a gombok prototípus-lapján | – | az AT42QT1010 helyett (2026-11-17, E2); a fém tetőlap alatt a prototípuson kipróbálni |
| 14 | 4 gomb | 4× **6×6 mm-es nyomógomb** (kis NYÁK-modulon), SLA sapkák szárral és gallérral; az Andor-gomb tetején préselt fa betét | 6 × 6 mm | a XIAO bemeneteire |
| 15 | Rendszer-tároló | **microSD kártya, 32 GB, A1** | – | a Pi Zero 2 W operációs rendszeréhez és programjaihoz |
| 16 | Óraelem | **CR1220 gombelem** | Ø 12,5 mm | a UPS panel valós idejű órájához (RTC); a panelhez nem jár |

**Kábelezés:** az I2C eszközök (IMU, rezgés) **STEMMA QT / Qwiic** csatlakozós kábelekkel láncba fűzhetők, forrasztás nélkül. A többi rövid vezetékkel, egy kis prototípus-lapon gyűjtve.

## Elrendezés a kockában (Fusion: „Elektronika (vazlat)” komponens)
- **Felül:** ReSpeaker 2-Mics Pi HAT (a mikrofonok a tetőfuratok alatt), alatta a Pi Zero 2 WH.
- **Középen:** a UPS panel a 18650-es akkuval (a stack hosszában, elölről hátra).
- **Elöl:** a kerek kijelző, mellette a mini kamera a C nyílásában, a C mögött az S-alakú LED-szalag (a tartó C bordáján).
- **Oldalt:** a 36 mm-es hangszóró az egyik rács mögött; a másik rács szellőző.
- **Alul:** a NeoPixel gyűrű, benne a XIAO RP2040 és a rezgőmotor-modul.
- **Jobb oldalt, a szán sínjén kívül:** az IMU (függőlegesen, lásd lent).
- **Bal oldalt, a szán sínjén kívül:** a NeoDriver (függőlegesen, lásd lent).
- **Hátul:** az USB-C hosszabbító a ház hátfalában (közép 18 mm-rel az alj fölött), PETG szorítólappal.

**IMU (2026-11-17 óta):** függőlegesen a szán **jobb sínjének külső oldalán** (a jobb hangszóró felőli oldalon). A NYÁK síkja függőleges, az alkatrész-oldal kifelé, jobbra néz (+X); a hosszanti él vízszintes, előre-hátra fut; a két rögzítőfuratos él felül van. A panel saját tengelyei a kockához képest (Y fel, eleje +Z, jobb +X): **panel X → hátra (−Z), panel Y → fel (+Y), panel Z → jobbra (+X)**. Ez a panel éleiből és a gyártói rajzból adódik; a chip tengelyjelölését a megvásárolt panel szitanyomatán ellenőrizni. **A firmware-ben (`firmware/xiao/code.py`, a `claude/confident-wilson-a057bb` ágon) a tengelyeket át kell számolni** (dobás, rázás, tájolás) – a firmware-t ez a változtatás nem módosította.
Rögzítés: 2 db M2,5×6 csavar a szán sínjébe olvasztott betétekbe; a kábel **Adafruit 4397** (Qwiic → női Dupont, 150 mm; a XIAO-n nincs Qwiic), a sínbe vágott résen (y 17…24, z −5…1) át a XIAO tüskéire (3V3, GND, D4 = SDA, D5 = SCL). Az út kb. 40 mm, a kb. 110 mm-es ráhagyást a jobb sín külső oldalán, az IMU előtt (z −5…+20, a sín és a hangszóró között) laza hurokban, kábelkötegelővel a sín réséhez fogva kell elvezetni – ragasztás nélkül.
- **A tető sarkaiban:** a 4 gomb kapcsolói; középen az érintőbetét alatt az elektróda.

Képek: [iso](assets/fusion/modulok_iso.png) · [elöl](assets/fusion/modulok_elol.png) · [oldal](assets/fusion/modulok_oldal.png)

**NeoDriver (Adafruit 5766, 2026-11-17):** függőlegesen a szán **bal sínjének külső oldalán** (ott már nincs hangszóró). A gyártói rajz szerint 25,4 × 25,4 mm, 4 db Ø2,5 furat; alkatrész-oldal kifelé (balra), a sorkapcsok felül (a LED-vezetékek felfelé lépnek ki, fölöttük kb. 9 mm szabad hely van az ívhez), a Qwiic csatlakozók előre és hátra néznek. 4 db M2,5×6 hengeres fejű csavar a sínbe olvasztott betétekbe. A Qwiic lánc az IMU második portjáról egy rövid QT–QT kábellel jön, a jobb és a bal sín résén át (bal: elöl, y 12…16,5, z 4…10).

## Ami a modellben változott emiatt
- A kocka **90 mm**-es lett (80 helyett), a tetőlap 72 mm, a gombok és a mikrofonfuratok ehhez igazodva kijjebb kerültek.
- A **kamerafurat** 22 mm-ről **26 mm-re** került a középtől (a C nyílásán belül maradt), így 3 mm hely marad a kerek kijelzőpanel mellett.
- Az alsó kis panelek (XIAO, rezgés) a LED-gyűrű fölé kerültek, hogy ne legyenek szorosan mellette.
- 2026-11-17: az IMU a jobb sín külső oldalára, az USB-C nyílás az osztásvonalról a ház hátfalába került, mert egy valódi USB-C hosszabbító anyavége a szán fedélzetébe és az IMU-ba ütközött volna (Zollo jóváhagyásával).

## Eldöntött kérdések
- Bluetooth-kihangosító: **kell** → a Pi Zero 2 W beépítve tudja (nem kell második chip).
- Akku: **18650-es cella**, TPU bölcsőben.
- Mikrofonok: **kevesebb** → 2 db (a hangpanelen).
- Költségoptimalizálás (2026-11-17): Pi Zero 2 WH EU-s boltból, ReSpeaker + 1 hangszóró, érintés a XIAO-n, rezgőmotor-modul, általános USB-C hosszabbító. **A Pi-Ener-lite UPS panel marad.** Részletek: [KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md).
- Érintés a fém tetőn: **szigetelt műanyag betét** + elektróda.
- Hangulatfelismerés: **egyszerűsítve** (a Pi-n ez könnyebb is, mint az ESP32-n).
- Kiegészítő NYÁK-ok és nagyobb kocka megengedett (most nem kell).
- Bonyolult formájú belső alkatrészek: 3D nyomtatás vagy SLS.

## Kell-e hozzá MCP?
Most **nem**: saját NYÁK nem kell, a modulok mechanikai elhelyezése a már működő **Fusion MCP**-vel megy. Ha később mégis lesz egy kis „összekötő” panel, akkor a **KiCad** (ingyenes NYÁK-tervező) és egy **KiCad MCP** szerver lehet hasznos. Alkatrész-beszállítói (DigiKey, Mouser, LCSC) MCP-t a katalógusban nem találtunk; az árakat a költségoptimalizálásnál webes kereséssel gyűjtjük.

## Sorozatgyártásra (később)
Nagyobb darabszámnál a kész modulok helyett **egy saját NYÁK** olcsóbb lehet (pl. az ESP32-es v0.1 terv, vagy egy Raspberry Pi Compute Module). Ezt a költségoptimalizálás dönti el.

## Következő lépések
1. **Gyártási rajzok átbeszélése:** melyik alkatrész miből, hogyan készül (vágás, marás, nyomtatás).
2. **Költségoptimalizálás:** árak, alternatívák, mi hagyható el vagy oldható meg olcsóbban.
3. Prototípus: a modulok beszerzése és összerakása.

## Kompatibilitás-ellenőrzés (2026-11-17)
Részletek és források: [KOMPATIBILITAS.md](KOMPATIBILITAS.md). A legfontosabbak:
- **Kijelző:** a `mipi-dbi-spi` overlayjel, SPI0 CE0 (GPIO8), DC = GPIO25, RST = GPIO27, BL = GPIO22 vagy fixen 3,3 V. A gyári `gc9a01` overlay nem jó (a háttérvilágítást a GPIO18-ra, az I2S órajelére tenné). A ReSpeaker APA102 LED-jei ugyanezen az SPI-n vannak, és chip select nélkül a kijelző adatától villoghatnak → próba, szükség esetén a két LED-tüske leválasztása. A kijelzőhöz a Pi és a ReSpeaker közé **GPIO 1→2 elosztó panel** kerül (döntés: 2026-11-17).
- **XIAO RP2040:** a **gyárilag forrasztott** változat; az IMU-hoz **Adafruit 4397** kábel (Qwiic → női Dupont); a Pi-hez **UART-on** (GPIO14/15, Dupont-kábellel az elosztóról), OTG kábel nélkül; az érintéshez 1 MΩ-os lehúzó ellenállás.
- **WS2812 LED-ek:** **Adafruit NeoDriver** (I2C → NeoPixel, 5 V-os kimenet) a Qwiic láncon, az IMU után; egyetlen lánc (gyűrű + C); a LED-ek 5 V-ja közvetlenül a UPS-ről, fényerőkorlát ≤ 30%.
- **Pi-Ener-lite:** 2,5 A kimenet, **1 A fix töltőáram** (nem 0,5 A), a GPIO4 a UPS-é (külső táp jelzése).
- **ReSpeaker v2.0:** a `respeaker-2mic-v2_0` overlayt a Seeed repójából kell lefordítani.
