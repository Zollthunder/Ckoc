# C-kocka – tervezési alapelvek (standard)

> Ezek kötelező szabályok minden további tervezési lépésnél. Ha egy megoldás ütközik velük, az a megoldás hibája, nem az elveké. Eltérni csak Zollo kifejezett jóváhagyásával lehet.

## 1. Szerelhetőség
- **Könnyen szerelhető legyen.** Ha valamit borzasztó összerakni, a minőség sem garantálható.
- **Ha nem is túl egyszerű, legyen hely:** a modulok, kábelek és csatlakozók körül legalább **3 mm** szabad hely (cél), szűk helyen legalább **2 mm**.
- **Belső szán (alváz):** minden modul a házon kívül felszerelhető és kipróbálható, és utána egyben becsúszik a házba.
- **Részegységek egy-egy csatlakozóval:** az előlap (kijelző, kamera, a C fényei) és a tetőlap (gombok, érintés) külön egység.
- **Csatlakozók forrasztás helyett** (JST, STEMMA QT / Qwiic), dugaszolható hangszórók.
- **Csavarok ragasztás helyett** (M2,5-ös menetes betétek a nyomtatott alvázban). Ragasztás csak a gumisarkoknál és a gumitalpnál, valamint **semleges szilikon** a fénycsatornáknál (C, érintőbetét) – rugalmas és kivágható (Zollo döntése, 2026-11-13).
- **Cserélhető akku:** a 18650-es cella alulról kivehető.

## 2. Gyárthatóság és költség
- **Költséghatékony kis- és közepes sorozatra:** nincs drága szerszám (fröccsöntőszerszám, maratás), a dizájnhoz ezért hozzá szabad nyúlni.
- **Kész alkatrészek, amennyire csak lehet** (pl. Raspberry Pi, kész kiegészítő panelek, LED-gyűrűk).
- **Bonyolult belső formák:** 3D nyomtatás vagy SLS.
- **Ház:** szabványos alumínium zártszelvény + marott lapok (kis sorozat), prototípusnak 3D nyomtatás.
- **Ne költsünk feleslegesen:** ami nem kell, vagy olcsóbban is hozza az elvárt szintet, azt cseréljük (külön költségoptimalizálási lépés).

## 3. Méret
- **A kocka élhossza: 90 mm** (a szerelhetőség miatt nőtt 80 mm-ről). Ha a szerelhetőség megkívánja, nőhet még, de előtte egyeztetünk.

## 4. Nyilvánosság és adatvédelem
- **Céglogó, cégnév, céges e-mail nem kerül nyilvános anyagba** (weboldal, GitHub, videó, commitok) engedély nélkül.
- Idegen ember hangját hozzájárulás nélkül nem klónozzuk.

## 5. Munkamódszer
- A Fusion MCP-vel a munkadokumentumokhoz (CAM) nem nyúlunk: minden művelet előtt ellenőrizzük, hogy a C-kocka dokumentum aktív-e.
- Minden lépés és elakadás bekerül a naplóba ([NAPLO.md](NAPLO.md)).
