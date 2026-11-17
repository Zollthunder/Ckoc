# C-kocka – tanúsítás és forgalmazási feltételek (v0.1, 2026-11-17)

> **Gyakorló anyag az AI-kihíváshoz, nem jogi tanács.** A C-kocka elméleti termék, nem kerül forgalomba. Éles gyártás előtt egy akkreditált vizsgálólaborral vagy megfelelőségi tanácsadóval át kell nézni.
> **Jelölések:** **[H]** hivatalos oldalon vagy dokumentumban ellenőrizve (EUR-Lex, Európai Bizottság, IATA, gov.uk, raspberrypi.com, fcc.gov, kormanyhivatalok.hu) · **[M]** másodlagos forrás (labor, ügyvédi iroda, tanácsadó) · **[T]** saját tudás, ellenőrizni kell.
> Az alkatrészek CE-állapota: [KOLTSEGOPTIMALIZALAS.md, 5.5](KOLTSEGOPTIMALIZALAS.md).

## Összefoglaló
- **Az EU-ban CE kell**, és ebben a rádióberendezés-irányelv (RED) a fő szabály. A tanúsítást a gyártó maga nyilatkozza, ha minden harmonizált szabványt teljesen alkalmaz. Kívülálló vizsgáló szervezet csak bizonyos kiberbiztonsági pontoknál kell, és a terméket úgy lehet tervezni, hogy ezeket elkerülje.
- **A CE mellett** ezek vonatkoznak a C-kockára: RoHS, REACH, WEEE, akkurendelet, általános termékbiztonsági rendelet (GPSR), csomagolási rendelet (PPWR), az MI-rendelet átláthatósági szabálya, GDPR, 2026-09-11-től a kiberrezilienciáról szóló rendelet (CRA) bejelentési kötelezettsége, 2027-12-11-től pedig a teljes CRA.
- **Magyarországon** ezek is kellenek: EPR-regisztráció (MOHU és kormányhivatal), magyar útmutató és feliratok.
- **Külföldre** a Raspberry Pi Zero 2 W rádiós engedélyei sokat segítenek: van FCC, kanadai (IC), japán, ausztrál (RCM) engedélye és EU-s megfelelőségi nyilatkozata. A kész terméket viszont minden piacon külön kell vizsgálni és jelölni.
- **A négy legnagyobb kockázat:** (1) a terméket **játéknak** minősítik, (2) a CRA „virtuális asszisztens” kategóriája, (3) a kiberbiztonsági jelszó-szabály, (4) a kamera és a felhő miatti **GDPR**-követelmények.

---

## 1. Európai Unió

