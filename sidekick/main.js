// Matka – a C-kocka cat mode-ja asztali segédként. A fő folyamat: ablak, tálcaikon, beállítások, egérkövetés, tétlenség, keresés
const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, shell, powerMonitor, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setName('Matka');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const MAC = process.platform === 'darwin';
// gyorsbillentyűk: Windowson NEM Ctrl+Alt, mert a magyar billentyűzeten az az AltGr (AltGr+B = „{”, AltGr+K = „ł”),
// Macen pedig NEM ⌘⌥, mert a ⌘⌥B a Chrome könyvjelzőkezelője. A ⌃⌘K / ⌃⌘B Macen szabad.
const KEY = MAC ? { search: '⌃⌘K', cheer: '⌃⌘B' } : { search: 'Ctrl+Shift+Alt+K', cheer: 'Ctrl+Shift+Alt+B' };
const W = 260, H = 330;                 // az ablak: alul a kocka, fölötte a buborék helye
const IDLE_SLEEP = 5 * 60;              // ennyi másodperc tétlenség után elalszik
const SEARCH_KEY = MAC ? 'Control+Command+K' : 'Control+Shift+Alt+K';
const CHEER_KEY = MAC ? 'Control+Command+B' : 'Control+Shift+Alt+B';
const KEY_OK = { search: false, cheer: false };   // ha egy másik program már lefoglalta, nem írjuk ki a menüben

// ---- beállítások (Windowson az AppData, Macen az Application Support mappában) ----
// indítás bejelentkezéskor: Windowson forrásból futtatva az electron.exe-t a program mappájával együtt kell elindítani
// a hordozható Matka.exe minden indításkor egy ideiglenes mappába bomlik ki – a bejelentkezéshez az eredeti exe kell
const LOGIN = MAC ? {} : app.isPackaged ? { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: [] } : { path: process.execPath, args: [path.resolve(__dirname)] };
const SET_FILE = () => path.join(app.getPath('userData'), 'settings.json');
const DEFAULTS = { muted: false, reminderMin: 0, pos: null, engine: 'google', cute: false };
let S = { ...DEFAULTS };
function loadSettings() { try { S = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SET_FILE(), 'utf8')) }; } catch { S = { ...DEFAULTS }; } }
function saveSettings() { try { fs.mkdirSync(path.dirname(SET_FILE()), { recursive: true }); fs.writeFileSync(SET_FILE(), JSON.stringify(S, null, 2)); } catch {} }

let win, tray, reminderTimer, cursorTimer, idleTimer, cuteTimer, asleep = false;

function defaultPos() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - W - 16, y: wa.y + wa.height - H - 8 };
}
function onScreen(p) {
  return p && screen.getAllDisplays().some(d => {
    const a = d.workArea; return p.x + W / 2 >= a.x && p.x + W / 2 <= a.x + a.width && p.y + H - 60 >= a.y && p.y + H - 60 <= a.y + a.height;
  });
}

function createWindow() {
  const p = onScreen(S.pos) ? S.pos : defaultPos();
  win = new BrowserWindow({
    x: p.x, y: p.y, width: W, height: H,
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false, backgroundColor: '#00000000',
    title: 'Matka', acceptFirstMouse: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setAlwaysOnTop(true, 'floating');
  if (MAC) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });   // Macen minden asztalon látszik (a Dock-ikon nélkül)
  win.setIgnoreMouseEvents(true, { forward: true });     // az átlátszó részek átengedik a kattintást
  win.loadFile(path.join(__dirname, 'cat.html'));
  win.once('ready-to-show', () => { win.showInactive(); send('settings', { ...S, mac: MAC, keys: KEY, keyOk: KEY_OK }); send('hello'); if (process.argv.includes('--demo')) console.log('shown', JSON.stringify(win.getBounds()), win.isVisible()); });
  win.webContents.on('did-finish-load', () => { if (process.argv.includes('--demo')) console.log('loaded'); });
  win.webContents.on('console-message', (_e, _l, m) => { if (process.argv.includes('--demo')) console.log('renderer:', m); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
}

const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };

// ---- egérkövetés: a szem a mutatót nézi az egész képernyőn ----
function startCursor() {
  let last = '';
  cursorTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const c = screen.getCursorScreenPoint(), b = win.getBounds();
    const fx = b.x + W / 2, fy = b.y + H - 95;          // az arc közepe
    const dx = c.x - fx, dy = c.y - fy, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 400);
    const msg = `${(dx / d * k).toFixed(2)},${(dy / d * k).toFixed(2)}`;
    if (msg !== last) { last = msg; send('look', { x: dx / d * k, y: dy / d * k }); }
  }, 60);
}

// ---- tétlenség: elalszik, visszatéréskor felébred ----
function startIdle() {
  idleTimer = setInterval(() => {
    const idle = powerMonitor.getSystemIdleTime();
    if (!asleep && idle >= IDLE_SLEEP) { asleep = true; send('sleep', true); }
    else if (asleep && idle < 5) { asleep = false; send('sleep', false); }
  }, 3000);
  powerMonitor.on('lock-screen', () => { asleep = true; send('sleep', true); });
  powerMonitor.on('unlock-screen', () => { asleep = false; send('sleep', false); });
}

