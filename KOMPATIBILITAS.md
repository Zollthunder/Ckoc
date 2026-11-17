# C-kocka – hardverkompatibilitás-ellenőrzés (2026-11-17)

> Webes ellenőrzés gyártói oldalak és adatlapok alapján, valódi alkatrész nélkül. **[E]** = ellenőrizve (hivatalos oldal vagy adatlap) · **[V]** = valószínű, nem igazolt.
> Alkatrészek: Pi Zero 2 WH, Seeed ReSpeaker 2-Mics Pi HAT v2.0, Pi-Ener-lite UPS, GC9A01 kerek kijelző, OV5647 kamera, Seeed XIAO RP2040 (LED-ek, gombok, érintés, rezgés, IMU), 18650 cella.

## Összefoglaló
| # | Téma | Eredmény | Teendő |
|---|---|---|---|
| 1 | **Kijelző és a ReSpeaker LED-jei ugyanazon az SPI-buszon** | ❗ PROBLÉMA | próba, majd szükség esetén a két LED-tüske leválasztása az elosztón; másik lábkiosztás |
| 2 | **A kijelző nem fér hozzá a Pi tüskesorához** (a ReSpeaker elfoglalja) | ✅ döntés: **GPIO 1→2 elosztó panel**; a XIAO is ezen át, UART-on | a 3D-modellben a stacket lejjebb kell tenni |
| 3 | **A Pi-Ener-lite töltőárama fix 1 A** (a hőkezelés 0,5 A-t kér) | ❗ PROBLÉMA | a hőszámítás újrafuttatása 1 A-re, vagy kérdés a gyártónak |
| 4 | **31 WS2812 LED a XIAO-ról** | ✅ döntés: **Adafruit NeoDriver** (I2C → NeoPixel, 5 V-os kimenet) a Qwiic láncon | a LED-táp közvetlenül a UPS 5 V-járól, fényerőkorlát |
| 5 | **XIAO RP2040: forrasztatlan tüskesor, nincs Qwiic** | ⚠️ ELLENŐRIZENDŐ | gyárilag forrasztott változat + női Dupont-végű Qwiic kábel |
| 6 | ReSpeaker v2.0 a Pi OS-en | ⚠️ működik, de az overlayt le kell fordítani | install-szkript |
| 7 | I2C-címek | ✅ OK | – (az 5 V-os felhúzást ellenőrizni) |
| 8 | Kamera | ✅ OK | – |
| 9 | Teljesítménymérleg | ⚠️ csak LED-korláttal fér bele | fényerőkorlát, a cella kisütési áramát ellenőrizni |

## Részletek

### 1. Kijelző és APA102 LED-ek ugyanazon az SPI0-n – PROBLÉMA
- A ReSpeaker 3 APA102 LED-je az SPI0-n van (Seeed-kód: `spi.open(bus=0, device=1)`) [E]. Valószínűleg a GPIO10 (MOSI) és a GPIO11 (SCLK) lábon [V, a v1-es kiosztás alapján].
- Az APA102-nek **nincs chip select lába**, ezért a kijelzőnek küldött adatot is „megkapja”, és a LED-ek véletlenszerűen színt válthatnak.
- **Az SPI1 nem megoldás:** a MISO/MOSI/SCLK a GPIO19/20/21, ez ütközik az I2S-sel; a CE1 a GPIO17, ez a ReSpeaker gombja [E].
- **A gyári `gc9a01` overlay nem használható,** mert a háttérvilágítást a GPIO18-ra teszi, ez pedig az I2S órajele [E]. Helyette a `mipi-dbi-spi` overlay kell, ahol a lábak szabadon megadhatók [E].

**Javasolt lábkiosztás:**

| Jel | GPIO | Fizikai tüske |
|---|---|---|
| MOSI | 10 | 19 |
| SCLK | 11 | 23 |
| CS (CE0) | 8 | 24 |
| DC | 25 | 22 |
| RST | 27 | 13 |
| BL | 22, vagy fixen 3,3 V | – |

Szabadon marad: GPIO 5, 6, 7, 9, 14, 15, 16, 23, 24, 26. A GPIO4 a UPS-é.

**Megoldás:**
1. Első lépés: próba a prototípuson, közben figyelni a ReSpeaker LED-jeit.
2. Ha villognak, a ReSpeaker felé menő 19-es és 23-as tüskét le kell választani az elosztó panel ReSpeaker felőli során (visszahajlítás vagy egy köztes aljzatban kivágás, forrasztás nélkül). A 3 LED-re nincs szükség, a 24-es gyűrű kiváltja őket.

