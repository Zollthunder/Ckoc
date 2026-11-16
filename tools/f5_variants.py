# Hangminőség-próba: ugyanaz a mondat több írásmóddal / tempóval / lépésszámmal (F5-TTS, GPU)
# Futtatás: %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/f5_variants.py
import os, sys, time
import numpy as np, soundfile as sf, torch, torchaudio

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
from f5_tts.api import F5TTS

REF = os.path.join(ROOT, 'video', 'test', 'xtts', 'Ludvig_Milivoj.wav')
REF_TEXT = ('Ez a cé-kocka, egy tenyérnyi asztali asszisztens. A kockát egy mesterséges intelligenciával '
            'együtt terveztem meg, pár nap alatt, és mindig jókedvű.')
BASE = 'Ez a {k}. Egy tenyérnyi asztali éjáj-asszisztens. Beszélhetsz hozzá, és mindig jókedvű.'
VARIANTS = [
    # név, kocka-írásmód, tempó, lépésszám, szöveg végi ráhagyás
    ('A_mostani', 'cé-kocka', 1.0, 32, ''),
    ('B_lassabb_raHagyas', 'cé-kocka', 0.9, 32, ' ...'),
    ('C_kocc-ka', 'cé-kocc-ka', 0.9, 32, ' ...'),
    ('D_kotszka', 'cé-kotszka', 0.9, 32, ' ...'),
    ('E_cekocka_egyben', 'cékocka', 0.9, 32, ' ...'),
    ('F_kocc-ka_nfe64', 'cé-kocc-ka', 0.9, 64, ' ...'),
]


def main():
    out = os.path.join(ROOT, 'video', 'test', 'f5_variants')
    os.makedirs(out, exist_ok=True)
    tts = F5TTS(model='F5TTS_v1_Base', ckpt_file=os.path.join(MODEL, 'model_last_final.safetensors'),
                vocab_file=os.path.join(MODEL, 'vocab.txt'), device='cuda' if torch.cuda.is_available() else 'cpu', use_ema=True)
    for name, k, speed, nfe, tail in VARIANTS:
        t = time.time()
        text = BASE.format(k=k) + tail
        wav, sr, _ = tts.infer(ref_file=REF, ref_text=REF_TEXT, gen_text=text, nfe_step=nfe, speed=speed, remove_silence=False)
        wav = np.asarray(wav, dtype=np.float32)
        wav = np.concatenate([wav, np.zeros(int(sr * 0.3), np.float32)])
        sf.write(os.path.join(out, name + '.wav'), wav, sr)
        print('%-22s %.1f s hang, %.1f s alatt | %s' % (name, len(wav) / sr, time.time() - t, text), flush=True)


if __name__ == '__main__':
    main()
