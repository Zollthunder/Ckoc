# Napló – AI Kihívás: C-kocka

## Eszközök
- **Claude Code (asztali app)**: tervezés, kódírás, fájlkezelés. A beszélgetésben csak „C”-nek hívom.
- **three.js** (böngészős 3D könyvtár): a 3D modell kódból készül, és ugyanebből exportálom a `.glb` fájlt.
- *(később: videóeszköz, GitHub, GitHub Pages)*

---

## 2026-11-12 – Indulás és témaválasztás

**Mit csináltam:** bemásoltam a kihívás leírását Claude-nak, és ötleteket kértem.

**Példaprompt:**
> „kaptam egy feladatot, ahhoz kellene segítség. [kihívás szövege]”
> „van valami jó ötleted?”

**Eredmény:** 4 témajavaslatot kaptam. A **C-kockát** választottam, egy asztali AI-asszisztens termékötletet, mert illik a kihívás témájához, és a formája elég egyszerű ahhoz, hogy pár nap alatt elkészüljön.

**Elakadás #1 – a határidő:** az eredeti határidő november 6. volt, de akkor nem értem rá, ezért hosszabbítást kértem.

## 2026-11-12 – Tervezés

**Példaprompt:**
> „tetszik a C-kocka ötlet, viszont nekünk akkor ezt valamennyire meg is kell terveznünk, legalább látvány szinten”

**Mit csinált az AI:**
1. Megnézte, milyen programok vannak a gépemen. Blender, git és ffmpeg nincs, Node.js van.
2. Ezért azt javasolta, hogy a 3D modell **böngészőben, three.js-sel, kódból** készüljön. Így semmit nem kell telepíteni, és a modellt egy gombnyomással `.glb` fájlba lehet menteni.
3. Megírta a tervezési koncepciót ([DESIGN.md](DESIGN.md)): méretek, anyagok, fényállapotok, belső felépítés.
## 2026-11-12 – Váltás Fusion 360-ra

**Példaprompt:**
> „kérlek hívj le hozzá skilleket, és mindent ami szükséges lehet ehhez. Ezen a gépen van fusion360, ha esetleg tudod kezelni.”

**Mit csinált az AI:**
1. Rákeresett a skill-, plugin- és connector-katalógusban a 3D, CAD, Fusion, videó és GitHub témákra. Fusionhöz nem talált kész skillt. A GitHub hivatalos pluginja hasznos lesz a weboldalhoz.
2. Megtalálta a gépen a Fusion 360-at és a szkriptmappáját.
3. Írt egy **Fusion 360 Python szkriptet** ([3d/fusion/CKocka/CKocka.py](3d/fusion/CKocka/CKocka.py)), ami az egész modellt felépíti: ház, élek lekerekítése, alumínium tetőlap, 6 mikrofonfurat, érintőfelület, világító C betű, két hangszórórács, USB-C aljzat, gumitalp és színek. A végén STEP, STL és F3D formátumba exportál.
4. A szkriptet bemásolta a Fusion Scripts mappájába, így a Fusionben egy kattintással futtatható.

**Elakadás #3 – nem találtam a szkriptet:** a Fusion a kezdőoldalon (Home) nyílik meg, ahol a Shift+S nem működik. **Megoldás:** előbb egy tervet kell megnyitni (New Part Design), és ott már elérhető a UTILITIES → ADD-INS → Scripts and Add-Ins menü.

**Elakadás #4 – hiányzott a hangszórórács:** az első futtatás után Claude egy saját böngészős STL-nézőben ([3d/preview.html](3d/preview.html)) körbenézte a modellt. Kiderült, hogy oldalt a rács helyett az egész lap be volt mélyítve. Az ok: a Fusion a lap éleit is belevette a vázlatba, ezért a kivágás a teljes lapra vonatkozott. **Megoldás:** a vázlatok `addWithoutEdges`-szel készülnek, és a szkript csak a kis (lyuk méretű) profilokat vágja ki.

## 2026-11-12 – Extra funkciók: gumisarkok, RGB, céglogó

**Példaprompt:**
> „néhány extra feature belefér? gumírozott sarkak, RGB világítás, és a cégünk logója rá?” (+ a logó képe)

**Mit csinált az AI:**
1. **Logó vektorizálása:** a PNG logót képpontonként „karakteres térképpé” alakította, abból kiolvasta a csúcspontokat, és megrajzolta vektorosan. Az eredményt egy összevető oldalon az eredeti mellé tette, hogy ellenőrizze az egyezést.
2. **Gumisarkok:** a 8 sarokba a lekerekítésnél kicsit nagyobb gömbsüvegek kerültek, gumi megjelenéssel.
3. **RGB fénygyűrű:** a ház alá került egy áttetsző gyűrű, ami az asztalra vetít fényt. A C betű is RGB lett.
4. **Logó:** a hátlapra került, kiemelkedő alumínium betétként.
5. A szkriptet a Fusion saját Python értelmezőjével szintaxisellenőrizte, mielőtt átadta futtatásra.

## 2026-11-12 – Ötletelés: a kockából karakter lesz

**Példaprompt:**
> „esetleg van vmi ötleted még, hogy mit lehetne rajta változtatni, javítani? esetleg csak reklám szempontjából, mondjuk ha játszik le zenét, akkor a RGB színe felveszik a zene ritmusát … ha lenne rajta egy kis LCD kijelző …”

**Eredmény:** az AI több ötletet adott: kerek kijelző a C-ben, party mód, stresszlabda mód (a gumisarkok miatt, ez az én poénom volt), fejjel lefelé némítás, fénnyel ébresztés, cserélhető sarkok. Mindegyik bekerült a koncepcióba ([DESIGN.md](DESIGN.md)). A modellre a **kerek kijelző egy mosolygós arccal** került fel, a többit a videó reklámrészében mutatjuk be.

Később én is hozzátettem egy ötletet: **kis kamera**, ami felismeri a gazdáját, és ha szomorúnak vagy stresszesnek látja, megpróbálja felvidítani. Az AI a C nyílásába tette a kamerát, így a C „szájában” ül, és mellé tett egy adatvédelmi megoldást is: helyi feldolgozás, jelzőfény, és fejjel lefelé a kamera is kikapcsol.

