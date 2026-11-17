# C-kocka – a kocka saját szoftvere

> **Koncepció:** a C-kocka nem készül el fizikailag, ezért ez a szoftver valódi hardver nélkül készült.
> PC-n **szimulált hardverrel** fut és tesztelhető; a Raspberry Pi-s és XIAO-s rész szintaktikailag ellenőrzött,
> de élesztés nélkül. A webes változat (ugyanezzel a viselkedéssel): [sim.html](../sim.html).

## Felépítés

```
            telefonos app (ws://ckocka.local:8765, JSON)
                         │  persona.set, led.color, mode.party …   ▲ event.button, event.throw, state …
                         ▼                                          │
┌──────────────── Raspberry Pi Zero 2 W  (Python, firmware/pi/ckocka) ───────────────┐
│ brain.py   viselkedés: bekapcsolás, viccek, személyiségek, party, Ne zavarj,       │
│            fordítás (adatvédelem), leskelődés, felvidítás, hívás                   │
│ face.py    az arc állapota (a XIAO rajzolja); PC-n PNG-előnézet – 11 üzemmód       │
│ synth.py   hangeffektek és party-zene kódból                                        │
│ talk.py    beszélgetés: ébresztőszó/érintés → Whisper → Claude → Piper (+claude.py)│
│ api.py     WebSocket az apphoz (opcionális párosító kód)                           │
│ hal.py     hardver-absztrakció ─┬─ hw_real.py: ReSpeaker (ALSA, mono), XIAO (USB),  │
│                                 │              OV5647 + OpenCV (helyben)            │
│                                 │  power.py:   UPS – alvás töltéskor, leállás 5 %   │
│                                 └─ hw_sim.py:  PC – PNG-képek, napló               │
│            (beszélgetés ugyanígy: talk_real.py a Pi-n, talk_sim.py PC-n/tesztben)  │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ USB (OTG), soronként egy JSON – az arcról csak az állapot
┌────────────── Seeed XIAO RP2040  (CircuitPython, firmware/xiao/code.py) ───────────┐
│ GC9A01 kijelző: az arc animációja (faces.py, vektoros) · NeoDriver: Ring 24 + C     │
│ · 4 gomb · érintés (touchio) · LSM6DS3 IMU (dobás, rázás, fordítás) · rezgőmotor    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Miért két processzor?** A Pi Linuxot futtat: jó a hanghoz, a beszélgetéshez és a kamerához, de nem valós idejű.
A XIAO ezredmásodperc pontossággal figyeli a gombokat és a mozgásérzékelőt, hajtja a LED-eket és **rajzolja az arcot** –
akkor is, ha a Pi épp dolgozik. (A kijelző a Pi tüskesoráról nem érhető el, ezért került a XIAO-ra.)

**Közös protokoll:** az app, a webes szimulátor és a Pi ugyanazokat az üzeneteket használja ([protocol.py](pi/ckocka/protocol.py)).
A szimulátor „Protokoll” paneljén látható üzenetek ugyanígy mennének a valódi kockának.

**Hangok:** a kocka mondatai ugyanazok az előre generált MP3-ak, mint a szimulátorban ([web/voice](../web/voice)),
a hangeffektek és a party-zene kódból készülnek. A hang a Pi-n szól, a száj a hang valódi hangerejére mozog.

**Adatvédelem:** a kamera képe a kockán marad (OpenCV, helyben). Fejjel lefelé fordítva a mikrofonok (ALSA) és a kamera is kikapcsol,
a fény elhalványul. Ha a kamera figyel, a C-szalag utolsó LED-je zölden világít.

## Kipróbálás PC-n (hardver nélkül)

```bash
cd firmware/pi
pip install Pillow numpy websockets
python -m ckocka --sim --demo --frames out      # bemutató: végigmegy a funkciókon, a kijelző képei az out/ mappába
python -m ckocka --sim                           # interaktív: 1-4 gombok, t érintés, throw, shake, flip, call, q,
                                                 #   ask <angol mondat> (érintés + kérdés), hey <angol mondat> (ébresztőszó + kérdés)
python -m unittest discover -s tests -v          # 48 teszt (mikrofon, hálózat és API-kulcs nélkül; a Claude API mockolva)
python tests/api_probe.py                        # élő app-kapcsolat próba: 12 ellenőrzés (párosító kód, parancsok, események, két app)
```

Szimulációban is fut az app-kapcsolat: `ws://localhost:8765` – pl. `{"type":"persona.set","data":{"name":"hype"}}`.

