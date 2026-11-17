#!/bin/sh
# A C-kocka szoftverének telepítése egy friss Raspberry Pi OS (Bookworm, 64 bit) rendszerre, a repó gyökeréből futtatva:
#   sudo sh firmware/pi/install.sh
# Előtte: a Voice Bonnet meghajtója (Adafruit leírás szerint), SPI és kamera engedélyezése (raspi-config).
# Az API-kulcsot ez a szkript NEM kéri és nem írja sehova – lásd firmware/README.md, „Beszélgetés”.
set -e
REPO=$(cd "$(dirname "$0")/../.." && pwd)

apt-get update
apt-get install -y python3-pil python3-numpy python3-spidev python3-gpiozero python3-serial \
                   python3-picamera2 python3-opencv python3-websockets python3-venv mpg123 alsa-utils avahi-daemon curl

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
echo "Beszélgetéshez: sudo nano /etc/ckocka.env  (ANTHROPIC_API_KEY=...), majd: sudo systemctl restart ckocka"
