# A japán narráció jelöltjei közül a Whisper (japánul) alapján a legjobb kiválasztása, vágás, 48 kHz-es WAV a keveréshez.
# Futtatás: %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/jp_voice_pick.py
import difflib, glob, json, os, sys, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf, torch, torchaudio.functional as AF
from whisper_check import transcribe

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANDS = os.path.join(ROOT, 'video', 'test', 'jp_cands')
OUT = os.path.join(ROOT, 'video', 'jp', 'voice')


def jnorm(t):
    """Írásjelek, szóközök nélkül, a teljes szélességű betűk normál alakban (a kanji/kana marad)."""
    t = unicodedata.normalize('NFKC', t)
    return ''.join(c for c in t if unicodedata.category(c)[0] in 'LN')


def score(accept, heard):
    h = jnorm(heard)
    return max(difflib.SequenceMatcher(None, jnorm(a), h).ratio() for a in accept)


def trim(wav, sr):
    """Az elején és a végén lévő csend levágása (a hang határaitól 60 ms ráhagyással)."""
    a = np.abs(wav)
    thr = a.max() * 0.02
    idx = np.flatnonzero(a > thr)
    s, e = max(0, idx[0] - int(sr * 0.06)), min(len(wav), idx[-1] + int(sr * 0.12))
    out = wav[s:e].copy()
    f = int(sr * 0.02); out[:f] *= np.linspace(0, 1, f); out[-f:] *= np.linspace(1, 0, f)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'jp', 'lines_jp.json'), encoding='utf-8'))
    report, durations = {}, {}
    for l in lines:
        best = None
        tried = []
        for fp in sorted(glob.glob(os.path.join(CANDS, l['id'] + '_*.wav'))):
            wav, sr = sf.read(fp, dtype='float32')
            heard, _ = transcribe(wav, sr, 'japanese', short=True)
            torch.cuda.empty_cache()
            s = score(l['accept'], heard)
            tried.append({'file': os.path.basename(fp), 'score': round(s, 3), 'heard': heard})
            if not best or s > best[0]:
                best = (s, wav, sr, heard, os.path.basename(fp))
        s, wav, sr, heard, fn = best
        w = trim(wav, sr)
        w48 = AF.resample(torch.from_numpy(w), sr, 48000).numpy()
        sf.write(os.path.join(OUT, l['id'] + '.wav'), w48, 48000, subtype='PCM_16')
        durations[l['id']] = round(len(w48) / 48000, 2)
        report[l['id']] = {'ja': l['ja'], 'chosen': fn, 'score': round(s, 3), 'heard': heard, 'candidates': tried}
        print('%s  %.2f  %.2f s | várt: %s | hallott: %s%s' % (l['id'], s, durations[l['id']], l['ja'], heard, '' if s >= 0.85 else '   <-- ELLENŐRIZNI'), flush=True)
    json.dump(durations, open(os.path.join(OUT, 'durations.json'), 'w'), indent=1)
    json.dump(report, open(os.path.join(OUT, 'minoseg.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('DONE')


if __name__ == '__main__':
    main()
