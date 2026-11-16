# Angol narráció XTTS-v2-vel (stúdióhang: Ludvig Milivoj, CPML) – mondatonként több jelölt; a választás: tools/pick_best.py
# Futtatás: %LOCALAPPDATA%\f5tts\venv_xtts\Scripts\python.exe tools/xtts_en_generate.py [--only N01,J02] [--n 4]
import argparse, json, os, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('TTS_HOME', os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'xtts_model'))
os.environ['COQUI_TOS_AGREED'] = '1'  # CPML (nem kereskedelmi) – Zollo jóváhagyta 2026-11-16
from TTS.api import TTS

SPEAKER = 'Ludvig Milivoj'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--n', type=int, default=4)
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'test', 'xtts_en_cands'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'lines.json'), encoding='utf-8'))
    todo = [l for l in lines if l['voice'] == 'narrator_en' and (not a.only or l['id'] in a.only.split(','))]
    t0 = time.time()
    tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2').to('cuda' if torch.cuda.is_available() else 'cpu')
    for l in todo:
        for k in range(a.n):
            torch.manual_seed(1000 + k)
            wav = np.asarray(tts.tts(text=l['text'], speaker=SPEAKER, language='en'), dtype=np.float32)
            wav = np.concatenate([np.zeros(7200, np.float32), wav, np.zeros(7200, np.float32)])  # 0,3 s csend elöl-hátul
            sf.write(os.path.join(a.out, '%s_%d.wav' % (l['id'], k)), wav, 24000)
        print('%s jelöltek kész (%.1f perc)' % (l['id'], (time.time() - t0) / 60), flush=True)
    print('KÉSZ', flush=True)


if __name__ == '__main__':
    main()
