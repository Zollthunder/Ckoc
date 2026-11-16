# A „japán reklám” narrációja XTTS-v2-vel (language="ja"). Az XTTS japán szöveghez a cutlet/fugashi/unidic csomagokkal
# romajivá alakítaná a szöveget; ehelyett mi adjuk a kiejtést (romaji) – így nem kell ~50 MB szótárt letölteni.
# Futtatás: %LOCALAPPDATA%\f5tts\venv_xtts\Scripts\python.exe tools/jp_voice_generate.py [--n 4] [--speaker "Gracie Wise"]
import argparse, json, os, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('TTS_HOME', os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'xtts_model'))
os.environ['COQUI_TOS_AGREED'] = '1'  # CPML (nem kereskedelmi) – Zollo jóváhagyta 2026-11-16
from TTS.api import TTS
from TTS.tts.layers.xtts import tokenizer as xtok


class Passthrough:                       # a „katsu” (cutlet) helyett: a szöveg már romaji
    def romaji(self, text):
        return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=4)
    ap.add_argument('--speaker', default='Gracie Wise')
    ap.add_argument('--only', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'test', 'jp_cands'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'jp', 'lines_jp.json'), encoding='utf-8'))
    tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2').to('cuda' if torch.cuda.is_available() else 'cpu')
    tok = tts.synthesizer.tts_model.tokenizer
    tok.katsu = Passthrough()
    xtok.VoiceBpeTokenizer.katsu = property(lambda self: Passthrough())   # biztosra: akárhogy kérdezi le
    t0 = time.time()
    for l in lines:
        if a.only and l['id'] not in a.only.split(','):
            continue
        for k in range(a.n):
            torch.manual_seed(2000 + k)
            wav = np.asarray(tts.tts(text=l['romaji'], speaker=a.speaker, language='ja', split_sentences=False), dtype=np.float32)
            pad = np.zeros(7200, np.float32)
            sf.write(os.path.join(a.out, '%s_%d.wav' % (l['id'], k)), np.concatenate([pad, wav, pad]), 24000)
        print('%s kész (%.1f perc)' % (l['id'], (time.time() - t0) / 60), flush=True)
    print('DONE', flush=True)


if __name__ == '__main__':
    main()