| Szabály | Vonatkozik? | Mit kér a C-kockától | Dátum | Forrás |
|---|---|---|---|---|
| **RED 2014/53/EU** | igen | biztonság (EN 62368-1), EMC (EN 301 489-1/-17, EN 55032/55035), rádió (EN 300 328), rádiós expozíció (EN 62311/62479). Az előtanúsított Pi-modul rádiós vizsgálatokat spórol meg, de a kész termékre a gyártó állítja ki a megfelelőségi nyilatkozatot | hatályos | [T]; a Pi Zero 2 W EU-nyilatkozata [H] |
| **RED kiberbiztonság** (2022/30 + EN 18031) | igen | EN 18031-1 (internetre kapcsolódik) és -2 (személyes adatot kezel). A -3 csak fizetés kezelésekor kell | 2025-08-01 óta | [M/T]; megszorítások: (EU) 2025/138 [H] |
| ↳ **Mikor kell kívülálló vizsgáló szervezet?** | | ha a szabványt nem teljesen alkalmazzuk; ha a jelszó beállítása **kihagyható** (a 6.2.5.1/6.2.5.2 pontra ilyenkor nincs megfelelőségi vélelem); vagy ha a termék **játék**. Különben elég a gyártó saját nyilatkozata | | [M] |
| ↳ **Tervezési teendő** | | kötelező, egyedi jelszó vagy párosítás, ne lehessen kihagyni | | |
| ↳ átmenet | | a 2022/30-at a (EU) 2026/339 hatályon kívül helyezi, 2027-12-11-től a CRA szabályozza a kiberbiztonságot | 2027-12-11 | [H] |
| **CRA (EU) 2024/2847** | igen | 2026-09-11-től az aktívan kihasznált sérülékenységeket és a súlyos incidenseket 24 órán belül jelenteni kell (ENISA), a már forgalomban lévő termékeknél is. 2027-12-11-től: SBOM (szoftver-alkatrészlista), támogatási időszak (legalább 5 év), biztonsági frissítések, CE a CRA alapján | 2026-09-11 / 2027-12-11 | [M] |
| ↳ **Kockázat** | | a CRA III. melléklet I. osztályában szerepel az okosotthonokba szánt, általános célú virtuális asszisztens. Ha a C-kocka ide tartozik, saját nyilatkozat csak harmonizált szabvány teljes alkalmazásával lehetséges | | [T] – a melléklet szövegét ellenőrizni kell |
| **RoHS 2011/65/EU** | igen | beszállítói RoHS-nyilatkozatok, műszaki dokumentáció (EN IEC 63000) | hatályos | [T] |
| **REACH** | igen | ha 0,1% feletti SVHC-anyag van benne, tájékoztatás (33. cikk) és SCIP-bejelentés (ECHA) | hatályos | [T] |
| **WEEE 2012/19/EU** | igen | áthúzott kuka jel; nyilvántartásba vétel minden eladási országban, más tagállamba távértékesítésnél meghatalmazott képviselő | hatályos | [T] |
| **Akkurendelet (EU) 2023/1542** | igen | 2024-08-18 óta: az akkun megfelelőségértékelés és CE (ez a cella gyártójának vagy importőrének feladata). 2025-08-18: szelektív gyűjtés jele. ~2026-08-18: általános címke (kapacitás stb.). **2027-02-18: QR-kód és cserélhetőség** (kereskedelmi forgalomban kapható szerszámmal) – a C-kocka alulról cserélhető cellája ennek megfelel. Az átvilágítási kötelezettség csak 40 M€ árbevétel felett | lépcsőzetes | [M] (a címke dátuma ellentmondásos) |
| **GPSR (EU) 2023/988** | igen | kockázatelemzés (dobás: ütés, akkusérülés), online értékesítésnél kötelező adatok (19. cikk), balesetek bejelentése (Safety Business Gateway), termékazonosító, gyártói cím | 2024-12-13 óta | [T] |
| **MI-rendelet, 50. cikk** | igen | a felhasználót tájékoztatni kell, hogy MI-vel beszél. **Kamerás érzelemfelismerés munkahelyen és oktatásban tilos** (5. cikk (1) f)), máshol tájékoztatni kell róla | 2026-08-02 óta | [M]; az 5. cikk [T] |
| ↳ **Tervezési teendő** | | a „hangulatfelismerés” irodai használatban kikapcsolva, vagy csak hangból, kamera nélkül; jogilag ellenőrizni | | |
| **Ecodesign, készenlét (2023/826)** | talán | a hálózati készenléti fogyasztás határértékeit érdemes ellenőrizni | 2025-05-09 óta | [T] |
| **Külső tápegység (2019/1782)** | nem | csak ha tápegységet is adunk a termékhez | | [T] |
| **Közös töltő (2022/2380)** | talán | a listán szerepel a „hordozható hangszóró”; a C-kocka nem egyértelműen ilyen. Önként ajánlott betartani: USB-C (már megvan), töltő nélküli változat, piktogram és töltési címke | | [H] EC |
| **PPWR (EU) 2025/40** | igen | csomagolási követelmények; 2028-08-12-től harmonizált anyagjelölés | 2026-08-12 óta | [H]/[M] |
| **GDPR** | igen | beépített és alapértelmezett adatvédelem (25. cikk): fizikai némítás, LED-jelzés, minimális adattárolás. Valószínűleg adatvédelmi hatásvizsgálat (DPIA) kell. Az USA-beli felhőszolgáltatóhoz adattovábbítási jogalap (DPF vagy SCC) és adatfeldolgozói szerződés (DPA) | hatályos | [T] |
| **Játékbiztonság** (2009/48/EK, új rendelet (EU) 2025/2509) | **kockázat** | ha a termék 14 év alattiaknak szánt játéknak tűnik: EN 71, vizsgáló szervezet az EN 18031-hez, adatvédelmi szigorítások. Egy „Nem játék, 14+” felirat önmagában nem elég: a reklámnak, a csomagolásnak és a megjelenésnek is felnőtteknek kell szólnia | | [T] |

