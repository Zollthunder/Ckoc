# Narráció minőségellenőrzéssel: mondatonként több F5-jelölt, a Whisper visszaírja, mit hallott,
# és a szöveghez legjobban illő jelölt kerül be. Az utolsó kimondott szó után a felvétel levágódik,
# így a végére nem maradhat elnyújtott „ÁÁÁ”-szerű hang.
# Futtatás: %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/f5_best.py [--only N01,N02] [--n 3]
import argparse, difflib, json, os, re, sys, time, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf, torch
import f5_generate as G          # F5 betöltése, szövegelőkészítés, torchaudio-javítás
from whisper_check import transcribe

ROOT = G.ROOT
OUT = os.path.join(ROOT, 'video', 'voice_raw_f5_ludvig')
# jelöltek: (seed, ráhagyás, előtag) – az előtag a hosszabb mondatoknál segít, a nagyon rövideknél árthat, ezért mindkettő szerepel; – a „ ...” óvja a szóvéget, de néha „ÁÁÁ”-t okoz; a „.” ezt elkerüli
CANDS = [(11, ' ...', True), (22, '.', False), (33, ' ...', False), (44, '.', True), (55, ' ...', True), (66, '.', False),
         (77, ' ...', True), (88, '.', False), (99, ' ...', False), (111, '.', True), (122, ' ...', True), (133, '.', False)]