// ---- szünet-emlékeztető ----
function scheduleReminder() {
  clearInterval(reminderTimer);
  if (!S.reminderMin) return;
  reminderTimer = setInterval(() => { if (!asleep) send('remind'); }, S.reminderMin * 60 * 1000);
}

// ---- cuki üzenetek: véletlenszerűen, 20–40 percenként ----
function scheduleCute() {
  clearTimeout(cuteTimer);
  cuteTimer = setTimeout(() => { if (S.cute && !asleep) send('cute'); scheduleCute(); }, (20 + Math.random() * 20) * 60 * 1000);
}

// ---- tálcaikon (egy kis macskafej, kódból rajzolva) ----
function trayIcon() {                     // Windowson színes; Macen fekete sziluett átlátszó szemekkel (sablonikon)
  const n = 32, buf = Buffer.alloc(n * n * 4);
  const set = (x, y, [r, g, b, a]) => { const i = (y * n + x) * 4; buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = a; };
  const inTri = (x, y, a, b, c) => { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); const d1 = s([x, y], a, b), d2 = s([x, y], b, c), d3 = s([x, y], c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const EYE = [196, 240, 110, 255], BG = [20, 22, 27, 255], ORG = [255, 138, 31, 255];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const cx = x + 0.5, cy = y + 0.5;
    let col = [0, 0, 0, 0];
    if (inTri(cx, cy, [4, 14], [13, 9], [6, 2]) || inTri(cx, cy, [28, 14], [19, 9], [26, 2])) col = EYE;
    const dx = Math.max(0, Math.abs(cx - 16) - 9), dy = Math.max(0, Math.abs(cy - 19) - 7);
    if (Math.hypot(dx, dy) <= 4) col = BG;
    if (col === BG && Math.hypot(dx, dy) > 3) col = ORG;
    if ((Math.hypot((cx - 11) / 2.2, (cy - 17) / 3.2) <= 1) || (Math.hypot((cx - 21) / 2.2, (cy - 17) / 3.2) <= 1)) col = EYE;
    if (inTri(cx, cy, [14.5, 22], [17.5, 22], [16, 24])) col = [255, 140, 170, 255];
    if (MAC) col = col[3] === 0 || col === EYE && !inTri(cx, cy, [4, 14], [13, 9], [6, 2]) && !inTri(cx, cy, [28, 14], [19, 9], [26, 2]) || col[0] === 255 && col[1] === 140 ? [0, 0, 0, 0] : [0, 0, 0, 255];
    set(x, y, col);
  }
  const img = nativeImage.createFromBitmap(buf, { width: n, height: n, scaleFactor: MAC ? 2 : 1 });
  if (MAC) img.setTemplateImage(true);
  return img;
}

function menu() {
  const rem = m => ({ label: m ? `${m} percenként` : 'Kikapcsolva', type: 'radio', checked: S.reminderMin === m, click: () => { S.reminderMin = m; saveSettings(); scheduleReminder(); } });
  const eng = (id, label) => ({ label, type: 'radio', checked: S.engine === id, click: () => { S.engine = id; saveSettings(); send('settings', { ...S, mac: MAC, keys: KEY, keyOk: KEY_OK }); } });
  return Menu.buildFromTemplate([
    { label: `🔎 Keresés…${KEY_OK.search ? `  (${KEY.search})` : ''}`, click: () => openSearch() },
    { label: '😺 Simogatás', click: () => send('pet') },
    { label: `💪 Bátoríts!${KEY_OK.cheer ? `  (${KEY.cheer})` : ''}`, click: () => send('cheer') },
    { type: 'separator' },
    { label: 'Szünet-emlékeztető', submenu: [rem(0), rem(30), rem(50), rem(60), rem(90)] },
    { label: 'Keresőmotor', submenu: [eng('google', 'Google'), eng('bing', 'Bing'), eng('ddg', 'DuckDuckGo')] },
    { label: 'Cuki üzenetek időnként', type: 'checkbox', checked: S.cute, click: i => { S.cute = i.checked; saveSettings(); } },
    { label: '🔇 Néma mód', type: 'checkbox', checked: S.muted, click: i => { S.muted = i.checked; saveSettings(); send('settings', { ...S, mac: MAC, keys: KEY, keyOk: KEY_OK }); } },
    { label: MAC ? 'Indítás bejelentkezéskor' : 'Indítás a Windowszal', type: 'checkbox', checked: app.getLoginItemSettings(LOGIN).openAtLogin, click: i => app.setLoginItemSettings({ ...LOGIN, openAtLogin: i.checked }) },
    { label: 'Vissza a sarokba', click: () => { const p = defaultPos(); win.setBounds({ ...p, width: W, height: H }); S.pos = p; saveSettings(); } },
    { label: '❓ Hogyan használd?', click: () => send('help') },
    { type: 'separator' },
    { label: 'Kilépés', click: () => app.quit() },
  ]);
}

