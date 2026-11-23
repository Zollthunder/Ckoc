Matka egy kis macskafejes kocka a képernyő sarkában – a C-kocka „cat mode”-ja **Windowsra és Macre**. 🐱

## Letöltés
- **Windows 10/11:** `Matka.exe` (~75 MB). Telepíteni nem kell, dupla kattintással indul.
- **Mac (Intel és Apple Silicon, macOS 11+):** `Matka-mac.dmg`. Nyisd meg, és húzd a Matkát az Alkalmazások mappába.

## Mit tud?
- Kattints rá: dorombol, és bíztat egy kicsit 💪 (62 mondat, nem ismétli magát)
- Dupla kattintás, vagy Ctrl+Shift+Alt+K (Macen ⌃⌘K): keresés – Google, `yt` YouTube, `w` Wikipédia, `map` térkép, és számol is: `12*7+3`
- Jobb gomb (Macen Ctrl+kattintás is): menü – néma mód, indítás bejelentkezéskor, szünet-emlékeztető
- Magától nem szól és nem nyávog, hogy ne zavarjon munka közben

## Első indítás – a program nincs digitálisan aláírva
Ingyenes hobbiprojekt, ezért nincs fizetős aláírása. Emiatt az első indításkor a rendszer figyelmeztet – egyszer kell átengedni:

**Windows:** „A Windows megvédte a számítógépet” → **További információ** → **Futtatás mindenképp**.

**Mac:**
1. Az Alkalmazások mappában **Ctrl+kattintás** (vagy jobb gomb) a Matkán → **Megnyitás** → **Megnyitás**.
2. Ha nincs „Megnyitás” gomb (macOS 15 Sequoia és újabb): **Rendszerbeállítások → Adatvédelem és biztonság**, görgess le, és a Matkánál kattints a **Megnyitás mindenképp** gombra.
3. Ha azt írja, hogy az alkalmazás „sérült, és nem lehet megnyitni”: nem sérült, csak a letöltött fájlon rajta van a „netről jött” jelzés. Nyisd meg a Terminált, és írd be:
   ```
   xattr -cr /Applications/Matka.app
   ```
   Utána már simán indul.

Részletes leírás: https://github.com/Zollthunder/Ckoc/tree/main/sidekick