Szimulációban kulcs nélkül egy előre megírt, személyiségenként más „szimulált ész” felel. Ha a valódi Claude-dal
akarsz beszélgetni a PC-n is (a hang ilyenkor is szimulált, a válasz a naplóban és az appban látszik):

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...        # Windows PowerShell: $env:ANTHROPIC_API_KEY = "..."
python -m ckocka --sim              # majd: ask What should I do this afternoon?
```

## Beszélgetés

```
 „Hey Jarvis” (openWakeWord)  ─┐                                        ┌─ arc: hallgat → gondolkodik → beszél
 vagy érintés (XIAO touchio)  ─┴→ felvétel a csend végéig → faster-whisper ─→ Claude API ─→ Piper → hangszóró
                                  (arecord, 16 kHz)          (tiny.en, helyben)  (felhő)    (helyben)
```

- **Ami helyben marad:** a hang. Az ébresztőszót, a beszédfelismerést és a beszédszintézist a Pi számolja; a Claude API-hoz
  csak a felismert **szöveg** megy. Fejjel lefelé a mikrofon kikapcsol, a félbehagyott felvétel elvész.
- **Modell:** `claude-opus-5-5`, `effort: low` (gyors, rövid válasz). A rendszerprompt a kocka aktuális személyiségéből
  készül (Sunny / Chill / Hype / Sarcastic / Pro / Saját – utóbbinál a csúszkákból), angolul beszél, felolvasható,
  markdown nélküli, 1–3 mondatos válaszokat kér. Ha a Claude egy kérést visszautasítana, a szerver ugyanabban a hívásban
  tartalék modellel próbálja újra (server-side fallback).
- **Emlék:** a beszélgetés 5 perc csendig, legfeljebb 12 kérdésig él; személyiségváltáskor újrakezdődik.
- **Fények és arc:** hallgat (`listen` – „lélegző” gyűrű), gondolkodik (`think` – körbefutó fény, felfelé néző szemek),
  beszél (a száj a hang hangerejére mozog). Az app `speech.heard` és `speech.say` eseményben látja a kérdést és a választ.
- **Hiba esetén** (nincs kulcs, nincs net, túlterhelés) nem némul el: egy rövid mondatban megmondja, mi a baj.
- **Kulcs nélkül** a Pi-n a kocka a régi módon viselkedik: érintésre megmondja a pontos időt vagy mond egy személyiség-mondatot.

**Mire kell API-kulcs?** Csak a válaszokhoz (Claude API, fizetős, [console.anthropic.com](https://console.anthropic.com)).
Az ébresztőszó, a beszédfelismerés és a beszédszintézis kulcs nélkül, internet nélkül is működik; a tesztekhez sem kell kulcs.
A kulcsot a szoftver **csak** az `ANTHROPIC_API_KEY` környezeti változóból olvassa – soha ne kerüljön a repóba vagy a kódba.

| Beállítás (környezeti változó) | Alapérték | Mire jó |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | a Claude API kulcsa (a Pi-n: `/etc/ckocka.env`, csak root olvashatja) |
| `CKOCKA_WAKEWORD` | `hey_jarvis` | openWakeWord-modell neve vagy `.onnx` útvonala; `off` = csak érintés |
| `CKOCKA_WHISPER` | `tiny.en` | faster-whisper modell (`base.en` pontosabb, de a Pi Zero 2 W-n lassú) |
| `CKOCKA_PIPER_BIN`, `CKOCKA_PIPER_MODEL` | `/opt/ckocka/piper/…` | a Piper programja és hangja |

Saját „Hey C” ébresztőszó az openWakeWord tanító jegyzetfüzetével készíthető (szintetikus hangmintákból); a kész `.onnx`
útvonalát kell a `CKOCKA_WAKEWORD`-be írni.

## Telepítés a Raspberry Pi-re

1. Raspberry Pi OS (Bookworm, 64 bit) a microSD-re. (Az I2C-t, a UPS óráját és a hangpanelt az
   `install.sh` kapcsolja be a `config.txt`-ben, a `# ckocka-… begin/end` jelölt blokkokban; a régi fájl: `config.txt.ckocka.bak`.)
