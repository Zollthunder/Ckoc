// A szimulátor nyelve: magyar (alap) vagy angol (sim.html?lang=en).
// A szövegek magyarul vannak a HTML-ben és a kódban; angolul ez a szótár cseréli le őket.
// A kocka maga mindkét nyelven angolul beszél (a hangfájlok angolok).
export const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'hu';

const EN = {
  // oldal
  'C-kocka szimulátor': 'C-Cube simulator',
  'Próbáld ki a C-kockát a böngészőben: élő arc, fények, gombok, személyiségek, party mód – és a telefonos vezérlőapp.': 'Try the C-Cube in your browser: live face, lights, buttons, personalities, party mode – and the phone app.',
  '-kocka': '-Cube',
  'Videó': 'Video', 'Funkciók': 'Features', 'Szimulátor': 'Simulator', 'Letöltés': 'Downloads',
  'Próbáld ki a C-kockát': 'Try the C-Cube',
  'Nyomd meg a gombjait, dobd el, rázd meg, fordítsd fejjel lefelé – vagy vezéreld a telefonos appból. Hangot is ad, ha engeded.': 'Press its buttons, throw it, shake it, turn it upside down – or control it from the phone app. It makes sounds too, if you let it.',
  '⏻ Bekapcsolás': '⏻ Power on', '⏻ Kikapcsolás': '⏻ Power off',
  'A kocka teteje': 'Top of the cube', 'érintés': 'touch',
  '🤾 Dobd el': '🤾 Throw it', '🎱 Rázd meg': '🎱 Shake it', '🙃 Fordítsd meg': '🙃 Flip it', '😮‍💨 Fáradt vagyok': "😮‍💨 I'm tired", '📞 Bejövő hívás': '📞 Incoming call',
  'Beszélj hozzá': 'Talk to it', 'Küldés': 'Send', '🇭🇺 magyarul': '🇭🇺 Hungarian', '🇬🇧 angolul': '🇬🇧 English',
  'C-kocka app': 'C-Cube app', 'ᛒ csatlakoztatva': 'ᛒ connected', 'ᛒ kocka kikapcsolva': 'ᛒ cube is off', '🔒 mikrofon, kamera KI': '🔒 mic, camera OFF',
  'Személyiség': 'Personality', 'Saját': 'Custom',
  'Energia': 'Energy', 'Beszédesség': 'Chattiness', 'Szarkazmus': 'Sarcasm', 'Kedvesség': 'Kindness',
  '🎵 Party mód': '🎵 Party mode', '📳 Ne zavarj': '📳 Do not disturb', '🐱 Cat mode': '🐱 Cat mode',
  '😺 Dorombol… (simogatásra)': '😺 Purring… (you petted it)', '👀 Leskelődés': '👀 Peeking', '🔊 Beszéd': '🔊 Voice',
  'Fény': 'Light', 'Megszólítás': 'Call me', 'Gombok hangja': 'Button sounds',
  '📯 Duda': '📯 Horn', '☕ Kávészünet?': '☕ Coffee break?',
  '↗ App megnyitása külön ablakban': '↗ Open the app in its own window',
  'Protokoll: app ⇄ kocka': 'Protocol: app ⇄ cube',
  'A C-kocka koncepció, a szimulátor azt mutatja meg, hogyan működne. A kocka angolul beszél: a mondatai előre generált, helyi AI-hangok (XTTS-v2 „Daisy Studious” stúdióhang, Whisperrel ellenőrizve). ·': 'The C-Cube is a concept; the simulator shows how it would work. Its lines are pre-generated local AI voices (XTTS-v2 “Daisy Studious” studio voice, checked with Whisper). ·',
  'Vissza a főoldalra': 'Back to the main page',
  'A virtuális C-kocka': 'The virtual C-Cube', 'A kocka arca': "The cube's face", 'Kamera': 'Camera', 'Kamera-jelzőfény': 'Camera indicator light',
  'Andor – a fa dad-joke gomb': 'Andor – the wooden dad-joke button', 'Türkiz gomb': 'Turquoise button', 'Menta gomb': 'Mint button', 'Rózsaszín gomb': 'Pink button',
  'Érintőfelület (beszéd indítása)': 'Touch pad (start talking)', 'Fizikai mozdulatok': 'Physical gestures', 'Beszélgetés a kockával': 'Conversation with the cube',
  'Kattints rá, és mondd (vagy érintsd meg a kocka tetejét)': 'Click and speak (or touch the top of the cube)',
  '…vagy írd be, mit mondanál neki': '…or type what you would say',
  'Milyen nyelven beszélsz hozzá? (A kocka angolul válaszol.)': 'Which language do you speak to it? (The cube answers in English.)',
  'Narancs': 'Orange', 'Türkiz': 'Turquoise', 'Menta': 'Mint', 'Rózsaszín': 'Pink', 'Lila': 'Purple', 'Fényerő': 'Brightness',
  // feliratok
  '📳 (Ne zavarj: csak finoman rezeg)': '📳 (Do not disturb: it only buzzes gently)',
  '🔒 Fejjel lefelé: mikrofon és kamera kikapcsolva': '🔒 Upside down: microphone and camera off',
  'Mikrofon és kamera újra bekapcsolva': 'Microphone and camera back on',
  '📳 Hívás: BRO – Ne zavarj módban csak rezeg': '📳 Call: BRO – only buzzes in Do not disturb',
  'Nem fogadott hívás: BRO': 'Missed call: BRO',
  '🔊 Kihangosítás: a hívás a kockán keresztül megy': '🔊 Speakerphone: the call goes through the cube',
  'Kapcsold be a kockát (⏻), vagy nyomd meg bármelyik gombját!': 'Switch the cube on (⏻), or press any of its buttons!',
  '🎙️ Hallgatlak…': "🎙️ I'm listening…",
  '🔇 Nem kaptam engedélyt a mikrofonhoz. Gépelj, vagy engedélyezd a böngészőben.': '🔇 No microphone permission. Type instead, or allow it in your browser.',
  '🔇 A böngésző beszédfelismerője most nem érhető el. Gépelj inkább!': "🔇 The browser's speech recognition isn't available right now. Type instead!",
  '🤷 Nem hallottam semmit.': "🤷 I didn't hear anything.",
  'Egy pillanat, még mondok valamit…': "Just a sec, I'm still talking…",
  'Te: „{0}”   🤔': 'You: “{0}”   🤔',
  '😵 Most nem értem el az agyamat ({0}). Próbáld újra!': "😵 Couldn't reach my brain ({0}). Try again!",
  // beszélgetés – megjegyzések
  'A beszélgetéshez a kocka „agya” kell: töltsd le a projektet, és indítsd el helyben a <code>node serve.js</code> paranccsal, Claude API-kulccsal. A nyilvános oldalon ez nem fut, mert a kulcs nem kerülhet egy weboldalba.': "Talking needs the cube's “brain”: download the project and run it locally with <code>node serve.js</code> and a Claude API key. It can't run on the public site, because the key must never be put into a web page.",
  'A szerver fut, de nincs Claude API-kulcs. Állítsd be az <code>ANTHROPIC_API_KEY</code> környezeti változót, és indítsd újra a <code>node serve.js</code>-t. Kulcs nélküli próbához: <code>CKOCKA_TALK_MOCK=1</code>.': 'The server is running, but there is no Claude API key. Set the <code>ANTHROPIC_API_KEY</code> environment variable and restart <code>node serve.js</code>. To try it without a key: <code>CKOCKA_TALK_MOCK=1</code>.',
  'A Claude SDK-hoz Node 18 vagy újabb kell, ezen a gépen régebbi fut.': 'The Claude SDK needs Node 18 or newer; this machine runs an older one.',
  'Hiányzik a Claude SDK: futtasd az <code>npm install</code> parancsot, majd indítsd újra a szervert.': 'The Claude SDK is missing: run <code>npm install</code>, then restart the server.',
  'Próbamód: a válaszok előre megírtak, nem Claude-tól jönnek.': 'Test mode: the answers are canned, not from Claude.',
  'Ez a böngésző nem ismeri a beszédfelismerést, írd be, mit mondanál.': "This browser can't do speech recognition – type what you'd say.",
  'A kocka angolul válaszol. Ha leveszed a hangját, a választ feliratként olvashatod.': 'The cube answers in English. If you mute it, you can read the answer as a subtitle.',
};

