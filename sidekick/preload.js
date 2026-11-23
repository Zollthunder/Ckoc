// híd az ablak és a fő folyamat között – csak ezek az üzenetek mehetnek át
const { contextBridge, ipcRenderer } = require('electron');

const IN = ['look', 'sleep', 'remind', 'settings', 'pet', 'search', 'hello', 'cheer', 'cute', 'help'];
const OUT = ['mouse', 'drag', 'drag-end', 'menu', 'search', 'search-done'];

contextBridge.exposeInMainWorld('kocka', {
  on: (ch, fn) => { if (IN.includes(ch)) ipcRenderer.on(ch, (_e, d) => fn(d)); },
  send: (ch, d) => { if (OUT.includes(ch)) ipcRenderer.send(ch, d); },
});
