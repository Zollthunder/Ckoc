# C-kocka – tervezési koncepció (v0.2)

> Asztali AI-asszisztens, amit az AI segítségével terveztem meg.

## Az ötlet egy mondatban
Egy tenyérnyi, mindig jókedvű kocka az asztalon. Hangon szólsz hozzá („Szia, C!”), a kis kijelzőn mosolygó arca és a körülötte világító **C betű** mutatja, mit csinál éppen. Ha pedig nagyon stresszes a nap, akár el is dobhatod.

## Kinek szól?
Irodai és otthoni felhasználóknak, akik telefon vagy képernyő nélkül, gyorsan szeretnének kérdezni valamit: emlékeztető, jegyzet, gyors számolás, fordítás, időjárás, napi teendők.

## Forma és méretek
| Elem | Leírás |
|---|---|
| Ház | **9 × 9 × 9 cm**-es kocka (a szerelhetőség miatt nőtt 8 cm-ről), 9 mm-es lekerekített élekkel |
| Anyag | matt grafitszürke, puha tapintású műanyag (soft-touch PC/ABS) |
| Tetőlap | 72 × 72 mm-es eloxált alumínium lap, 6 furattal körben (2 mögött mikrofon), középen Ø18 mm-es áttetsző műanyag érintőbetéttel |
| Gombok | 4 programozható gomb (Ø 7,6 mm) a tetőlap sarkaiban: **„Andor”** (valódi fa borítás, bal elöl), türkiz, menta, rózsaszín |
| Előlap | **kerek kijelző** (Ø 33 mm), körülötte világító **C betű** (Ø 4,4 cm-es nyitott gyűrű, ~288°-os ív) |
| Kamera | apró kameralencse (Ø 4,4 mm) a C nyílásában, mellette adatvédelmi jelzőfény |
| Oldalak | bal és jobb oldalon kör alakú, perforált hangszórórács |
| Hátlap | USB-C tápcsatlakozó |
| Sarkok | 8 **narancs** gumi „ütköző” sarokvédő (1,5 mm-rel állnak ki), színben cserélhetők |
| Alj | **RGB fénygyűrű** (Ø 66 mm), ami az asztalra vetül, alatta csúszásgátló gumitalp |

## A karakter: a kocka arca
A kijelzőn egy egyszerű, **mosolygós, mindig jókedvű kis arc** látható: két szem és egy mosoly, semmi több. A kifejezése az állapottal együtt változik:

| Állapot | Arc | C betű és fénygyűrű |
|---|---|---|
| Készenlét | mosolyog, néha pislog | meleg fehér, lassú „lélegzés” |
| Hallgat | nagy, figyelő szemek | türkiz, egyenletes fény |
| Gondolkodik | felfelé néző szemek, „hmm” | borostyán, gyors pulzálás |
| Beszél | a szája mozog | zöld, a hanggal együtt vibrál |
| Eldobták | szédült, spirál alakú szemek | körbefutó szivárvány |
| Leskelődik | néha titokban rád néz… ha visszanézel, gyorsan, „ártatlanul” elnéz | változatlan, hogy ne bukjon le |

A C betű és az alsó fénygyűrű **RGB**, így bármilyen színre állítható.

## Funkciók
**Alap:** hangalapú AI-asszisztens: kérdés-válasz, emlékeztetők, jegyzetek, időzítő, fordítás, időjárás.

