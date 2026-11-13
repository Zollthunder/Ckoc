# C-kocka – piaci előtanulmány (2026. november)

> **Mire jó ez a dokumentum:** gyors becslés arról, hogy van-e piaca egy ilyen asztali AI-asszisztensnek, mennyiért lehetne eladni, mekkora haszonnal, és milyen darabszámban érdemes gyártani.
> **Mire nem:** üzleti tervnek. A piaci számok fizetős elemzések nyilvános kivonataiból származnak, az árak kiskereskedelmi listaárak. A dollárárakat kb. 0,9-es szorzóval számoltuk át euróra. A saját becsléseket külön jelöljük.

## Összefoglaló
- **A piac kicsi, de létező:** az „asztali AI-robotkedvenc” rés kb. **130 millió USD/év**, évi ~9%-kal nő. Mellette ott a jóval nagyobb okoshangszóró-piac (~16 milliárd USD).
- **Ár:** a hasonló termékek **140–380 USD** között vannak. A C-kocka helye **199–249 €** (bruttó), az Eilik és az EMO között.
- **Darabköltség:** a mostani prototípus (kész modulokból, házon belüli SLS-sel) kb. **230–260 €/db**. Saját NYÁK-kal és 1000 db-tól kb. **110–125 €**, 5000 db felett kb. **65–75 €**.
- **Haszon:** 1000 db-os sorozatnál közvetlen (webshopos) eladással kb. **35–40%** bruttó árrés. Kis szériában (100 db) a kész modulok miatt drága, csak limitált vagy céges ajándék változatként éri meg.
- **Javaslat:** 3 prototípus → **100–300 db-os limitált széria** (céges ajándék, közösségi finanszírozás) házon belüli SLS-sel, szerszám nélkül → ha beválik, **saját NYÁK + 1000 db**.
- **Kockázatok:** a Voice Bonnet több helyen már nem kapható, ezért saját NYÁK úgyis kell. Ezen felül: folyamatos AI-költség, CE/RED tanúsítás, és az adatvédelem (kamera és mikrofon az asztalon).

---