2. A ReSpeaker 2-Mics Pi HAT a Pi tüskesorára, a hangszóró (1 db, mono) a JST hangszórókimenetre (lásd „Hangpanel”).
3. A repó gyökeréből: `sudo sh firmware/pi/install.sh` – telepít (a hangpanel meghajtóját is; a beszélgetéshez: venv
   `anthropic`, `faster-whisper`, `openwakeword` csomagokkal, a Piper programja és egy angol hang), és szolgáltatásként
   elindítja (`journalctl -u ckocka -f`). Ha a hangpanel vagy az óra beállítása most került fel: `sudo reboot`.
   Utána a UPS ellenőrzése (a szolgáltatás leállítása után): `cd /opt/ckocka && python3 -m ckocka.diag power`.
4. Beszélgetéshez a kulcs: `sudo nano /etc/ckocka.env` → `ANTHROPIC_API_KEY=...`, majd `sudo systemctl restart ckocka`.
5. XIAO: CircuitPython 9.x, majd `circup install adafruit_gc9a01a adafruit_display_text adafruit_lsm6ds adafruit_seesaw
   adafruit_pixelbuf adafruit_debouncer adafruit_ticks`, és a `firmware/xiao/boot.py` + `code.py` + `reflex.py` + `faces.py`
   a CIRCUITPY meghajtóra. A XIAO a Pi USB-portjára megy (OTG kábel).

## Hangpanel: Seeed ReSpeaker 2-Mics Pi HAT

Két változata van, a szoftver **mindkettőt** kezeli (a kodeket a `/proc/asound`-ból ismeri fel, és ahhoz állítja a keverőt):

| | v1 | v2.0 (ma ez kapható) |
|---|---|---|
| Kodek | WM8960 | TLV320AIC3104 |
| Felismerés | – | „v2.0” felirat a gomb mellett; I2C-cím 0x18 (v1: 0x1a) |
| Meghajtó (install.sh) | `dtoverlay=respeaker-2mic-v1_0` | `dtoverlay=respeaker-2mic-v2_0` |
| Hangszóró | JST, a WM8960 saját erősítőjéről | 2 tűs, 2,0 mm-es JST (J2), **TPA2005D1** mono D osztályú erősítő; bemenete a kodek két vonalkimenetének összege (L+R), ezért a szoftver a *Line* keverőket kapcsolja be. Az erősítő mindig be van kapcsolva (~SHUTDOWN 10 kΩ-mal 3,3 V-ra húzva), GPIO nem kell hozzá. Forrás: a v2.0 kapcsolási rajza (2024-11-15) |

- **Meghajtó:** az `install.sh` a Seeed `seeed-linux-dtoverlays` repójából fordítja le az eszközfa-overlay-t, és beírja a
  `config.txt`-be. A változatot magától felismeri; ha nem sikerül, a v2.0-t teszi fel, kézzel: `sudo RESPEAKER=v1 sh firmware/pi/install.sh`.
  (A régi `seeed-voicecard` DKMS-meghajtó a mai kernelekkel már nem működik.)
- **ALSA** ([firmware/pi/asound.conf](pi/asound.conf) → `/etc/asound.conf`): a kártyát a nevéről keresi (`seeed2micvoicec`,
  a sorszáma változhat), a lejátszás dmix (beszéd + hanghatás + zene egyszerre), a felvétel dsnoop. **Mono:** minden hang
  (L+R)/2 keverékként mindkét csatornára megy, így mindegy, hogy a hangszóró melyik csatornán van.
- **Keverő és mikrofon-némítás:** `hw_real.CODECS` – a Linux-meghajtók vezérlőnevei (v1: `Capture Switch`, v2.0:
  `PGA Capture Switch`). Valódi panelen még nem futott: az első élesztésnél `amixer -c seeed2micvoicec controls`, és ha
  egy név más, ott kell javítani. Ha egy vezérlő nem állítható, a kocka elindul, csak figyelmeztet a naplóban; fejjel
  lefelé a beszélgetés ettől függetlenül is eldobja a mikrofon hangját.
- **Próba:** `aplay -l` (látszik-e a `seeed2micvoicec`), `speaker-test -c 2 -t wav`, `arecord -d 3 -f S16_LE -r 16000 -c 1 proba.wav && aplay proba.wav`.

## Kijelző és arc: a XIAO rajzolja

