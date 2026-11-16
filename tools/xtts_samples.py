# XTTS-v2 stúdióhangok magyarul – referenciajelöltek az F5-TTS-hez.
# A stúdióhangok a Coqui által licencelt, hozzájáruló beszélőktől származnak (CPML, nem kereskedelmi licenc).
# Futtatás: %LOCALAPPDATA%\f5tts\venv_xtts\Scripts\python.exe tools/xtts_samples.py [--speakers "A,B"] [--text "..."]
import argparse, os, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('TTS_HOME', os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'xtts_model'))
os.environ['COQUI_TOS_AGREED'] = '1'  # CPML (nem kereskedelmi) – Zollo jóváhagyta 2026-11-16
from TTS.api import TTS

MALE = ['Viktor Eka', 'Damien Black', 'Craig Gutsy', 'Andrew Chipper', 'Baldur Sanjin', 'Ludvig Milivoj']
FEMALE = ['Claribel Dervla', 'Daisy Studious', 'Gracie Wise', 'Ana Florence', 'Sofia Hellen', 'Gitta Nikolina']
TEXT = ('Ez a cé-kocka, egy tenyérnyi asztali asszisztens. A kockát egy mesterséges intelligenciával '
        'együtt terveztem meg, pár nap alatt, és mindig jókedvű.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--speakers', default=','.join(MALE + FEMALE))
    ap.add_argument('--text', default=TEXT)
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'test', 'xtts'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    t0 = time.time()
    tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2').to('cuda' if torch.cuda.is_available() else 'cpu')
    print('modell betöltve %.1f s alatt' % (time.time() - t0), flush=True)
    avail = set(tts.speakers or [])
    for sp in a.speakers.split(','):
        sp = sp.strip()
        if sp not in avail:
            print('NINCS ilyen hang:', sp, flush=True)
            continue
        t1 = time.time()
        wav = np.asarray(tts.tts(text=a.text, speaker=sp, language='hu'), dtype=np.float32)
        fn = os.path.join(a.out, sp.replace(' ', '_') + '.wav')
        sf.write(fn, wav, 24000)
        print('%-18s %.1f s hang, %.1f s alatt' % (sp, len(wav) / 24000, time.time() - t1), flush=True)
    print('KESZ, összesen %.1f perc' % ((time.time() - t0) / 60), flush=True)


if __name__ == '__main__':
    main()
