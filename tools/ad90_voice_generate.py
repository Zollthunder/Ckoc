# A „90-es évekbeli amerikai tévéreklám” bemondója XTTS-v2-vel (angol stúdióhang, CPML – nem kereskedelmi).
# Mondatonként több jelölt; a választás Whisperrel: a video-narration skill pick_best.py-ja (lásd VIDEO.md).
# Futtatás: %LOCALAPPDATA%\f5tts\venv_xtts\Scripts\python.exe tools/ad90_voice_generate.py [--n 4] [--speaker "Craig Gutsy"]
import argparse, json, os, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('TTS_HOME', os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'xtts_model'))
os.environ['COQUI_TOS_AGREED'] = '1'  # CPML (nem kereskedelmi) – Zollo jóváhagyta 2026-11-16
from TTS.api import TTS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=4)
    ap.add_argument('--speaker', default='Craig Gutsy')
    ap.add_argument('--only', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'test', 'ad90_cands'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'ad90', 'lines_ad90.json'), encoding='utf-8'))
    tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2').to('cuda' if torch.cuda.is_available() else 'cpu')
    pad = np.zeros(7200, np.float32)
    t0 = time.time()
    for l in lines:
        if a.only and l['id'] not in a.only.split(','):
            continue
        for k in range(a.n):
            torch.manual_seed(3000 + k)
            # egyben (split_sentences=False), különben a mondatok közé 0,42 s digitális csend kerül; a „speed” a túlpörgetett bemondáshoz
            wav = np.asarray(tts.tts(text=l['text'], speaker=a.speaker, language='en', split_sentences=False,
                                     speed=l.get('speed', 1.0), temperature=0.8), dtype=np.float32)
            sf.write(os.path.join(a.out, '%s_%d.wav' % (l['id'], k)), np.concatenate([pad, wav, pad]), 24000)
        print('%s kész (%.1f perc)' % (l['id'], (time.time() - t0) / 60), flush=True)
    print('DONE', flush=True)


if __name__ == '__main__':
    main()
