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
│ face.py    az arc a kerek kijelzőn (240×240) – 9 üzemmód                           │
│ synth.py   hangeffektek és party-zene kódból                                        │
│ api.py     WebSocket az apphoz (opcionális párosító kód)                           │
│ hal.py     hardver-absztrakció ─┬─ hw_real.py: GC9A01 (SPI), Voice Bonnet (ALSA),  │
│                                 │              OV5647 + OpenCV (helyben), XIAO (USB)│
│                                 └─ hw_sim.py:  PC – PNG-képek, napló               │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ USB, soronként egy JSON
┌────────────── Seeed XIAO RP2040  (CircuitPython, firmware/xiao/code.py) ───────────┐
│ NeoPixel Ring 24 + C-szalag · 4 gomb · AT42QT1010 érintés · LSM6DS3 IMU (dobás,     │
│ rázás, fordítás felismerése) · DRV2605L rezgés · kamera-jelzőfény                   │
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
python -m ckocka --sim                           # interaktív: 1-4 gombok, t érintés, throw, shake, flip, call, q
python -m unittest discover -s tests -v          # 11 teszt
python tests/api_probe.py                        # élő app-kapcsolat próba: 12 ellenőrzés (párosító kód, parancsok, események, két app)
```

Szimulációban is fut az app-kapcsolat: `ws://localhost:8765` – pl. `{"type":"persona.set","data":{"name":"hype"}}`.

## Telepítés a Raspberry Pi-re

1. Raspberry Pi OS (Bookworm, 64 bit) a microSD-re; SPI és kamera engedélyezése (`raspi-config`).
2. Voice Bonnet meghajtó (Adafruit leírása szerint), hangszórók a két kimenetre.
3. A repó gyökeréből: `sudo sh firmware/pi/install.sh` – telepít, és szolgáltatásként elindítja (`journalctl -u ckocka -f`).
4. XIAO: CircuitPython 9.x, majd `circup install neopixel adafruit_lsm6ds adafruit_drv2605 adafruit_debouncer adafruit_ticks`,
   és a `firmware/xiao/boot.py` + `code.py` a CIRCUITPY meghajtóra.

## Bekötés

| Eszköz | Hova | Megjegyzés |
|---|---|---|
| GC9A01 kijelző | Pi SPI0: MOSI GPIO10, SCLK GPIO11, CS GPIO8 (CE0), DC GPIO24, RST GPIO25, háttérfény GPIO23 | A Voice Bonnet 3 DotStar LED-je is az SPI0-n van – belül nem látszanak, de villoghatnak; ha zavar, le kell választani |
| Voice Bonnet | a Pi tüskesorára | I2S: GPIO18–21, I2C: GPIO2/3 |
| Kamera | Pi kamera-csatlakozó (22 pólusú) | OV5647 „spy” kamera |
| XIAO RP2040 | Pi USB (OTG adapter) | táp is innen |
| NeoPixel Ring 24 | XIAO D0 | 5 V a UPS panelről, közös GND |
| C LED-szalag (7 LED) | XIAO D1 | |
| 4 gomb | XIAO D2, D3, D8, D9 → GND | belső felhúzó ellenállás |
| AT42QT1010 | XIAO D10 | aktív magas |
| LSM6DS3TR-C + DRV2605L | XIAO D4 (SDA), D5 (SCL) – Qwiic lánc | |

## Mi nincs benne (még)

- **Beszédfelismerés és AI-válaszok:** az érintésre most a pontos időt vagy egy személyiség-mondatot mond. A „valódi” asszisztenshez
  egy beszédfelismerő (pl. helyi Whisper tiny, vagy felhős API) és egy nyelvi modell kellene – ez beállítás és adatvédelmi döntés kérdése.
- **Bluetooth (A2DP zene, HFP kihangosítás):** a Pi Zero 2 W tudja, BlueZ/PipeWire beállítással; a szoftverben csak a hívás jelenete
  (`incoming_call`) van meg.
- **Telefonos app Bluetooth LE-n:** az API ugyanerre az üzenetformára épülhet; most Wi-Fi (WebSocket) van.