**Ami miatt szeretni fogod** (a videó reklámrészébe):
1. **Kijelző módok:** arc, akvárium halakkal, saját GIF (kedvenc karakter, háziállat), óra, időjárás, a következő meeting.
2. **Party mód:** zenelejátszáskor a C és a fénygyűrű a ritmusra lüktet, a kijelzőn hangszínkép-animáció fut.
3. **Stresszlabda mód:** a gumisarkoknak köszönhetően dobálható. A mozgásérzékelő észreveszi, ha eldobják: „Aú!”, és szédült szemek. Dobásszámlálóval: „Ma már 14-szer dobtál el. Tartsunk egy kávészünetet?”
4. **Fordítsd meg, és csend van:** fejjel lefelé a mikrofonok teljesen kikapcsolnak (adatvédelem). Oldalára fordítva fókuszidőzítő indul (Pomodoro), a fénygyűrű visszaszámol.
5. **Ébresztés fénnyel:** a fénygyűrű napfelkeltét utánozva lassan világosodik.
6. **Értesítőfény:** halványan pulzál, ha hamarosan meeting kezdődik.
7. **Felismer és felvidít:** a kis kamera felismeri a gazdáját („Szia, Zollo!”), és ha szomorúnak vagy stresszesnek lát, megpróbál felvidítani egy viccel, a kedvenc zenéddel vagy egy szünet javaslatával. **Adatvédelem:** a képfeldolgozás a kockán belül történik, kép nem megy a felhőbe. Amíg a kamera aktív, világít egy jelzőfény, és fejjel lefelé fordítva a kamera is kikapcsol.
8. **Moráljavító gombok:** a tetején 4 programozható gomb, amelyekre bármilyen hangeffekt rendelhető. A gomb színével együtt a C is felvillan. Alapbeállítás:
   - 🪵 **Andor:** fa borítású gomb, ami csak **random fapados vicceket (faviccet)** mond. Fából van, mert a viccei is olyanok. Utána dobpergés és cintányér: *ba-dum-tss!* Példa a repertoárból: *„Mi az? Feldobod, repülve piros, ha leesik, fáj. – Tégla!”*
   - 🔵 türkiz: duda
   - 🟢 menta: „Let's gooo!”
   - 🩷 rózsaszín: taps és ujjongás, vagy a saját felvett hangod
9. **Leskelődő kocka:** néha véletlenszerűen rád pillant a kamerával. Ha észreveszi, hogy visszanézel, gyorsan elkapja a tekintetét, mintha mi sem történt volna. Apró gesztus, de ettől érződik élőnek.
10. **Rázd meg, és dönt helyetted („Shake to Decide”):** tegyél fel egy igen–nem kérdést, és rázd meg a kockát. A kijelzőn az arc helyén forgó köd jelenik meg, majd előúszik a válasz **angolul**: **YES** vagy **NO**. Igennél a C zölden, nemnél pirosan villan. Néha egy kis extra is jár mellé: *"YES. Obviously."*, *"NO. Nice try."*, *"YES… but don't tell Andor."* *(A Magic 8 Ball játék ihlette, a C-kocka saját stílusában.)*
11. **Bekapcsolási rituálé:** minden bekapcsoláskor egy rövid, angol nyelvű motiváló üzenettel indul, utána jön a programozható, humoros köszöntés (lásd lent). Néha azt is hozzáteszi, mennyi ideje nem látott.
12. **Csendes jelzés („Ne zavarj” mód):** ilyenkor nincs hang és villogás. Ha mégis fontos dolog történik (hívás, közelgő meeting, időzítő), a beépített rezgőmotor finoman „megbökdösi” az asztalt: rövid, halk zümmögés, mint egy telefon rezgése. A kijelzőn közben csak egy apró ikon jelenik meg.
13. **Telefonos app és kihangosító:** Bluetooth-on csatlakozik a telefonhoz, a hozzá tartozó appban (C-kocka app) lehet beállítani a köszöntéseket, a gombok hangjait, a fényeket és a kijelző módjait. **Kihangosítóként** is működik: a hívást a kocka hangszórói és mikrofonjai viszik, a kijelzőn a hívó neve jelenik meg, a felvétel a tetején lévő érintőfelülettel történik. Bluetooth-hangszóróként zenét is lejátszik, ilyenkor jöhet a party mód.
14. **Választható személyiség:** néhány kész személyiség közül lehet választani, vagy az appban sajátot lehet összerakni (lásd lent).
15. **Személyre szabható:** cserélhető, színes gumisarkok (grafit, narancs, menta, céges színek).

## Személyiségek
Ugyanaz a kocka, de mindegyik személyiségnél másképp beszél, más az arckifejezése, és más fényeket használ.