- A GC9A01 (240×240) a XIAO SPI0-ján van: **D8 = SCK, D10 = MOSI, D9 = DC**. A CS a GND-n, a RST és a háttérfény
  3,3 V-on, ezért nincs reset-láb: a `fourwire.FourWire` reset és chip select nélkül is indul (ilyenkor csak szoftveres
  reset van), és mivel az `adafruit_gc9a01a` init-sora nem küld szoftveres resetet, a `code.py` maga küldi (0x01, 150 ms).
  A háttérfény így mindig világít – alváskor a képernyő fekete.
- **Az arcot a XIAO rajzolja** ([`firmware/xiao/faces.py`](xiao/faces.py)): a Pi csak az állapotot küldi
  (`face`: üzemmód, száj, személyiség, tekintet, felirat…; beszéd közben `talk`: a hang hangereje → a száj), csak ha
  változott. Pislogás, a gondolkodás pontjai, a szédült spirál, a party-hangszínkép a XIAO-n animálódik.
- **Memória:** nincs képkocka-puffer – az arc ~30 vektoros alakzat (`vectorio` sokszögek és körök) + 2 felirat, és a
  `displayio` csak a megváltozott részeket rajzolja újra (25 kép/s).
- Az arcok a DESIGN.md szerint: készenlét (két szem és mosoly), hallgat (nagy, figyelő szemek), gondolkodik (felfelé
  néz, keringő pontok), beszél (a száj a hanggal nyílik), eldobták (spirál szemek), leskelődik (résnyire nyitott szemek),
  személyiségek (Chill: félig lehunyt, Hype: tágra nyílt, Sarcastic: hunyorítás + felhúzott szemöldök, Pro: visszafogott).
- A PC-s szimulátor a Pi oldali `face.py`-jal ugyanezt PNG-be rajzolja; a XIAO rajzát a `tests/test_face_xiao.py`
  rajzolja ki (`CKOCKA_FACE_PNG=out` mellett a képeket el is menti).

## Táp: Pi-Ener-lite UPS

- **GPIO4:** a UPS jelzése, alacsony = van külső táp. **CW2015** töltöttségmérő: I2C 0x62. **DS1307** óra: 0x68
  (`dtoverlay=i2c-rtc,ds1307`, a kernel kezeli).
- **Biztonságos leállás** ([`ckocka/power.py`](pi/ckocka/power.py)): külső táp nélkül 5 % alatt (3 egymás utáni mérésen
  át, 10 másodpercenként) a kijelzőn „LOW BATTERY”, a LED-ek kialszanak, majd `shutdown -h now`. A jogot az install.sh
  adja (`/etc/sudoers.d/ckocka`, csak ez az egy parancs). 15 % alatt figyelmeztet (napló + `battery` esemény az appnak).
- **Alvás töltés közben** (HOKEZELES.md 7.5): a töltőáram fix 1 A, a töltő vesztesége a cella alatt keletkezik. Külső
  tápon (GPIO4 alacsony) a kocka legfeljebb **15 percig** van ébren (bedugás vagy ébresztés után), utána elalszik, ha épp
  nem beszél: az arc kialszik, a LED-ek összesen **≤ 8 %**, a kamera szünetel. Az ébresztőszó, gomb, érintés, mozdulat
  vagy az app felébreszti (újabb 15 percre), kihúzáskor rögtön felébred. Az értékek: `power.CHARGE_AWAKE`, `power.SLEEP_LED_BUDGET`.
- A CW2015 itt cellaprofil nélkül, a saját alapprofiljával becsül – az első élesztésnél a `diag power` kiírt
  cellafeszültségével össze kell vetni.

## Bekötés