// T('… {0} …', x): a szöveg az aktuális nyelven, a {0}, {1} helyére a paraméterek kerülnek
export function T(s, ...args) {
  let out = LANG === 'en' && EN[s] !== undefined ? EN[s] : s;
  args.forEach((a, i) => { out = out.split(`{${i}}`).join(a); });
  return out;
}

// a HTML statikus szövegei (szövegcsomópontok és néhány attribútum) angolra
export function applyStatic(root = document) {
  if (LANG !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = T(document.title);
  const meta = document.querySelector('meta[name=description]'); if (meta) meta.content = T(meta.content);
  const w = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim();
    if (t && EN[t] !== undefined) n.textContent = n.textContent.replace(t, EN[t]);
  }
  root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(e => {
    for (const a of ['title', 'placeholder', 'aria-label']) { const v = e.getAttribute(a); if (v && EN[v] !== undefined) e.setAttribute(a, EN[v]); }
  });
  // a főoldali linkek az angol főoldalra mutassanak
  root.querySelectorAll('a[href^="index.html"]').forEach(a => a.setAttribute('href', a.getAttribute('href').replace('index.html', 'index-en.html')));
  root.querySelectorAll('a[href="sim.html"]').forEach(a => a.setAttribute('href', 'sim.html?lang=en'));
}

// nyelvváltó link a menübe: HU ⇄ EN, a többi URL-paraméter (pl. embed, app) megmarad
export function addLangSwitch(nav) {
  if (!nav) return;
  const p = new URLSearchParams(location.search);
  if (LANG === 'en') p.delete('lang'); else p.set('lang', 'en');
  const a = document.createElement('a');
  const q = p.toString();
  a.href = location.pathname.split('/').pop() + (q ? '?' + q : '');
  a.textContent = LANG === 'en' ? 'HU' : 'EN';
  a.lang = LANG === 'en' ? 'hu' : 'en'; a.hreflang = a.lang;
  a.title = LANG === 'en' ? 'Magyarul' : 'In English';
  nav.append(a);
}