def norm(t):
    t = t.lower()
    for a, b in (('cé-kocka', 'ckocka'), ('c-kocka', 'ckocka'), ('cékocka', 'ckocka'), ('cé kocka', 'ckocka'), ('c kocka', 'ckocka'),
                 ('éjáj', 'ai'), ('a.i.', 'ai'), ('er-gé-bé', 'rgb'), ('háromdé', '3d'), ('három dé', '3d')):
        t = t.replace(a, b)
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')       # ékezetek nélkül (a Whisper ékezethibái ne számítsanak)
    t = re.sub(r'[^a-z0-9 ]+', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def score(expected, heard):
    e, h = norm(expected), norm(heard)
    s = difflib.SequenceMatcher(None, e, h).ratio()
    extra = max(0, len(h.split()) - len(e.split()))                      # plusz „szavak” (pl. á, ö) büntetése
    # a mondat első szava külön súlyt kap: egy elcserélt kezdőhang („mordítsd”) a teljes mondatban alig látszana
    ef, hf = (e.split() or [''])[0], (h.split() or [''])[0]
    first = difflib.SequenceMatcher(None, ef, hf).ratio()
    return s - 0.05 * extra - 0.3 * (1 - first)


def last_expected_word(words, expected):
    """Az utolsó olyan hallott szó, ami az elvárt szöveg utolsó szavához illik (a mögötte lévő „Áh!”, „Alf.” kimarad)."""
    last = norm(expected).split()[-1] if norm(expected) else ''
    for i in range(len(words) - 1, -1, -1):
        w = norm(words[i][0])
        if w and last and difflib.SequenceMatcher(None, w, last).ratio() >= 0.6:
            return words[:i + 1]
    return words


PREFIX = 'Nos. '   # „feláldozható” előtag: a modell előtét-magánhangzója erre esik, utána levágjuk


def core_words(words, expected):
    """Az előtag ('Nos') és a végén lévő „Áh!”-szerű hangok nélküli szavak."""
    first = norm(expected).split()[0] if norm(expected) else ''
    i0 = 0
    for i, w in enumerate(words[:3]):
        if difflib.SequenceMatcher(None, norm(w[0]), 'nos').ratio() >= 0.6:
            i0 = i + 1
            break
    start = i0
    if i0 < len(words) - 1 and re.fullmatch(r'[aeiou]', norm(words[i0][0]) or '-') and \
            difflib.SequenceMatcher(None, norm(words[i0 + 1][0]), first).ratio() >= 0.5:
        start = i0 + 1                                                # magányos előtét-magánhangzó („A …”) kihagyása
    return last_expected_word(words[start:], expected)


def cut_before_first_word(wav, sr, words):
    """Az első valódi szó előtt az utolsó csendes pontnál (max. 0,15 s-mal korábban) vág, rövid felfutással."""
    if not words or words[0][1] is None:
        return wav
    st = int(words[0][1] * sr)
    peak = np.max(np.abs(wav)) + 1e-9
    win = int(sr * 0.01)
    st = max(0, st - int(sr * 0.08))                                     # a Whisper szókezdete néha későn van
    cut = max(0, st - int(sr * 0.05))
    for i in range(st, max(0, st - int(sr * 0.25)), -win):
        if np.sqrt(np.mean(wav[max(0, i - win):i] ** 2)) < peak * 0.01:
            cut = max(0, i - win)
            break
    out = wav[cut:].copy()
    f = min(len(out), int(sr * 0.02))
    out[:f] *= np.linspace(0, 1, f)
    return np.concatenate([np.zeros(int(sr * 0.05), np.float32), out])


def cut_after_last_word(wav, sr, words):
    """Az utolsó szó vége után az első csendes pontnál (max. 0,35 s) vág, rövid lecsengéssel."""
    if not words or words[-1][2] is None:
        return wav
    end = int(words[-1][2] * sr)
    peak = np.max(np.abs(wav)) + 1e-9
    win = int(sr * 0.02)
    cut = min(len(wav), end + int(sr * 0.35))
    for i in range(end, min(len(wav) - win, end + int(sr * 0.35)), win):
        if np.sqrt(np.mean(wav[i:i + win] ** 2)) < peak * 0.01:            # -40 dB a csúcshoz képest
            cut = i
            break
    out = wav[:cut].copy()
    f = min(len(out), int(sr * 0.06))
    out[-f:] *= np.linspace(1, 0, f)
    return np.concatenate([out, np.zeros(int(sr * 0.25), np.float32)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--n', type=int, default=6)
    ap.add_argument('--nfe', type=int, default=32)
    a = ap.parse_args()
    lines = json.load(open(os.path.join(ROOT, 'video', 'lines.json'), encoding='utf-8'))
    todo = [l for l in lines if l['voice'] == 'szabolcs' and (not a.only or l['id'] in a.only.split(','))]
    t0 = time.time()
    tts = G.F5TTS(model='F5TTS_v1_Base', ckpt_file=os.path.join(G.MODEL, 'model_last_final.safetensors'),
                  vocab_file=os.path.join(G.MODEL, 'vocab.txt'), device='cuda' if torch.cuda.is_available() else 'cpu', use_ema=True)
    ref_text = G.speakable(G.DEFAULT_REF_TEXT)
    report_fp = os.path.join(OUT, 'minoseg.json')
    report = json.load(open(report_fp, encoding='utf-8')) if os.path.exists(report_fp) else {}
    # 1. fázis: minden jelölt legenerálása lemezre (a 6 GB-os kártyára az F5 és a Whisper együtt nem fér rá)
    cdir = os.path.join(ROOT, 'video', 'test', 'f5_cands')
    os.makedirs(cdir, exist_ok=True)
    plan = []
    for l in todo:
        short = len(l['text']) < 15                                        # nagyon rövid szövegnél a lassítás néma kimenetet adott
        speed = 1.0 if short else 0.9
        for seed, tail, pre in CANDS[:a.n]:
            if short:
                tail = '.'
            text = (PREFIX if pre else '') + G.speakable(l['text']) + tail
            wav, sr, _ = tts.infer(ref_file=G.DEFAULT_REF, ref_text=ref_text, gen_text=text, nfe_step=a.nfe,
                                   speed=speed, seed=seed, remove_silence=False)
            # NINCS energia alapú eleji vágás: az a halk kezdő mássalhangzókat (T, F, M, Z) is levágta.
            # Helyette csend az elejére, hogy a Whisper is tisztán hallja az első hangot.
            wav = np.concatenate([np.zeros(int(sr * 0.3), np.float32), np.asarray(wav, dtype=np.float32)])
            fp = os.path.join(cdir, '%s_%d.wav' % (l['id'], seed))
            sf.write(fp, wav, sr)
            plan.append((l, seed, tail + (' +előtag' if pre else ''), fp))
        print('%s jelöltek kész (%.1f perc)' % (l['id'], (time.time() - t0) / 60), flush=True)
    del tts
    import gc; gc.collect(); torch.cuda.empty_cache()
    # 2. fázis: Whisper-ellenőrzés és kiválasztás
    for l in todo:
        best, tried = None, []
        for l2, seed, tail, fp in plan:
            if l2 is not l:
                continue
            wav, sr = sf.read(fp, dtype='float32')
            if np.max(np.abs(wav)) < 0.05:                                  # néma kimenet
                tried.append({'seed': seed, 'tail': tail, 'score': 0, 'heard': '(néma)'})
                continue
            _, all_words = transcribe(wav, sr)
            words = core_words(all_words, l['text'])
            heard = ' '.join(w[0] for w in words)
            s = score(l['text'], heard)
            tried.append({'seed': seed, 'tail': tail, 'score': round(s, 3), 'heard': heard})
            if not best or s > best[0]:
                best = (s, wav, sr, words, heard, seed, tail)
        if not best:
            print('%s  NEM SIKERÜLT (minden jelölt néma)' % l['id'], flush=True)
            continue
        s, wav, sr, words, heard, seed, tail = best
        wav = cut_after_last_word(wav, sr, words)
        if words and words[0][1] is not None:
            wav = cut_before_first_word(wav, sr, words)
        sf.write(os.path.join(OUT, l['id'] + '.wav'), wav, sr)
        report[l['id']] = {'text': l['text'], 'chosen': {'seed': seed, 'tail': tail, 'score': round(s, 3), 'heard': heard},
                           'candidates': tried}
        flag = '' if s >= 0.9 else '   <-- ELLENŐRIZNI'
        print('%s  %.2f  %.1f s | hallott: %s%s' % (l['id'], s, len(wav) / sr, heard, flag), flush=True)
    json.dump(report, open(report_fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('KÉSZ, összesen %.1f perc' % ((time.time() - t0) / 60), flush=True)


if __name__ == '__main__':
    main()