Még két saját ötletem volt: **JBL-hangszórós stílusú gombok** a tetején, amikre hangeffekt rendelhető (duda, „Let's gooo!”), és egy **leskelődő viselkedés**: a kocka néha titokban rám néz, és ha visszanézek, gyorsan elnéz. Az AI a gombokat színesen a tetőlap 4 sarkába tette, hogy ne zavarják a mikrofonokat. A leskelődés a karakter viselkedései közé és a videó egyik vicces jelenetébe került.

Utolsó ötletként egy **bekapcsolási rituálé**: angol motiváló üzenet, utána programozható, humoros köszöntés („Welcome back, Captain!”), és néha egy „ennyi ideje nem láttalak” számláló, másodpercre pontosan. Az AI megírta hozzá a köszöntések első változatait.

Az egyik gomb az **„Andor” gomb** lett, ami csak random fapados vicceket (faviccet) mond. Az AI szójátékot csinált belőle: a favicc-gomb valódi **fa borítást** kapott a modellben. 🪵

Később jött még egy ötletem: **rázd meg, és válaszol**, mint a jósgolyós játékok. Feltett igen–nem kérdésre a kijelzőn angolul jelenik meg a válasz (YES/NO). A funkció a „Shake to Decide” nevet kapta, és a Magic 8 Ball ihlette.

További koncepciószintű ötleteim: **rezgőmotor**, ami „Ne zavarj” módban is finoman jelez, ha fontos dolog történik, és **telefonos app Bluetooth-kapcsolattal**, amivel a kocka kihangosítóként is működik. Az AI kiegészítette ezeket a hozzájuk tartozó alkatrészekkel (lineáris rezgőmotor, visszhangszűrés), és felvette a belső felépítés listájába.

Utolsóként **választható személyiségeket** kértem: néhány alap típust és egy saját, összerakható változatot. Az AI ötöt javasolt (Sunny, Chill, Hype, Sarcastic, Pro), mindegyikhez példamondattal, arckifejezéssel és fényszínnel, valamint egy appbeli szerkesztőt csúszkákkal (humor, energia, szarkazmus stb.). Ez a videóba is bekerült, egy gyors „személyiségváltós” jelenettel.

**Tanulság:** az AI-jal ötletelni olyan, mint egy gyors brainstorming egy kollégával. Én hoztam a poént (dobálható stresszlabda), az AI továbbgondolta funkcióvá (mozgásérzékelő, dobásszámláló, szédült szemek).

## 2026-11-13 – A Fusion hivatalos MCP-je

**Példaprompt:**
> „fusion360hoz sincs mcp? nézz utána kérlek alaposan”

**Mit csinált az AI:** az előző napi keresés csak a plugin- és connector-katalógusban nézett körül, és ott nem talált semmit. Most a weben is keresett, és kiderült, hogy **az Autodesknek van hivatalos, a Fusionbe beépített MCP szervere**. Az Autodesk blogját az egyszerű letöltő eszköz nem tudta megnyitni (403-as hiba), ezért az AI a beépített böngészőben olvasta el. Ezután:
1. Én bekapcsoltam: Preferences → General → API → **Fusion MCP Server** (27182-es port).
2. Az AI kipróbálta a kapcsolatot. A helyes cím a `http://127.0.0.1:27182/mcp`, a gyökércím 404-et ad. Ezután felvette a projekt MCP-beállításai közé (`.mcp.json`).
3. Lekérte, mit tud a szerver: Python szkript futtatása a Fusionben, képernyőkép a modellről, dokumentációkeresés, visszavonás (undo).

**Tanulság:** ha az AI azt mondja, „nincs ilyen”, érdemes rákérdezni, hol keresett. Itt az első keresés szűkebb volt, mint gondoltam.

## 2026-11-13 – Ellenőrzés a Fusion MCP-vel

**Példaprompt:**
> „most hogy kaptál fusion360hoz mcp-t, kérlek azzal is nézz rá a modelre”

**Mit csinált az AI:**
1. Írt egy kis parancssori segédet ([tools/fusion-mcp.js](tools/fusion-mcp.js)), amivel szkriptet futtat és képernyőképet készít a Fusionben. **Elakadás:** a gépen régi Node.js (14-es) van, amiben még nincs beépített `fetch`. **Megoldás:** a segéd a Node beépített `http` moduljával küldi a kéréseket.
2. **Biztonság:** minden művelet előtt megnézte, melyik dokumentum aktív, és csak olvasó (read-only) szkripttel vizsgálódott. Én ugyanebben a Fusionben CAM-ezek, ezért ez fontos.
3. Lekérte a modell összes testét, színét és méretét. Az idővonal 51 eleméből egyik sem jelzett hibát.
4. Képeket készített a modellről 5 irányból ([assets/fusion/](assets/fusion/)), és meg is nézte őket.
5. **Talált hiba:** az arcnál csak az egyik szem kapta meg a színét, a másik szem és a mosoly acélszínű maradt. Javította a szkriptben, és az élő modellen is az MCP-n keresztül.
6. **Téves riasztás:** hátulnézetben a logó fejjel lefelé állónak tűnt. Az AI pontellenőrzéssel kimutatta, hogy a geometria jó, csak a Fusion hátulnézete fordítja meg a képet.

7. **Színjavaslat:** a képeken látszott, hogy a fekete gumisarkok beleolvadnak a sötét házba. Az AI javasolta, hogy legyenek színesek. Én a narancsot választottam, és az AI átszínezte őket a szkriptben és az élő modellen is, majd újraexportálta a fájlokat.

**Tanulság:** az MCP-vel az AI saját maga látja, amit csinál, nem nekem kell képernyőképeket küldenem. Gyorsabb, és több hibát kiszúr.

## 2026-11-13 – Jobb hangot keresünk

**Példaprompt:**
> „más ingyenes text-to-speech nincs? ami esetleg tud magyarul, keress rá kérlek”

Hosszabb keresés lett belőle, sok tanulsággal:
1. **Piper** (offline, nyílt forráskódú): működött, de a magyar hangjai gyengék voltak. **Elakadások:** a legújabb hangmodellekhez újabb program kell, ezért a v1.0.0-s modelleket használtuk. A beszédmotor pedig nem bírta az **„ó” betűt** a mappanévben (klódakszing), ezért ékezet nélküli mappába került.
2. **FreeTTS** (ingyenes weboldal, Microsoft-hangok): az AI a beépített böngészőben vezérelte az oldalt, beírta a mondatokat és letöltötte az MP3-akat. A **Noémi HD** tetszett, de **a napi ingyenes HD-keret menet közben elfogyott**, és az oldal szó nélkül átváltott sima hangra. Az AI a fájlok kódolásából vette észre, melyik HD és melyik nem. Végül mind a 16 magyar mondat a sima Noémi hangon készült el.
3. **F5-TTS magyar** (helyi AI-modell, hangklónozással): ez a legígéretesebb. **Elakadások:** a Python-telepítő ebben a környezetben nem futott le (0x80070003), ezért az AI a „uv” eszközzel egy hordozható Pythont töltött le, Windows-telepítés nélkül. A PowerShell-szkriptek pedig BOM nélküli UTF-8-ban elrontották az ékezeteket.
   - **Etika:** idegen ember hangját hozzájárulás nélkül nem klónozzuk. Referenciának a CC0 licencű szintetikus Anna-hang szolgál, később a saját hangom.

4. **Végső döntés:** ezen a gépen nincs NVIDIA videókártya, csak Intel beépített grafika, így a helyi AI-modellek csak a processzoron futnak, nagyon lassan: az F5 egy 3 másodperces mondatot 2,5 perc alatt csinált meg. Ezért a „képességeinkhez legjobb” megoldás a **FreeTTS Noémi** lett. Az AI a mondatközi hosszú szüneteket automatikusan lerövidítette, és ahol egy mondat a következőbe lógott volna, ott kicsit gyorsított rajta (max. 15%) vagy pár tized másodperccel arrébb tette. A hangsávot újrakeverte, és **a kép újrarenderelése nélkül** kicserélte a videóban.

**Tanulság:** az „ingyenes” mindig valamilyen korláttal jár: keret, minőség, licenc vagy gépigény. Érdemes előre megnézni.

## 2026-11-13 – Gyárthatóság: DXF, elektronika, ház

**Példaprompt:**
> „csinálj minden alkatrészből DXF-et, keress a kockához elektronikát, és ha gond van, akkor egyeztetünk”

1. **DXF:** az AI a Fusion MCP-n keresztül minden alkatrészről 3 nézetet (elöl, felül, oldal) és 1 középmetszetet exportált, összesen **88 DXF**-et a [dxf/](dxf/) mappába. Ideiglenes vázlatokkal dolgozott, amiket utána törölt, így a modell idővonala nem változott. Az ellenőrzéshez írt egy kis DXF→SVG átalakítót, és képen nézte át a nézeteket. **Elakadás:** az első változat csak a körvonalakat tartalmazta, és az ívek „bulge”-os vonalláncként vannak a fájlban, ezt az előnézet eleinte rosszul mérte.
2. **Elektronika** ([ELEKTRONIKA.md](ELEKTRONIKA.md)): ESP32-S3 alapú javaslat, az Espressif ESP32-S3-BOX-3 fejlesztőkártya mintájára, alkatrészlistával és blokkvázlattal. **Fontos lelet:** az ESP32-S3 nem tud klasszikus Bluetooth-t, így a kihangosító és a BT-hangszóró funkció ezzel a chippel nem megy. Ez döntési pont lett.
3. **Ház** ([GYARTAS.md](GYARTAS.md)): a lekerekített, tömör ház sorozatban csak drága fröccsöntéssel lenne gazdaságos. Javaslat: prototípusnak 3D nyomtatás, kis sorozatnak **szabványos alumínium zártszelvény + marott lapok**, a sarkokra ragasztott gumisapkákkal.

## 2026-11-13 – Elektronikai döntések

Végigmentünk a nyitott kérdéseken, mindegyikre egy rövid döntés született:
- **Bluetooth:** kell, ezért egy **második chip** (klasszikus ESP32) viszi a zenét és a kihangosítást.
- **Akku:** igen, egy **18650-es cella TPU bölcsőben**, hogy kibírja a dobálást.
- **Mikrofonok:** **3 db** elég, a 6 furatból 3 dizájnelem marad.
- **Érintés:** az alumínium lapon nem működne, ezért **szigetelt műanyag betét** került a tetőlap közepére. Az AI a Fusion MCP-n keresztül a modellbe is beépítette, és újraexportálta a fájlokat.
- A kiegészítő NYÁK-ok és a nagyobb kockaméret is megengedett, a hangulatfelismerés egyszerűsítve.

**Tanulság:** az AI nem dönt helyettem, hanem előkészíti a döntést: leírja a lehetőségeket, az előnyöket és a hátrányokat, én pedig egy szóval választok.

## 2026-11-13 – Gyártható ház: SLS + eloxált alu tetőlap

**Példaprompt:**
> „cnc maró, lézervágó, FDM, SLA, SLS nyomtató · 3 db elsőre · eloxált, legyen szép és igényes. Szerinted miből legyen a ház?”

**Döntés:** az AI javaslatára a ház **SLS-sel nyomtatott PA12** lett (kb. 79 g, dobálva sem veszélyes, megtartja a lekerekített formát, szerszám nélkül készül), az **alumínium tetőlap** pedig eloxált. A teljes alumínium házat azért vetettük el, mert a 90×90-es zártszelvény csak 4 mm-es fallal kapható (kb. 330 g).

**Mit csinált az AI a Fusion MCP-n keresztül:**
1. **Kettévágta a házat 9 mm magasan.** A felső rész a vékonyfalú ház lett, az alsó, lekerekített rész pedig a tálca, ami egyben **a szán alapja**. Így a szán teljes szélességben betolható alulról.
2. **2,5 mm-es falra héjazta** mindkét részt, és **átmenő nyílásokat** vágott: kijelző, kamera, C, rácsok, tetőnyílás, 4 csavarfurat.
3. **Hibák, amiket maga talált meg:**
   - a régi mikrofonfuratok alja a héjazás után **6 apró, lebegő testté** vált a házban, ezeket törölte,
   - a kamera ütközött az előlapi tartóval, a hézagvizsgálat 1 mm-t mutatott az akku előtt, és szűk volt a hely a LED-gyűrű mellett. Ezeket több körben átrendezte, amíg **mindenhol legalább 3 mm** nem lett.
4. **Ellenőrzés:** 14 pontos geometriai teszt (üreges belső, átmenő nyílások, tömör fal), mind rendben.
5. **Gyártási fájlok:** 96 nézeti DXF, valamint **7 vágási DXF** a lézerhez, CNC-hez és vízvágáshoz (tetőlap, akril elemek, gumitalp, a fa gombsapka), és frissített STEP/F3D/STL.

**Tanulság:** az AI-val a CAD-ben is lehet „tesztvezérelten” dolgozni: előbb mérhető szabályokat adunk (3 mm hely, átmenő nyílás, tömör fal), utána ő maga ellenőrzi őket minden módosítás után.

## 2026-11-13 – Szerelhetőség: 90 mm és tervezési alapelvek

**Példaprompt:**
> „legyen könnyen szerelhető … ha nem is túl egyszerű de legyen hely legalább”
> „tetszik, legyen úgy. Ezekre mint a szentírás tekints, mint standard.”

**Mit csinált az AI:**
1. A helyőrzőkkel lemérte a hézagokat: 80 mm-nél **0,5–1 mm** volt a legkisebb. Ebbe nem fér bele kábel, és szerelni sem lehet.
2. Javasolta a **90 mm**-es kockát, a belső nyomtatott **szánt**, a csatlakozós részegységeket, a csavarozást ragasztás helyett és a cserélhető akkut. Én elfogadtam, és **standarddá tettem** őket: [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md).
3. Újragenerálta a modellt 90 mm-re (tetőlap 72 mm, gombok és furatok kijjebb), és a modulokat paraméteresen újra elhelyezte. A szkript most **3 mm alatti hézagokat is jelez**, nem csak ütközést. Két szűk helyet javított: a kamera 26 mm-re került, az alsó panelek feljebb. Eredmény: **mindenhol legalább 3 mm**.

**Tanulság:** a „belefér” még nem jelenti azt, hogy „össze is lehet szerelni”. Az AI-nak érdemes konkrét, mérhető szabályt adni (pl. min. 3 mm), mert azt automatikusan ellenőrizni tudja.

## 2026-11-13 – Kész modulokból: Raspberry Pi Zero 2 W

**Példaprompt:**
> „nem szükséges letöltened vmi MCP-t hozzá? … Lehetőleg használj minél több már létező alkatrészt hozzá, akár bananapi vagy nanopi”

**Mit csinált az AI:**
1. **MCP:** megnézte a katalógust és a webet. KiCad MCP létezik, de **most nem kell**, mert saját NYÁK helyett kész modulok lesznek, a mechanikát pedig a Fusion MCP intézi.
2. **Fordulat:** kiderült, hogy egy **Raspberry Pi Zero 2 W** beépítve tud klasszikus Bluetooth-t, így nem kell második chip. Köré kész panelek jöttek: **Adafruit Voice Bonnet** (2 mikrofon, sztereó hang), **18650-es UPS panel**, **NeoPixel Ring 24**. Ez utóbbi pont Ø66 mm, mint a modellben a fénygyűrű.
3. **Elhelyezés a Fusionben:** az MCP-n keresztül helyőrző testeket tett a kockába, és **ütközésvizsgálatot** futtatott. Az első körben a kijelzőpanel sarka ütközött a kamerával. Megoldás: kerek NYÁK-os kijelző, és a kamerafurat 2 mm-rel kijjebb került. Második körre: **minden belefér, ütközés nélkül.**
4. **Elakadás:** a modell újragenerálásakor **visszakerült a céglogó**, mert a privát koordinátafájl helyben megvolt. Az AI azonnal észrevette, törölte, újraexportált, és a logót **alapból kikapcsolttá** tette a szkriptben.

**Tanulság:** a kész modulok drasztikusan egyszerűsítik a projektet. A helyőrző testekkel és az automatikus ütközésvizsgálattal pedig percek alatt kiderül, mi fér el és mi nem.

## 2026-11-13 – A céglogó kikerül

**Példaprompt:**
> „addig akkor vegyük le a cég logóját kérlek, mert nem kérdeztem rá, hogy használhatom-e”

A weboldal nyilvános lesz, a logó használatára pedig nincs engedélyem, ezért mindenhonnan kivettük:
- **Fusion:** az AI az MCP-n keresztül törölte a logó két testét az élő modellből, és újraexportálta az F3D, STEP és STL fájlokat.
- **Szkript:** a logó koordinátái egy privát fájlba kerültek, ami nem megy fel a GitHubra. Ha a fájl nincs meg, a kocka logó nélkül épül fel.
- **Videó:** a „logó átrajzolása” jelenet helyére a napló került, új narrációval. A hátsó közeli képen most csak az USB-C látszik. A videót újrarenderelte.
- **Weboldal és Git:** a logó képei és a 3D fájljai kimaradnak a feltöltésből (`.gitignore`), a szövegekből is kikerült.

**Tanulság:** egy céges kihívásnál is érdemes előre végiggondolni, mi kerül nyilvánosan az internetre: logók, nevek, e-mail-címek. Az AI ezért használja a commitokban a GitHub privát e-mail-címét a céges cím helyett.

## 2026-11-13 – A videó elkészítése

**Példaprompt:**
> „akkor lets goo, generáld a videót”

**Mit csinált az AI** (minden lépés kódból, külső fizetős szolgáltatás nélkül):
1. **Eszközök:** npm-ről telepítette az ffmpeg-et (videó és hang) és a `puppeteer-core`-t (a gépen lévő Edge böngésző vezérléséhez). Rendszergazdai telepítés nem kellett.
2. **Fusion MCP:** a modell minden testét külön STL-be exportálta (24 fájl) a böngészős 3D jelenethez. Az idővonal jelölőjét lépésenként léptetve **51 képkockát** mentett arról, ahogy a modell felépül, ebből lett a „Hogyan készült?” rész gyorsított felvétele.
3. **Gépi hangok:** 28 mondat a Windows beépített hangjaival, angolul Zira, magyarul Szabolcs ([tools/tts.ps1](tools/tts.ps1)). A kocka hangja magasítva és kicsit gyorsítva, személyiségenként más tempóval ([tools/voice_process.js](tools/voice_process.js)).
4. **Zene és hangeffektek:** saját, kódból szintetizált zene: C–G–Am–F akkordmenet 110 BPM-en, külön party, lopakodós és lezáró résszel. A hangeffektek is kódból készültek: bekapcsolás, ba-dum-tss, fütyülés, telefoncsörgés, rezgés stb. A zene automatikusan halkul, amikor valaki beszél ([tools/audio_mix.js](tools/audio_mix.js)). Így **jogdíjproblémák sincsenek**.
5. **Animált 3D jelenet** ([video/scene.js](video/scene.js)): three.js, valódi anyagokkal, RGB fényekkel, és a kijelzőn **élő, rajzolt arccal**: pislog, beszél, leskelődik, szédül, YES-t mutat. Hozzá jönnek a feliratok, a chatablakok, a Fusion-ablak, a logó-összevetés és a telefonos app. Minden képkocka csak az időből számolódik, így a felvétel pontos.
6. **Időzítés:** egy közös [video/timeline.json](video/timeline.json) mondja meg, mikor szól melyik mondat és hangeffekt. Ezt használja a jelenet és a hangkeverő is.
7. **Ellenőrzés:** próbaképeket renderelt, és mozaikképekben nézte át őket. Javított: túl erős ragyogás, egy emoji, ami Windows 10-en nem jelenik meg, túl sötét logó, a dobásnál képből kirepülő kocka, a tetőlap csillogása, és a telefon, ami takarta a kockát.
8. **Felvétel:** a jelenet fejnélküli (headless) Edge-ben fut, a 30 fps-es képkockák közvetlenül az ffmpeg-be mennek, és abból lesz az MP4 a hanggal ([tools/render_video.js](tools/render_video.js)).

**Elakadás:** a fejnélküli Edge a Claude Bash-környezetéből nem indult el, és hibaüzenetet sem adott. **Megoldás:** az AI kipróbálta PowerShellből, onnan működött, így a felvétel onnan fut.

**Visszajelzés:** a videó tetszett, de a gépi hang túl robotos volt.
- Az első ötlet a Microsoft ingyenes neurális hangja volt az Edge felolvasó szolgáltatásán keresztül. A kész npm csomag nem működött a régi Node-dal, az AI által írt saját klienst pedig a **Claude Code biztonsági ellenőrzése letiltotta**, mert az Edge böngészőnek adta volna ki magát egy nem nyilvános felülethez. Az AI ezt nem kerülte meg.
- A második út a **hivatalos Azure AI Speech** lett volna, ingyenes kerettel. A szkript elkészült ([tools/azure_tts.js](tools/azure_tts.js)), de a regisztrációnál elakadtam, ezért átugrottuk.
- **Végül finomítás a meglévő hangokon:** hangszínszabályzás (tompa közepek ki, érthetőség be), sziszegésszűrés, enyhe tömörítés és egy kis „szobahang”. A kocka hangját kevésbé magasította, így kevésbé „mókus”. A mondatok hossza ugyanaz maradt (legfeljebb 0,06 mp eltérés), így a szájmozgás továbbra is stimmel. Közben a zárókép feliratát is rendbe tette, mert az rálógott a kockára.

**Tanulság:** a videó „forráskódként” készült. Ha valamin változtatni kell (szöveg, időzítés, szín), elég átírni egy sort, és újra lehet renderelni.

## 2026-11-13 – Videó forgatókönyv

**Példaprompt:**
> „akkor jöhet a videó forgatókönyv”

**Eredmény:** egy kb. 2:20-as forgatókönyv ([VIDEO.md](VIDEO.md)), 6 jelenettel: ébredés és köszöntés, bemutatás, hogyan készült AI-jal, közeli képek, vicces funkciók (party mód, Andor-gomb, leskelődés, stresszlabda, fejjel lefelé némítás, felvidítás), zárás. Kétféle hang szól benne: a kocka angolul beszél gépi hangon, a narráció magyar.

**Tanulság:** a Fusion modellező felületét az AI nem tudja „kattintgatni”, de a Fusion beépített Python API-jával kódból tud modellt építeni. Az eredmény valódi, paraméteres CAD modell, idővonallal (timeline). Minden lépés név szerint látszik benne, és utólag módosítható.

## 2026-11-13 – DXF-ek és szerelhetőség ellenőrzése

**Példaprompt:**
> „nézz rá hogy jól adja-e ki minden dxf, szerelhető-e, és nincs-e semmi hiba”

**Hogyan:** az AI írt egy DXF-ellenőrzőt ([tools/dxf_check.js](tools/dxf_check.js)): mértékegység, zárt kontúrok, méret, dupla elemek. A szerelhetőséghez „pontszondát” használt ([tools/probe_axes.py](tools/probe_axes.py)): egy egyenes mentén milliméterenként megnézi, melyik alkatrész van ott – így látszik, hol fekszik fel valami, és hol lóg a levegőben.

**Talált hibák:**
- minden lapos alkatrész kontúrja **duplán** volt a vágórajzban (alsó + felső él) → a lézer kétszer vágott volna. Javítva.
- a betétek (C, érintőbetét, kijelzőablak) **pont akkorák voltak, mint a nyílás** → nem mennének be. Javítva: körben 0,1 mm hézag.
- **a gombsapka nem éri el a kapcsolót** (6,7 mm hiányzik), és a C, az érintőbetét meg az alsó diffúzor sincs megfogva → javaslat kész, döntésre vár ([GYARTASI_TERV.md](GYARTASI_TERV.md)).

**Hol akadtunk el:** a régi DXF-export fél óráig „lefagyasztotta” a Fusiont, mert minden vetített él után újraszámolta a vázlatot. Megoldás: halasztott számítás (`isComputeDeferred`).

**Tanulság:** az ütközésvizsgálat csak azt mondja meg, hogy semmi nem ér egymásba – azt nem, hogy minden **meg van-e tartva**. Ehhez külön ellenőrzés kell.

**Döntések és javítások (ugyanaznap):** Zollo jóváhagyta a gombsapkát szárral és gallérral (a ház peremébe kis kivágással), az S-alakú LED-szalagot a C mögé, a kijelzőablak elhagyását, és a diffúzor csavarozását. Az AI ezeket egy külön, többször is futtatható szkriptbe tette ([tools/apply_fixes.py](tools/apply_fixes.py)), majd pontszondával ellenőrizte: a sapka szára 0,1 mm-re van a kapcsolótól, a gallér befér a kivágásba, és az ütközésvizsgálatban csak szándékos érintkezések maradtak.

**Ragasztás vagy perem?** A C-akril rögzítésére az AI egy peremes, egy darabból álló megoldást javasolt. Zollo a szilikont vetette fel. Az AI szerint ez jó ötlet, mert rugalmas (dobálható kocka!) és kivágható, de csak semleges térhálósodású lehet, és csak belülről, a fal mögött mehet körbe. A tervezési elvekbe bekerült ez a kivétel, a perem-rajzok pedig kimaradtak.

## 2026-11-13 – Szerelési útmutató és piaci tanulmány

**Példapromptok:**
> „ha ezekkel megvagy, akkor szeretnék egy szerelési útmutatót is”
> „esetleg egy tanulmány is jöhetne, hogy mekkora piaca van egy ilyen ai asszisztensnek, mennyiért lehetne adni, milyen haszonkulccsal, esetleg mekkora termelésben gyártani.”

**Szerelési útmutató ([SZERELES.md](SZERELES.md)):** az AI egy Fusion-szkripttel ([tools/assembly_shots.py](tools/assembly_shots.py)) lépésenként képeket készített: mindig csak az addig beszerelt alkatrészek látszanak, a ház áttetsző. Az útmutató megírása közben két újabb hibát talált:
- **A szán nem volt rögzítve a tálcához** (a lábakon volt furat, alatta semmi). Javítva: alulról 4 süllyesztett M2 csavar a lábakba, menetes betéttel.
- **A 72 mm-es tetőtartó nem fér át a 60 mm-es tetőnyíláson** → a „felülről egyben levehető tetőegység” így nem igaz. Javítva a leírásban: a tetőtartó alulról kerül be, a tetőlap felülről, és a csavarok fogják össze őket.

**Piaci tanulmány ([PIACI_TANULMANY.md](PIACI_TANULMANY.md)):** az AI egy segédügynököt indított webes kutatásra (piacméret, versenytársak, árrések, gyártási küszöbök, alkatrészárak – forrásokkal), az önköltséget és az árszámítást pedig maga készítette el. Eredmény: kicsi, de létező piac (~130 M USD), 199–249 €-s ár, a mostani kész modulos változat csak limitált szériára jó, tömegtermékhez saját NYÁK kell.

**Tanulság:** a szerelési útmutató megírása maga is ellenőrzés: amikor lépésről lépésre végig kell gondolni a sorrendet, előjönnek azok a hibák, amiket az ütközésvizsgálat nem lát.

## 2026-11-13 – A narráció cseréje (vízjel a hangban)

**Visszajelzés:**
> „sajnos a generált hang nagyon rossz minőségű, és hallani benne hogy melyik oldal által lett generálva, mert bemondja azt is”

**Mi történt:** a narráció a FreeTTS ingyenes, standard hangjából készült, ami egy hangos reklámot (vízjelet) mond be a felvételbe. Az AI a hangokat nem hallja, csak a hosszukat és a hangerejüket méri, ezért ez nem tűnt fel neki – ezt csak ember veheti észre.

**Megoldás:** a narráció a helyi F5-TTS-ből jön, egy szabad licencű szintetikus referenciahanggal. Ez a gépen fut, így vízjel nem lehet benne. Az F5-ös mondatok kicsit hosszabbak, ezért az AI 0,8–2,2 másodperccel későbbre tolt öt megszólalást az idővonalon, és a videót újrarenderelte. A FreeTTS-es fájlok nem kerülnek fel a GitHubra.

**Tanulság:** ingyenes online szolgáltatásnál mindig meg kell nézni a feltételeket, és **végig kell hallgatni a kimenetet** – az AI ellenőrzései a hangtartalomra „vakok”.

## 2026-11-13 – Robbantott ábra a videóban és GitHub

**Példaprompt:**
> „a videóba tehetnénk ilyen betekintős részt, ahol látnánk mint egy robbantott ábrán, hogy mik vannak belül, ilyen-olyan nyák, akksi, stb.”

**Hogyan:** az AI a Fusionből kiexportálta a gyártható, 90 mm-es modell mind a 49 alkatrészét ([tools/export_inside.py](tools/export_inside.py)), és a videó jelenetében ezekből robbantott ábrát épített. A kocka szétnyílik, a ház áttetsző lesz, a részek csoportonként szétválnak. A feliratok vonallal mutatnak az alkatrészekre, és akkor jelennek meg, amikor a narrátor kimondja őket: a szó időpontját az AI a mondatban elfoglalt helyéből becsülte meg. A „Közelről” jelenet helyére került, így a videó hossza nem változott. Közben a narráció „hat mikrofonja” „két mikrofonra” javult, a „8 × 8 × 8 cm” felirat pedig „9 × 9 × 9 cm” lett.

**GitHub:** a projekt felkerült a [github.com/Zollthunder/Ckoc](https://github.com/Zollthunder/Ckoc) címre, a weboldal a [zollthunder.github.io/Ckoc](https://zollthunder.github.io/Ckoc/) címen él. Feltöltés előtt az AI átnézte a fájlokat, a 3D exportokat is (cégnév, e-mail). A commitok a GitHub noreply címével mennek.

**Hol akadtunk el:** a tálca nézeti DXF-exportja több mint egy órára lefagyasztotta a Fusiont. Az AI csendben várt, ahelyett hogy szólt volna – Zollo jogosan jelezte, hogy erről azonnal tudnia kellett volna. A Fusiont a Feladatkezelőből kellett bezárni, utána az AI a mentett `c-kocka.f3d`-ből folytatta.

**Tanulság:** a hosszú, gépet foglaló feladatoknál kell egy várható idő és egy „szólok, ha túllépi” jelzés.

## 2026-11-16 – Mégis van videókártya: az F5-TTS GPU-n

**Példaprompt:**
> „nézzük meg újra azt a lokális hang generátort, mert a hangok mindig nagyon gyengék. Tudom, gyenge ez a gép hozzá, és sokáig fog tartani.”

**Mi derült ki:** az AI ellenőrizte a gépet, és kiderült, hogy az Intel grafika mellett van egy **NVIDIA RTX 2060 (6 GB)** is, működő meghajtóval. A 11-13-i bejegyzés szerint nincs NVIDIA kártya: ez **tévedés volt**, mert akkor csak azt nézte az AI, hogy a telepített PyTorch látja-e a GPU-t. A CPU-s változat nem látta.

**Hogyan:** a régi meghajtó (CUDA 11.6) miatt csak a CUDA 11.8-as PyTorch 2.7.1 használható. Az AI ezt egy külön környezetbe telepítette (`venv_gpu`), a régi, CPU-s környezet megmaradt. A [tools/f5_generate.py](tools/f5_generate.py) most magától a videókártyát használja, ha elérhető.

**Eredmény:** egy 8,7 másodperces mondat **7 másodperc** alatt készül el a korábbi kb. 2,5 perc helyett. Ez több mint 20-szoros gyorsulás, és a generálás gyorsabb, mint maga a beszéd.

**Elakadás:** a Claude asztali app a `%LOCALAPPDATA%` alá írt új fájlokat a saját csomagmappájába irányítja át (Windows-virtualizáció). Az appból minden működik, de az Intézőben máshol kell keresni a fájlokat.

**Következő lépés:** a gyenge hangminőség fő oka valószínűleg nem a gép, hanem a referenciahang. Az F5 hangklónozó, és most egy szintetikus Piper-hangot utánoz. Jobb referenciát keresünk (saját hang vagy szabad licencű emberi felvétel).

## 2026-11-16 – Új narrátorhang: F5-TTS + XTTS stúdióhang

**Példaprompt:**
> „Keress szabad hangot”

**Az akadály:** a magyar F5-modell licence tiltja, hogy valódi ember hangját az ő kifejezett hozzájárulása nélkül utánozzuk. Ezért a közkincs hangoskönyvek (LibriVox) és a CC0 hangadatbázisok (Common Voice) nem jöhettek szóba: a felolvasók lemondtak a jogaikról, de a klónozáshoz nem járultak hozzá.

**Megoldás:** az **XTTS-v2** nyílt beszédmodell (Coqui, CPML, nem kereskedelmi licenc) tud magyarul, és beépített stúdióhangjai vannak, amelyeket hangszintézishez licencelt beszélők adtak. Az AI egy külön környezetbe telepítette, és **12 stúdióhanggal** elmondatott egy magyar mondatot. A 12 másodpercnél rövidebb mintákat (7 db) F5-referenciaként is kipróbálta, és mindet egy lejátszóoldalra tette ([video/test/hangmintak.html](video/test/hangmintak.html)).

**Választás:** hallgatás után Zollo az **F5 + „Ludvig Milivoj” XTTS-referencia** változatot választotta. A 16 narrációs mondat a videókártyán **1,3 perc** alatt elkészült (a processzoron ez kb. 40 perc lett volna). Az új hang tempósabb, így két mondatot kellett csak minimálisan (legfeljebb 6%-kal) gyorsítani, és a videót újrarenderelni.

**Elakadások:** a coqui-tts telepítőjéből kimaradt a PyTorch és egy kis csomag (`six`). Az AI ezeket a hibaüzenetből azonosította és pótolta.

**Közben:** az AI egy segédágenssel **költségbecslést és ajánlatkérő e-mail-tervezeteket** készíttetett a 3 prototípushoz ([AJANLATKERESEK.md](AJANLATKERESEK.md)). Ezek gyakorló anyagok, egyiket sem küldtük el. Fontos lelet: az Adafruit Voice Bonnet kifutó termék.

## 2026-11-16 – Döntések a költségbecslés után

**Példaprompt:**
> „legyen m2,5, kérlek nézd át a többi dokumentumot is. […] microsd és cr1220 elem is legyen benne a beszerzési tervbe”

Az ajánlatkérések átnézése után a következő döntések születtek, és az AI átvezette őket a dokumentumokba:
- **Raspberry Pi Zero 2 W + Voice Bonnet marad**, bár a Voice Bonnetet a gyártó már kivezette. A C-kocka elméleti termék, sosem kerül gyártásba, és semmit nem rendelünk meg.
- **Mindenhol M2,5-ös csavar és menetes betét** (eddig a szerelési leírás M2-vel számolt). Érintett fájlok: [SZERELES.md](SZERELES.md), [GYARTASI_TERV.md](GYARTASI_TERV.md), [AJANLATKERESEK.md](AJANLATKERESEK.md). A betétek Ø3,6-os, a tetőlap csavarjai Ø2,8-es furatot kapnak.
- **microSD kártya és CR1220 óraelem** került az [ELEKTRONIKA.md](ELEKTRONIKA.md) alkatrészlistájába.
- **Hangszóró:** a 40 mm-es helyett a Ø36 mm-es VISATON K 36 WP.
- **Kamera:** Zollo egy Kailap kameramodult javasolt. Az AI megnézte, de az OV5640-es, **DVP párhuzamos interfészű** modul nem csatlakoztatható a Pi CSI-portjához. Helyette Pi Zero-kábeles OV5647 „spy” kamera kerül be (pl. Arducam B006603 vagy Pi Supply Spy Camera).

**Még nyitott:** a 3D modellben és a DXF-ekben a furatok és a hangszórógyűrű még a régi méretűek. A Fusion most nem érhető el, és Zollo ugyanebben a Fusionben dolgozik, ezért ez külön, egyeztetett lépés lesz.

**Átvezetés a 3D modellbe (ugyanaznap):** Zollo megnyitotta a Fusiont. Az AI a mentett modellt új dokumentumként nyitotta meg, és az idővonal végére 10 **felületeltolás** (Offset Faces) műveletet tett. Így az eredeti felépítés érintetlen maradt, és a módosítás egyben visszavonható.
- **Menetes betétek:** 29 furat Ø3,2-ről Ø3,6-ra.
- **Átmenő csavarfuratok:** 15 furat Ø2,2/2,4-ről Ø2,8-ra. A süllyesztések Ø5,0-ra nőttek, ez pont az M2,5-ös süllyesztett fejhez való.
- **Hangszóró-rögzítő gyűrű:** a belső nyílás Ø34-ről Ø30-ra szűkült, így a gyűrű a Ø36 mm-es hangszóró peremére szorít.

A szkript előbb megszámolta a furatokat sugár szerint, és csak akkor módosított, ha minden darabszám stimmelt. Az ütközésvizsgálat után csak a korábbi, szándékos érintkezések maradtak. Az újraexportált fájlok: f3d, STEP, STL, 19 nyomtatási STL és 6 vágási DXF.

**Elakadás:** a Fusion indításakor véletlenül az alapmodell szkriptje futott le, és **felülírta** a mentett modellt egy régi változattal. Az AI ezt a fájlok időbélyegéből és méretéből vette észre, és a gitből visszaállította a jó változatot. **Tanulság:** a verziókezelés (git) itt mentette meg a pénteki munkát.

## 2026-11-16 – A narráció hibáinak javítása

**Példaprompt:**
> „ennek nagyon rossz a minősége. a kocka helyett koka-t mond, és mintha leharapná a szavak végét. lehet ezzel valamit kezdeni?”

**Hogyan:** az AI külön meghallgatásra adta a nyers F5-kimenetet, az utófeldolgozott változatot és hat új próbaváltozatot ([tools/f5_variants.py](tools/f5_variants.py)): más tempóval, a mondat végén kis ráhagyással, a „kocka” szó más írásmódjaival és több számítási lépéssel. Zollo szerint a nyers és az utófeldolgozott is rossz volt, az új változatok viszont jók. **A hiba tehát a generálásban volt**, és a 10%-kal lassabb tempó a szöveg végi ráhagyással megoldotta.

**Az új beállítások:** tempó 0,9, a szöveg végén „ ...”, 64 számítási lépés, és 0,3 s csend a végén. Az utófeldolgozás csendvágása is szelídebb lett: csak a 0,6 s-nál hosszabb, −55 dB alatti szüneteket rövidíti.

**Elakadások:**
- A lassabb mondatok közül kettő nem fért a helyére. Gyorsítás helyett az AI az N04–N08 szakaszt 0,4–0,9 s-mal arrébb tolta, mert ott volt hely.
- A legrövidebb mondatból („Tégla!”) az F5 lassítva **teljesen néma** fájlt adott. Az AI ezt a hangerő méréséből vette észre, és ezt az egy mondatot normál tempóval generálta újra. **Tanulság:** a nagyon rövid szövegekkel az F5 bizonytalan, ezért minden kimenetet érdemes legalább hangerőre ellenőrizni.

## 2026-11-16 – Automatikus minőségellenőrzés Whisperrel

**Példaprompt:**
> „ennek a minősége jó, de néha vannak ilyen fura hangok benne, mint ÁÁÁÁÁÁÁÁ meg hasonlók”

**Hogyan:** az AI nem hallja a hangot, ezért egy beszédfelismerő modellt (**Whisper large-v3-turbo**) tett a generálás mellé. Mondatonként több F5-jelölt készül, a Whisper visszaírja, mit hallott, és a gép azt választja ki, amelyik szó szerint a legjobban egyezik a szöveggel. Az utolsó elvárt szó után a felvételt levágja, így a végére nem maradhat „ÁÁÁ” ([tools/f5_best.py](tools/f5_best.py)). A választás indoklása mondatonként ide kerül: `video/voice_raw_f5_ludvig/minoseg.json`.

**Mit derített ki a Whisper:**
- a mondatok végén „Áh!”, „Ár…”, „Alf.” hangok voltak (ezek voltak az „ÁÁÁ”-k);
- sok mondat elején volt egy plusz „A” hang;
- a mássalhangzóval kezdődő mondatok első hangja sérült („Tégla” → „mégla”). Ennek egyik oka az AI saját hibája volt: az eleji zajvágás a halk kezdő mássalhangzókat is levágta.

**Elakadások:**
- A 6 GB-os videókártyára az F5, a Whisper és a Fusion grafikája együtt nem fért rá, ezért a futás két fázisra bomlott: előbb az összes jelölt generálása, utána az ellenőrzés.
- Egy „feláldozható” előtag („Nos.”) a hosszabb mondatoknál eltüntette az eleji „A”-t, a nagyon rövideknél viszont rontott. Ezért most előtaggal és anélkül is készülnek jelöltek, és a Whisper választ.
- Néhány kezdő mássalhangzót a Whisper továbbra is másnak hall. Hogy ez a modell kiejtése-e vagy a Whisper tévedése, az AI nem tudja eldönteni: **ezt csak emberi füllel lehet ellenőrizni.**

**Tanulság:** egy második AI (a beszédfelismerő) „füllé” teheti az elsőt. Számszerűsíti a hibákat, és a jelöltek közül automatikusan választ. A végső ítélet viszont az emberé.

## 2026-11-16 – Angol videó

**Példaprompt:**
> „ez még mindig nagyon rossz, inkább az egész legyen angolul, hang és a videó feliratai is. a viccet meg cseréld le vmi angol faviccre, oké?”

**Döntés:** a magyar narráció a helyi modellekkel (F5-TTS magyar finomhangolás) nem lett elég jó. Különösen a mássalhangzóval kezdődő mondatok első hangja torzult. Ezért **az egész videó angol lett**.

**Hogyan:**
- **Narráció:** a 16 mondat angol fordítása az **XTTS-v2**-vel készült, ugyanazzal a „Ludvig Milivoj” stúdióhanggal ([tools/xtts_en_generate.py](tools/xtts_en_generate.py)). Mondatonként 4 jelölt készült, és a Whisper (angolul) választotta ki a legjobbat ([tools/pick_best.py](tools/pick_best.py)). **16-ból 16 mondatot hall szó szerint hibátlannak.** Angolul ez a modell láthatóan sokkal erősebb, mint a magyar F5.
- **Feliratok:** a 3D jelenet mind a 64 magyar szövegét lefordította egy cseretáblával, ami ellenőrzi, hogy minden régi szöveg pontosan egyszer szerepel-e. A robbantott ábra címkéi az angol narráció szavaihoz igazodnak.
- **Név:** angolul a termék **„C-Cube”**, mert a „C-kocka” szót egy angol hang torzítva mondaná ki. A repó és a weboldal neve marad.
- **Vicc:** a magyar favicc („Tégla!”) helyett egy fához illő angol „dad joke” a fa Andor-gombhoz: *„What do you call a tree that fits in your hand?” – „A palm tree!”*

**Elakadás:** az AI saját hibája: a magyar „Nos.” előtag felismerője az angol „Not” szót összekeverte vele, és levágta. Angolul ezt a lépést ki kellett kapcsolni.

**Tanulság:** a helyi hangmodellek minősége nyelvenként nagyon eltér. Ahol a magyar kevés, ott az angol egy kész, jó megoldás lehet.

**Javítás (ugyanaznap):** Zollo 2:43-nál „szünetet a szóban” hallott. Az AI a hullámformából találta meg az okot: az XTTS a sorokat **pontonként külön** generálta, és közéjük fix 0,42 s **teljes digitális csendet** tett. Így a „C-Cube.” egy elnyújtott, magában álló mini-mondat lett, utána hirtelen némasággal. Egy első javítási kísérlet, ami a Whisper szóidőpontjaiból próbálta mérni a szón belüli csendet, téves eredményt adott (a Whisper a szavak közti szünetet is a szóhoz számolja), ezért az AI visszavonta. A valódi megoldás: a sorok **egyben** készülnek (`split_sentences=False`). Mind a 16 mondat újra 1,00-s pontszámot kapott, és egyikben sincs már belső digitális csend.

## 2026-11-16 – Az AI megtanítja saját magát: „video-narration” skill

**Példaprompt:**
> „esetleg legközelebb a hanghoz vmi skillt nem lenne érdemes letölteni? vagy amiket lehúztál már azok voltak?”

**Mi derült ki:** amit a nap során letöltöttünk (F5-TTS, XTTS-v2, Whisper, PyTorch), azok **modellek és programok**, nem skillek. A skill becsomagolt utasításgyűjtemény Claude-nak. Az AI átnézte a katalógust: videónarrációhoz nincs kész skill.

**Hogyan:** az AI a beépített **skill-creator** skill-lel saját skillt írt a nap tapasztalataiból:
- `SKILL.md`: mikor kell használni, melyik nyelvre melyik modell, etika és licenc, a teljes folyamat (több jelölt, Whisper-válogatás, vágás, emberi meghallgatás, idővonalba illesztés);
- két általános szkript (generálás és kiválasztás);
- két háttéranyag: a gép beállítása (GPU, CUDA 11.8, környezetek), és **a nap összes buktatója** okkal és megoldással.

A szkripteket egy rövid próbaszövegen kipróbálta: mindkét mondat hibátlan lett. Telepítette Claude Code-hoz, és `.skill` csomagként is átadta.

**Tanulság:** ami egyszer órákig tartó próbálkozás volt, az a skillnek köszönhetően legközelebb az első próbálkozásra jó lehet. Az AI a saját hibáiból tanuló „receptkönyvet” írt magának.

## 2026-11-16 – A nézetenkénti DXF-ek frissítése alkatrészenként

**Példaprompt:**
> „legyen alkatrészenként”

**Hogyan:** az AI a régi, az összes testet egyszerre exportáló szkriptből egy egy-alkatrészes változatot írt ([tools/export_dxf_part.py](tools/export_dxf_part.py)). Csak a 4 megváltozott testet futtatta, egyesével, testenként 3 perces felső korláttal. A tetőlap és a fénygyűrű-diffúzor 1 s alatt elkészült.

**Hol akadtunk el:** az **alsó tálcánál a Fusion ugyanúgy lefagyott, mint pénteken**. Ezúttal az AI a 3 perces korlát után azonnal szólt, ellenőrizte a folyamatot („nem válaszol”, alig használ processzort, tehát beakadt, nem számol), és javasolta a leállítást. Zollo bezárta a Fusiont. A tálcát és a házat kihagytuk; egy megjegyzés jelzi, hogy ezeknek a nézeti rajzai régi méretűek ([dxf/MEGJEGYZES.txt](dxf/MEGJEGYZES.txt)). A hiteles méretek a STEP-ben és a vágási DXF-ekben vannak.

**Közben:** a C-kocka dokumentum egyszer bezárult a Fusionben. Az AI ezt észrevette, és nem váltott át magától egy másik nyitott dokumentumra, mert az Zollo munkája is lehetett. A mentett modellt új dokumentumként nyitotta meg.

**Tanulság:** ha ugyanaz a művelet ugyanannál a testnél másodszor is lefagy, az már nem véletlen. Ilyenkor nem érdemes harmadszor is próbálkozni: meg kell kerülni, és dokumentálni.

## 2026-11-16 – Webes szimulátor és vezérlőapp

**Példaprompt:**
> „esetleg egy programot tudnál írni hozzá? ami vezérli a c kockát”

**Döntés:** a kocka csak elméletben létezik, ezért az AI megkérdezte, milyen programra van szükség. Zollo a **böngészős szimulátort és a telefonos appot** választotta, hogy bárki kipróbálhassa. Kész skillt kerestünk hozzá, de nem volt; nem is kellett, mert a feladat sima HTML/JavaScript.

**Mit tud** ([sim.html](sim.html), [web/sim.js](web/sim.js)):
- **A virtuális kocka:** élő arc, ami követi az egeret és pislog. Néha titokban „leskelődik” (közben ég a kamera jelzőfénye), és ha az egérrel „visszanézel”, elkapja a tekintetét: *„I wasn't looking!”*
- **Gombok és mozdulatok:**
  - a fa Andor-gomb angol dad jokes-okat mond, ba-dum-tss-szel; a többi gombhoz hang rendelhető;
  - az érintőfelületre megmondja a pontos időt;
  - dobás után szédül, és számolja a dobásokat;
  - rázásra YES/NO választ ad;
  - fejjel lefelé fordítva elnémul (mikrofon és kamera ki);
  - van „fáradt vagyok” felvidítás és bejövő hívás kihangosítással.
- **Bekapcsoláskor** megmondja, mennyi ideje nem látott (a böngészőben tárolva).
- **Az app:** személyiségek (Sunny, Chill, Hype, Sarcastic, Pro, Saját csúszkákkal), party mód saját szintetizált zenével (a fények ütemre villognak, a kijelzőn hangszínkép), Ne zavarj, fényszín és fényerő, megszólítás, a gombok hangjai. Külön ablakban is megnyitható, és onnan is vezérli a kockát (BroadcastChannel).
- **Protokollnapló:** minden app → kocka parancs és kocka → app esemény látszik (pl. `persona.set`, `led.color`, `event.throw`). Így a vezérlés logikája is bemutatható.

**Ellenőrzés:** az AI a beépített böngészőben végigkattintotta a funkciókat (bekapcsolás, rázás, party, fordítás, külön ablakos app), és telefonméretben is megnézte. Két hibát talált és javított: a „Saját” csúszkák akkor is látszottak, ha nem az volt kiválasztva, a party-hangszínkép pedig kilógott a kerek kijelzőből.

**Javítás (ugyanaznap):** Zollo szerint a szimulátor „nagyon töri az angolt”. Az ok: a böngésző beépített hangját használta, és ha a gépen nincs angol hang, magyar hanggal olvassa fel az angol szöveget. A megoldás a friss **video-narration skill első éles bevetése** volt: a kocka mind a 47 mondatát előre legeneráltuk XTTS-v2-vel (vidám női stúdióhang, „Daisy Studious”), mondatonként 3 jelöltből a Whisper választott. A szimulátor ezeket az MP3-akat játssza le (összesen kb. 1 MB, [web/voice/](web/voice/)), és a kocka szája most már a hang valódi hangerejére mozog. A változó adat (megszólítás, idő, mennyi ideje nem látott) a feliratba került. A Whisper négy sort jelzett gyanúsnak, de ezek a szóviccek miatt hangzanak úgy, ahogy kell („knotty” = „naughty”, „Leaf” = „Leave”). **Tanulság:** a Whisper pontszáma jelzés, nem ítélet; a szóvicceknél az „eltérés” maga a poén.

**Bővítés (ugyanaznap):** Zollo kérésére a dad jokes 8-ról **25**-re bővült (fás, kávés, programozós, irodai viccek), és véletlen sorrendben jönnek „zsákból húzással”: egyik sem ismétlődik, amíg mind el nem hangzott, és egy kör végén sem jöhet kétszer egymás után ugyanaz. Az AI ezt 75 húzáson tesztelte. A 34 új mondatot a skill generálta; két csattanót a Whisper jelzése alapján át kellett fogalmazni („In case he got…” → a modell „you”-t mondott). A „planet”-et viszont a Whisper „plan it”-nek írta, ami kiejtésben pont a poén, ezért az maradt. **Elakadás a tesztben:** egy ellenőrző lépés véletlenül még egyszer betöltötte a programot az oldalba, így minden esemény duplán futott. Az AI ezt a naplóból vette észre, és tiszta újratöltéssel megismételte a tesztet.

## 2026-11-16 – A kocka saját szoftvere (Raspberry Pi + XIAO)

**Példaprompt:**
> „király! esetleg a nyákra is tudnál tervezni egy progit ami ezeket kezeli?”

**Hogyan:** az AI a webes szimulátor logikáját átírta arra a két processzorra, ami a kockában lenne ([firmware/](firmware/README.md)):
- **Raspberry Pi Zero 2 W, Python:** ez az „agy”. Viselkedés (bekapcsolás, viccek ismétlés nélkül, személyiségek, party, Ne zavarj, fordítás = adatvédelem, leskelődés, felvidítás, hívás), az arc a kerek kijelzőn (Pillow, 9 üzemmód), hangeffektek és party-zene kódból, és WebSocket-kapcsolat az apphoz **ugyanazzal a protokollal**, mint a webes szimulátor.
- **Seeed XIAO RP2040, CircuitPython:** ezek a „reflexek”. LED-gyűrű és C-szalag, gombok, érintés, a mozgásérzékelőből dobás, rázás és fordítás felismerése, rezgés és kamera-jelzőfény.
- **Hardver-absztrakció:** minden eszköznek van valódi (GC9A01 SPI-n, Voice Bonnet ALSA-n, OV5647 + OpenCV helyben, XIAO USB-n) és szimulált változata. PC-n `python -m ckocka --sim --demo` végigmegy a funkciókon, és a kijelző képeit PNG-be menti.

**Ellenőrzés:** 11 automatikus teszt (protokoll, viccek sorrendje, mentés, a kijelző minden üzemmódja, bekapcsolás és vicc, fordítás, Ne zavarj, parancsok) – mind átment. A bemutató futtatása közben két hibát találtunk és javítottunk: a leskelődés nem szakadt meg Ne zavarj módban, a bemutató forgatókönyvében pedig rossz volt az időzítés.

**Ami nincs benne:** valódi beszédfelismerés és AI-válasz, Bluetooth-zene és kihangosítás (csak a jelenet van meg). A Pi- és XIAO-kód hardveren nem volt kipróbálva, mert a kocka koncepció. A GC9A01 inicializálása a gyártói referenciakódból való.

**App-kapcsolat élőben (ugyanaznap):** Zollo engedélyével az AI telepítette a `websockets` csomagot, és írt egy próbaklienst ([firmware/pi/tests/api_probe.py](firmware/pi/tests/api_probe.py)), ami úgy viselkedik, mint a telefonos app. 12 ellenőrzés: párosító kód nélkül elutasít, kóddal állapotot küld, a parancsokat nyugtázza, a hibás és a nem JSON üzenetet visszautasítja (a kapcsolat közben él), a dobás és a fordítás eseményként megérkezik, két app egyszerre is szinkronban marad. **Lelet:** személyiségváltáskor az app csak a köszönés végén kapta meg az új állapotot (~3 s késés). Az AI javította: az állapot azonnal megy, a köszönés utána jön. Ezután 12/12 ellenőrzés és mind a 11 teszt sikeres.

## 2026-11-16 – Teljes ellenőrzés: az apptól a firmware-ig

**Példaprompt:**
> „kérlek a mobilos apptól kezdve, egészen idáig ellenőrizz le mindent”

**Hogyan:** az AI két irányból dolgozott párhuzamosan:
1. **Független kódátnézés:** egy külön AI-ügynök, előzetes feltevések nélkül, csak olvasva nézte át a szimulátort, a Pi-szoftvert és a XIAO-firmware-t. 15 találatot adott, súlyosság szerint rangsorolva.
2. **Élő tesztek:** a GitHub Pages-en futó valódi oldalon végigkattintotta mind a ~30 funkciót, összevetette a hangfájlokat és a protokollt a három helyen (81 mondat = 81 MP3, minden azonosító egyezik), átnézte a linkeket, és ellenőrizte, hogy cégnév vagy e-mail sehol ne legyen a repóban.

**Mit talált, és mi lett javítva:**
- **A szimulátor hangja minden mondattal hangosabb lett** (minden mondat egy újabb erősítőt kötött be párhuzamosan). Ezt a rövid tesztek nem fogták meg, csak hosszabb használatnál jött volna elő. Javítva: egyetlen, egyszer bekötött hangút.
- **Egymást felülíró jelenetek:** egy korábbi jelenet (pl. a kávés gomb) időzítője később visszaírta az arcot, és felülírta a dobás szédült arcát vagy az adatvédelmi képet. Javítva: minden jelenet sorszámot kap, és csak a legutóbbi állíthatja vissza az arcot, mindig az aktuális állapot szerint (kikapcsolva, fejjel lefelé, Ne zavarj, party).
- **A megszakított mondat utólag megszólalhatott** (fordítás vagy Ne zavarj közben, ha a hangfájl még töltődött). Javítva mindkét változatban.
- **Party be/ki/be:** dupla zene és dupla ütem-task. Javítva: egyetlen időzítő, és a legutolsó kérés számít.
- **Személyiségváltásnál az app lassan frissült** a szimulátorban is (a Pi-szoftverben már korábban javítva).
- **A fordítás bekapcsolta a kockát**, ami így fejjel lefelé köszönt. Javítva: a fordítás nem kapcsol be.
- **Pi-szoftver:**
  - a fogadott hívás sosem ért véget;
  - a soros port olvasása másodpercenként újranyitotta a portot;
  - a beszéd leállítása lemaradhatott;
  - a háttér-ciklusok egy kivételtől végleg leálltak volna;
  - a fényerő-csúszka húzása tucatszor írta volna az SD-kártyát;
  - az üres becenév nem állt vissza „Captain”-re.
- **XIAO:** a fordítás-érzékelés hiszterézist kapott (oldalára fektetve nem billeg), és a tájolás az életjelben is megy, így a Pi újraindulás után sem kési le.

**Eredmény:** a szimulátorban 21 böngészős ellenőrzés sikeres (ebből 5 kifejezetten a javított hibákra), a Pi-szoftver 18 tesztje (ebből 6 új visszaesési teszt) és az app-kapcsolat 12 élő ellenőrzése is sikeres. Konzolhiba nincs, telefonméretben is rendben van. Két apró eltérés maradt a két változat között, ezek szándékosak: a webes szimulátor nem menti a fényszínt és a fényerőt, és a „Let's gooo” gombnál a weben 🔥 látszik, a kocka kijelzőjén „GO!”.

**Tanulság:** a független, „friss szemű” átnézés olyan hibákat talált (pl. a hangosodó hang), amiket a funkcionális tesztek nem fogtak meg. A kettő együtt adja a biztonságot.

## 2026-11-16 – Bónusz: „japán reklám”

**Példaprompt:**
> „esetleg egy videót tudnál olyan típikus "japán" stílusban csinálni? ez csak olyan plusz lenne. szokásos gyors vágások, hanghatások, amire az ember gondolna egy virális japán reklámra gondolva.”

**Eredmény:** egy 31 másodperces reklám ([video/c-cube_japan.mp4](video/c-cube_japan.mp4)), 11 vágással ütemre (150 BPM):
- „新発売！” (Új!) taiko-dobütéssel;
- beszél, világít, dobható, dad jokes-t mond, leskelődik, fejjel lefelé adatvédelmi módba vált, választható a személyisége;
- „今なら…プライスレス！” (Most… megfizethetetlen!) dobpergéssel;
- zárókép szlogennel és egy lábjegyzettel: „※コンセプト製品です” (koncepciótermék, nem kapható).

A műfaj ismert elemeit használja (napsugaras hátterek, beugró feliratok vastag körvonallal, villanások, rázkódás, sebességvonalak), konkrét reklámot nem másol.

**Hogyan:**
- **Jelenet:** a fő videó „motorja” (a kocka 3D modellje, anyagai, fényei, élő arca) változatlanul maradt, csak a forgatókönyv és a képi elemek újak ([video/jp/scene_jp_part.js](video/jp/scene_jp_part.js), összerakva: [tools/build_jp_scene.js](tools/build_jp_scene.js)). A renderelő paraméterként kapja az oldalt, a hangsávot és a kimenetet.
- **Japán narráció:** XTTS-v2 („Gracie Wise” stúdióhang, `language="ja"`). Az XTTS a japán szöveget csomagokkal alakítaná latin betűs kiejtéssé (cutlet/fugashi, kb. 50 MB-os szótárral). **Ehelyett az AI maga írta meg a kiejtést**, így nem kellett letöltés.
- **Zene és hanghatások:** 150 BPM-es pörgős zene, taiko, csillámlás, rugózás, rimshot és a többi, mind kódból ([tools/jp_audio.js](tools/jp_audio.js)).

**Elakadások:**
- Az első próbán a szókezdő „h” elveszett („shinhatsubai” → „shinatsubai”). Kiderült, hogy a modell szóközzel tagolt romajin tanult, és a jövevényszavakat angolul várja („privacy mode” → プライバシーモード). Átírás után 12-ből 12 mondatot hall a Whisper (japánul) helyesen.
- Japánul a Whisper egy jelöltnél „belepörgött”, és elfogyott a videókártya memóriája. Rövid mondatokhoz korlátozott dekódolás kell.
- Az első képkockákon a kamera túl közel volt, a feliratok rálógtak a kockára. A próbaképek alapján hátrébb került.

**Tanulság:** egy jól felépített renderelő-„motor” újrahasznosítható: a második videó a forgatókönyvtől a kész MP4-ig egy délután alatt elkészült, és maga a renderelés 89 másodperc volt.

## 2026-11-17 – A kocka beszél: beszélgetés Claude-dal, és a többi ötlet egyszerre

**Példapromptok:**
> „valami ötlet, hogy tudjuk fejleszteni vmit a c kockán?”
> „és mindre igent mondok, elkezdheted őket”

**Hogyan:** az AI nyolc fejlesztési ötletet javasolt. Zollo mindre igent mondott, ezért az AI **szétosztotta a munkát**: négy önálló feladat külön Claude Code sessionökben, saját git-ágon fut párhuzamosan (Pi-szoftver beszélgetéssel, a hiányzó DXF-ek Fusion nélkül, költségoptimalizálás, hőterhelés). A weboldalt érintő feladatokat ő maga csinálta egymás után, mert ugyanazokat a fájlokat érintik.

**Mi készült el itt:**
- **Beszélgetés a szimulátorban:** egy 🎙️ gomb vagy a kocka érintőfelülete elindítja a böngésző beszédfelismerőjét (magyarul vagy angolul), de be is lehet gépelni a kérdést. A helyi szerver ([serve.js](serve.js) → [talk.js](talk.js)) a **Claude API**-tól kér választ a kocka aktuális személyiségében. A válasz rövid és angol, és a kocka arcának hangulatát is a modell választja (mosoly, vigyor, aggódó, meglepett, unott). Gondolkodás közben a kocka felfelé néz, és lüktet a C betű. Fejjel lefelé fordítva a hallott szöveget eldobja, a félkész választ pedig nem mondja ki.
- **Biztonság:** az API-kulcs csak a helyi szerveren van (környezeti változóban), a weboldalba sosem kerül. A végpontot csak a saját gépről lehet hívni. A nyilvános oldalon ezért a beszélgetés nem él, és ezt a felület ki is írja. Kulcs nélküli próbához van egy próbamód (`CKOCKA_TALK_MOCK=1`).
- **Beágyazott szimulátor:** a főoldalon most egy ablakban kipróbálható a szimulátor, telefonméretben is.
- **Magyar/angol nyelvváltó:** angol főoldal ([index-en.html](index-en.html)), a szimulátor pedig `?lang=en`-nel angolul jelenik meg (egy kis szótár cseréli a feliratokat).
- **Frissített „Hogyan készült?”:** az idővonal 6 lépésről 10-re bővült (hang és Whisper, szimulátor, saját szoftver, japán reklám), és frissültek az elakadások is.

**Elakadás:** a gépen **Node 14** fut, a Claude hivatalos JavaScript SDK-ja viszont Node 18-at kér. A szerver ezért régi Node-on is elindul, a beszélgetés pedig kiírja, mi hiányzik. Az éles próbához újabb Node és API-kulcs kell.

**Tanulság:** amikor egyszerre sok független feladat van, érdemes őket szétosztani: külön sessionök, külön ágak, és mindegyik csak a saját fájljaihoz nyúl. Így nem írják felül egymás munkáját.

## 2026-11-17 – Párhuzamos sessionök: hő, kompatibilitás, tanúsítás, „B döntés”

**Hogyan:** az előző bejegyzésben szétosztott feladatok külön Claude Code sessionökben, saját git-ágon (worktree-ben) futottak, majd az AI összefésülte őket. Egy-egy session csak a saját fájljaihoz nyúlt.

**Mi készült el:**
- **Hőkezelés** ([HOKEZELES.md](HOKEZELES.md)): teljesítménymérleg üzemmódonként és egyszerű hőmodell. Kiderült, hogy az eredeti beállítással a kocka **túlmelegszik**: hallgatás közben, 25 °C-on a Pi ~92 °C, és a hő fele a 31 LED-ből jön. Javítócsomag: LED-fényerőkorlát, szellőzőrés, borda, alvás töltés közben.
- **Kompatibilitás** ([KOMPATIBILITAS.md](KOMPATIBILITAS.md)): adatlapok alapján ellenőrizte, összeillenek-e a kész modulok (buszok, lábkiosztás, címek, töltőáram). Itt derült ki, hogy a kijelző és a LED-ek ugyanazon az SPI-n ütköznének.
- **„B döntés”:** az AI a kijelző bekötésére több változatot tett elém, én választottam: **„B: arc a XIAO-n”**. A kijelzőt a XIAO hajtja, az arcot is ő rajzolja, a GPIO-elosztó panel elmaradt. A döntés egyszerre ment át a 3D modellbe (Fusion), a firmware-be (138, majd 149 teszt zöld) és a dokumentációba.
- **Költségoptimalizálás** ([KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md)): alkatrészenként, sorozatnagyság szerint. A nyitott kérdéseket rábíztam az AI-ra, ő döntött és indokolt: ~140 ezerről ~111 ezer Ft/db.
- **Tanúsítás** ([TANUSITAS.md](TANUSITAS.md)) és **marketing** ([MARKETING.md](MARKETING.md)): CE/RED, kiberreziliencia, MI-rendelet, EPR, export; szlogenek és kampányterv.

**Elakadás:** a párhuzamos ágak ugyanazokat a dokumentumokat is módosították (pl. ELEKTRONIKA.md), ezért az összefésülés után az AI egy külön commitban egységesítette a szöveget.

**Tanulság:** a párhuzamos munka gyors, de a döntéseket egy helyen kell meghozni. Amikor a „B döntés” megszületett, minden érintett sessionnek szólni kellett, különben a régi terv szerint dolgoztak volna tovább.

## 2026-11-17 – Még három bónuszvideó, cat mode és a pörgős bemutató

**Példapromptok:**
> „…hozzá inspirációnak retro magyar reklámokat, amikor még nem csak átszinkronizálták a meglévő külföldi rek[lámokat]…”
> „…lehetne egy "cat mode" ahol a C kocka ara átalakulna egy macskáére, és tudna dorombolni is…”
> „egy picit pörgősebb, mint az eredeti… kevés az az idő…”

**Mi készült el:**
- **90-es évekbeli amerikai tévéreklám** (42 mp): harsány bemondó (XTTS, Whisperrel válogatva), neon hátterek, krómfeliratok, VHS-zaj és időbélyeg, 13 vágás ütemre.
- **Retró magyar tévéreklám** (41 mp): 1978 · 1993 · 2004, csatornaváltós átmenetekkel. Filmszemcse és stop-motion, „házi” WordArt-betűk, korai digitális fények és AKCIÓ-csillag. Magyar AI-narráció két hanggal.
- **Cat mode:** egy új üzemmód, amit végig átvezettünk: macskaarc a XIAO-n, a PC-s előnézetben és a szimulátorban, simogatásra dorombolás (hang + rezgőmotor), bekapcsoláskor miaú, 11 új teszt.
- **Cat mode rövid klip** (20 mp, függőleges 9:16): horog az első fél másodpercben, kb. 1 mp-es vágások, nagy feliratok, hurokba illő zárás.
- **Pörgős bemutató** (1:52): az eredeti 2:56-os videó jelenete vágólistával újravágva, ütemre (120 BPM), tömörebb narrációval (10 új mondat) és cat mode-blokkal. A hangkeverőt úgy alakította át az AI, hogy az eredeti videó hangsávja bitre azonos maradt.
- **Kutatások aloldal** ([kutatasok.html](kutatasok.html)): kártyák a fő számokkal, és egy olvasó, ami a .md dokumentumokat közvetlenül jeleníti meg (HU/EN).

**Tanulság:** a kódból épülő videómotor itt hozta vissza a befektetést: egy új reklám már csak forgatókönyv, idővonal és hang, a 3D kocka és az arc kész.

## 2026-11-18 – Beadás előtti átnézés

**Példapromptok:**
> „cső C! ötletek a projekthez? van amin érdemes lenne változtatni?”
> „mehet mind!”

**Hogyan:** az AI átnézte a repót, a weboldalt és az élő oldalt, és fontossági sorrendben javasolt változtatásokat. Ezeket egy menetben megcsinálta.

**Mi változott:**
- **A fő videó a pörgős, 1:52-es lett.** A kiírás 1–3 percet kér, és a rövidebb változatot nagyobb eséllyel nézik végig. A teljes, 2:56-os változat lenyitható alatta.
- **Bónuszgaléria:** a négy bónuszvideó (japán, 90-es, retró magyar, cat mode) borítóképpel egy helyen. Eddig csak a japán volt fent, a többi csak a repóban.
- **Demó beszélgetés a nyilvános oldalon:** eddig a szimulátorban csak helyben, API-kulccsal lehetett beszélgetni. Most a weboldalon egy kis „demó agy” felel (kulcsszavak alapján, előre megírt mondatokkal), javasolt kérdésgombokkal. Helyben továbbra is Claude válaszol.
- **„Számokban” és „ki mit csinált”:** a „Hogyan készült?” elején a projekt számai (napok, commitok, kódsorok, fájlok), és két oszlop arról, mit csináltam én és mit az AI.
- **A napló olvasható a weboldalon:** a GitHub Pages a .md fájlokat nyers szövegként mutatta, ezért a napló és a tervezési koncepció most a Kutatások oldal olvasójában nyílik meg.
- **Ez a napló** is pótolva lett a 11-17-i munkákkal.
- **Új skill:** `c-kocka-render`, ami leírja, hogyan kell bármelyik videót újragenerálni (melyik szkript, milyen sorrendben, mire figyelni).

**Elakadás:** a projekt fájljai Windows-sorvégeket (CRLF) használnak, ezért az AI első, többsoros szövegcseréi nem találták a cserélendő részt. Írt egy kis segédet, ami a sorvégeket is kezeli.

**Tanulság:** a beadás előtt érdemes kívülről ránézni: mit lát az, aki csak a linket kapja meg? Több kész munka (videók, napló) egyszerűen nem volt elérhető onnan.

## 2026-11-18 – „Rázd meg!” külön programként

**Példaprompt:**
> „A magic 8 ball rázós rézét tudnánk egy külön progira csinálni? amit lehetne futtatni lokálisan”

**Mi készült el:** [8ball/index.html](8ball/index.html), a kocka „Rázd meg, és dönt helyetted” funkciója önálló programként. **Egyetlen HTML-fájl**, internet, szerver és telepítés nélkül: letöltés után dupla kattintással indul.
- Tegyél fel egy igen–nem kérdést, és rázd meg a kockát: a gombbal, a szóközzel, a kocka egérrel vagy ujjal való ide-oda rángatásával, vagy telefonon magát a telefont megrázva (gyorsulásérzékelő).
- A kijelzőn lila köd kavarog, aztán előúszik a válasz: **YES** vagy **NO**. A C háromszor zölden vagy pirosan felvillan, és néha jön egy beszólás is („…but don't tell Andor.”), ahogy a [DESIGN.md](DESIGN.md) 10. pontja leírja. A szimulátorban eddig csak egy egyszerű „…” → YES/NO volt.
- Hang kódból (zörgés rázáskor, köd-suhogás, külön dallam igenre és nemre), angol felolvasás a böngésző beszédhangjával. Mindkettő kikapcsolható.
- **Poén:** ugyanarra a kérdésre (kis- vagy nagybetűvel, írásjellel vagy anélkül) ugyanazt feleli, és szóvá is teszi: „Still YES. Stop asking.”
- Az előzmények (utolsó döntések, igen/nem számláló) a böngészőben maradnak. A felület magyar és angol, a válasz mindig angol, mint a kockán.

**Ellenőrzés:** az AI a beépített böngészőben, a fájlt közvetlenül megnyitva próbálta ki: gomb, rángatás (szimulált egérmozgással), ismételt kérdés, angol felület és telefonméret. A telefon megrázását és a hangot nem tudta kipróbálni, ezt nekem kell megnéznem.