| Személyiség | Jellem | Példamondat | Arc és fény |
|---|---|---|---|
| ☀️ **Sunny** *(alapértelmezett)* | mindig jókedvű, kedves | *"Good morning, sunshine! Today is going to be great."* | nagy mosoly, meleg fehér |
| 🧘 **Chill** | nyugodt, zen, lassú tempó | *"Breathe in… breathe out… the emails can wait."* | félig lehunyt szemek, lassan hullámzó kék |
| 🔥 **Hype** | energikus edző, mindenre rápörög | *"LET'S GOOOO! You've got this, Captain!"* | tágra nyílt szemek, pörgő narancs |
| 😏 **Sarcastic** | száraz humor, szeretetteljes szurkálódás | *"Oh great, Monday. My absolute favorite."* | egyik szemöldök felhúzva, hűvös lila |
| 💼 **Pro** | profi irodai asszisztens, kevés vicc | *"You have three meetings today. The first one starts in 10 minutes."* | visszafogott arc, tiszta fehér |

**Saját (custom) személyiség az appban:**
- **Név:** a kocka neve (például „Bob”), és hogy téged hogyan szólítson („Captain”, „Boss”, „Zollo”)
- **Csúszkák:** humor · energia · beszédesség · szarkazmus · kedvesség
- **Hang:** hangszín, sebesség, nyelv
- **Saját köszöntések és mondatok**, például a bekapcsolási rituáléhoz
- **Arcstílus** (szemek formája, mosoly) és **kedvenc színek**
- Kipróbálható, mentés előtt bemutat egy mintamondatot az új személyiséggel

Vicces extra: hétfő reggel a Sarcastic magától is „bekapcsolhat” egy mondat erejéig, ha engedélyezed.

## Bekapcsolási rituálé
**1. Motiváló nyitómondat** (véletlenszerűen választva):
- *"Today is a great day to do great things."*
- *"Small steps still move you forward."*
- *"Coffee loaded. Brain booting. Let's do this."*
- *"You've got this. And if not, you've got me."*

**2. Programozható köszöntés** (előre megírt, humoros változatok, vagy saját szöveg):
- *"Welcome back, Captain!"*
- *"The legend has returned!"*
- *"Oh, it's you! I was just… definitely not watching the door."*
- *"Boss is in the building. Everybody look busy!"*
- *"Player one has entered the game."*
- *"You're back! I only cried a little."*

**3. „Hiányoztál” számláló** (nem mindig, csak néha, hogy meglepetés maradjon):
- *"I haven't seen you for 2 days, 14 hours, 7 minutes and 32 seconds. Not that I was counting."*
- *"63 hours without you. I reorganized my pixels twice."*
- Rövid távollét után: *"That was a long 4 minutes. Coffee?"*

A köszöntés közben a kijelzőn az arc felragyog (nagy, csillogó szemek), és a C betű egy kört fut a gomb- vagy kedvenc színben.

## Belső felépítés (koncepció szinten)
- 2 mikrofon (Adafruit Voice Bonnet) a tetőfuratok alatt; a többi furat dizájnelem
- 2 db oldalsugárzó hangszóró
- Ø 33 mm-es kerek IPS kijelző (240 × 240 képpont)
- Kis kameramodul helyi (eszközön futó) arc- és hangulatfelismeréssel, jelzőfénnyel
- RGB LED-ek a C alakú fénycsatornában és az alsó gyűrűben
- 6 tengelyes mozgásérzékelő (gyorsulásmérő és giroszkóp): dobás, rázás és tájolás érzékelése
- Raspberry Pi Zero 2 W (Wi-Fi + klasszikus Bluetooth: app, kihangosító, BT-hangszóró) – részletek: ELEKTRONIKA.md
- Lineáris rezgőmotor (LRA, a telefonokban is ilyen van) a csendes jelzésekhez
- Visszhangszűrés (echo cancellation) a kihangosításhoz, hogy a hívó ne hallja vissza saját magát
- Kapacitív érintőfelület a tetőn: egy érintés = némítás / ébresztés

## Arculat
- Név: **C-kocka** (angolul: C-Cube)
- Színek: grafit `#2a2d33`, alumínium `#c9ccd1`, borostyán kiemelés `#ff9a3c`, az arc türkiz `#78e6ff`
- Hangulat: barátságos, vidám, prémium. Inkább „kis asztali társ”, mint kütyü.
