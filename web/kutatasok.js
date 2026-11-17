// Kutatások oldal: kártyák a fő számokkal + olvasó, ami a .md fájlokat közvetlenül jeleníti meg
// (így az oldal mindig a repó aktuális dokumentumait mutatja). Útvonal: #piac vagy #piac/fejezet-azonosito
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

const EN = new URLSearchParams(location.search).get('lang') === 'en';
const REPO = 'https://github.com/Zollthunder/Ckoc/blob/main/';

const DOCS = [
  { key: 'piac', file: 'PIACI_TANULMANY.md', icon: '📈',
    hu: ['Piaci előtanulmány', 'Van-e piaca, mennyiért lehetne eladni, mekkora haszonnal, és hány darabot érdemes gyártani.'],
    en: ['Market study', 'Is there a market, what price, what margin, and how many units to build.'],
    facts: [['~130 M USD', 'évente az asztali AI-robot rés', 'a year: the desktop AI-robot niche'],
            ['199–249 €', 'javasolt bruttó ár', 'suggested retail price'],
            ['35–40%', 'árrés 1000 db-nál', 'gross margin at 1000 units']] },
  { key: 'koltseg', file: 'AJANLATKERESEK.md', icon: '🧾',
    hu: ['Költségbecslés – 3 prototípus', 'Tételes anyaglista beszállítókkal és árakkal, plusz ajánlatkérés-tervezetek (nem elküldve).'],
    en: ['Cost estimate – 3 prototypes', 'Itemised bill of materials with suppliers and prices, plus draft quote requests (not sent).'],
    facts: [['~111 ezer Ft', 'kockánként, nettó', 'per cube, net (HUF)'],
            ['~62 ezer Ft', 'ebből elektronika', 'of which electronics'],
            ['+10%', 'tartalék benne', 'contingency included']] },
  { key: 'optimalizalas', file: 'KOLTSEGOPTIMALIZALAS.md', icon: '✂️',
    hu: ['Költségoptimalizálás', 'Alkatrészenként: mit lehet olcsóbban, mibe kerül munkaidőben, mi ütközik a tervezési elvekkel – és mit döntöttünk.'],
    en: ['Cost optimisation', 'Part by part: what can be cheaper, the labour impact, what conflicts with the design rules – and what we decided.'],
    facts: [['140 → 111 ezer Ft', 'darabköltség a döntések után', 'unit cost after the decisions (HUF)'],
            ['−21%', 'kockánként', 'per cube'],
            ['top 5', 'javaslat rangsorolva', 'ranked proposals']] },
  { key: 'hokezeles', file: 'HOKEZELES.md', icon: '🌡️',
    hu: ['Hőkezelés', 'Bírja-e hővel a 90 mm-es zárt kocka? Teljesítménymérleg üzemmódonként és hőmodell 25 és 35 °C-os szobára.'],
    en: ['Thermal check', 'Can the closed 90 mm cube handle the heat? Power budget per mode and a thermal model for 25 and 35 °C rooms.'],
    facts: [['2,4 W', 'a 31 LED – a hő fele', 'from the 31 LEDs – half the heat'],
            ['≤ 71 °C', 'a Pi a javítócsomaggal', 'Pi with the fix package'],
            ['~41 °C', 'a cella, ha töltés közben alszik', 'cell when it sleeps while charging']] },
  { key: 'kompatibilitas', file: 'KOMPATIBILITAS.md', icon: '🔌',
    hu: ['Hardverkompatibilitás', 'Összeillenek-e a kész modulok: buszok, lábkiosztás, címek, töltőáram – adatlapok alapján.'],
    en: ['Hardware compatibility', 'Do the off-the-shelf modules fit together: buses, pinout, addresses, charge current – from datasheets.'],
    facts: [['9', 'ellenőrzött pont', 'checks'],
            ['11 / 11', 'XIAO-láb kiosztva', 'XIAO pins assigned'],
            ['arc a XIAO-n', 'a fő döntés', 'the key decision']] },
  { key: 'tanusitas', file: 'TANUSITAS.md', icon: '🛡️',
    hu: ['Tanúsítás és forgalmazás', 'Mi kellene, hogy eladható legyen: CE/RED, RoHS, GDPR, MI-rendelet, kiberreziliencia, EPR – és külföldön.'],
    en: ['Certification', 'What it would take to sell it: CE/RED, RoHS, GDPR, AI Act, Cyber Resilience Act, EPR – and abroad.'],
    facts: [['CE / RED', 'a fő szabály az EU-ban', 'the main EU rule'],
            ['4', 'nagy kockázat', 'major risks'],
            ['2027-12', 'teljes CRA', 'full Cyber Resilience Act']] },
];

const L = (hu, en) => (EN ? en : hu);
const $ = (id) => document.getElementById(id);