## 2. Magyarország
| Téma | Mit kell tenni | Forrás |
|---|---|---|
| **EPR** (80/2023. Korm. rendelet) | kétlépcsős regisztráció: MOHU Partner Portál, valamint nyilvántartásba vétel a hulladékgazdálkodási hatóságnál (Pest Vármegyei Kormányhivatal). Érintett termékkörök: elektronika, hordozható akku, csomagolás. Az EPR-díjat a MOHU szedi. Akkumulátorra: 445/2012. Korm. rendelet | [H] kormanyhivatalok.hu; [M] |
| **Környezetvédelmi termékdíj** | várhatóan nem kell: 2025-01-01 óta az EPR-köteles termékekre nem kell külön termékdíjat is fizetni. A 2011. évi LXXXV. törvény mellékletében ellenőrizni kell | [M] |
| **Magyar nyelv** | magyar használati útmutató és biztonsági feliratok (RED 10. cikk (8) és a fogyasztóvédelmi szabályok) | [T] – a pontos paragrafust ellenőrizni kell |
| **Piacfelügyelet** | NMHH: rádió és EMC (bírság legfeljebb 500 M Ft); fogyasztóvédelmi hatóság: termékbiztonság; kormányhivatal: EPR és hulladék | [H] NMHH; [T] |

## 3. Külföldi forgalmazás
**A Pi Zero 2 W engedélyei** (Raspberry Pi approvals oldal, 30 dokumentum) [H]: USA (FCC ID **2ABCB-RPIZ2**), Kanada (IC **20953-RPIZ2**), Japán, Ausztrália/Új-Zéland, EU, Dél-Korea, Tajvan, Brazília, India.

| Piac | Mi kell a kész C-kockához | Forrás |
|---|---|---|
| **USA** | FCC Part 15B (nem szándékos sugárzó, B osztály) megfelelőségi nyilatkozat (SDoC) a kész termékre, a beépített modult működés közben kell vizsgálni. Címke: „Contains FCC ID: 2ABCB-RPIZ2” + 15.19 nyilatkozat + 15.105 tájékoztatás. UL/NRTL nem kötelező, de a kiskereskedők kérik. Prop 65 (Kalifornia), CPSC termékbiztonság, Kalifornia SB-327 (egyedi jelszó), Illinois BIPA (arc- vagy hangazonosításhoz előzetes írásos hozzájárulás). Szállítás: UN38.3, DOT 49 CFR 173.185 | [H] 47 CFR 15.212, [M] KDB 996369, a többi [T] |
| **Egyesült Királyság** | a CE-t határozatlan ideig elfogadják. **PSTI** (2024-04-29 óta): nincs alapértelmezett jelszó, legyen sérülékenység-bejelentési elérhetőség, közzétett támogatási időszak, megfelelőségi nyilatkozat (statement of compliance). Ehhez az ETSI EN 303 645 segít. Brit importőr vagy cím kell | [H] gov.uk; [T] |
| **Kanada** | ICES-003 (B) a kész termékre; címke: „CAN ICES-003(B)/NMB-003(B)” és „Contains IC: 20953-RPIZ2”; angol és francia útmutató és címke | [T/M] |
| **Svájc** | a CE-t elfogadják (EU–svájci kölcsönös elismerési megállapodás); svájci cím vagy forgalmazó, VREG/INOBAT díj | [T] |
| **Japán** | a Pi Zero 2 W japán engedélye megvan [H]; a kész terméken a rádiós engedély jele (giteki) és száma; a Li-ion cellára PSE, japán importőr | [T] |
| **Ausztrália/Új-Zéland** | a Pi-nek van RCM-engedélye [H]; a kész termékre ausztrál felelős szállító teszi az RCM jelet (EMC, rádió, EME) | [T] |

## 4. Szállítás (akku)
- UN38.3 tesztösszesítő kell a cellára. Ha mi szereljük össze a csomagot (cella + védőpanel), azt külön is vizsgálni kell. [T]
- A 10,8 Wh-s cella 20 Wh alatt van, ezért IATA Section II szerint szállítható. [T]
- **Az akku a dobozban, külön (PI 966):** 2,7 Wh felett 2026-01-01 óta **kötelező a legfeljebb 30%-os töltöttség**. [H] IATA DGR 66
- **Az akku a készülékben (PI 967):** a 30% csak ajánlás. [H/M]
- **Javaslat:** a kocka beszerelt akkuval, kb. 30%-os töltöttséggel menjen.

