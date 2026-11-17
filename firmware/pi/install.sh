#!/bin/sh
# A C-kocka szoftverének telepítése egy friss Raspberry Pi OS (Bookworm, 64 bit) rendszerre, a repó gyökeréből futtatva:
#   sudo sh firmware/pi/install.sh
# Az SPI-t, az I2C-t, a kijelzőt (mipi-dbi-spi), a UPS óráját és a hangpanelt ez a szkript kapcsolja be (config.txt);
# a kamera az OV5647 automatikus felismerésével megy. A hangpanel (Seeed ReSpeaker 2-Mics Pi HAT) meghajtóját
# ez a szkript teszi fel; a változatot magától felismeri, vagy megadható: sudo RESPEAKER=v1 sh firmware/pi/install.sh
#   v2 (alapértelmezett, ma ez kapható): TLV320AIC3104 kodek – „v2.0” felirat a gomb mellett
#   v1 (több boltban kifutott):           WM8960 kodek
# Az API-kulcsot ez a szkript NEM kéri és nem írja sehova – lásd firmware/README.md, „Beszélgetés”.
set -e
REPO=$(cd "$(dirname "$0")/../.." && pwd)

apt-get update
apt-get install -y python3-pil python3-numpy python3-spidev python3-gpiozero python3-serial \
                   python3-picamera2 python3-opencv python3-websockets python3-venv mpg123 alsa-utils avahi-daemon curl \
                   git make device-tree-compiler i2c-tools python3-smbus

# --- hangpanel: Seeed ReSpeaker 2-Mics Pi HAT (a Seeed eszközfa-overlay-ével; a régi seeed-voicecard DKMS-meghajtó
#     a mai kernelekkel már nem működik). A kártya neve mindkét változatnál: seeed2micvoicec
CONFIG=/boot/firmware/config.txt
[ -f "$CONFIG" ] || CONFIG=/boot/config.txt
OVERLAYS=$(dirname "$CONFIG")/overlays
REBOOT=0
config_block() {              # a config.txt "# ckocka-<név> begin/end" közötti részét a bemenetre cseréli (újrafuttatható)
  tmp=$(mktemp)
  awk -v b="# ckocka-$1 begin" -v e="# ckocka-$1 end" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' "$CONFIG" > "$tmp"
  { echo "# ckocka-$1 begin"; echo "[all]"; cat; echo "# ckocka-$1 end"; } >> "$tmp"
  if ! cmp -s "$tmp" "$CONFIG"; then
    [ -f "$CONFIG.ckocka.bak" ] || cp "$CONFIG" "$CONFIG.ckocka.bak"
    cat "$tmp" > "$CONFIG"
    REBOOT=1
  fi
  rm -f "$tmp"
}
detect_respeaker() {          # a már betöltött meghajtóból, különben az I2C-címből (v2: 0x18, v1: 0x1a)
  if grep -q tlv320aic3x /proc/asound/pcm 2>/dev/null; then echo v2; return; fi
  if grep -q wm8960 /proc/asound/pcm 2>/dev/null; then echo v1; return; fi
  modprobe i2c-dev 2>/dev/null || true
  if i2cdetect -y 1 0x18 0x18 2>/dev/null | grep -Eq ' (18|UU)'; then echo v2; return; fi
  if i2cdetect -y 1 0x1a 0x1a 2>/dev/null | grep -Eq ' (1a|UU)'; then echo v1; return; fi
}
if [ -z "$RESPEAKER" ]; then
  RESPEAKER=$(detect_respeaker || true)
  if [ -z "$RESPEAKER" ]; then
    RESPEAKER=v2
    echo "FIGYELEM: a ReSpeaker változata nem ismerhető fel (az I2C még nincs bekapcsolva?) – v2.0-t telepítek."
    echo "          v1 (WM8960) esetén: sudo RESPEAKER=v1 sh firmware/pi/install.sh"
  fi