### 2. A kijelző hozzáférése a tüskesorhoz – PROBLÉMA
A ReSpeakeren valószínűleg nincs átmenő tüskesor [V]. A 3D-ellenőrzés szerint egy stacking tüskesor sem ad hozzáférést: a tüskék a ReSpeaker aljzatában végződnek, és a két panel között nincs elég szabad tüske a Dupont-aljzatnak.

**Döntés (2026-11-17):** **GPIO 1→2 elosztó panel** (pl. Micro Connectors RAS-GP02 vagy GeeekPi, 40 tűs, egy anya és két apa tüskesorral [V, kereskedői leírás]). Az egyik soron a ReSpeaker ül, a másikon Dupont-kábellel a kijelző és a XIAO soros vonala. A ReSpeaker LED-jeinek két tüskéje szükség esetén ezen az elosztón választható le. A stack ettől magasabb lesz: a 3D-modellben a UPS–Pi–ReSpeaker stacket lejjebb kell tenni.

### 3. Pi-Ener-lite töltőárama – PROBLÉMA
A gyártói kézikönyv (User Manual V1.0) szerint [E]:
- kimenet: 2,5 A @ 5,1 V;
- töltés: **1 A @ 5 V**, nem állítható (a töltő IC-t sem nevezik meg);
- töltés közben is működik (átmenő táp);
- túltöltés-, mélykisütés-, túláram- és rövidzárvédelem van;
- külső táp jelzése a GPIO4-en (alacsony = van táp), kapcsolóval leválasztható;
- vezérelt leállás jelzése nincs.

A [HOKEZELES.md](HOKEZELES.md) (a thermal ágon) 0,5 A-es töltést javasol. **Teendő:** a hőszámítás újrafuttatása 1 A-es töltésre, töltés közbeni takarékmóddal. Párhuzamosan meg lehet kérdezni a fejlesztőt, van-e áramállító ellenállás. A biztonságos leállás saját szkripttel oldható meg: GPIO4 + a CW2015 töltöttség, például 5% alatt `shutdown`.

### 4. A WS2812 LED-ek – PROBLÉMA
- **Szintillesztés:** a WS2812 adatbemenetének 5 V-os tápnál kb. 3,5 V kell (a tápfeszültség 70%-a), a XIAO 3,3 V-os kimenete határeset [E, Adafruit NeoPixel útmutató]. → **Döntés (2026-11-17): Adafruit NeoDriver** (I2C → NeoPixel meghajtó, STEMMA QT, 5 V-os kimenet, csavaros sorkapocs). A Qwiic láncon az IMU után jön, ezért nem foglal XIAO-lábat, nem kell forrasztás, és a gyűrű meg a C-szalag egyetlen láncban megy. Egy csupasz 74AHCT125 IC-hez forrasztani kellene.
- **Áram:** legfeljebb 60 mA/LED, 31 LED × 60 mA ≈ 1,86 A [E]. Ez túl sok a Pi OTG-portján és a XIAO-n át. → **A LED-ek 5 V-ja közvetlenül a UPS 5 V-járól**, közös GND-vel, és **szoftveres fényerőkorlát** (≤ 30% ≈ 0,6 A). A hőkezelési vizsgálat LED-korlátja ugyanerre mutat.

### 5. XIAO RP2040 – ELLENŐRIZENDŐ
- Az alapváltozat **forrasztatlan tüskesorral** jön; van **gyárilag forrasztott („Pre-Soldered”) változat** [E]. → Azt kell rendelni (a forrasztás ütközne az elvekkel).
- **Nincs rajta STEMMA QT/Qwiic** csatlakozó [E]. → Az IMU-hoz **Adafruit 4397** kábel kell (STEMMA QT → női Dupont-aljzatok, 150 mm), a XIAO tüskéire: 3V3, GND, D4 = SDA, D5 = SCL [E]. *(Az eddig tervezett 4399-es kábel két végén is Qwiic-dugó van, a XIAO-hoz nem jó.)*
- **Érintés (`touchio`):** RP2040-en külső **1 MΩ-os lehúzó ellenállás** kell a GND felé [E, Adafruit útmutató]; enélkül a `TouchIn` hibát dob [V]. A gombok prototípus-lapjára kerül (ott amúgy is van forrasztás).
- **Döntés (2026-11-17): a XIAO soros vonalon (UART) kapcsolódik a Pi-hez** (Pi GPIO14/15 ↔ XIAO TX/RX, + 5 V és GND, Dupont-kábellel az elosztó panelről). Így nem kell OTG kábel. A 3D-ellenőrzés szerint a micro-USB dugó nem fért volna el: 1,5 mm maradt volna a hangszóróig, a minimum 2 mm helyett. A Pi Zero 2 W-n ez a „mini UART” (a PL011 a Bluetooth-é), ezért `enable_uart=1` kell, és a soros konzolt ki kell kapcsolni.

