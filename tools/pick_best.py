# A generált jelöltek közül a Whisper alapján a szöveghez legjobban illő kiválasztása, vágás az első/utolsó szónál
# Futtatás: %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/pick_best.py [--only N01] [--lang english]
import argparse, glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf
from whisper_check import transcribe
from f5_best import score, last_expected_word, cut_after_last_word, cut_before_first_word

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def inner_gap(wav, sr, words, db=-45, min_s=0.08, edge_s=0.05):
    """Szavakon BELÜLI csendes szakaszok összhossza (s): az XTTS néha „megakad” egy szó közepén."""
    peak = np.max(np.abs(wav)) + 1e-9
    win = int(sr * 0.01)
    total = 0.0
    for w, a, b in words:
        if a is None or b is None or b - a < 0.25:
            continue
        seg = wav[int((a + edge_s) * sr):int((b - edge_s) * sr)]
        run = 0
        for i in range(0, len(seg) - win, win):
            quiet = 20 * np.log10(np.sqrt(np.mean(seg[i:i + win] ** 2)) / peak + 1e-12) < db
            run = run + 1 if quiet else 0
            if run * 0.01 == min_s:
                total += min_s
            elif run * 0.01 > min_s:
                total += 0.01
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--lang', default='english')
    ap.add_argument('--cands', default=os.path.join(ROOT, 'video', 'test', 'xtts_en_cands'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'voice_raw_en'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'lines.json'), encoding='utf-8'))
    todo = [l for l in lines if l['voice'] == 'narrator_en' and (not a.only or l['id'] in a.only.split(','))]
    rep_fp = os.path.join(a.out, 'minoseg.json')
    report = json.load(open(rep_fp, encoding='utf-8')) if os.path.exists(rep_fp) else {}
    for l in todo:
        best, tried = None, []
        for fp in sorted(glob.glob(os.path.join(a.cands, l['id'] + '_*.wav'))):
            wav, sr = sf.read(fp, dtype='float32')
            _, all_words = transcribe(wav, sr, a.lang)
            words = last_expected_word(all_words, l['text'])          # angolul nincs „Nos.” előtag
            heard = ' '.join(w[0] for w in words)
            gap = inner_gap(wav, sr, words)
            s = score(l['text'], heard)            # (az inner_gap csak tájékoztató: a Whisper a szavak közti szünetet is a szóhoz számolja)
            tried.append({'file': os.path.basename(fp), 'score': round(s, 3), 'inner_gap_s': round(gap, 2), 'heard': heard})
            if not best or s > best[0]:
                best = (s, wav, sr, words, heard, os.path.basename(fp))
        if not best:
            print('%s  nincs jelölt' % l['id'], flush=True)
            continue
        s, wav, sr, words, heard, fn = best
        wav = cut_after_last_word(wav, sr, words)
        wav = cut_before_first_word(wav, sr, words)
        sf.write(os.path.join(a.out, l['id'] + '.wav'), wav, sr)
        report[l['id']] = {'text': l['text'], 'chosen': fn, 'score': round(s, 3), 'heard': heard, 'candidates': tried}
        print('%s  %.2f  %.1f s | %s%s' % (l['id'], s, len(wav) / sr, heard, '' if s >= 0.9 else '   <-- ELLENŐRIZNI'), flush=True)
    json.dump(report, open(rep_fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('KÉSZ', flush=True)


if __name__ == '__main__':
    main()