fi
case "$RESPEAKER" in
  v1) OVL=respeaker-2mic-v1_0 ;;
  v2) OVL=respeaker-2mic-v2_0 ;;
  *)  echo "RESPEAKER csak v1 vagy v2 lehet (most: $RESPEAKER)"; exit 1 ;;
esac
echo "Hangpanel: ReSpeaker 2-Mics $RESPEAKER ($OVL)"
if [ ! -f "$OVERLAYS/$OVL.dtbo" ]; then
  SRC=$(mktemp -d)
  git clone --depth 1 https://github.com/Seeed-Studio/seeed-linux-dtoverlays.git "$SRC"
  ( cd "$SRC" && make "overlays/rpi/$OVL-overlay.dtbo" ) ||
    dtc -@ -I dts -O dtb -o "$SRC/overlays/rpi/$OVL-overlay.dtbo" "$SRC/overlays/rpi/$OVL-overlay.dts"
  install -m 644 "$SRC/overlays/rpi/$OVL-overlay.dtbo" "$OVERLAYS/$OVL.dtbo"
  rm -rf "$SRC"
fi
if ! grep -q "^dtoverlay=$OVL\$" "$CONFIG"; then
  sed -i '/^dtoverlay=respeaker-2mic-v[12]_0$/d' "$CONFIG"     # a másik változat sora (ha volt) ki
  echo "dtoverlay=$OVL" >> "$CONFIG"
  REBOOT=1
fi

# --- kijelző: GC9A01 a mipi-dbi-spi meghajtóval (SPI0 CE0 GPIO8, DC GPIO25, RST GPIO27, háttérfény GPIO22).
#     A gyári gc9a01 overlay NEM jó: a háttérfényt a GPIO18-ra tenné, ami a ReSpeaker I2S órajele. Lásd ckocka/panel.py.
#     A panel init-sorozata firmware-fájlként: /lib/firmware/gc9a01.bin (a panel.py állítja elő).
#     A ReSpeaker APA102 LED-jei ugyanezen az SPI0-n vannak – ellenőrzés: python3 -m ckocka.diag spi-leds
sed -i '/^dtoverlay=gc9a01/d' "$CONFIG"
python3 "$REPO/firmware/pi/ckocka/panel.py" --firmware /lib/firmware/gc9a01.bin
config_block display <<EOF
$(python3 "$REPO/firmware/pi/ckocka/panel.py" --config)
EOF

# --- táp: Pi-Ener-lite – CW2015 töltöttségmérő (0x62) és DS1307 óra (0x68) az I2C-1-en, külső táp jelzése a GPIO4-en
config_block ups <<EOF
dtparam=i2c_arm=on
dtoverlay=i2c-rtc,ds1307
EOF
# --- XIAO: soros vonal (UART) a GPIO14/15-ön. Pi Zero 2 W-n ez a mini UART (/dev/serial0 -> ttyS0; a PL011 a Bluetooth-é).
#     enable_uart=1 (a mini UART órája így stabil), a Linux soros konzolja ki, hogy ne írjon a XIAO-ra.
config_block uart <<EOF
enable_uart=1
EOF
CMDLINE=$(dirname "$CONFIG")/cmdline.txt
if grep -Eq 'console=(serial0|ttyS0|ttyAMA0),[0-9]+ ?' "$CMDLINE" 2>/dev/null; then
  cp "$CMDLINE" "$CMDLINE.ckocka.bak"
  sed -i -E 's/console=(serial0|ttyS0|ttyAMA0),[0-9]+ ?//g' "$CMDLINE"
  REBOOT=1
fi
systemctl disable --now serial-getty@ttyS0.service 2>/dev/null || true
usermod -aG dialout pi                      # a szolgáltatás (pi) olvashassa a /dev/serial0-t

# biztonságos leállás: a szolgáltatás (pi felhasználó) jelszó nélkül csak ezt az egy parancsot futtathatja rootként
SUDOERS=/etc/sudoers.d/ckocka
printf 'pi ALL=(root) NOPASSWD: /usr/sbin/shutdown -h now\n' > "$SUDOERS.tmp"
chmod 440 "$SUDOERS.tmp"
if visudo -cf "$SUDOERS.tmp" >/dev/null; then mv "$SUDOERS.tmp" "$SUDOERS"; else rm -f "$SUDOERS.tmp"; echo "FIGYELEM: sudoers hiba"; fi