function openSearch() {
  if (!win) return;
  win.setIgnoreMouseEvents(false);
  if (MAC) app.focus({ steal: true });
  win.show(); win.focus();
  send('search');
}

// ---- keresés: csak ismert keresőoldalakra visz, a szöveg URL-kódolva ----
const ENGINES = {
  google: q => `https://www.google.com/search?q=${q}`,
  bing: q => `https://www.bing.com/search?q=${q}`,
  ddg: q => `https://duckduckgo.com/?q=${q}`,
};
function searchUrl(text) {
  const t = String(text || '').trim().slice(0, 300);
  if (!t) return null;
  const m = t.match(/^(yt|w|map|wiki|térkép)\s+(.+)$/i);
  if (m) {
    const q = encodeURIComponent(m[2]);
    switch (m[1].toLowerCase()) {
      case 'yt': return `https://www.youtube.com/results?search_query=${q}`;
      case 'w': case 'wiki': return `https://hu.wikipedia.org/w/index.php?search=${q}`;
      default: return `https://www.google.com/maps/search/${q}`;
    }
  }
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;            // ha egy webcímet írtál be, azt nyitja meg
  return (ENGINES[S.engine] || ENGINES.google)(encodeURIComponent(t));
}

// ---- üzenetek az ablakból ----
ipcMain.on('mouse', (_e, inside) => { if (win) win.setIgnoreMouseEvents(!inside, { forward: true }); });
ipcMain.on('drag', (_e, { dx, dy }) => {
  if (!win) return; const [x, y] = win.getPosition();
  win.setBounds({ x: Math.round(x + dx), y: Math.round(y + dy), width: W, height: H });
});
ipcMain.on('drag-end', () => { if (!win) return; const [x, y] = win.getPosition(); S.pos = { x, y }; saveSettings(); });
ipcMain.on('menu', () => menu().popup({ window: win }));
ipcMain.on('search', (_e, text) => { const u = searchUrl(text); if (u) shell.openExternal(u); });
ipcMain.on('search-done', () => { if (win) win.blur(); });

// ---- ikon: a build/icon.png (512 px) elkészítése az arcból – npm run icon ----
function makeIcon() {
  const iw = new BrowserWindow({ width: 512, height: 512, x: 0, y: 0, frame: false, transparent: true, skipTaskbar: true, backgroundColor: '#00000000', webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true } });
  iw.loadFile(path.join(__dirname, 'cat.html'), { hash: 'icon' });
  iw.webContents.once('did-finish-load', () => setTimeout(() => iw.webContents.capturePage().then(img => {
    fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'build', 'icon.png'), img.resize({ width: 512, height: 512, quality: 'best' }).toPNG());
    app.quit();
  }), 1200));
}

app.whenReady().then(() => {
  if (process.argv.includes('--icon')) return makeIcon();
  if (MAC && app.dock) app.dock.hide();            // Macen nem kell Dock-ikon, a menüsorban lakik
  loadSettings();
  createWindow();
  tray = new Tray(trayIcon());
  tray.setToolTip('Matka – a C-kocka cicája');
  // Windowson: bal klikk simogat, jobb klikk menü; Macen a menüsor-ikonra kattintva a menü nyílik (ez a szokás)
  tray.on('click', () => (MAC ? tray.popUpContextMenu(menu()) : send('pet')));
  tray.on('right-click', () => tray.popUpContextMenu(menu()));
  KEY_OK.search = globalShortcut.register(SEARCH_KEY, openSearch);
  KEY_OK.cheer = globalShortcut.register(CHEER_KEY, () => send('cheer'));
  startCursor(); startIdle(); scheduleReminder(); scheduleCute();
  // bemutató mód (npm run demo): sorban végigmegy a viselkedéseken, hogy egyben látszódjon minden
  if (process.argv.includes('--demo')) [[3, 'pet'], [9, 'cute'], [15, 'remind'], [21, 'help'], [27, 'search'], [33, 'sleep', true], [39, 'sleep', false]]
    .forEach(([t, ch, d]) => setTimeout(() => {
      if (ch === 'search') openSearch(); else send(ch, d);
      const dir = process.env.SIDEKICK_SHOTS;
      if (dir) setTimeout(() => win.webContents.capturePage().then(img => fs.writeFileSync(path.join(dir, `${t}-${ch}.png`), img.toPNG())), 1500);
    }, t * 1000));
  screen.on('display-removed', () => { if (win && !onScreen({ x: win.getPosition()[0], y: win.getPosition()[1] })) { const p = defaultPos(); win.setBounds({ ...p, width: W, height: H }); } });
});
app.on('second-instance', () => send('pet'));
app.on('will-quit', () => { globalShortcut.unregisterAll(); clearInterval(cursorTimer); clearInterval(idleTimer); clearInterval(reminderTimer); clearTimeout(cuteTimer); });
app.on('window-all-closed', () => app.quit());
