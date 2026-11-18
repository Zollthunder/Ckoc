---
name: c-kocka-render
description: Re-generate or re-render any of the C-kocka (C-Cube) project's videos — the main video (2:56), the fast cut (1:52), the Japanese, 90s American and retro Hungarian ad parodies, or the vertical cat-mode short — and refresh the website posters. Use whenever the user wants a C-kocka video re-rendered, re-cut, re-mixed, re-voiced, or asks "how do I rebuild the video", "rendereld újra", "frissítsd a videót", "új hang a reklámba", even if they only name one scene or one line.
---

# C-kocka video rebuild

Every C-kocka video is made from code: a three.js scene (`video/scene*.html`), a timeline JSON, voice WAVs and music/SFX synthesised by a Node script, mixed and then recorded frame by frame in headless Edge into ffmpeg (`tools/render_video.js`). Nothing is edited by hand, so any change means re-running part of a pipeline. The order below matters: each step reads the previous step's output.

## Before you start

- **Render from PowerShell, not Bash.** Headless Edge does not start from the Bash tool and gives no error. Run `node tools/render_video.js …` with the PowerShell tool, in the background (a full render takes minutes; the 2:56 one about 7–8 min).
- **Render in the main checkout.** `video/fusion_build/` (Fusion frames) and `video/voice/*.wav` are gitignored, so a worktree does not have them.
- **VRAM:** Fusion, XTTS and Whisper do not fit on the RTX 2060 (6 GB) together. Close Fusion before generating voices. Never touch Fusion documents other than the C-kocka (the user does real CAM work in the same Fusion).
- **Voice lines:** use the `video-narration` skill (XTTS-v2 candidates → Whisper pick). It holds the venv paths and pitfalls. The user's ears are the final judge of audio.
- Quick check without a full render: `node tools/render_video.js test 8,20,36.5` writes stills to `video/test/t_<time>.jpg`; look at them before rendering everything.

## Pipelines

Run only from the step that changed onwards.

| Video | Output | Steps |
|---|---|---|
| Main (2:56, English) | `video/c-kocka.mp4` | `tools/xtts_en_generate.py` → `tools/pick_best.py` → `node tools/voice_process.js` → `node tools/audio_mix.js` → `node tools/render_video.js full` |
| Fast cut (1:52) | `video/c-kocka_bemutato_porgos.mp4` | new lines from `video/porgos/lines_porgos.json` via video-narration → `node tools/build_porgos.js` → `node tools/audio_mix.js --tl video/porgos/timeline_porgos.json --out video/porgos/audio_mix_porgos.wav` → `node tools/render_video.js full --page scene_porgos.html --audio video/porgos/audio_mix_porgos.wav --out video/c-kocka_bemutato_porgos.mp4` |
| Japanese ad (0:31) | `video/c-cube_japan.mp4` | `tools/jp_voice_generate.py` → `tools/jp_voice_pick.py` → `node tools/jp_audio.js` → `node tools/build_jp_scene.js` → `node tools/render_video.js full --page scene_jp.html --audio video/jp/audio_mix_jp.wav --out video/c-cube_japan.mp4` |
| 90s US ad (0:42) | `video/c-cube_90s.mp4` | `tools/ad90_voice_generate.py` → `tools/pick_best.py` → `node tools/ad90_audio.js` → `node tools/build_ad90_scene.js` → `node tools/render_video.js full --page scene_ad90.html --audio video/ad90/audio_mix_ad90.wav --out video/c-cube_90s.mp4` |
| Retro HU ad (0:41) | `video/c-kocka_retro_hu.mp4` | XTTS `--lang hu` (speakers "Gitta Nikolina", "Craig Gutsy") → `pick_best.py --lang hungarian` → `node tools/hu_retro_audio.js` → `node tools/build_hu_retro_scene.js` → `node tools/render_video.js full --page scene_hu_retro.html --audio video/hu_retro/audio_mix_hu_retro.wav --out video/c-kocka_retro_hu.mp4` |
| Cat mode short (0:20, 9:16) | `video/c-kocka_catmode_short.mp4` | `node tools/catmode_audio.js` → `node tools/build_catmode_scene.js` → `node tools/render_video.js full --page scene_catmode.html --audio video/catmode/audio_mix_catmode.wav --out video/c-kocka_catmode_short.mp4` |

`VIDEO.md` has each video's script, timeline and the reasons behind it; read the matching section before changing content.

**Keep the main video's audio stable.** `tools/audio_mix.js` is shared by the main video and the fast cut. After touching it, re-mix the main video and confirm its WAV is bit-identical to before (hash it), unless the change was meant for both.

## After rendering

1. **Check it:** duration and resolution with `node_modules/ffmpeg-static/ffmpeg.exe -i <mp4>`; a contact sheet (`-vf "fps=1/4,scale=320:-1,tile=5x2"`) to eyeball the cuts; Whisper on the final mix if narration changed (every line, right order).
2. **Website poster** if the opening changed: `ffmpeg -ss <t> -i <mp4> -frames:v 1 -vf scale=960:-2 -q:v 4 assets/poster-<name>.jpg` (cat mode: `scale=540:-2`). Main and fast cut share `assets/poster.jpg`.
3. **Durations on the site:** `index.html` and `index-en.html` show the length in the video section and the downloads; update both languages.
4. **Repo size:** each re-render adds 20–45 MB to git history forever. Commit a video only when it is final, not every iteration.
5. Add a short entry to `NAPLO.md` (what changed, example prompt, where it got stuck) — the log is part of the AI challenge submission.
