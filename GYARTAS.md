# C-kocka – gyárthatóság (első javaslat, v0.1)

> Szempont: **költséghatékony kis- és közepes sorozat**, drága szerszámok (fröccsöntőszerszám, maratás) nélkül. A dizájnhoz hozzá szabad nyúlni. A puha gumisarkok maradhatnak, akár ragasztva.

## A gond: a lekerekített ház
A mostani modellben a ház egyetlen tömör kocka, minden élén 9 mm-es lekerekítéssel. Ezt gazdaságosan csak **fröccsöntéssel** lehetne sorozatban gyártani, a szerszám viszont nagyon drága, és csak nagy darabszámnál térül meg. Marással a 12 lekerekített él és a belső kiüregelés nagyon sok gépidő.

## Lehetőségek
| | Megoldás | Szerszámköltség | Darabköltség | Dizájnváltozás |
|---|---|---|---|---|
| **A** ⭐ | **Szabványos alumínium zártszelvény** (80×80 mm, lekerekített sarkú profil) méretre vágva → ez adja a 4 oldalfalat; teteje és alja **marott sík lap** | nincs | alacsony | a függőleges élek sugara a profilé lesz (kisebb, kb. 2–5 mm); a vízszintes éleket a lapok letörése vagy a gumisarkok adják |
| **B** | **5 sík, marott/vízvágott lap** (elő-, hát-, 2 oldal-, tetőlap) + alsó lap, a sarkokban összeillesztve; **a sarkok illesztését a ráragasztott gumisarkok takarják** | nincs | alacsony–közepes | az élek egyenesek lesznek; a gumisarkok funkciót kapnak (takarás + ütésvédelem) |
| **C** | **3D nyomtatott ház** (SLS/MJF nejlon, festve vagy szórva) | nincs | közepes (kis darabszámnál a legolcsóbb) | a mostani forma maradhat; a felület kevésbé prémium |
| **D** | Fröccsöntés | nagyon magas | nagyon alacsony | csak nagy sorozatnál éri meg |

## Javaslat
- **Prototípus és pár darab:** **C** (3D nyomtatás), gyors, és a mostani dizájn változtatás nélkül kipróbálható.
- **Kis sorozat:** **A** – az alumínium zártszelvény prémium hatású, olcsó, és a C betű, a kijelzőablak, a kameranyílás és a hangszórórács **marással** elkészíthető (ehhez a műhelyben adott a CAM és a marás). A tető- és alsó lapot be lehet ragasztani vagy csavarozni, a sarkokra pedig ráragasztjuk a gumisarkokat.

## Ami ehhez a modellben változna (az A változatnál)
1. A ház: zártszelvény + 2 lap, a 9 mm-es körbefutó lekerekítés helyett.
2. A sarkok: ragasztott, öntött vagy TPU-ból nyomtatott gumisapkák, amelyek takarják a lapok és a profil találkozását.
3. A hangszórórács: furatminta marással vagy lézervágással (kevesebb, nagyobb furat → kevesebb gépidő).
4. A C betű fénycsatornája: marott horony + beragasztott opál akril betét (lézervágott).
5. A tetőlap gombjai és furatai maradhatnak.

## Szerelhetőség (2026-11-13)
> Elv: ha valamit borzasztó összerakni, a minőség sem garantálható. Ha nem is túl egyszerű, **legyen hely**.

**Eldöntve (2026-11-13): mindez standard** – lásd [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md). A kocka 90 mm-es lett; az újramérés szerint most **mindenhol legalább 3 mm** hely van.

A korábbi, 80 mm-es elrendezés mért legkisebb hézagai (ezért nőtt a méret):
| Hol | Hézag | Gond |
|---|---|---|
| a Voice Bonnet teteje – a tetőlap | **kb. 0,5 mm** | nem fér el a kábel és a csatlakozó |
| a stack eleje – a kijelző hátulja | **kb. 1 mm** | a kijelző szalagkábele nem fér el |
| a kamera – a kijelzőpanel széle | **kb. 1 mm** | szerelésnél könnyen sérül |
| a stack oldala – a hangszórók | kb. 6,5 mm | rendben |

**Javaslat a könnyű szereléshez:**
1. **Nagyobb kocka: 90 mm** (a 80 helyett). Ez mindenhol +5 mm helyet ad, és még mindig tenyérnyi. *(A méretnövelés megengedett, de előtte egyeztetünk.)*
2. **Belső „szán” (alváz):** egy 3D nyomtatott vagy SLS keret, amire **minden modul a házon kívül** felszerelhető és kipróbálható, és utána egyben becsúszik a házba. Ez illik az alumínium zártszelvényes házhoz (A változat), mert a szán alulról betolható, és az alsó lap rögzíti.
3. **Előlapi részegység:** a kijelző, a kamera és a C LED-szalagja egy nyomtatott tartón, **egyetlen csatlakozós kábellel** a főegység felé.
4. **Tetőlapi részegység:** a 4 gomb, az érintőelektróda és (ha kell) a mikrofonok egy kis lapon, **szintén egy csatlakozóval**, így a tető levehető.
5. **Csatlakozók forrasztás helyett:** JST és STEMMA QT/Qwiic kábelek, a hangszórók is dugaszolhatók.
6. **Csavarok, ragasztás nélkül:** M2,5-ös menetes betétek a nyomtatott alvázba. Ragasztás csak a gumisarkoknál.
7. **Akku cserélhető:** a 18650-es cella alulról, a bölcsőből kivehető.
8. **USB-C a házon:** panelbe szerelhető USB-C hosszabbító, hogy a ház nyílása ne a UPS panel pontos helyéhez legyen kötve.

## Nyitott kérdések
- Milyen darabszámban gondolkodunk (1 prototípus, 10, 100, 1000)? Ettől függ a választás.
- Alumínium vagy műanyag a cél? (Súly, hő, rádiójel: az **alumínium ház árnyékolja a Wi-Fit és a Bluetooth-t** → a modul antennája egy műanyag felület mögé kell, pl. a tetőlap alá vagy a C fénycsatornája mögé.)
- Milyen gépek érhetők el házon belül (CNC marás, lézer, vízvágás, 3D nyomtatás)?