# ALSA: a ReSpeaker a NEVÉVEL az alapértelmezett eszköz, mono keveréssel (1 hangszóró), dmix/dsnoop-pal
[ -f /etc/asound.conf ] && ! cmp -s /etc/asound.conf "$REPO/firmware/pi/asound.conf" && cp /etc/asound.conf /etc/asound.conf.bak
install -m 644 "$REPO/firmware/pi/asound.conf" /etc/asound.conf

install -d /opt/ckocka /opt/ckocka/voice /opt/ckocka/piper
cp -r "$REPO/firmware/pi/ckocka" /opt/ckocka/
cp "$REPO"/web/voice/*.mp3 "$REPO/web/voice/lines.json" /opt/ckocka/voice/

# --- beszélgetés: venv a pip-csomagoknak (a Pi OS saját csomagjait is látja)
python3 -m venv --system-site-packages /opt/ckocka/venv
/opt/ckocka/venv/bin/pip install --upgrade pip
/opt/ckocka/venv/bin/pip install anthropic faster-whisper
# openWakeWord: Linuxon a tflite-runtime függőség nem mindig települ – ilyenkor ONNX-szal, függőségek nélkül
/opt/ckocka/venv/bin/pip install openwakeword || {
  /opt/ckocka/venv/bin/pip install --no-deps openwakeword && /opt/ckocka/venv/bin/pip install onnxruntime tqdm scipy scikit-learn requests
} || echo "FIGYELEM: az openWakeWord nem települt – a kocka csak érintésre hallgat"
/opt/ckocka/venv/bin/python -c "import openwakeword.utils as u; u.download_models(['hey_jarvis'])" || true
# a Whisper-modell letöltése most (különben az első kérdésnél töltené le)
/opt/ckocka/venv/bin/python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8')" || true

# Piper (önálló program) + egy angol hang
PIPER_REL=https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_aarch64.tar.gz
VOICE_URL=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
if [ ! -x /opt/ckocka/piper/piper ]; then
  curl -fsSL "$PIPER_REL" | tar -xz -C /opt/ckocka            # a csomag egy piper/ mappát tartalmaz
fi
[ -f /opt/ckocka/piper/en_US-lessac-medium.onnx ] || curl -fsSL -o /opt/ckocka/piper/en_US-lessac-medium.onnx "$VOICE_URL"
[ -f /opt/ckocka/piper/en_US-lessac-medium.onnx.json ] || curl -fsSL -o /opt/ckocka/piper/en_US-lessac-medium.onnx.json "$VOICE_URL.json"

chown -R pi:pi /opt/ckocka

# a kulcs helye: /etc/ckocka.env (csak root olvashatja; a szolgáltatás ebből kapja környezeti változóként)
if [ ! -f /etc/ckocka.env ]; then
  printf '# ANTHROPIC_API_KEY=<ide a kulcs>   – ez a fájl soha ne kerüljön a repóba\n' > /etc/ckocka.env
fi
chmod 600 /etc/ckocka.env

hostnamectl set-hostname ckocka            # az app így találja meg: ckocka.local
install -m 644 "$REPO/firmware/pi/ckocka.service" /etc/systemd/system/ckocka.service
systemctl daemon-reload
systemctl enable --now ckocka
echo "Kész. Napló: journalctl -u ckocka -f"
if [ "$REBOOT" = 1 ]; then
  echo "A hangpanel, a kijelző és az óra meghajtója újraindítás után töltődik be: sudo reboot"
  echo "  utána: aplay -l → seeed2micvoicec;  cd /opt/ckocka && python3 -m ckocka.diag spi-leds   (és: … diag power)"
fi
echo "Beszélgetéshez: sudo nano /etc/ckocka.env  (ANTHROPIC_API_KEY=...), majd: sudo systemctl restart ckocka"