## 5. Költség és idő (becslés, ajánlatot kell kérni)
| Tétel | Költség | Átfutás |
|---|---|---|
| EU: EMC + rádió + biztonság, előtanúsított Wi-Fi/BT-modullal | ~8–15 e€ | 2–6, legfeljebb 12 hét [M] |
| EN 18031 kiberbiztonság | +3–10 e€ (vizsgáló szervezettel további hetek) | [T]/[M] |
| USA FCC 15B SDoC + Kanada ICES-003 | ~2–5 e USD (új rádiós engedély nem kell, ha a modulé átvehető) | [T] |

## 6. Mit jelent ez a tervezésre (teendők)
1. **Kötelező egyedi jelszó vagy párosítás** az első indításkor, ne lehessen kihagyni (EN 18031, PSTI, SB-327).
2. **Biztonságos frissítés** és közzétett **támogatási időszak** (legalább 5 év, CRA); **sérülékenység-bejelentési cím** a weboldalon.
3. **SBOM** a szoftverről (CRA, 2027-től).
4. **Adatvédelem:** fizikai némítás (fejjel lefelé), kamera-LED, helyi feldolgozás, ahol lehet; DPIA; adatfeldolgozói szerződés a felhőszolgáltatóval.
5. **Kamerás hangulatfelismerés** irodai használatban kikapcsolva (MI-rendelet 5. cikk).
6. **Felnőtt pozicionálás:** ne legyen játék (lásd [MARKETING.md](MARKETING.md)).
7. **Címkék:** CE, WEEE, akku-jelölések, gyártói cím, típus- és sorozatszám; exportnál FCC/IC/RCM/giteki.
8. **Beszállítói dokumentumok:** RoHS, REACH, a cella UN38.3-a és akkurendeleti dokumentumai; a Pi-Ener-lite-hoz nyilatkozatot kérni (lásd KOLTSEGOPTIMALIZALAS.md 5.5).

**Nem ellenőriztem:** a CRA III. melléklet pontos szövegét, a 2023/826 hatályát akkus termékekre, a magyar nyelvi paragrafust, a Pi Zero 2 W japán tanúsítványszámát, valamint hogy a modulengedély pontosan milyen címkeszöveget ír elő a kész termékre (FCC 15B, ICES).

## Források
- EU: [(EU) 2025/138 – EN 18031 megszorítások](https://eur-lex.europa.eu/eli/dec_impl/2025/138/oj) · [(EU) 2026/339](https://eur-lex.europa.eu/eli/reg_del/2026/339/oj) · [Közös töltő (EC)](https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red/one-common-charging-solution-all_en) · [PPWR (EC)](https://environment.ec.europa.eu/news/new-eu-rules-packaging-enter-application-2026-08-11_en)
- Raspberry Pi: [approvals](https://pip.raspberrypi.com/categories/586-approvals) · [FCC ID 2ABCB-RPIZ2](https://fcc.report/FCC-ID/2ABCB-RPIZ2)
- USA: [47 CFR 15.212](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15/subpart-A/section-15.212) · [FCC modulintegrációs útmutató](https://www.fcc.gov/sites/default/files/33-Modules-Integration-Instructions-TCB_Oct_2023.pdf)
- UK: [PSTI](https://www.gov.uk/guidance/regulations-consumer-connectable-product-security) · [Rádióberendezések](https://www.gov.uk/guidance/radio-and-telecommunications-terminal-equipment)
- IATA: [DGR 66 változások](https://www.iata.org/contentassets/b08040a138dc4442a4f066e6fb99fe2a/dgr-66-en-significant-changes.pdf) · [Lítiumakku-útmutató](https://www.iata.org/contentassets/05e6d8742b0047259bf3a700bc9d42b9/lithium-battery-guidance-document.pdf)
- Magyarország: [80/2023. Korm. rendelet](https://njt.jog.gov.hu/jogszabaly/2023-80-20-22) · [NMHH – berendezések](https://english.nmhh.hu/infocoms/equipment)
- Másodlagos: compliancegate.com, adozona.hu, houthoff.com, joneswalker.com, cms.law