### 6. ReSpeaker v2.0 a Raspberry Pi OS-en – ELLENŐRIZENDŐ
- A `respeaker-2mic-v2_0` overlay **nincs benne** a Raspberry Pi kernelben (rpi-6.12.y – 6.18.y) [E]. → A Seeed `seeed-linux-dtoverlays` repójából kell lefordítani, a `/boot/firmware/overlays/` alá másolni, és a `config.txt`-be beírni: `dtoverlay=respeaker-2mic-v2_0` [E].
- A Seeed fóruma szerint Pi Zero 2 W-n, Bookworm 64 biten (6.12-es kernel) elég az overlay, külön driver nem kell [V]. Trixie-re nincs adat.

### 7. I2C-címek – OK
TLV320AIC3104: 0x18; CW2015: 0x62; DS1307: 0x68 [E]. Nincs ütközés. Az IMU (0x6A/0x6B) a XIAO saját buszán van. **Ellenőrizni:** a DS1307 5 V-os chip. Mérni kell, hogy a UPS I2C-felhúzása 3,3 V-ra megy-e, mert az 5 V árt a Pi lábainak.

### 8. Kamera – OK
Az `ov5647` overlay benne van a hivatalos kernelben, a Zero 22 pólusú CSI-kábellel működik [E]. Külső gyártó moduljánál szükség lehet erre: `camera_auto_detect=0` + `dtoverlay=ov5647`.

### 9. Teljesítménymérleg
| Fogyasztó | Becsült áram (5 V) |
|---|---|
| Pi Zero 2 W | ~0,6 A csúcs [V] |
| Hangszóró-erősítő (1,4 W / 8 Ω) | ~0,3–0,4 A |
| Kamera | ~0,25 A |
| Kijelző + XIAO + IMU | ~0,1 A |
| 31 WS2812, teljes fehér | 1,86 A |
| **Legrosszabb eset** | **~3,1 A > a UPS 2,5 A-je** → túlterhelés, újraindulás |
| **LED-korláttal (≤ 30%)** | **~1,9 A** → belefér |

2,5 A-es kimenetnél a cellának kb. 4 A-t kell leadnia → a védett cella túláram-küszöbét az adatlapon ellenőrizni kell.

## Források
- ReSpeaker v2: [Seeed wiki](https://wiki.seeedstudio.com/respeaker_2_mics_pi_hat_raspberry_v2/), [overlay forrás](https://github.com/Seeed-Studio/seeed-linux-dtoverlays/blob/master/overlays/rpi/respeaker-2mic-v2_0-overlay.dts), [APA102-kód](https://github.com/respeaker/mic_hat/blob/master/interfaces/apa102.py), [fórum, Zero 2 W](https://forum.seeedstudio.com/t/respeaker-2mic-not-recognized-raspberry-pi-zero-2-w/293120?page=2), [v1 pinout](https://www.pinout.xyz/pinout/respeaker_2_mics_phat)
- Raspberry Pi: [kernel overlay README](https://github.com/raspberrypi/linux/blob/rpi-6.12.y/arch/arm/boot/dts/overlays/README), [kamera](https://www.raspberrypi.com/documentation/accessories/camera.html)
- Pi-Ener-lite: [Tindie](https://www.tindie.com/products/rachel/pi-ener-litea-portable-power-platform-for-pi-zero/), [GitHub (kézikönyv)](https://github.com/linshuqin329/Pi-Ener-lite), [CNX Software](https://www.cnx-software.com/2026/08/17/pi-ener-lite-a-compact-18650-ups-board-for-raspberry-pi-zero-with-rtc-and-fuel-gauge/)
- XIAO: [Seeed wiki](https://wiki.seeedstudio.com/XIAO-RP2040/), [The Pi Hut](https://thepihut.com/products/seeed-xiao-rp2040); Adafruit: [4397](https://www.adafruit.com/product/4397), [4209](https://www.adafruit.com/product/4209), [4503](https://www.adafruit.com/product/4503), [touchio RP2040](https://learn.adafruit.com/adafruit-metro-rp2040/capacitive-touch), [NeoPixel tápellátás](https://learn.adafruit.com/adafruit-neopixel-uberguide/powering-neopixels); [CircuitPython touchio](https://docs.circuitpython.org/en/latest/shared-bindings/touchio/)
