// Közös: a Whisperrel kiválasztott WAV-okból kiegyenlített hangerejű MP3 (a szimulátor és a „Rázd meg!” hangjai).
//
// FIGYELEM: az ffmpeg loudnorm szűrője 3 mp-nél rövidebb klipeken félremér, és szinte némára halkítja őket
// (2026-11-18: a szimulátor 81 mondatából 50, a Rázd meg! 30-ából 10 lett -16…-58 dB csúcsú). Ezért itt mért,
// egyszerű erősítés van: az átlagos hangerőt -18 dB-re hozzuk, de a csúcs legfeljebb -1,5 dB lehet.
// A végén minden fájlt visszamérünk, és ami halk vagy túl rövid, azt hibának jelezzük.
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const TARGET_MEAN = -18, PEAK_MAX = -1.5;

function measure(file) {
  const r = spawnSync(ffmpeg, ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const num = (k) => +((r.stderr.match(new RegExp(k + ': (-?[0-9.]+) dB')) || [])[1]);
  const dur = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return { mean: num('mean_volume'), max: num('max_volume'), dur: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : NaN };
}

function convertAll(linesFile, srcDir, outDir) {
  const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
  let n = 0, bytes = 0, bad = 0;
  for (const l of lines) {
    const src = path.join(srcDir, l.id + '.wav');
    if (!fs.existsSync(src)) { console.log('HIÁNYZIK:', l.id); bad++; continue; }
    const m = measure(src);
    const gain = Math.min(TARGET_MEAN - m.mean, PEAK_MAX - m.max);
    const dst = path.join(outDir, l.id + '.mp3');
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-af', `highpass=f=80,volume=${gain.toFixed(2)}dB`, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
    const o = measure(dst);
    const ok = o.max > -6 && o.dur > 0.6;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'HIBA'} ${l.id.padEnd(18)} ${o.dur.toFixed(2)} s  csúcs ${o.max.toFixed(1)} dB  átlag ${o.mean.toFixed(1)} dB`);
    n++; bytes += fs.statSync(dst).size;
  }
  console.log(`${n} MP3 kész, összesen ${(bytes / 1024).toFixed(0)} KB${bad ? `, ${bad} HIBÁS` : ', mind rendben'}`);
  process.exitCode = bad ? 1 : 0;
}

module.exports = { convertAll, measure };
