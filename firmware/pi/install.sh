#!/bin/sh
# A C-kocka szoftverének telepítése egy friss Raspberry Pi OS (Bookworm, 64 bit) rendszerre, a repó gyökeréből futtatva:
#   sudo sh firmware/pi/install.sh
# Előtte: a Voice Bonnet meghajtója (Adafruit leírás szerint), SPI és kamera engedélyezése (raspi-config).
set -e
REPO=$(cd "$(dirname "$0")/../.." && pwd)

apt-get update
apt-get install -y python3-pil python3-numpy python3-spidev python3-gpiozero python3-serial \
                   python3-picamera2 python3-opencv python3-websockets mpg123 alsa-utils avahi-daemon

install -d /opt/ckocka /opt/ckocka/voice
cp -r "$REPO/firmware/pi/ckocka" /opt/ckocka/
cp "$REPO"/web/voice/*.mp3 "$REPO/web/voice/lines.json" /opt/ckocka/voice/
chown -R pi:pi /opt/ckocka

hostnamectl set-hostname ckocka            # az app így találja meg: ckocka.local
install -m 644 "$REPO/firmware/pi/ckocka.service" /etc/systemd/system/ckocka.service
systemctl daemon-reload
systemctl enable --now ckocka
echo "Kész. Napló: journalctl -u ckocka -f"
