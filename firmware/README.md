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
│ face.py    az arc a kerek kijelzőn (240×240) – 10 üzemmód                          │
│ synth.py   hangeffektek és party-zene kódból                                        │
│ talk.py    beszélgetés: ébresztőszó/érintés → Whisper → Claude → Piper (+claude.py)│
│ api.py     WebSocket az apphoz (opcionális párosító kód)                           │
│ hal.py     hardver-absztrakció ─┬─ hw_real.py: GC9A01 (SPI), ReSpeaker (ALSA, mono),│
│                                 │              OV5647 + OpenCV (helyben), XIAO (USB)│
│                                 └─ hw_sim.py:  PC – PNG-képek, napló               │
│            (beszélgetés ugyanígy: talk_real.py a Pi-n, talk_sim.py PC-n/tesztben)  │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ USB, soronként egy JSON
┌────────────── Seeed XIAO RP2040  (CircuitPython, firmware/xiao/code.py) ───────────┐
│ NeoPixel Ring 24 + C-szalag · 4 gomb · érintés (touchio) · LSM6DS3 IMU (dobás,      │
│ rázás, fordítás felismerése) · rezgőmotor (PWM) · kamera-jelzőfény                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Miért két processzor?** A Pi Linuxot futtat: jó a hanghoz, a kijelzőhöz és a kamerához, de nem valós idejű.
A XIAO ezredmásodperc pontossággal figyeli a gombokat és a mozgásérzékelőt, és hajtja a LED-eket – akkor is, ha a Pi épp dolgozik.

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

1. Raspberry Pi OS (Bookworm, 64 bit) a microSD-re; SPI és kamera engedélyezése (`raspi-config`).
2. A ReSpeaker 2-Mics Pi HAT a Pi tüskesorára, a hangszóró (1 db, mono) a JST hangszórókimenetre (lásd „Hangpanel”).
3. A repó gyökeréből: `sudo sh firmware/pi/install.sh` – telepít (a hangpanel meghajtóját is; a beszélgetéshez: venv
   `anthropic`, `faster-whisper`, `openwakeword` csomagokkal, a Piper programja és egy angol hang), és szolgáltatásként
   elindítja (`journalctl -u ckocka -f`). Ha a hangpanel meghajtója most került fel: `sudo reboot`.
4. Beszélgetéshez a kulcs: `sudo nano /etc/ckocka.env` → `ANTHROPIC_API_KEY=...`, majd `sudo systemctl restart ckocka`.
5. XIAO: CircuitPython 9.x, majd `circup install neopixel adafruit_lsm6ds adafruit_debouncer adafruit_ticks`,
   és a `firmware/xiao/boot.py` + `code.py` + `reflex.py` a CIRCUITPY meghajtóra.

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

## Bekötés

| Eszköz | Hova | Megjegyzés |
|---|---|---|
| GC9A01 kijelző | Pi SPI0: MOSI GPIO10, SCLK GPIO11, CS GPIO8 (CE0), DC GPIO24, RST GPIO25, háttérfény GPIO23 | A ReSpeaker 3 APA102 LED-je is SPI-n van (a lábakat a Seeed leírása nem adja meg) – belül nem látszanak, de villoghatnak; az első élesztésnél ellenőrizni |
| ReSpeaker 2-Mics Pi HAT | a Pi tüskesorára | I2S: GPIO18–21, I2C: GPIO2/3 (kodek: v2.0 0x18, v1 0x1a); a lap gombja (GPIO17) és Grove-csatlakozói nincsenek használva |
| Hangszóró (1 db, 8 Ω) | ReSpeaker JST hangszórókimenet (v2.0: J2, 2 tűs, 2,0 mm) | mono; a 3,5 mm-es aljzat külön, a hangszóró attól nem némul el |
| Kamera | Pi kamera-csatlakozó (22 pólusú) | OV5647 „spy” kamera |
| XIAO RP2040 | Pi USB (OTG adapter) | táp is innen |
| NeoPixel Ring 24 | XIAO D0 | 5 V a UPS panelről, közös GND |
| C LED-szalag (7 LED) | XIAO D1 | |
| 4 gomb | XIAO D2, D3, D8, D9 → GND | belső felhúzó ellenállás |
| Érintés: rézfólia-elektróda az érintőbetét alatt | XIAO D10 + **1 MΩ lehúzó ellenállás D10 → GND** (a gombok prototípus-lapján) | `touchio`; induláskor kalibrál (akkor ne érjen hozzá senki), utána lassan követi a hő- és páraváltozást. Lehúzó nélkül a XIAO digitális bemenetre vált: így tartalékként egy AT42QT1010 (aktív magas) visszadugható ide szoftvercsere nélkül |
| Rezgőmotor-modul (ERM + tranzisztor, 3 tűs) | XIAO D6 (jel, PWM 20 kHz), VCC 3V3 (vagy 5 V), GND | `tick` (hallgat) és `buzz` (Ne zavarj) minta, rövid teljes erejű indítással |
| LSM6DS3TR-C | XIAO D4 (SDA), D5 (SCL) – Qwiic | |

## Mi nincs benne (még)

- **A beszélgetés élesztése:** a beszélgetés kódja kész és szimulációban tesztelt, de valódi mikrofonnal nem futott.
  A Pi Zero 2 W-n becslés szerint egy válasz 4–8 s (Whisper ~2–4 s, Claude ~1–2 s, Piper ~1 s); a csend-felismerés
  küszöbeit és az ébresztőszó érzékenységét a valódi mikrofonhoz kell hangolni. Közbevágás (barge-in) nincs: amíg beszél, nem hallgat.
- **Saját ébresztőszó** („Hey C”): most egy kész openWakeWord-modell („Hey Jarvis”) a helyén.
- **Bluetooth (A2DP zene, HFP kihangosítás):** a Pi Zero 2 W tudja, BlueZ/PipeWire beállítással; a szoftverben csak a hívás jelenete
  (`incoming_call`) van meg.
- **Telefonos app Bluetooth LE-n:** az API ugyanerre az üzenetformára épülhet; most Wi-Fi (WebSocket) van.
