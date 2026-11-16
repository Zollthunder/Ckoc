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