| Eszköz | Hova | Megjegyzés |
|---|---|---|
| GC9A01 kijelző | XIAO D8 (SCK), D10 (MOSI), D9 (DC); CS → GND, RST és háttérfény (BL) → 3,3 V | lásd „Kijelző és arc” |
| Pi-Ener-lite UPS | a Pi alá; GPIO4 = külső táp jelzése, I2C: CW2015 0x62, DS1307 0x68 | lásd „Táp”. A DS1307 5 V-os: mérni kell, hogy az I2C-felhúzás 3,3 V-ra megy-e |
| ReSpeaker 2-Mics Pi HAT | a Pi tüskesorára | I2S: GPIO18–21, I2C: GPIO2/3 (kodek: v2.0 0x18, v1 0x1a); a lap gombja (GPIO17) és Grove-csatlakozói nincsenek használva |
| Hangszóró (1 db, 8 Ω) | ReSpeaker JST hangszórókimenet (v2.0: J2, 2 tűs, 2,0 mm) | mono; a 3,5 mm-es aljzat külön, a hangszóró attól nem némul el |
| Kamera | Pi kamera-csatlakozó (22 pólusú) | OV5647 „spy” kamera |
| XIAO RP2040 | Pi USB (OTG kábel, USB CDC) | táp is innen; a Pi a XIAO „data” soros portját nyitja (`/dev/serial/by-id/*if02*`). **Mind a 11 láb foglalt**, a kiosztás egy helyen: `code.py`, `PINS` |
| Adafruit NeoDriver (I2C → NeoPixel, seesaw) | Qwiic-lánc: XIAO → IMU → NeoDriver; I2C-cím alapból 0x60 (`NEODRIVER_ADDR`, a valódi panelen ellenőrizni: a XIAO konzolja szól, ha nem találja) | a jelszintet maga illeszti (nincs 74AHCT125); a LED-ek 5 V-ja a UPS 5 V-járól, közös GND |
| NeoPixel Ring 24 + C LED-szalag (7 LED) | a NeoDriver kimenetén **egy láncban**: előbb a gyűrű (0–23), utána a C-szalag (24–30) | a szoftver a 31 LED-et **összesen legfeljebb 30 %** fényerőre korlátozza (≈ 0,56 A; `reflex.LED_BUDGET`, teszt ellenőrzi), bármit kér a Pi; töltés közbeni alvásban ≤ 8 %; frissítés 50 Hz |
| 4 gomb | XIAO D1 (1. – Andor), D2, D3, D6 → GND | belső felhúzó ellenállás |
| Érintés: rézfólia-elektróda az érintőbetét alatt | XIAO D7 + **1 MΩ lehúzó ellenállás D7 → GND** (a gombok prototípus-lapján) | `touchio`; induláskor kalibrál (akkor ne érjen hozzá senki), utána lassan követi a hő- és páraváltozást. Lehúzó nélkül a `TouchIn` hibát dob: a firmware nem áll le, a XIAO konzoljára kiírja, mi hiányzik, és digitális bemenetre vált (belső lehúzással, hamis érintés nélkül) – így tartalékként egy AT42QT1010 (aktív magas) is visszadugható ide |
| Rezgőmotor-modul (ERM + tranzisztor, 3 tűs) | XIAO D0 (jel, PWM 20 kHz), VCC 3V3 (vagy 5 V), GND | `tick` (hallgat) és `buzz` (Ne zavarj) minta, rövid teljes erejű indítással |
| LSM6DS3TR-C | XIAO D4 (SDA), D5 (SCL), 3V3, GND – **Adafruit 4397** kábellel (STEMMA QT → női Dupont; a XIAO-n nincs Qwiic); a lánc első tagja, utána a NeoDriver | ha nincs bekötve, a firmware IMU nélkül fut (konzol: „nincs IMU”). Függőlegesen a szán jobb sínjének külső oldalán: panel X → hátra, Y → fel, Z → jobbra. Az átszámolás a kocka tengelyeire egy helyen van: `firmware/xiao/reflex.py`, `IMU_AXES`. **Első élesztésnél:** álló kockánál a XIAO konzolján `cube_g (0.0, 1.0, 0.0)` körüli értéknek kell megjelennie; ha nem, a panel szitanyomata szerint a táblázatot kell átírni (a teszt ellenőrzi, hogy forgatás maradjon) |

## Mi nincs benne (még)

- **A beszélgetés élesztése:** a beszélgetés kódja kész és szimulációban tesztelt, de valódi mikrofonnal nem futott.
  A Pi Zero 2 W-n becslés szerint egy válasz 4–8 s (Whisper ~2–4 s, Claude ~1–2 s, Piper ~1 s); a csend-felismerés
  küszöbeit és az ébresztőszó érzékenységét a valódi mikrofonhoz kell hangolni. Közbevágás (barge-in) nincs: amíg beszél, nem hallgat.
- **Saját ébresztőszó** („Hey C”): most egy kész openWakeWord-modell („Hey Jarvis”) a helyén.
- **Bluetooth (A2DP zene, HFP kihangosítás):** a Pi Zero 2 W tudja, BlueZ/PipeWire beállítással; a szoftverben csak a hívás jelenete
  (`incoming_call`) van meg.
- **Telefonos app Bluetooth LE-n:** az API ugyanerre az üzenetformára épülhet; most Wi-Fi (WebSocket) van.
