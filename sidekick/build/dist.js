// Matka.exe elkészítése. A gép Node-ja (14) ehhez túl régi, ezért az Electron saját Node-jával fut:
//   npm run dist
process.noAsar = true;                  // az Electron Node-ja ne kezelje külön az .asar fájlokat (különben nem tudja megírni)
const builder = require('electron-builder');
builder.build({ projectDir: require('path').join(__dirname, '..'), win: ['portable'] })
  .then(files => { console.log('Kész:', files.join(', ')); })
  .catch(e => { console.error(e); process.exit(1); });
