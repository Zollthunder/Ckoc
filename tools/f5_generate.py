# Magyar mondatok generálása F5-TTS-sel (magyar finomhangolás, Maxdorger29/f5-tts-hungarian, CC-BY-NC-4.0)
# Referenciahang: alapból a Piper "Anna" (CC0) szintetikus hangja – valódi személy hangját hozzájárulás nélkül nem klónozzuk.
# Futtatás (a hordozható környezetből):
#   %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/f5_generate.py   (GPU, CUDA 11.8; a régi CPU-s: ...\venv\...) [--ref ref.wav --ref_text "..."] [--only N01,N02]
import argparse, json, os, sys, time
import numpy as np
import soundfile as sf
import torch, torchaudio

# a modell leírása szerinti javítás: torchaudio betöltés/mentés soundfile-lal (Windows-on stabilabb)
def _load(fp, **kw):
    d, sr = sf.read(str(fp), dtype='float32')
    d = d[np.newaxis, :] if d.ndim == 1 else d.T
    return torch.from_numpy(d), sr
def _save(fp, w, sr, **kw):
    sf.write(str(fp), (w.squeeze(0) if w.dim() > 1 else w).numpy(), sr)
torchaudio.load, torchaudio.save = _load, _save

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'model_hu')
sys.path.insert(0, MODEL)
from hungarian_preprocessing import normalize_hungarian_text
from f5_tts.api import F5TTS

DEFAULT_REF = os.path.join(ROOT, 'video', 'samples', '2_narrator_Anna.wav')
DEFAULT_REF_TEXT = 'Ez a C-kocka. Egy tenyérnyi asztali AI-asszisztens. Beszélhetsz hozzá, és mindig jókedvű.'


def speakable(t):
    """Rövidítések kiírása kiejtés szerint (a modell betű alapú)."""
    for a, b in (('C-kocka', 'cé-kocka'), ('AI-', 'éjáj-'), (' AI ', ' éjáj '), ('RGB', 'er-gé-bé'), ('3D', 'háromdé')):
        t = t.replace(a, b)
    return normalize_hungarian_text(t)


def trim_start(audio, sr, max_ms=400, win_ms=10, ratio=0.15):
    """Az elején néha keletkező rövid zaj levágása energia alapján (a modell példakódja szerint)."""
    mx, w = int(sr * max_ms / 1000), int(sr * win_ms / 1000)
    if len(audio) < mx:
        return audio
    en = [np.sqrt(np.mean(audio[i:i + w] ** 2)) for i in range(0, mx - w, w)]
    th = max(en) * ratio
    for i, e in enumerate(en):
        if e > th:
            return audio[max(0, i * w - w):]
    return audio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', default=DEFAULT_REF)
    ap.add_argument('--ref_text', default=DEFAULT_REF_TEXT)
    ap.add_argument('--only', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'voice_raw_f5'))
    ap.add_argument('--nfe', type=int, default=32)
    ap.add_argument('--device', default='auto', help='auto | cuda | cpu (auto: RTX 2060, ha a GPU-s környezetből fut)')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lines = json.load(open(os.path.join(ROOT, 'video', 'lines.json'), encoding='utf-8'))
    todo = [l for l in lines if l['voice'] == 'szabolcs' and (not a.only or l['id'] in a.only.split(','))]
    dev = a.device if a.device != 'auto' else ('cuda' if torch.cuda.is_available() else 'cpu')
    if dev == 'cpu':
        torch.set_num_threads(max(1, os.cpu_count() or 4))
    t0 = time.time()
    tts = F5TTS(model='F5TTS_v1_Base', ckpt_file=os.path.join(MODEL, 'model_last_final.safetensors'),
                vocab_file=os.path.join(MODEL, 'vocab.txt'), device=dev, use_ema=True)
    print('modell betöltve %.1f s alatt (%s)' % (time.time() - t0, torch.cuda.get_device_name(0) if dev == 'cuda' else 'CPU'), flush=True)
    for l in todo:
        t1 = time.time()
        text = speakable(l['text'])
        wav, sr, _ = tts.infer(ref_file=a.ref, ref_text=speakable(a.ref_text), gen_text=text, nfe_step=a.nfe, remove_silence=False)
        wav = trim_start(np.asarray(wav, dtype=np.float32), sr)
        sf.write(os.path.join(a.out, l['id'] + '.wav'), wav, sr)
        print('%s  %.1f s hang, %.1f s alatt  | %s' % (l['id'], len(wav) / sr, time.time() - t1, text), flush=True)
    print('KÉSZ, összesen %.1f perc' % ((time.time() - t0) / 60))


if __name__ == '__main__':
    main()
