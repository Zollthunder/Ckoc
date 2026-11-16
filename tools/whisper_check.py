# Whisper (openai/whisper-large-v3-turbo, MIT) beszédfelismerés szóidőpontokkal – a generált mondatok ellenőrzéséhez
# Futtatás: %LOCALAPPDATA%\f5tts\venv_gpu\Scripts\python.exe tools/whisper_check.py <wav> [<wav> ...]
import os, sys, time
os.environ.setdefault('HF_HOME', os.path.join(os.environ['LOCALAPPDATA'], 'f5tts', 'hf'))
import numpy as np, soundfile as sf, torch
from transformers import pipeline

MODEL_ID = 'openai/whisper-large-v3-turbo'
_asr = None


def asr():
    global _asr
    if _asr is None:
        dev = 0 if torch.cuda.is_available() else -1
        _asr = pipeline('automatic-speech-recognition', model=MODEL_ID, device=dev,
                        torch_dtype=torch.float16 if dev == 0 else torch.float32)
    return _asr


def transcribe(wav, sr):
    """Visszaadja a szöveget és a szavakat [(szó, kezdet, vég)] másodpercben."""
    if sr != 16000:
        import torchaudio.functional as AF
        wav = AF.resample(torch.from_numpy(wav), sr, 16000).numpy()
    r = asr()({'raw': wav.astype(np.float32), 'sampling_rate': 16000}, return_timestamps='word',
              generate_kwargs={'language': 'hungarian', 'task': 'transcribe'})
    words = [(c['text'].strip(), c['timestamp'][0], c['timestamp'][1]) for c in r.get('chunks', [])]
    return r['text'].strip(), words


if __name__ == '__main__':
    t = time.time()
    asr()
    print('Whisper betöltve %.1f s alatt' % (time.time() - t), flush=True)
    for fp in sys.argv[1:]:
        w, sr = sf.read(fp, dtype='float32')
        txt, words = transcribe(w if w.ndim == 1 else w.mean(1), sr)
        print('%s: %s' % (os.path.basename(fp), txt))
        print('   utolsó szó: %r | hossz %.2f s' % (words[-1] if words else '-', len(w) / sr))