// ---- angol felület ----
if (EN) {
  document.documentElement.lang = 'en';
  document.title = 'C-Cube – research';
  const t = { 'Videó': 'Video', 'Funkciók': 'Features', 'Szimulátor': 'Simulator', 'Kutatások': 'Research', 'Letöltés': 'Downloads' };
  document.querySelectorAll('#nav a').forEach((a) => {
    a.textContent = t[a.textContent] || a.textContent;
    a.href = a.getAttribute('href').replace('index.html', 'index-en.html').replace(/^sim\.html$/, 'sim.html?lang=en').replace(/^kutatasok\.html$/, 'kutatasok.html?lang=en');
  });
  document.querySelector('.brand').innerHTML = '<span class="brand-c">C</span>-Cube';
  document.querySelector('.brand').href = 'index-en.html';
  document.querySelector('.research-head .eyebrow').textContent = 'Research';
  document.querySelector('.research-head h1').textContent = 'What’s behind the cube';
  document.querySelector('.research-head .section-lead').textContent = 'While designing, Claude and I worked out whether it would pay off, what it would cost, whether it overheats, whether the parts fit together, and what selling it would require. These are practice documents for the AI challenge: estimates, not a business plan or legal advice. The documents are in Hungarian.';
  $('back').textContent = '↑ Back to research';
  $('src').textContent = 'Source on GitHub ↗';
  $('note').hidden = false;
  document.querySelector('.footer').innerHTML = '<p><span class="brand-c">C</span>-Cube · Designed by Zollo &amp; C (Claude) · AI Challenge 2026</p><p class="muted">Concept product – not for sale.</p>';
}
{ // nyelvváltó
  const a = document.createElement('a');
  a.href = EN ? 'kutatasok.html' : 'kutatasok.html?lang=en';
  a.textContent = EN ? 'HU' : 'EN';
  a.title = EN ? 'Magyarul' : 'In English';
  $('nav').append(a);
}

// ---- kártyák ----
$('cards').innerHTML = DOCS.map((d) => {
  const [title, text] = EN ? d.en : d.hu;
  const facts = d.facts.map(([n, hu, en]) => `<li><b>${n}</b><span>${L(hu, en)}</span></li>`).join('');
  return `<a class="rcard" href="#${d.key}">
    <span class="rcard-icon" aria-hidden="true">${d.icon}</span>
    <h2>${title}</h2>
    <p>${text}</p>
    <ul class="facts">${facts}</ul>
    <span class="rcard-more">${L('Elolvasom →', 'Read it →')}</span>
  </a>`;
}).join('');

// ---- markdown → HTML ----
// GitHub-szerű fejezet-azonosítók, hogy a dokumentumok belső hivatkozásai működjenek
const slug = (s) => s.toLowerCase().trim().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
marked.use({
  gfm: true,
  renderer: {
    heading(text, level, raw) { return `<h${level} id="${slug(raw)}">${text}</h${level}>\n`; },
  },
});

const byFile = Object.fromEntries(DOCS.map((d) => [d.file, d]));
let current = null;

function fixLinks(root, doc) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:)/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; return; }
    const [path, frag] = href.split('#');
    if (!path) { a.href = `#${doc.key}/${frag}`; return; }       // fejezet ugyanebben a dokumentumban
    if (byFile[path]) { a.href = `#${byFile[path].key}${frag ? '/' + frag : ''}`; return; } // másik kutatás
    a.href = REPO + path + (frag ? '#' + frag : '');             // minden más a GitHubon
    a.target = '_blank'; a.rel = 'noopener';
  });
  // a széles táblázatok mobilon vízszintesen görgethetők
  root.querySelectorAll('table').forEach((t) => {
    const w = document.createElement('div'); w.className = 'table-wrap';
    t.replaceWith(w); w.append(t);
  });
}

async function show(key, frag) {
  const doc = DOCS.find((d) => d.key === key);
  const reader = $('olvaso');
  if (!doc) { reader.hidden = true; current = null; return; }
  reader.hidden = false;
  $('src').href = REPO + doc.file;
  if (current !== key) {
    current = key;
    $('doc').innerHTML = `<p class="muted">${L('Betöltés…', 'Loading…')}</p>`;
    try {
      const res = await fetch(doc.file, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      $('doc').innerHTML = marked.parse(await res.text());
      fixLinks($('doc'), doc);
    } catch (e) {
      $('doc').innerHTML = `<p>${L('Nem sikerült betölteni a dokumentumot.', 'Could not load the document.')} <a href="${REPO + doc.file}" target="_blank" rel="noopener">GitHub ↗</a></p>`;
    }
  }
  const target = frag ? document.getElementById(decodeURIComponent(frag)) : reader;
  (target || reader).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function route() {
  const [key, frag] = location.hash.slice(1).split('/');
  document.querySelectorAll('.rcard').forEach((c) => c.classList.toggle('on', c.getAttribute('href') === '#' + key));
  show(key, frag);
}
$('back').addEventListener('click', (e) => {
  e.preventDefault();
  history.replaceState(null, '', location.pathname + location.search);
  route();
  $('cards').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
addEventListener('hashchange', route);
route();