## 1. Mekkora a piac?
| Piac | Méret | Növekedés | Forrás |
|---|---|---|---|
| **Asztali AI-robotkedvencek** (legközelebbi rés) | 131 M USD (2025) → 203 M USD (2030) | ~9%/év | [360iResearch](https://www.giiresearch.com/report/ires1803626-desktop-ai-robot-pets-market-by-product-type.html) |
| Társ- (companion) robotok, tágabban | 1,4–1,7 Mrd USD (2025) → 2,9–3,1 Mrd (2030) | 12–15%/év | [360iResearch](https://www.gii.tw/report/ires1714732-companion-robots-market-by-type-age-group.html), [Knowledge Sourcing](https://www.knowledge-sourcing.com/report/companion-robot-market) |
| Okoshangszórók | ~16 Mrd USD (2025) | 10–15%/év | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/smart-speakers-market) |

**Mit jelent ez darabszámban? (saját becslés)** A 130 millió USD-s rés 200 €-s átlagárral kb. **600–700 ezer eladott készülék évente**, világszerte. Ennek 0,1–0,3%-a **600–2000 db/év**. Egy új szereplőnél ez reális, de nem garantált cél. Európára külön adatot nem találtunk.

## 2. Versenytársak és tanulságok
| Termék | Ár | Mi lett vele |
|---|---|---|
| **Eilik** | ~140–200 USD | siker: olcsó, aranyos ajándék, LLM nélkül |
| **Living.ai EMO** | ~280–380 USD | siker a résben (YouTube/TikTok) |
| **Loona** | ~500 USD | közepes; drága |
| **Anki Vector** | 250 → 350–400 USD | az Anki 2019-ben csődbe ment (drága gyártás, felhőfüggés) |
| **Rabbit R1** | 199 USD | ~100 ezer eladott db, de csak ~5 ezer napi használó – „egy telefonos app is tudja” |
| **Humane AI Pin** | 699 USD + 24 USD/hó | 2025-ben megszűnt, a készülékek használhatatlanná váltak |
| **ElliQ** (időseknek) | 250 USD + 50–60 USD/hó | előfizetéses, B2B/állami modell működik |
| **Echo Show 5/8, Nest Hub** | 40–180 USD | támogatott (veszteséges) árak – ez az „okoskijelző” árplafon |

Források: [Vector](https://robotomated.com/explore/consumer/anki-vector-2), [EMO/Eilik](https://keyirobot.com/blogs/buying-guide/is-the-emo-robot-worth-it-a-buyers-honest-look-at-price-features-for-2025), [Loona](https://keyirobot.com/blogs/loona-tutorials/loona-robot-price-in-2025-is-this-smart-pet-worth-the-cost), [Rabbit](https://9to5google.com/2024/09/26/rabbit-5000-people-use-the-r1-daily/), [Humane](https://www.techspot.com/news/106833-humane-shuts-down-ai-pin-business-hp-buys.html), [ElliQ](https://elliq.com/products/annual-subscription), [Echo Show](https://www.phonearena.com/news/amazon-smart-speakers-e-readers-more-way-pricier-all-of-a-sudden_id182788).

**Tanulságok a C-kockára:**
- **Amelyik eszköz csak egy telefonos app tudását adja, az elbukik** (Rabbit, Humane). A C-kocka erőssége a **fizikai élmény**: arc, fény, gombok, dobálható stresszlabda, Andor-gomb. Ezt kell hangsúlyozni, nem „még egy ChatGPT-t”.
- **A felhőfüggés kockázat** (Anki, Humane). A szoftvernek akkor is tudnia kell valamit, ha a szolgáltatás leáll: például legyen helyi mód és saját API-kulcs.
- **Az ajándékpiac működik** (Eilik): az ár 200 € alatt tartása sokat segít.

## 3. Darabköltség (BOM és teljes önköltség)

### 3.1 Prototípus (1–3 db, kész modulokból)
| Tétel | Ár (kb.) |
|---|---|
| Raspberry Pi Zero 2 W | 14 € |
| Voice Bonnet (hang, 2 mikrofon) | 14–27 € |
| 18650 UPS panel + cella | 30–40 € |
| Kerek kijelző (GC9A01) | 5–14 € |
| Mini kamera (OV5647) | 8–23 € |
| 2 hangszóró | 4–7 € |
| NeoPixel Ring 24 + C LED-szalag | 21 € |
| XIAO RP2040, IMU, rezgés, érintés | 35 € |
| Gombok, USB-C, kábelek, csatlakozók | 10 € |
| **Elektronika összesen** | **~145–165 €** |
| SLS ház + tálca, PETG belső részek, SLA sapkák, TPU sarkok (házon belül) | 25–35 € |
| Alu tetőlap (CNC + eloxálás), akril, fa, gumi | 12–18 € |
| Csavarok, menetes betétek, szilikon | 5 € |
| Szerelés (~1,5 óra) | 35–40 € |
| **Prototípus önköltség** | **~230–260 €/db** |

Árforrások: [Pi Zero 2 W](https://www.raspberrypi.com/news/price-increases/), [Voice Bonnet](https://coolcomponents.co.uk/products/voice-bonnet-for-raspberry-pi-two-speakers-two-mics), [Geekworm X306](https://geekworm.com/products/x306), [18650](https://www.batteryjunction.com/products/samsung-30q-18650-3000-button-opt), [kijelző](https://www.switch-science.com/products/7347), [kamera](https://www.adafruit.com/product/5390), [NeoPixel](https://www.pololu.com/product/2538/specs), [XIAO](https://www.robotshop.com/products/seeedstudio-seeed-studio-xiao-rp2040-supports-arduino-micropython-circuitpython), [IMU](https://www.adafruit.com/products/4503), [DRV2605L](https://www.adafruit.com/products/2305), [érintés](https://www.adafruit.com/products/1374). A hangszóró, a gombok és a USB-C ára becslés.

### 3.2 Sorozatok (saját becslés)
| | **100 db** (limitált) | **1000 db** | **5000+ db** |
|---|---|---|---|
| Elektronika | kész modulok, mennyiségi kedvezménnyel ~120 € | **saját NYÁK** a Pi Zero 2 W mellé (hang, töltés, LED, MCU egy lapon) ~50–65 € | saját NYÁK, nagy tétel ~40 € |
| Ház és mechanika | házon belüli SLS ~35 € | házon belüli SLS ~20–25 € | **fröccsöntés** ~5 € + szerszám (15–25 e€ / 5000 db) ~4 € |
| Szerelés | 1 óra ~25 € | 30 perc ~12 € | bérszerelés ~8 € |
| Tanúsítás (CE/RED, ~10–15 e€) | – (prototípus / limitált) | ~12 € | ~3 € |
| Csomagolás, garancia | ~8 € | ~8 € | ~6 € |
| **Önköltség** | **~185 €** | **~110–125 €** | **~65–75 €** |

## 4. Ár és haszonkulcs
**Az iparági ökölszabály:** a fogyasztói elektronika kiskereskedelmi ára a teljes önköltség **3–5-szöröse**. Online kereskedő ~15–20%-ot, nagyáruház 30–40%-ot visz el. Közvetlen eladásnál 50–60% bruttó árrés a cél. ([Sinovation](https://www.sinovationventures.com/blog/consumer-iot-start-up-advice), [Make:](https://makezine.com/article/technology/maker-pro-how-much-should-i-charge/), [Bolt](https://blog.bolt.io/?p=112))

**Számítás a C-kockára:** bruttó ár, benne 27% ÁFA. A nettó a gyártóhoz jutó ár.
| Darabszám | Javasolt ár | Nettó ár | Önköltség | Bruttó árrés (közvetlen eladás) | Webáruházon át (−20%) |
|---|---|---|---|---|---|
| 100 db, limitált | **299 €** | 235 € | 185 € | ~21% – vékony | nem éri meg |
| 1000 db | **249 €** | 196 € | 110–125 € | **~36–44%** | ~20–30% |
| 5000+ db | **199 €** | 157 € | 65–75 € | **~52–59%** | ~40–48% |

**Következtetés:** a mostani, kész modulokból épített változat **csak limitált/céges ajándék szériának** jó (ott 299 € elfogadható, és a „kézzel szerelt, eloxált alu” érzet ezt alá is támasztja). Tömegtermékhez **saját NYÁK** kell, ez a legnagyobb költségcsökkentő lépés: az elektronika a felére vagy harmadára csökken.

### Folyamatos AI-költség
**Becslés:** napi 30 beszélgetés, olcsó modellekkel.
| Tétel | Költség/hó |
|---|---|
| Beszédfelismerés | 0,45–0,70 USD |
| LLM | ~0,20 USD |
| Felolvasás (TTS) | 1–4 USD (helyben, a Pi-n futtatva ingyenes) |
| **Összesen** | **~1,5–5 USD/felhasználó/hó** |

Források: [OpenAI](https://developers.openai.com/api/docs/pricing), [Google Gemini](https://ai.google.dev/gemini-api/docs/pricing), [TTS-árak](https://www.assemblyai.com/blog/tts-api-pricing).

**Javaslat:**
- **12 hónap szolgáltatás benne van az árban,** utána **3,99 €/hó vagy 35 €/év** előfizetés.
- **Alternatíva:** „saját kulcs” mód, amikor a vevő a saját AI-fiókját köti be, és nincs előfizetés.
- A szoftvert úgy kell megírni, hogy a szolgáltató cserélhető legyen. Az AI-modellek gyorsan változnak, és meg is szűnnek.

## 5. Mekkora termelésben?
| Lépés | Darab | Gyártás | Miért |
|---|---|---|---|
| 1. Prototípus | 3 | házon belül, kész modulok | kipróbálás, fotók, videó |
| 2. Limitált széria | **100–300** | házon belüli SLS, kész modulok, kézi szerelés | szerszám nélkül, gyorsan; céges ajándék, közösségi finanszírozás (Kickstarter) – a piac kipróbálása |
| 3. Első sorozat | **1000** | saját NYÁK, házon belüli SLS, CE/RED | a házon belüli SLS-sel a fröccsöntés megtérülési pontja (más gyártóknál ~150–300 db) kitolódik |
| 4. Nagy sorozat | **5000+** | fröccsöntött ház, bérszerelés | csak ha az 1000 db elfogy |

A fröccsöntés vs. 3D nyomtatás megtérülési pontja általában **150–300 db** ([Xometry](https://www.xometry.com/resources/molding-casting-and-more/3d-printing-vs-injection-molding-breakeven), [Industrial Monitor Direct](https://industrialmonitordirect.com/blogs/knowledgebase/low-volume-injection-molding-vs-3d-printing-quantity-break-point)). Saját SLS géppel (csak anyag és gépidő) ez jóval feljebb tolódik, ezért az 1000 db-os körben még nem kell szerszám.

## 6. Kötelezettségek és kockázatok
- **CE/RED tanúsítás** (rádiós eszköz): előtanúsított modullal (a Pi Zero 2 W ilyen) kb. **8–15 e€** ([ComplianceGate](https://www.compliancegate.com/ce-marking-cost/)). Az akkus termékhez biztonsági vizsgálat (EN 62368-1), a szállításhoz pedig **UN38.3** akkuteszt kell.
- **Adatvédelem (GDPR):** kamera és mikrofon egy irodai asztalon nagyon érzékeny téma. Előnyt jelenthet:
  - a helyi feldolgozás (pl. arcfelismerés a készüléken),
  - egy fizikai „némítás” (fejjel lefelé fordítva),
  - és egy látható jelzés, amikor a mikrofon vagy a kamera figyel.
- **EU AI-rendelet:** a felhasználónak tudnia kell, hogy géppel beszél (átláthatósági kötelezettség). A C-kocka ezt magától teljesíti, de a dokumentációban rögzíteni kell. *(Jogi ellenőrzést igényel.)*
- **Beszerzés:** a Voice Bonnetet több kereskedő már nem forgalmazza, és a Pi Zero 2 W időnként hiánycikk. Ez a saját NYÁK mellett szól.
- **„Divatcikk”-kockázat:** a hasonló eszközök egy része gyorsan kiment a divatból (Rabbit R1). Hosszabb életet a személyiségek, a rendszeres új funkciók és a céges felhasználás (pl. tárgyalói segéd, ügyfélváró) adhat.

## 7. Következő lépések
1. A 3 prototípus elkészítése, a szoftver alapjai, és fotók/videó a kipróbáláshoz.
2. **Valódi ajánlatok** az elektronikára (100 / 1000 db) és a saját NYÁK-ra (tervezés + gyártás + beültetés). Ez a költségoptimalizálás lépés.
3. Egy kis **vásárlói felmérés** (céges ajándék és magánvásárló), például egy előrendelési oldallal.
4. Ha a visszajelzés jó: limitált széria, CE-előteszt, és egy közösségi finanszírozási kampány.
